import os  # to read env vars
import httpx  # async http client
from fastapi import APIRouter, HTTPException  # APIRouter so this plugs into main.py
from pydantic import BaseModel  # request body validation

router = APIRouter()  # gets attached to main.py's app, not a standalone app


class RealtimeSessionRequest(BaseModel):  # body for POST /realtime/session
    session_id: str | None = None  # optional, for tracking purposes


@router.post("/realtime/session")  # creates an openai realtime session for live voice
async def get_realtime_session(req: RealtimeSessionRequest):
    """Create an OpenAI Realtime session token for live voice interviews."""
    openai_key = os.getenv("OPENAI_API_KEY")  # pull key from .env
    if not openai_key:  # fail fast if key is missing
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set in .env")
    try:
        async with httpx.AsyncClient() as client:  # one-shot async http session
            response = await client.post(
                "https://api.openai.com/v1/realtime/sessions",  # openai realtime endpoint
                headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},  # auth
                json={
                    "model": "gpt-4o-realtime-preview-2024-12-17",  # realtime model
                    "modalities": ["audio", "text"],  # support voice and text
                    "instructions": "You are a professional technical interviewer named Mentor. Be concise and challenging.",  # system prompt
                },
            )
            response.raise_for_status()  # crash on 4xx/5xx
            return response.json()  # return session token to frontend
    except Exception as e:  # catch any http errors
        raise HTTPException(status_code=500, detail=str(e))  # return clean error to frontend
