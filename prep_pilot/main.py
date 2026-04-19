import os
import json
import random
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
import tempfile
import hd_client as hd
from openaivoice import router as voice_router
from session_store import active_sessions

# ─── APP SETUP ───────────────────────────────────

app = FastAPI(title="PrepPilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router)

# ─── SUPABASE ────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
db = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── OPENAI CONFIG ───────────────────────────────

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL = "gpt-4o-mini"

# ─── REQUEST MODELS ──────────────────────────────

class SetupRequest(BaseModel):
    company_url: str
    company_name: str
    role_title: str
    max_pages: int = 30

class AskRequest(BaseModel):
    session_id: str

class AnswerRequest(BaseModel):
    session_id: str
    question: str
    answer: str
    context_used: str = ""

# ─── SUPABASE HELPERS ────────────────────────────

def _save_session(session_id: str) -> None:
    try:
        db.table("sessions").upsert(
            {"id": session_id, **active_sessions[session_id]}
        ).execute()
    except Exception as e:
        print(f"[warn] supabase save failed for {session_id}: {e}")


def _load_session(session_id: str) -> dict | None:
    try:
        result = db.table("sessions").select("*").eq("id", session_id).execute()
        if result.data:
            active_sessions[session_id] = result.data[0]
            return result.data[0]
    except Exception as e:
        print(f"[warn] supabase load failed for {session_id}: {e}")
    return None

# ─── ROUTES ──────────────────────────────────────

@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/setup")
async def setup(req: SetupRequest, background_tasks: BackgroundTasks):
    """Start a website crawl and create a session."""
    try:
        crawl = hd.create_index(req.company_url, req.company_name, req.max_pages)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Crawl failed: {e}")
    index_id = crawl["index_id"]
    active_sessions[index_id] = {
        "index_id": index_id,
        "role_title": req.role_title,
        "company_name": req.company_name,
        "index_status": "queued",
        "q_count": 0,
        "weak_areas": [],
    }
    _save_session(index_id)
    background_tasks.add_task(_crawl_in_background, index_id)
    return {"session_id": index_id, "status": "queued"}


async def _crawl_in_background(session_id: str) -> None:
    """Background task — runs the actual crawl."""
    try:
        final = await asyncio.to_thread(hd.wait_for_index, session_id)
        if session_id in active_sessions:
            active_sessions[session_id]["index_status"] = final["status"]
            _save_session(session_id)
    except Exception as e:
        print(f"[warn] background crawl failed for {session_id}: {e}")
        if session_id in active_sessions:
            active_sessions[session_id]["index_status"] = "failed"


@app.get("/status/{session_id}")
async def get_status(session_id: str):
    """Return current crawl status."""
    if session_id not in active_sessions:
        loaded = _load_session(session_id)
        if not loaded:
            raise HTTPException(status_code=404, detail="Session not found")
    session = active_sessions[session_id]
    status = session.get("index_status", "queued")
    return {"status": status, "ready": status == "completed"}


@app.post("/upload/{session_id}")
async def upload_file(session_id: str, category: str = "resume", file: UploadFile = File(...)):
    """Upload a file (stored locally for now)."""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    return {"success": True, "doc_id": tmp_path}


@app.post("/quiz/next")
async def next_question(req: AskRequest):
    """Generate the next interview question grounded in crawled content."""
    session = active_sessions.get(req.session_id)
    if not session:
        session = _load_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["index_status"] != "completed":
        return {"ready": False, "message": "Still crawling, poll /status"}

    # Get crawled content directly
    context_block = hd.get_all_content(session.get("index_id", req.session_id))

    prev_questions = session.get("asked_questions", [])
    question = await _generate_question(session["role_title"], context_block, session["q_count"], prev_questions)

    if "asked_questions" not in active_sessions[req.session_id]:
        active_sessions[req.session_id]["asked_questions"] = []
    active_sessions[req.session_id]["asked_questions"].append(question)
    active_sessions[req.session_id]["q_count"] += 1
    _save_session(req.session_id)
    return {
        "question": question,
        "question_number": session["q_count"],
        "context_used": context_block,
    }


@app.post("/quiz/answer")
async def submit_answer(req: AnswerRequest):
    """Grade an answer."""
    session = active_sessions.get(req.session_id)
    if not session:
        session = _load_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    grading = await _grade_answer(req.question, req.answer, req.context_used)
    if grading["score"] < 7 and grading["weak_area"]:
        active_sessions[req.session_id]["weak_areas"].append(grading["weak_area"])
        weak_areas_text = "\n".join(f"- {w}" for w in active_sessions[req.session_id]["weak_areas"])
        hd.fs_write_memory(
            f"/agent/prep_pilot_{req.session_id}.md",
            f"# Weak Areas for {session['role_title']}\n\n{weak_areas_text}",
        )
    _save_session(req.session_id)
    return grading


@app.get("/memory/{session_id}")
async def get_memory(session_id: str):
    """Read session memory."""
    if session_id not in active_sessions:
        loaded = _load_session(session_id)
        if not loaded:
            raise HTTPException(status_code=404, detail="Session not found")
    content = hd.fs_read(f"/agent/prep_pilot_{session_id}.md")
    return {"content": content}

class GradeInterviewRequest(BaseModel):
    session_id: str
    conversation: list
    role_title: str
    company_name: str
    duration_seconds: int = 0


@app.post("/grade-interview")
async def grade_interview(req: GradeInterviewRequest):
    """Grade a full voice interview conversation, save to Supabase, return results."""
    if not req.conversation or len(req.conversation) == 0:
        return {"score": 50, "strengths": [], "weakAreas": [], "transcripts": []}

    transcript_text = ""
    for turn in req.conversation:
        speaker = "Interviewer" if turn["role"] == "assistant" else "Candidate"
        transcript_text += f"{speaker}: {turn['text']}\n\n"

    prompt = f"""You are an expert interview coach. Analyze this mock interview transcript for a {req.role_title} role at {req.company_name}.

TRANSCRIPT:
{transcript_text[:6000]}

Return ONLY valid JSON with this exact structure:
{{
  "score": <overall score 1-100>,
  "strengths": [
    {{"title": "<strength area>", "detail": "<specific praise with examples from the transcript>"}}
  ],
  "weakAreas": [
    {{"title": "<weak area>", "detail": "<specific issue>", "tip": "<actionable improvement advice>"}}
  ],
  "transcripts": [
    {{"question": "<interviewer question>", "answer_summary": "<brief summary of candidate answer>", "score": <1-100>, "feedback": "<1-2 sentence feedback on this specific answer>"}}
  ]
}}

Rules:
- Score fairly based on the actual answers given
- Include 1-3 strengths with specific examples from the transcript
- Include 1-3 weak areas with actionable tips
- In transcripts, include each question-answer pair you can identify
- If the candidate gave short or unclear answers, reflect that in the score"""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            OPENAI_URL,
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1500,
                "temperature": 0.3,
            },
            timeout=30,
        )
        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"].strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
        results = json.loads(raw)

    # Save to Supabase
    try:
        db.table("interviews").insert({
            "session_id": req.session_id,
            "company_name": req.company_name,
            "role_title": req.role_title,
            "score": results.get("score", 0),
            "strengths": results.get("strengths", []),
            "weak_areas": results.get("weakAreas", []),
            "transcripts": results.get("transcripts", []),
            "conversation": req.conversation,
            "duration_seconds": req.duration_seconds,
        }).execute()
    except Exception as e:
        print(f"[warn] failed to save interview to supabase: {e}")

    return results


@app.get("/interviews")
async def list_interviews():
    """Return all past interviews, newest first."""
    try:
        r = db.table("interviews").select("*").order("created_at", desc=True).limit(50).execute()
        return r.data or []
    except Exception as e:
        print(f"[warn] failed to load interviews: {e}")
        return []


@app.get("/interviews/{interview_id}")
async def get_interview(interview_id: str):
    """Return a single interview by ID."""
    try:
        r = db.table("interviews").select("*").eq("id", interview_id).execute()
        if r.data:
            return r.data[0]
        raise HTTPException(status_code=404, detail="Interview not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/insights")
async def get_insights():
    """Return aggregated insights across all interviews."""
    try:
        r = db.table("interviews").select("*").order("created_at", desc=True).limit(50).execute()
        interviews = r.data or []
    except Exception as e:
        print(f"[warn] failed to load interviews for insights: {e}")
        interviews = []

    if not interviews:
        return {"avg_score": 0, "total_sessions": 0, "total_practice_seconds": 0, "scores": [], "skills": [], "recent": []}

    scores = [i["score"] for i in interviews if i.get("score")]
    avg_score = round(sum(scores) / len(scores)) if scores else 0
    total_seconds = sum(i.get("duration_seconds", 0) for i in interviews)

    # Aggregate strengths and weak areas across all interviews
    strength_counts = {}
    weak_counts = {}
    for i in interviews:
        for s in (i.get("strengths") or []):
            title = s.get("title", "")
            if title:
                strength_counts[title] = strength_counts.get(title, 0) + 1
        for w in (i.get("weak_areas") or []):
            title = w.get("title", "")
            if title:
                weak_counts[title] = weak_counts.get(title, 0) + 1

    # Build score trend (last 10)
    score_trend = [{"score": i["score"], "date": i["created_at"], "company": i.get("company_name", "")} for i in interviews[:10] if i.get("score")]
    score_trend.reverse()

    # Recent sessions for sidebar
    recent = [{
        "id": i["id"],
        "role_title": i.get("role_title", ""),
        "company_name": i.get("company_name", ""),
        "score": i.get("score", 0),
        "created_at": i.get("created_at", ""),
        "duration_seconds": i.get("duration_seconds", 0),
    } for i in interviews[:5]]

    return {
        "avg_score": avg_score,
        "total_sessions": len(interviews),
        "total_practice_seconds": total_seconds,
        "best_score": max(scores) if scores else 0,
        "scores": score_trend,
        "top_strengths": sorted(strength_counts.items(), key=lambda x: x[1], reverse=True)[:4],
        "top_weak_areas": sorted(weak_counts.items(), key=lambda x: x[1], reverse=True)[:4],
        "recent": recent,
    }


# ─── OPENAI HELPERS ──────────────────────────────

async def _generate_question(role_title: str, context: str, q_number: int, prev_questions: list = None) -> str:
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
                "temperature": 1.0,
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()


async def _grade_answer(question: str, answer: str, context: str) -> dict:
    prompt = f"""Grade this interview answer 1-10 based on the reference context.

QUESTION: {question}
ANSWER: {answer}
CONTEXT: {context[:1500]}

Return ONLY JSON:
{{"score": <int>, "feedback": "<2-3 sentences>", "weak_area": "<topic or empty string>"}}"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            OPENAI_URL,
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": OPENAI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 300,
                "temperature": 0.2,
            },
        )
        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"].strip()
        return json.loads(raw)
