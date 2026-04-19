# Simple web crawler — replaces Human Delta dependency
# Crawls a website, extracts text, stores in memory

import uuid
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor
from session_store import active_sessions

# ─── CRAWLER ─────────────────────────────────────

def create_index(url: str, name: str, max_pages: int = 30) -> dict:
    """Start a website crawl. Returns a session-like dict immediately."""
    index_id = str(uuid.uuid4())
    # Normalize URL
    if not url.startswith("http"):
        url = f"https://{url}"
    # Store crawl config — actual crawling happens in background task
    active_sessions[f"crawl_{index_id}"] = {
        "url": url,
        "max_pages": max_pages,
        "status": "queued",
        "pages": [],
    }
    return {"index_id": index_id, "status": "queued"}


def poll_index(index_id: str) -> dict:
    """Check crawl status."""
    crawl = active_sessions.get(f"crawl_{index_id}")
    if not crawl:
        return {"index_id": index_id, "status": "completed"}  # assume done if not found
    return {"index_id": index_id, "status": crawl["status"]}


def wait_for_index(index_id: str) -> dict:
    """Actually run the crawl (called from background task)."""
    crawl = active_sessions.get(f"crawl_{index_id}")
    if not crawl:
        return {"index_id": index_id, "status": "failed"}

    crawl["status"] = "running"
    try:
        pages = _crawl_site(crawl["url"], crawl["max_pages"])
        crawl["pages"] = pages
        crawl["status"] = "completed"
        print(f"[crawler] Crawled {len(pages)} pages from {crawl['url']}")
    except Exception as e:
        print(f"[crawler] Crawl failed: {e}")
        crawl["status"] = "failed"

    return {"index_id": index_id, "status": crawl["status"]}


def _crawl_site(start_url: str, max_pages: int) -> list[dict]:
    """Crawl a website starting from start_url, return list of {url, title, text}."""
    visited = set()
    to_visit = [start_url]
    pages = []
    domain = urlparse(start_url).netloc

    while to_visit and len(pages) < max_pages:
        url = to_visit.pop(0)
        if url in visited:
            continue
        visited.add(url)

        try:
            resp = requests.get(url, timeout=10, headers={
                "User-Agent": "PrepPilot/1.0 (interview prep bot)"
            })
            if resp.status_code != 200:
                continue
            if "text/html" not in resp.headers.get("content-type", ""):
                continue

            soup = BeautifulSoup(resp.text, "html.parser")

            # Remove script/style tags
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()

            title = soup.title.string.strip() if soup.title and soup.title.string else url
            text = soup.get_text(separator="\n", strip=True)

            # Skip near-empty pages
            if len(text) < 100:
                continue

            pages.append({
                "url": url,
                "title": title,
                "text": text[:3000],  # cap per page to avoid memory bloat
            })

            # Find links on the same domain
            for link in soup.find_all("a", href=True):
                href = urljoin(url, link["href"])
                parsed = urlparse(href)
                # Stay on the same domain, skip anchors/external
                if parsed.netloc == domain and href not in visited and not parsed.fragment:
                    clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
                    if clean_url not in visited:
                        to_visit.append(clean_url)

        except Exception as e:
            print(f"[crawler] Failed to fetch {url}: {e}")
            continue

    return pages


# ─── SEARCH (simple keyword matching) ───────────

def search(query: str, top_k: int = 5, index_id: str | None = None, sources=None) -> list[dict]:
    """Search crawled content. Simple keyword matching — no vector DB needed."""
    crawl = active_sessions.get(f"crawl_{index_id}") if index_id else None
    if not crawl or not crawl.get("pages"):
        return []

    query_words = set(query.lower().split())
    scored = []
    for page in crawl["pages"]:
        text_lower = page["text"].lower()
        # Score by how many query words appear in the page
        matches = sum(1 for w in query_words if w in text_lower)
        if matches > 0:
            scored.append({
                "text": page["text"],
                "source_url": page["url"],
                "score": matches / len(query_words),
                "page_title": page["title"],
            })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


def get_all_content(index_id: str) -> str:
    """Get all crawled text concatenated — for feeding directly to the voice agent."""
    crawl = active_sessions.get(f"crawl_{index_id}")
    if not crawl or not crawl.get("pages"):
        return ""
    chunks = []
    for page in crawl["pages"]:
        chunks.append(f"## {page['title']}\n{page['text'][:1500]}")
    # Cap total context to ~4000 chars
    combined = "\n\n".join(chunks)
    return combined[:4000]


# ─── STUBS (replace HD-specific features) ───────

def upload_document(file_path: str, category: str = "") -> dict:
    """Stub — document upload not needed without HD."""
    return {"doc_id": "local", "doc_name": file_path}


def fs_write_memory(path: str, content: str) -> bool:
    """Store memory in active_sessions instead of HD filesystem."""
    active_sessions[f"memory_{path}"] = content
    return True


def fs_read(path: str) -> str:
    """Read memory from active_sessions."""
    return active_sessions.get(f"memory_{path}", "")
