#the bridge to Human Delta , thankful for all the helper functions

import os  # to read env vars
import time
from requests.exceptions import HTTPError
from humandelta import HumanDelta  # official hd sdk

HD_API_KEY = os.getenv("HD_API_KEY", "")  # pulled from .env at runtime
hd = HumanDelta(api_key=HD_API_KEY)  # single sdk client, reused for all calls


# ─── INDEXES ─────────────────────────────────────

def _retry(fn, retries=3, backoff=2):
    """Retry a function with exponential backoff on 429 rate limits."""
    for attempt in range(retries):
        try:
            return fn()
        except HTTPError as e:
            if e.response is not None and e.response.status_code == 429 and attempt < retries - 1:
                wait = backoff ** (attempt + 1)
                print(f"[warn] HD rate limited, retrying in {wait}s...")
                time.sleep(wait)
            else:
                if e.response is not None:
                    print(f"[error] HD API {e.response.status_code}: {e.response.text}")
                raise


def create_index(url: str, name: str, max_pages: int = 50) -> dict:  # kicks off async crawl
    """Start a website crawl. 
    In: url, name, max_pages. 
    Out: {index_id, status}."""
    job = hd.indexes.create(url, max_pages=max_pages, name=name)  # start crawl, returns immediately
    return {"index_id": job.id, "status": job.status}  # return id and initial status


def poll_index(index_id: str) -> dict:  # single poll to check crawl status
    """Check crawl status once. 
    In: index_id. 
    Out: {index_id, status}."""
    job = hd.indexes.get(index_id)  # fetch current job state from hd
    return {"index_id": job.id, "status": job.status}  # return id and current status


def wait_for_index(index_id: str) -> dict:  # blocks until crawl finishes
    """Block until crawl reaches a terminal state. 
    In: index_id. 
    Out: {index_id, status}."""
    job = hd.indexes.get(index_id)  # fetch job object first
    job.wait()  # sdk polls internally until terminal state
    return {"index_id": job.id, "status": job.status}  # return final state


# ─── SEARCH ──────────────────────────────────────

def search(query: str, top_k: int = 5, index_id: str | None = None, sources: list[str] | None = None) -> list[dict]:
    """Semantic search over indexed content.
    In: query, top_k, optional index_id, optional sources (["web"], ["documents"], or both).
    Out: list of result dicts."""
    # SDK's hd.search() doesn't support index_id/sources, so hit the API directly
    body = {"query": query, "top_k": top_k}
    if index_id:
        body["index_id"] = index_id  # scope search to a specific crawl index
    if sources:
        body["sources"] = sources  # "web" for crawled pages, "documents" for uploads
    raw = hd._post("/v1/search", body)  # use the SDK's internal _post helper
    if isinstance(raw, list):
        items = raw
    elif isinstance(raw, dict):
        items = raw.get("results") or raw.get("data") or []
    else:
        items = []
    return [  # convert to plain dicts for json serialization
        {
            "text": r.get("text", ""),
            "source_url": r.get("source_url", ""),
            "score": r.get("score", 0),
            "page_title": r.get("page_title"),
        }
        for r in items
    ]


# ─── DOCUMENTS ───────────────────────────────────

def upload_document(file_path: str, category: str = "") -> dict:  # upload a local file to hd doc library
    """Upload a local file to HD document library. 
    In: file_path, optional category. 
    Out: {doc_id, doc_name}."""
    doc = hd.documents.upload(file_path, category=category or None)  # sdk handles multipart upload ( thankfully)
    return {"doc_id": doc.doc_id, "doc_name": doc.doc_name}  # return doc reference


# ─── KB FILESYSTEM ───────────────────────────────

def fs_write_memory(path: str, content: str) -> bool:  # write to /agent/ memory
    """Write text to HD agent memory (stateful storage).
    In: /agent/ path, content string.
    Out: True on success."""
    if not path.startswith("/agent/"):  # hd only allows writes under /agent/
        raise ValueError(f"writes must be under /agent/, got: {path}")  # fail fast
    hd.fs.write(path, content)  # sdk posts to /v1/fs with op=write
    return True  # if no exception, write succeeded


def fs_read(path: str) -> str:  # read a file from hd kb filesystem
    """Read a file from HD filesystem. 
    In: path string. 
    Out: file content as string."""
    return hd.fs.read(path)  # sdk posts to /v1/fs with op=read, returns content string
