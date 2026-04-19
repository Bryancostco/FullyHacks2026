import os
import json
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv()

import hd_client as hd

app = FastAPI(title="PrepPilot API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for hackathon
active_sessions = {}

class SetupRequest(BaseModel):
    company_url: str
    company_name: str
    role_title: str
    max_pages: int = 30

class RealtimeSessionRequest(BaseModel):
    session_id: str | None = None

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/setup")
async def setup(req: SetupRequest, background_tasks: BackgroundTasks):
    try:
        crawl_response = await hd.create_index(req.company_url, req.company_name, req.max_pages)
        index_id = crawl_response.get("index_id")
        
        active_sessions[index_id] = {
            "index_id": index_id,
            "company_name": req.company_name,
            "role_title": req.role_title,
            "status": "indexing"
        }
        
        background_tasks.add_task(poll_until_ready, index_id)
        return {"session_id": index_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def poll_until_ready(session_id: str):
    final_job = await hd.wait_for_index(session_id)
    if session_id in active_sessions:
        active_sessions[session_id]["status"] = final_job.get("status")

@app.get("/status/{session_id}")
async def get_status(session_id: str):
    if session_id not in active_sessions:
        return {"status": "completed", "ready": True}
    
    session = active_sessions[session_id]
    return {
        "status": session["status"],
        "ready": session["status"] == "completed"
    }

@app.post("/realtime/session")
async def get_realtime_session(req: RealtimeSessionRequest):
    """
    Creates an ephemeral session for OpenAI Realtime API.
    Returns the ephemeral key for the frontend to use.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")

    instructions = """You are a professional technical interviewer named Mentor. 
    You are here to help candidates practice their interview skills.
    Be encouraging, professional, and provide constructive feedback if asked.
    Keep your responses concise.
    """

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-realtime-preview-2024-12-17",
                    "modalities": ["audio", "text"],
                    "instructions": instructions,
                },
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"Error creating realtime session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
