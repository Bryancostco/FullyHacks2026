import os  # to read env vars
from humandelta import HumanDelta  # official hd sdk

HD_API_KEY = os.getenv("HD_API_KEY", "")  # pulled from .env at runtime
hd = HumanDelta(api_key=HD_API_KEY)  # single sdk client, reused for all calls


# ─── INDEXES ─────────────────────────────────────

def create_index(url: str, name: str, max_pages: int = 50) -> dict:  # kicks off async crawl
    job = hd.indexes.create(url, max_pages=max_pages, name=name)  # start crawl, returns immediately
    return {"index_id": job.id, "status": job.status}  # return id and initial status


def poll_index(index_id: str) -> dict:  # single poll to check crawl status
    job = hd.indexes.get(index_id)  # fetch current job state from hd
    return {"index_id": job.id, "status": job.status}  # return id and current status


def wait_for_index(index_id: str) -> dict:  # blocks until crawl finishes
    job = hd.indexes.get(index_id)  # fetch job object first
    job.wait()  # sdk polls internally until terminal state
    return {"index_id": job.id, "status": job.status}  # return final state


# ─── SEARCH ──────────────────────────────────────

def search(query: str, top_k: int = 5, index_id: str | None = None) -> list[dict]:  # vector search over indexed content
    results = hd.search(query, top_k=top_k)  # run semantic search via sdk
    return [  # convert sdk objects to plain dicts for json serialization
        {
            "text": r.text,  # the actual content chunk
            "source_url": r.source_url,  # where it came from
            "score": r.score,  # relevance score
            "page_title": r.page_title,  # page title if available
        }
        for r in results  # one dict per result
    ]


# ─── DOCUMENTS ───────────────────────────────────

def upload_document(file_path: str, category: str = "") -> dict:  # upload a local file to hd doc library
    doc = hd.documents.upload(file_path, category=category or None)  # sdk handles multipart upload
    return {"doc_id": doc.doc_id, "doc_name": doc.doc_name}  # return doc reference


# ─── KB FILESYSTEM ───────────────────────────────

def fs_write_memory(path: str, content: str) -> bool:  # write to /agent/ memory
    if not path.startswith("/agent/"):  # hd only allows writes under /agent/
        raise ValueError(f"writes must be under /agent/, got: {path}")  # fail fast
    hd.fs.write(path, content)  # sdk posts to /v1/fs with op=write
    return True  # if no exception, write succeeded


def fs_read(path: str) -> str:  # read a file from hd kb filesystem
    return hd.fs.read(path)  # sdk posts to /v1/fs with op=read, returns content string
