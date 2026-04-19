import os  # to read env vars
import asyncio  # for the polling loop
import httpx  # async http client

HD_BASE_URL = "https://api.humandelta.ai"  # hd base url
HD_API_KEY = os.getenv("HD_API_KEY", "")  # pulled from .env at runtime


def _get_headers() -> dict:  # builds auth headers for json requests
    
    return {"Authorization" : f"Bearer {HD_API_KEY}" , "Content-Type" : "application/json" }


# ─── INDEXES ─────────────────────────────────────

async def create_index(url: str, name: str, max_pages: int = 50) -> dict:  # kicks off async crawl
    payload = {
        "source_type" : "website",
        "name" : name, 
        "website" : {"url": url, "max_pages": max_pages}
    }
    async with httpx.AsyncClient() as client: 
        response = await client.post(
        f"{HD_BASE_URL}/v1/indexes",
        headers=_get_headers(),
        json=payload
        )
        response.raise_for_status()
        return response.json()

async def poll_index(index_id: str) -> dict:  # single poll to check crawl status
    
    async with httpx.AsyncClient() as client: 
        response = await client.get(
            f"{HD_BASE_URL}/v1/indexes/{index_id}",
            headers=_get_headers()
        )
        response.raise_for_status()
        return response.json()
    


async def wait_for_index(index_id: str, poll_interval: int = 5) -> dict:  # blocks until crawl finishes
    terminal_states = {"completed", "failed", "cancelled"}  # states we stop waiting at
    
    while True:
        job = await poll_index(index_id)
        if job.get("status") in terminal_states:
            return job
        await asyncio.sleep(poll_interval)


# ─── SEARCH ──────────────────────────────────────

async def search(query: str, top_k: int = 5, index_id: str | None = None) -> list[dict]:  # vector search
    payload = {
        "query" : query , 
        "top_k" : top_k
    }
    if index_id:  # only add if provided, scopes search to this company's index
        payload["index_id"] = index_id  
    # TODO 3: POST to f"{HD_BASE_URL}/v1/search", return response.json().get("results", [])
    async with httpx.AsyncClient() as client: 
        response = await client.get(
        f"{HD_BASE_URL}/v1/search"
        )
        response.raise_for_status()
        return response.json()


# ─── DOCUMENTS ───────────────────────────────────

async def upload_document(file_path: str, category: str = "") -> dict:  # upload file to hd
    # NOTE: multipart uploads don't use Content-Type: application/json
    # use headers = {"Authorization": f"Bearer {HD_API_KEY}"} only
    # TODO 1: open(file_path, "rb") and read bytes, get filename from os.path.basename
    # TODO 2: POST with files={"file": (filename, bytes)} for multipart
    # TODO 3: optional data={"category": category} if category is provided
    pass


# ─── KB FILESYSTEM ───────────────────────────────

async def fs_write_memory(path: str, content: str) -> bool:  # write to /agent/ memory
    if not path.startswith("/agent/"):  # hd only allows writes under /agent/
        raise ValueError(f"writes must be under /agent/, got: {path}")  # fail fast
    # TODO: POST to f"{HD_BASE_URL}/v1/fs" with body {"op": "write", "path": path, "content": content}
    # return response.json().get("ok", False)
    pass


async def fs_read(path: str) -> str:  # read a file from hd kb filesystem
    # TODO: POST to f"{HD_BASE_URL}/v1/fs" with body {"op": "read", "path": path}
    # return response.json().get("content", "")
    pass
