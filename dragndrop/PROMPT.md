# PrepPilot — AI Assistant Prompt (paste this at the start of any new chat)

---

## Who I am

I'm Bryan Orozco, a CS junior at Cal State Fullerton. I'm building a hackathon project called **PrepPilot** for FullyHacks 2026. I know Python well but I've never built an API before — I've only *used* them. My frontend partner is handling the React/UI side. I need help with Python backend work.

## What I'm building

**PrepPilot** — an AI interview prep agent grounded in real company content.

**Flow:**
1. User enters a company URL + job title
2. App crawls the company site via **Human Delta API** (`POST /v1/indexes`)
3. User uploads their resume + the job description (`POST /v1/documents`)
4. App searches the indexed content (`POST /v1/search`) and uses OpenAI to generate interview questions *grounded in real company info*
5. User answers, OpenAI grades the answer against retrieved context
6. Weak areas get written to Human Delta's `/agent/` memory (`POST /v1/fs` with `op=write`) — so the next session drills those gaps

**The differentiator:** stateful agent memory. Most RAG demos are read-only. PrepPilot writes back to its own knowledge base to learn about the user over time.

## My tech stack

- **Backend:** Python + FastAPI + httpx (async HTTP client)
- **LLM:** OpenAI `gpt-4o-mini` (or Claude via Anthropic API)
- **Knowledge layer:** Human Delta API (`api.humandelta.ai`)
- **Frontend:** partner handles this (probably React or Next.js)

## Human Delta API — what you need to know

Base URL: `https://api.humandelta.ai`
Auth: `Authorization: Bearer hd_live_...`

Endpoints I use:
- `POST /v1/indexes` — start async crawl, returns `index_id` and `status: queued`
- `GET /v1/indexes/{id}` — poll until `status: completed`
- `POST /v1/documents` — multipart upload (PDF/MD/CSV/PNG/JPEG/TXT, max 10MB)
- `POST /v1/search` — vector search, params: `query`, `top_k`, `sources` (`["web"]` / `["documents"]` / both), `index_id`
- `POST /v1/fs` — virtual filesystem, ops: `shell` / `read` / `write` / `delete`
  - `/source/` = indexed websites, `/uploads/` = uploaded docs, `/agent/` = writable memory (requires `fs:write` scope)

## My code style — please follow these

- **snake_case** for all variable and function names
- **Inline end-of-line comments on every line of code** (not block comments above — right next to the line explaining what it does)
- Async everything in the backend (FastAPI + httpx, not requests)
- Type hints on function signatures
- No unnecessary abstractions — this is a 24-hour hackathon, keep it flat

Example of the comment style I want:
```python
async def search(query: str, top_k: int = 5) -> list[dict]:  # vector search wrapper
    payload = {"query": query, "top_k": top_k}  # build request body
    async with httpx.AsyncClient() as client:  # one-shot async client
        response = await client.post(url, json=payload, headers=headers)  # POST to hd
        return response.json().get("results", [])  # return just the results array
```

## What I usually need help with

- Writing new FastAPI routes (I'm still learning how to make APIs)
- Debugging async/await issues
- Prompt engineering for the question generation + grading steps
- Explaining *what my code does* so I can talk about it in the demo
- Connecting frontend concerns (CORS, request shapes) when my partner hits issues

## Ground rules for our chat

1. **Don't assume I know API terminology.** Explain endpoints, request/response bodies, HTTP methods when relevant.
2. **Don't dump giant code blocks unless I ask.** Prefer to walk me through one chunk at a time so I learn.
3. **When I share errors, explain what's happening, not just the fix.**
4. **Keep snake_case and inline comments consistent** — don't switch to camelCase or remove comments.
5. **If my approach is wrong, say so directly.** I'd rather rebuild than ship broken code.
6. **Be honest about tradeoffs.** If something is a hackathon hack vs. production, tell me.

## Current status

- [ ] Human Delta API key from dev.humandelta.ai
- [ ] OpenAI API key loaded in `.env`
- [ ] `hd_client.py` wrapper built (all endpoints covered)
- [ ] `main.py` FastAPI app with 8 routes
- [ ] Tested crawl + search end-to-end
- [ ] Frontend wired up with partner
- [ ] Demo script + recorded backup video
- [ ] Submission writeup

---

**Now here's my current question / what I'm stuck on:**

[type your question below this line]
