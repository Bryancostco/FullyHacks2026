# PrepPilot - AI Mock Interview Tool

AI-powered mock interview prep tool that uses real company data to simulate phone screens with a voice AI recruiter.

## Prerequisites

- **Node.js** (v18+)
- **Python** (3.10+)
- **npm**

## Environment Variables

Create a `.env` file in the `prep_pilot/` directory:

```
OPENAI_API_KEY=your_openai_api_key
HUMANDELTA_API_KEY=your_humandelta_api_key
SUPABASE_URL=your_supabase_url        # optional
SUPABASE_KEY=your_supabase_anon_key    # optional
```

## Running the Backend

```bash
cd prep_pilot
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`.

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Running Both Together

Open two terminal windows:

**Terminal 1 (Backend):**
```bash
cd prep_pilot
pip install -r requirements.txt
uvicorn main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```

Then open the frontend URL shown in the terminal (usually `http://localhost:5173`).

## Tech Stack

- **Frontend:** React + Vite, Tailwind CSS v4, React Router
- **Backend:** FastAPI, Python
- **AI:** OpenAI Realtime API (voice), GPT-4o-mini (grading)
- **Data:** Human Delta API (company research/web scraping)
- **Database:** Supabase (optional, for session persistence)
