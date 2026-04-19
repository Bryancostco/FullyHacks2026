import os  # to read env vars
import asyncio  # to run sync calls in a thread
import httpx  # async http client
from fastapi import APIRouter, HTTPException  # APIRouter so this plugs into main.py
from pydantic import BaseModel  # request body validation
import hd_client as hd  # crawler wrapper
from session_store import active_sessions  # shared session state


router = APIRouter()


class RealtimeSessionRequest(BaseModel):
    session_id: str | None = None


@router.post("/realtime/session")
async def get_realtime_session(req: RealtimeSessionRequest):
    """Create an OpenAI Realtime session token grounded in crawled company content."""
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set in .env")

    instructions = _build_instructions(None, None, None)

    if req.session_id and req.session_id in active_sessions:
        session = active_sessions[req.session_id]
        role_title = session.get("role_title", "the role")
        company_name = session.get("company_name", "the company")
        index_id = session.get("index_id")

        context_block = ""
        if index_id and session.get("index_status") == "completed":
            try:
                # Get all crawled content directly — no external API needed
                context_block = await asyncio.to_thread(hd.get_all_content, index_id)
            except Exception as e:
                print(f"[warn] failed to get crawled content: {e}")
                context_block = ""

        instructions = _build_instructions(role_title, company_name, context_block)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-realtime-preview",
                    "modalities": ["audio", "text"],
                    "instructions": instructions,
                    "voice": "alloy",
                    "input_audio_transcription": {"model": "whisper-1", "language": "en"},
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.8,
                        "prefix_padding_ms": 500,
                        "silence_duration_ms": 1500,
                    },
                },
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _build_instructions(role_title, company_name, context):
    """Build the AI interviewer system prompt."""
    if not role_title or not company_name:
        return (
            "You are Mentor, a professional technical interviewer. "
            "Conduct a mock phone screen. Ask one question at a time, wait for the answer, "
            "give brief encouraging feedback, then move to the next question. "
            "After 5-7 questions, wrap up the call naturally. "
            "Always speak in English only."
        )

    base = (
        f"You are Mentor, a Technical Recruiter conducting a phone screen for a {role_title} role at {company_name}. "
        f"Your job is to assess the candidate's fit for this specific role at {company_name}.\n\n"
        "RULES:\n"
        "- Always speak in English only.\n"
        "- Ask ONE question at a time. Wait for the full answer before responding.\n"
        "- After each answer, give 1-2 sentences of brief, encouraging feedback, then ask your next question.\n"
        "- Your questions must be grounded in the real company information below — reference actual "
        f"{company_name} products, tech stack, values, or challenges when relevant.\n"
        "- After 5-7 questions, wrap up naturally: summarize the conversation and wish them well.\n"
        "- Be professional but warm. This is a phone screen, not an interrogation.\n\n"
    )

    if context and context.strip():
        base += (
            f"REAL {company_name.upper()} COMPANY CONTEXT (from their website — use this to ground your questions):\n"
            f"{context[:4000]}\n\n"
            f"Start the call by introducing yourself and asking the candidate to tell you about themselves."
        )
    else:
        base += (
            f"The company research is still loading. Ask strong general {role_title} interview questions "
            f"and mention {company_name} where relevant.\n\n"
            f"Start the call by introducing yourself and asking the candidate to tell you about themselves."
        )

    return base
