import os  # to read env vars
import asyncio  # to run sync calls in a thread
import httpx  # async http client
from fastapi import APIRouter, HTTPException  # APIRouter so this plugs into main.py
from pydantic import BaseModel  # request body validation
import hd_client as hd  # human delta wrapper for search
from session_store import active_sessions  # shared session state


router = APIRouter()  # gets attached to main.py's app, not a standalone app


class RealtimeSessionRequest(BaseModel):  # body for POST /realtime/session
    session_id: str | None = None  # optional — if provided, grounds AI in company context


@router.post("/realtime/session")  # creates an openai realtime session for live voice
async def get_realtime_session(req: RealtimeSessionRequest):
    """Create an OpenAI Realtime session token grounded in company context from Human Delta."""
    openai_key = os.getenv("OPENAI_API_KEY")  # pull key from .env
    if not openai_key:  # fail fast if key is missing
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set in .env")

    instructions = _build_instructions(None, None, None)  # default generic instructions

    if req.session_id and req.session_id in active_sessions:  # session exists, use it
        session = active_sessions[req.session_id]  # pull session data
        role_title = session.get("role_title", "the role")  # job they're prepping for
        company_name = session.get("company_name", "the company")  # company they're prepping for
        index_id = session.get("index_id")  # hd crawl index to search within

        context_block = ""  # fallback if search fails
        if index_id and session.get("index_status") == "completed":  # only search if crawl is done
            try:
                query = f"{role_title} interview questions {company_name} culture values engineering"
                # Run sync hd.search in a thread so it doesn't block the event loop
                # Only search crawled web pages, not uploaded resumes
                results = await asyncio.wait_for(
                    asyncio.to_thread(hd.search, query, top_k=5, index_id=index_id, sources=["web"]),
                    timeout=10,  # give HD 10 seconds max, then fall back to generic
                )
                context_block = "\n\n".join(r.get("text", "") for r in results)
            except asyncio.TimeoutError:
                print(f"[warn] hd search timed out for session {req.session_id}, using generic questions")
                context_block = ""
            except Exception as e:  # hd search failed, continue without context
                print(f"[warn] hd search failed in voice setup: {e}")
                context_block = ""

        instructions = _build_instructions(role_title, company_name, context_block)  # build grounded instructions

    try:
        async with httpx.AsyncClient() as client:  # one-shot async http session
            response = await client.post(
                "https://api.openai.com/v1/realtime/sessions",  # openai realtime endpoint
                headers={
                    "Authorization": f"Bearer {openai_key}",  # auth
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-realtime-preview",  # realtime model (latest stable)
                    "modalities": ["audio", "text"],  # support voice and text
                    "instructions": instructions,  # grounded system prompt
                    "voice": "alloy",  # ai voice style
                    "input_audio_transcription": {"model": "whisper-1"},  # transcribe user speech
                    "turn_detection": {  # auto-detect when user stops speaking
                        "type": "server_vad",
                        "threshold": 0.8,           # higher = less sensitive to background noise
                        "prefix_padding_ms": 500,    # buffer before speech
                        "silence_duration_ms": 1500, # wait longer before ending turn
                    },
                },
            )
            response.raise_for_status()  # crash on 4xx/5xx
            return response.json()  # return session token to frontend
    except Exception as e:  # catch any http errors
        raise HTTPException(status_code=500, detail=str(e))  # return clean error to frontend


def _build_instructions(role_title: str | None, company_name: str | None, context: str | None) -> str:
    """Build the AI interviewer system prompt. Grounded if context is provided, generic otherwise."""
    if not role_title or not company_name:  # no session info, use generic
        return (
            "You are Mentor, a professional technical interviewer. "
            "Conduct a mock phone screen. Ask one question at a time, wait for the answer, "
            "give brief encouraging feedback, then move to the next question. "
            "After 5-7 questions, wrap up the call naturally."
        )

    base = (
        f"You are Mentor, a Technical Recruiter conducting a phone screen for a {role_title} role at {company_name}. "
        f"Your job is to assess the candidate's fit for this specific role at {company_name}.\n\n"
        "RULES:\n"
        "- Ask ONE question at a time. Wait for the full answer before responding.\n"
        "- After each answer, give 1-2 sentences of brief, encouraging feedback, then ask your next question.\n"
        "- Your questions must be grounded in the real company information below — reference actual "
        f"{company_name} products, tech stack, values, or challenges when relevant.\n"
        "- After 5-7 questions, wrap up naturally: summarize the conversation and wish them well.\n"
        "- Be professional but warm. This is a phone screen, not an interrogation.\n\n"
    )

    if context and context.strip():  # we have real company data from human delta
        base += (
            f"REAL {company_name.upper()} COMPANY CONTEXT (from their website — use this to ground your questions):\n"
            f"{context[:3000]}\n\n"  # cap context length to stay within token limits
            f"Start the call by introducing yourself and asking the candidate to tell you about themselves."
        )
    else:  # crawl not done or search failed, use generic fallback
        base += (
            f"The company research is still loading. Ask strong general {role_title} interview questions "
            f"and mention {company_name} where relevant.\n\n"
            f"Start the call by introducing yourself and asking the candidate to tell you about themselves."
        )

    return base
