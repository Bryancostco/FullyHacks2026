import os  # to read env vars
import json  # to parse openai json responses
import random  # for randomizing question topics
import httpx  # async http client for openai calls
from dotenv import load_dotenv  # loads .env into os.getenv

load_dotenv()  # sets up environment variables, must run first

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File  # core fastapi
from fastapi.middleware.cors import CORSMiddleware  # lets frontend call backend
from pydantic import BaseModel  # validates json requests
from supabase import create_client  # supabase sdk
import tempfile  # for saving uploaded files temporarily
import hd_client as hd  # hd wrapper
from openaivoice import router as voice_router  # realtime voice routes
from session_store import active_sessions  # shared session state

# ─── APP SETUP ───────────────────────────────────

app = FastAPI(title="PrepPilot API")  # create the app

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],  # frontend dev urls
    allow_credentials=True,  # allow cookies/auth headers
    allow_methods=["*"],  # allow all http methods
    allow_headers=["*"],  # allow all headers
)

app.include_router(voice_router)  # registers /realtime/session from openaivoice.py

# ─── SUPABASE ────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")  # pulled from .env
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")  # pulled from .env
db = create_client(SUPABASE_URL, SUPABASE_KEY)  # single supabase client, reused for all calls

# ─── OPENAI CONFIG ───────────────────────────────

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")  # pulled from .env
OPENAI_URL = "https://api.openai.com/v1/chat/completions"  # openai chat endpoint
OPENAI_MODEL = "gpt-4o-mini"  # cheap and fast for hackathon

# ─── REQUEST MODELS ──────────────────────────────

class SetupRequest(BaseModel):  # body for POST /setup
    company_url: str  # required
    company_name: str  # required
    role_title: str  # required
    max_pages: int = 30  # optional, default 30

class AskRequest(BaseModel):  # body for POST /quiz/next
    session_id: str  # required

class AnswerRequest(BaseModel):  # body for POST /quiz/answer
    session_id: str  # required
    question: str  # required
    answer: str  # required
    context_used: str = ""  # context that backed the question

# ─── SESSION STORAGE ─────────────────────────────

# active_sessions is imported from session_store.py (shared with openaivoice.py)

# ─── SUPABASE HELPERS ────────────────────────────

def _save_session(session_id: str) -> None:  # writes session dict to supabase
    """Upsert current session state to supabase. In: session_id. Out: None."""
    try:
        db.table("sessions").upsert(  # upsert = insert or update
            {"id": session_id, **active_sessions[session_id]}  # spread session dict into the row
        ).execute()  # actually run the query
    except Exception as e:  # supabase not configured or network error — don't crash the route
        print(f"[warn] supabase save failed for {session_id}: {e}")  # log but continue


def _load_session(session_id: str) -> dict | None:  # reads session from supabase
    """Load a session from supabase into active_sessions. In: session_id. Out: session dict or None."""
    try:
        result = db.table("sessions").select("*").eq("id", session_id).execute()  # query by id
        if result.data:  # if a row was found
            active_sessions[session_id] = result.data[0]  # load it into the whiteboard
            return result.data[0]  # return the session dict
    except Exception as e:  # supabase not configured or network error
        print(f"[warn] supabase load failed for {session_id}: {e}")  # log but continue
    return None  # session not found

# ─── ROUTES ──────────────────────────────────────

@app.get("/health")  # simple health check
async def health():  # no params needed
    return {"ok": True}  # confirms server is alive


@app.post("/setup")  # starts a crawl, returns session_id immediately
async def setup(req: SetupRequest, background_tasks: BackgroundTasks):
    """Start a company crawl and create a session. In: SetupRequest. Out: {session_id, status}."""
    crawl = hd.create_index(req.company_url, req.company_name, req.max_pages)  # kick off crawl
    index_id = crawl["index_id"]  # extract the id hd gave us
    active_sessions[index_id] = {  # store session on the whiteboard
        "index_id": index_id,  # hd crawl job id
        "role_title": req.role_title,  # job they're prepping for
        "company_name": req.company_name,  # company they're prepping for
        "index_status": "queued",  # crawl just started
        "q_count": 0,  # no questions asked yet
        "weak_areas": [],  # no weak areas yet
    }
    _save_session(index_id)  # persist to supabase
    background_tasks.add_task(_poll_until_ready, index_id)  # poll in background, don't block
    return {"session_id": index_id, "status": "queued"}  # return immediately


async def _poll_until_ready(session_id: str) -> None:  # runs in background until crawl finishes
    """Background task that waits for HD crawl to complete and updates session status."""
    try:
        final = hd.wait_for_index(active_sessions[session_id]["index_id"])  # blocks until terminal
        status = final["status"]
    except Exception as e:
        print(f"[error] crawl failed for {session_id}: {e}")
        status = "failed"
    if session_id in active_sessions:  # guard against stale sessions
        active_sessions[session_id]["index_status"] = status  # update status on whiteboard
        _save_session(session_id)  # persist updated status to supabase


@app.get("/status/{session_id}")  # frontend polls this every 3s
async def get_status(session_id: str):
    """Return current crawl status. In: session_id path param. Out: {status, ready}."""
    if session_id not in active_sessions:  # session not on whiteboard
        loaded = _load_session(session_id)  # try loading from supabase
        if not loaded:  # not in supabase either
            raise HTTPException(status_code=404, detail="Session not found")  # clean 404
    cached_status = active_sessions[session_id].get("index_status", "queued")
    if cached_status in ("failed", "cancelled"):  # no point re-polling HD after terminal failure
        return {"status": cached_status, "ready": False}
    job = hd.poll_index(active_sessions[session_id]["index_id"])  # ask hd for current status
    return {"status": job["status"], "ready": job["status"] == "completed"}  # ready is a boolean


@app.post("/upload/{session_id}")  # accepts resume or JD file upload
async def upload_file(session_id: str, category: str = "resume", file: UploadFile = File(...)):
    """Upload a file to HD document library. In: session_id, category, file. Out: {success, doc_id}."""
    if session_id not in active_sessions:  # validate session exists
        raise HTTPException(status_code=404, detail="Session not found")  # clean 404
    with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:  # save to disk temporarily
        tmp.write(await file.read())  # write uploaded bytes to temp file
        tmp_path = tmp.name  # grab the temp file path
    result = hd.upload_document(tmp_path, category=category)  # upload to hd
    return {"success": True, "doc_id": result["doc_id"]}  # return doc reference


@app.post("/quiz/next")  # generates an interview question grounded in company content
async def next_question(req: AskRequest):
    """Generate the next interview question. In: AskRequest. Out: {question, question_number, context_used}."""
    session = active_sessions.get(req.session_id)  # pull from whiteboard
    if not session:  # not on whiteboard, try supabase
        session = _load_session(req.session_id)  # try loading from supabase
    if not session:  # not found anywhere
        raise HTTPException(status_code=404, detail="Session not found")  # clean 404
    if session["index_status"] != "completed":  # crawl not done yet
        return {"ready": False, "message": "Still indexing, poll /status"}  # tell frontend to wait
    # Randomize the search angle so we get different context each time
    angles = [
        "engineering culture and team structure",
        "technical challenges and infrastructure",
        "product strategy and roadmap",
        "company values and mission",
        "recent projects and initiatives",
        "hiring process and expectations",
        "leadership and management style",
        "tools and technologies used",
        "growth and career development",
        "collaboration and cross-functional work",
    ]
    angle = random.choice(angles)
    query = f"{session['role_title']} {angle} at {session['company_name']}"  # varied search query
    results = hd.search(query, top_k=5)  # get relevant company content
    context_block = "\n\n".join(r["text"] for r in results)  # join chunks into one string
    # Pass previously asked questions so the AI avoids repeats
    prev_questions = session.get("asked_questions", [])
    question = await _generate_question(session["role_title"], context_block, session["q_count"], prev_questions)
    # Track asked questions
    if "asked_questions" not in active_sessions[req.session_id]:
        active_sessions[req.session_id]["asked_questions"] = []
    active_sessions[req.session_id]["asked_questions"].append(question)
    active_sessions[req.session_id]["q_count"] += 1  # increment question counter
    _save_session(req.session_id)  # persist updated count
    return {  # return question and metadata
        "question": question,  # the generated question
        "question_number": session["q_count"],  # which question this is
        "context_used": context_block,  # context chunks used to generate it
    }


@app.post("/quiz/answer")  # grades answer and writes weak areas to memory
async def submit_answer(req: AnswerRequest):
    """Grade an answer and write weak areas to HD memory. In: AnswerRequest. Out: {score, feedback, weak_area}."""
    session = active_sessions.get(req.session_id)  # pull from whiteboard
    if not session:  # not on whiteboard, try supabase
        session = _load_session(req.session_id)  # try loading from supabase
    if not session:  # not found anywhere
        raise HTTPException(status_code=404, detail="Session not found")  # clean 404
    grading = await _grade_answer(req.question, req.answer, req.context_used)  # grade via openai
    if grading["score"] < 7 and grading["weak_area"]:  # below passing and has a topic
        active_sessions[req.session_id]["weak_areas"].append(grading["weak_area"])  # track weak area
        weak_areas_text = "\n".join(f"- {w}" for w in active_sessions[req.session_id]["weak_areas"])  # format as list
        hd.fs_write_memory(  # write to hd agent memory
            f"/agent/prep_pilot_{req.session_id}.md",  # unique path per session
            f"# Weak Areas for {session['role_title']}\n\n{weak_areas_text}",  # markdown content
        )
    _save_session(req.session_id)  # persist updated weak areas
    return grading  # {score, feedback, weak_area}


class FeedbackRequest(BaseModel):
    turns: list[dict]  # [{role: 'ai'|'user', text: str}]


@app.post("/feedback/{session_id}")
async def generate_feedback(session_id: str, req: FeedbackRequest):
    """Analyze a voice interview transcript and return structured feedback."""
    session = active_sessions.get(session_id) or _load_session(session_id) or {}
    role_title = session.get("role_title", "the role")
    company_name = session.get("company_name", "the company")

    # Pair up turns into Q&A exchanges (AI asks, user answers)
    pairs = []
    i = 0
    while i < len(req.turns):
        if req.turns[i]["role"] == "ai":
            question = req.turns[i]["text"]
            answer = req.turns[i + 1]["text"] if i + 1 < len(req.turns) and req.turns[i + 1]["role"] == "user" else ""
            if answer:
                pairs.append({"question": question, "answer": answer})
            i += 2
        else:
            i += 1

    if not pairs:
        return {"answers": []}

    transcript_text = "\n".join(
        f"Q{idx+1}: {p['question']}\nA{idx+1}: {p['answer']}" for idx, p in enumerate(pairs)
    )
    prompt = f"""You are evaluating a mock interview for a {role_title} role at {company_name}.

TRANSCRIPT:
{transcript_text[:4000]}

For each Q&A pair, return a JSON array of objects with:
- question_number (int, 1-based)
- question (string)
- score (int 1-10)
- feedback (string, 1-2 sentences)
- weak_area (string or empty)

Return ONLY the JSON array, no markdown."""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            OPENAI_URL,
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
            json={"model": OPENAI_MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 1500, "temperature": 0.2},
            timeout=30,
        )
        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"].strip()
        answers = json.loads(raw)
    return {"answers": answers}


@app.get("/memory/{session_id}")  # returns session memory for the feedback page
async def get_memory(session_id: str):
    """Read HD agent memory for a session. In: session_id. Out: {content}."""
    if session_id not in active_sessions:  # validate session exists
        loaded = _load_session(session_id)  # try loading from supabase
        if not loaded:  # not found anywhere
            raise HTTPException(status_code=404, detail="Session not found")  # clean 404
    content = hd.fs_read(f"/agent/prep_pilot_{session_id}.md")  # read from hd filesystem
    return {"content": content}  # return memory content to frontend

# ─── OPENAI HELPERS ──────────────────────────────

async def _generate_question(role_title: str, context: str, q_number: int, prev_questions: list = None) -> str:
    """Generate one interview question grounded in context. In: role, context, q_number, prev_questions. Out: question string."""
    avoid_block = ""
    if prev_questions:
        avoid_list = "\n".join(f"- {q}" for q in prev_questions)
        avoid_block = f"\n\nDO NOT repeat or rephrase any of these previously asked questions:\n{avoid_list}\n"

    prompt = f"""You are an interviewer for a {role_title} role.
Based on this real company content, write ONE creative and unique interview question.
Ask about a different topic or angle than typical questions. Mix behavioral, technical, and situational questions.
{avoid_block}
CONTEXT:
{context[:2000]}

Return only the question. No preamble."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            OPENAI_URL,
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": OPENAI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 200,
                "temperature": 1.0,  # higher temp for more variety
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()


async def _grade_answer(question: str, answer: str, context: str) -> dict:  # calls openai to grade an answer
    """Grade an interview answer 1-10. In: question, answer, context. Out: {score, feedback, weak_area}."""
    prompt = f"""Grade this interview answer 1-10 based on the reference context.

QUESTION: {question}
ANSWER: {answer}
CONTEXT: {context[:1500]}

Return ONLY JSON:
{{"score": <int>, "feedback": "<2-3 sentences>", "weak_area": "<topic or empty string>"}}"""
    async with httpx.AsyncClient() as client:  # one-shot async http session
        response = await client.post(
            OPENAI_URL,  # openai chat completions endpoint
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},  # auth
            json={
                "model": OPENAI_MODEL,  # gpt-4o-mini
                "messages": [{"role": "user", "content": prompt}],  # single user message
                "max_tokens": 300,  # feedback needs a bit more space
                "temperature": 0.2,  # low temp for consistent json output
            },
        )
        response.raise_for_status()  # crash on 4xx/5xx
        raw = response.json()["choices"][0]["message"]["content"].strip()  # extract response text
        return json.loads(raw)  # parse json string into dict
