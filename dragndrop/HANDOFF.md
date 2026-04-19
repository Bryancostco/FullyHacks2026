# PrepPilot — Backend Build Guide

A step-by-step teaching doc for building the PrepPilot backend. This is **not** complete code — it's scaffolding with `# TODO` markers and explanations so you build it yourself and understand every piece.

---

## Table of Contents

1. [What is an API and why am I building one?](#1-what-is-an-api)
2. [FastAPI in 5 minutes](#2-fastapi-in-5-minutes)
3. [Project structure](#3-project-structure)
4. [Step 1 — Set up the project](#step-1--set-up-the-project)
5. [Step 2 — Build the Human Delta client](#step-2--build-the-human-delta-client)
6. [Step 3 — Build the FastAPI app](#step-3--build-the-fastapi-app)
7. [Step 4 — Add the core routes](#step-4--add-the-core-routes)
8. [Step 5 — Add OpenAI for question generation](#step-5--add-openai)
9. [Step 6 — Run and test your API](#step-6--run-and-test)
10. [How your frontend partner connects to this](#10-frontendbackend-connection)
11. [Debugging checklist](#11-debugging-checklist)

---

## 1. What is an API

Think of an API as a **waiter at a restaurant**. Your frontend is the customer, the backend is the kitchen. The customer doesn't walk into the kitchen and cook — they tell the waiter "I want a burger," the waiter takes it to the kitchen, and brings back food. The API is that waiter.

**In code terms**, an API is a program that:
- Listens on a URL (like `http://localhost:8000`)
- Accepts specific requests at specific paths (`/setup`, `/search`, etc.)
- Each path accepts a specific HTTP method (`GET` or `POST` usually)
- Does some work (calls Human Delta, calls OpenAI, etc.)
- Returns data as JSON

**You've used APIs** — every time you call Human Delta with `httpx.post(...)`, you're the customer. **You're about to build one** — FastAPI makes your Python functions callable over HTTP so your frontend partner can hit them from the browser.

### The mental model

```
[Frontend (React)]  ←→  [Your FastAPI backend]  ←→  [Human Delta API]
                                                ←→  [OpenAI API]
```

Your backend sits in the middle. The frontend never talks to Human Delta directly — it goes through you. This is good because:
- Your API keys stay on the server (never exposed to browser)
- You can add your own logic between the frontend and external services
- The frontend has a simpler, cleaner surface to work with

---

## 2. FastAPI in 5 minutes

FastAPI turns Python functions into web endpoints with decorators. That's basically it.

```python
from fastapi import FastAPI  # import the framework

app = FastAPI()  # create the app instance

@app.get("/hello")  # ← this decorator says "when someone GETs /hello, run this function"
async def say_hello():  # just a normal async function
    return {"message": "hi"}  # returning a dict → fastapi converts it to json automatically
```

**That's a working API.** Run it with `uvicorn main:app --reload` and go to `http://localhost:8000/hello` in your browser — you'll see `{"message": "hi"}`.

### The 4 concepts you'll use constantly

**1. Decorators define routes.** `@app.get(...)`, `@app.post(...)`, `@app.delete(...)`. These correspond to the HTTP methods the frontend will use.

**2. Pydantic models validate request bodies.** When the frontend sends JSON in a POST request, you define what shape it should be:
```python
from pydantic import BaseModel

class SetupRequest(BaseModel):  # defines the shape of incoming data
    company_url: str  # required string
    max_pages: int = 30  # optional, defaults to 30

@app.post("/setup")
async def setup(req: SetupRequest):  # fastapi automatically parses JSON → SetupRequest
    return {"got_url": req.company_url}  # access fields like normal python objects
```
If the frontend sends wrong data, FastAPI returns a 422 error automatically. You don't write validation.

**3. Path parameters come from the URL.** `{session_id}` in the path becomes a function arg:
```python
@app.get("/status/{session_id}")  # {session_id} is a placeholder in the URL
async def status(session_id: str):  # same name in the function = populated from URL
    return {"id": session_id}  # GET /status/abc123 → session_id = "abc123"
```

**4. CORS middleware lets the frontend call you.** Browsers block cross-origin requests by default (security). You add middleware to allow your partner's frontend origin.

---

## 3. Project structure

```
prep_pilot/
├── main.py              ← FastAPI app, all your routes live here
├── hd_client.py         ← Wrapper around Human Delta API calls
├── requirements.txt     ← Python dependencies
├── .env                 ← Your API keys (NEVER commit this)
├── .env.example         ← Template showing what .env should have
└── .gitignore           ← Must include .env to avoid leaking keys
```

Flat structure on purpose. Don't over-engineer for a 24-hour hackathon.

---

## Step 1 — Set up the project

```bash
# create project folder
mkdir prep_pilot && cd prep_pilot

# create virtual environment so your global python stays clean
python -m venv venv
source venv/bin/activate  # mac/linux
# venv\Scripts\activate   # windows

# install everything you need
pip install fastapi uvicorn httpx python-dotenv python-multipart pydantic

# freeze it for your partner / deployment
pip freeze > requirements.txt
```

**Create `.env`** (never commit this file):
```
HD_API_KEY=hd_live_your_key_here
OPENAI_API_KEY=sk-your_key_here
```

**Create `.gitignore`**:
```
.env
venv/
__pycache__/
*.pyc
```

**What each library does:**
- `fastapi` — the framework (creates the API)
- `uvicorn` — the server that actually runs FastAPI (think: apache/nginx but for python)
- `httpx` — async HTTP client, like `requests` but supports `async/await`
- `python-dotenv` — reads your `.env` file into `os.getenv()`
- `python-multipart` — lets FastAPI accept file uploads
- `pydantic` — data validation (comes with FastAPI but worth listing)

---

## Step 2 — Build the Human Delta client

This file wraps every HD endpoint as a clean Python function. Your FastAPI routes will import these instead of dealing with HTTP directly.

**File: `hd_client.py`**

```python
import os  # to read env vars
import asyncio  # for the polling loop
import httpx  # async http client

HD_BASE_URL = "https://api.humandelta.ai"  # hd base url from the docs
HD_API_KEY = os.getenv("HD_API_KEY", "")  # pulled from .env

def _get_headers() -> dict:  # helper to build auth headers once
    # TODO: return a dict with "Authorization": f"Bearer {HD_API_KEY}" and Content-Type: application/json
    pass


# ─── INDEXES ─────────────────────────────────────

async def create_index(url: str, name: str, max_pages: int = 50) -> dict:
    """kicks off an async crawl, returns index_id immediately"""
    # TODO 1: build the payload dict with source_type="website" and website={url, max_pages}
    # TODO 2: use httpx.AsyncClient() to POST to f"{HD_BASE_URL}/v1/indexes"
    # TODO 3: return response.json() — it contains index_id, status, etc.
    pass


async def poll_index(index_id: str) -> dict:
    """single poll of an index job — check status"""
    # TODO: GET f"{HD_BASE_URL}/v1/indexes/{index_id}" and return the JSON
    # the response has status ("queued"/"running"/"completed") and stages breakdown
    pass


async def wait_for_index(index_id: str, poll_interval: int = 5) -> dict:
    """blocks until status is terminal (completed/failed/cancelled)"""
    terminal_states = {"completed", "failed", "cancelled"}  # what we're waiting for
    # TODO: in a while loop, call poll_index, check status, return if terminal
    # otherwise await asyncio.sleep(poll_interval) and loop again
    pass


# ─── SEARCH ──────────────────────────────────────

async def search(query: str, top_k: int = 5, index_id: str | None = None) -> list[dict]:
    """vector search over indexed web pages + uploaded docs"""
    # TODO 1: build payload with query and top_k
    # TODO 2: if index_id is provided, add it to the payload
    # TODO 3: POST to /v1/search, return response.json()["results"]
    pass


# ─── DOCUMENTS ───────────────────────────────────

async def upload_document(file_path: str, category: str = "") -> dict:
    """upload a local PDF/MD/CSV to the hd doc library"""
    # NOTE: multipart uploads don't use Content-Type: application/json
    # use headers = {"Authorization": f"Bearer {HD_API_KEY}"} only
    # TODO 1: open(file_path, "rb") and read bytes
    # TODO 2: use httpx's files={"file": (filename, bytes)} param for multipart
    # TODO 3: optional data={"category": category} if category provided
    pass


# ─── KB FILESYSTEM ───────────────────────────────

async def fs_write_memory(path: str, content: str) -> bool:
    """write to /agent/ memory (requires fs:write scope on the API key)"""
    if not path.startswith("/agent/"):  # hd only allows writes under /agent/
        raise ValueError(f"writes must be under /agent/, got: {path}")  # fail fast
    # TODO: POST to /v1/fs with body {"op": "write", "path": path, "content": content}
    # return response.json().get("ok", False)
    pass


async def fs_read(path: str) -> str:
    """read a file from the hd kb filesystem"""
    # TODO: POST to /v1/fs with body {"op": "read", "path": path}
    # return response.json().get("content", "")
    pass
```

### Pattern to follow for every HD function

Every wrapper follows the same 4-line shape:
```python
async with httpx.AsyncClient() as client:  # open async http session
    response = await client.post(url, headers=..., json=payload)  # hit the endpoint
    response.raise_for_status()  # crashes on 4xx/5xx so you see errors immediately
    return response.json()  # parse json and return
```

**Once you get one function working, the rest are copy-paste-and-tweak.**

---

## Step 3 — Build the FastAPI app

**File: `main.py`**

Start with the absolute minimum and grow from there.

```python
import os  # env vars
from dotenv import load_dotenv  # loads .env into os.getenv

load_dotenv()  # MUST run before any import that calls os.getenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks  # core fastapi
from fastapi.middleware.cors import CORSMiddleware  # lets frontend call us
from pydantic import BaseModel  # request body validation

import hd_client as hd  # your wrapper from step 2

app = FastAPI(title="PrepPilot API")  # create the app

# CORS — critical for frontend connection
app.add_middleware(
    CORSMiddleware,  # the middleware class
    # TODO: set allow_origins to your partner's frontend url
    # during dev, use ["http://localhost:3000", "http://localhost:5173"]
    # for demo, if deployed, add the deployed frontend url too
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,  # allow cookies/auth headers
    allow_methods=["*"],  # allow GET/POST/DELETE/etc
    allow_headers=["*"],  # allow any request headers
)

@app.get("/health")  # simple health check route
async def health():  # no params needed
    return {"ok": True}  # just confirms the server is alive
```

**Run it now, before writing anything else:**
```bash
uvicorn main:app --reload
```

Open `http://localhost:8000/health` in your browser. You should see `{"ok": true}`. **If this works, your API is live.** Also try `http://localhost:8000/docs` — FastAPI auto-generates a Swagger UI where you can test every route.

---

## Step 4 — Add the core routes

Each route is just a Python function with a decorator. Build them one at a time, test each in `/docs` before moving on.

### 4a. Define your request bodies (Pydantic models)

```python
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
    context_used: str  # required — the context that backed the question
```

**Why Pydantic matters:** if the frontend sends `{"company_url": 123}` (a number instead of string), FastAPI automatically returns a 422 error with a clear message. You don't write that validation.

### 4b. Session storage

For a hackathon, a plain dict works:
```python
active_sessions: dict[str, dict] = {}  # session_id → {index_id, role_title, ...}
# NOTE: this resets when the server restarts. Fine for demo, not production.
```

### 4c. The `/setup` route — kick off a crawl

```python
@app.post("/setup")  # POST because we're creating something
async def setup(req: SetupRequest, background_tasks: BackgroundTasks):
    """start crawling the company site, return session_id immediately"""
    # TODO 1: call await hd.create_index(req.company_url, req.company_name, req.max_pages)
    # TODO 2: extract index_id from the response (crawl_response["index_id"])
    # TODO 3: store session info in active_sessions[index_id] = {index_id, role_title, q_count: 0, weak_areas: []}
    # TODO 4: add a background task to poll hd until done (see pattern below)
    # TODO 5: return {"session_id": index_id, "status": "queued"}
    pass
```

**Why BackgroundTasks?** Crawls take minutes. If your route waits for completion, the HTTP request times out. Instead, you return immediately with `session_id` and poll in the background. The frontend polls `/status/{id}` to know when it's ready.

```python
async def _poll_until_ready(session_id: str, index_id: str):  # runs in background
    final_job = await hd.wait_for_index(index_id)  # blocks until terminal
    if session_id in active_sessions:  # guard stale sessions
        active_sessions[session_id]["index_status"] = final_job.get("status")  # update state
```

### 4d. The `/status/{session_id}` route — let frontend poll progress

```python
@app.get("/status/{session_id}")  # GET because we're reading, not changing
async def get_status(session_id: str):
    if session_id not in active_sessions:  # validate the session exists
        raise HTTPException(status_code=404, detail="Session not found")  # proper 404
    # TODO 1: call hd.poll_index(active_sessions[session_id]["index_id"])
    # TODO 2: return {status, current_phase, pages_indexed, ready: status == "completed"}
```

**HTTPException** is how FastAPI returns error responses. `raise HTTPException(status_code=404, detail="...")` becomes a clean 404 response the frontend can handle.

### 4e. The `/quiz/next` route — generate a grounded question

```python
@app.post("/quiz/next")
async def next_question(req: AskRequest):
    session = active_sessions.get(req.session_id)  # pull session
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("index_status") != "completed":  # crawl must be done
        return {"ready": False, "message": "Still indexing, poll /status"}

    # TODO 1: build a search query based on session.role_title and q_count
    # TODO 2: call hd.search(query, top_k=5, index_id=session["index_id"])
    # TODO 3: join result texts into a context_block string
    # TODO 4: call _generate_question(role, context_block) → returns question string
    # TODO 5: increment session["q_count"]
    # TODO 6: return {question, question_number, context_used, sources}
    pass
```

### 4f. The `/quiz/answer` route — grade and update memory

```python
@app.post("/quiz/answer")
async def submit_answer(req: AnswerRequest):
    session = active_sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # TODO 1: call _grade_answer(req.question, req.answer, req.context_used)
    # TODO 2: if score < 7 and there's a weak_area, append to session["weak_areas"]
    # TODO 3: also call hd.fs_write_memory(f"/agent/prep_pilot_{session_id}.md", ...)
    # TODO 4: return {score, feedback, weak_area}
    pass
```

This is the **star of your demo** — the `fs_write_memory` call is what makes PrepPilot stateful. Make sure this works before anything else is polished.

---

## Step 5 — Add OpenAI

Helper functions that call OpenAI for question generation and grading. These aren't routes — just regular async functions your routes call internally.

```python
import httpx  # same client
import json  # to parse openai responses

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")  # from .env
OPENAI_URL = "https://api.openai.com/v1/chat/completions"  # chat endpoint
OPENAI_MODEL = "gpt-4o-mini"  # cheap + fast for hackathons

async def _generate_question(role_title: str, context: str, q_number: int) -> str:
    prompt = f"""You are an interviewer for a {role_title} role.
Based on this real company content, write ONE interview question.

CONTEXT:
{context[:2000]}

Return only the question. No preamble."""  # tight prompt, no fluff

    # TODO 1: build headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    # TODO 2: build payload with model, messages=[{"role": "user", "content": prompt}], max_tokens=200, temperature=0.7
    # TODO 3: POST to OPENAI_URL
    # TODO 4: extract data["choices"][0]["message"]["content"].strip()
    pass


async def _grade_answer(question: str, answer: str, context: str) -> dict:
    prompt = f"""Grade this interview answer 1-10 based on the reference context.

QUESTION: {question}
ANSWER: {answer}
CONTEXT: {context[:1500]}

Return ONLY JSON:
{{"score": <int>, "feedback": "<2-3 sentences>", "weak_area": "<topic or empty>"}}"""

    # TODO 1: same openai POST pattern as above
    # TODO 2: parse the response content with json.loads()
    # TODO 3: return the parsed dict
    pass
```

**Prompt engineering tip:** Force JSON output with `Return ONLY JSON` and give the exact shape. `gpt-4o-mini` follows this reliably if the prompt is tight.

---

## Step 6 — Run and test

```bash
uvicorn main:app --reload
```

**Test in Swagger UI** (`http://localhost:8000/docs`):
1. Open `/setup`, click "Try it out", fill in a real company URL
2. Copy the returned `session_id`
3. Poll `/status/{session_id}` until `ready: true` (takes 1-3 min)
4. Hit `/quiz/next` with the `session_id`, read the question
5. Hit `/quiz/answer` with your answer, check the score

**If something breaks**, the uvicorn terminal shows the full traceback. Read it top to bottom.

### Testing with curl (for scripting / your partner)

```bash
# create session
curl -X POST http://localhost:8000/setup \
  -H "Content-Type: application/json" \
  -d '{"company_url": "https://avidbio.com", "company_name": "Avid", "role_title": "AI Intern"}'

# poll status
curl http://localhost:8000/status/idx_01j9...

# ask a question
curl -X POST http://localhost:8000/quiz/next \
  -H "Content-Type: application/json" \
  -d '{"session_id": "idx_01j9..."}'
```

---

## 10. Frontend/backend connection

This is the section to **send to your partner**. They don't need to know Python — just how to call your API.

### The contract

Your backend runs on `http://localhost:8000` during development. Every endpoint accepts/returns JSON. The frontend uses `fetch()` (built into browsers) or `axios` to call your routes.

### Example: frontend calling your `/setup` route (JavaScript)

```javascript
// partner's frontend code — any framework
async function startPrep(companyUrl, roleName) {
  const response = await fetch("http://localhost:8000/setup", {  // your backend
    method: "POST",  // matches @app.post in fastapi
    headers: { "Content-Type": "application/json" },  // tells backend it's json
    body: JSON.stringify({  // body must match your SetupRequest pydantic model
      company_url: companyUrl,
      company_name: "Avid Bioservices",
      role_title: roleName,
      max_pages: 30,
    }),
  });
  const data = await response.json();  // { session_id, status, message }
  return data.session_id;  // store this in frontend state
}
```

### Example: polling status with GET

```javascript
async function pollStatus(sessionId) {
  const response = await fetch(`http://localhost:8000/status/${sessionId}`);  // no method = GET
  const data = await response.json();  // { status, current_phase, ready }
  return data.ready;  // boolean
}
```

### What your partner needs from you

Give them this contract sheet:

| Endpoint | Method | Request body | Response |
|---|---|---|---|
| `/setup` | POST | `{company_url, company_name, role_title, max_pages?}` | `{session_id, status}` |
| `/status/{session_id}` | GET | — | `{status, current_phase, pages_indexed, ready}` |
| `/upload/{session_id}?category=resume` | POST | multipart file | `{success, doc_id}` |
| `/quiz/next` | POST | `{session_id}` | `{question, question_number, context_used, sources}` |
| `/quiz/answer` | POST | `{session_id, question, answer, context_used}` | `{score, feedback, weak_area}` |
| `/memory/{session_id}` | GET | — | `{path, content}` |

### The CORS thing (the #1 frontend/backend bug)

If your partner sees `CORS error` or `blocked by CORS policy` in their browser console, it means their frontend URL isn't in your `allow_origins` list. **Fix it in `main.py`:**

```python
allow_origins=[
    "http://localhost:3000",  # create-react-app default
    "http://localhost:5173",  # vite default
    "http://localhost:5174",  # vite fallback
    # add their deployed url when they deploy
],
```

Restart uvicorn after changing this.

### Where to deploy for the demo

- Backend: **Railway** or **Render** (free tier, one-click deploy from GitHub)
- Frontend: **Vercel** or **Netlify** (your partner probably knows these)
- Update CORS `allow_origins` with the deployed frontend URL before demo

---

## 11. Debugging checklist

When something's broken, work down this list:

- [ ] Is uvicorn running? Check the terminal for errors.
- [ ] Did you `load_dotenv()` **before** importing `hd_client`? If not, `HD_API_KEY` will be empty.
- [ ] Is your `.env` file in the same folder as `main.py`?
- [ ] Check `/docs` — can you hit the route there? If yes, problem is in the frontend. If no, problem is in the route.
- [ ] `response.raise_for_status()` in your httpx calls — without this, failed HTTP calls silently return garbage.
- [ ] Is Human Delta's crawl actually completing? Hit `GET /v1/indexes/{id}` directly and check `status`.
- [ ] Are you `await`-ing every async function? Forgetting `await` returns a coroutine object instead of data.
- [ ] CORS errors in browser console = update `allow_origins` and restart uvicorn.
- [ ] OpenAI returning weird JSON? Lower `temperature` to 0.2 and tighten the prompt's "Return ONLY JSON" instruction.

---

## One more thing — what to build first

Do these in order, don't skip ahead:

1. **Health check route.** Prove `uvicorn` runs.
2. **One HD wrapper function** (`create_index`). Prove your key works.
3. **`/setup` route.** Prove frontend → your API → HD works end-to-end.
4. **`/status` route.** Prove polling works.
5. **`/quiz/next` route (without OpenAI).** Return raw search results first. Prove retrieval works before generation.
6. **Add OpenAI to `/quiz/next`.** Prove generation works.
7. **`/quiz/answer` with memory write.** This is your demo moment.
8. **Polish everything else.**

If you finish through step 7 by hour 18, you have a working demo. Everything after that is polish.

Good luck. Ship it.
