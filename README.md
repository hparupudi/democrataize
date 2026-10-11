# Democratize (NC)

North Carolina midterm candidate matching, with a frontend styled after
[hparupudi/democrataize](https://github.com/hparupudi/democrataize).

| Folder | Role |
| --- | --- |
| [`scripts/`](scripts/) | Python pipeline: NCSBE + GeoCoder + TIGER boundaries + FEC/Gemini incumbency + Gemini research/scoring → TigerData |
| [`backend/`](backend/) | Next.js API: Gemini scoring/explanations, TigerData candidate lookup |
| [`frontend/`](frontend/) | Next.js UI (Democratize design): issues → priorities → address → matches + map |

## Quick start

### 1. Ingest candidates

```bash
cd scripts
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env    # GEMINI_API_KEY, TIGERDATA_DATABASE_URL, FEC_API_KEY
python run.py
```

### 2. Run backend API

```bash
cd backend
cp .env.local.example .env.local
npm install
npm run dev             # :3848
```

### 3. Run frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev             # :3847  (proxies /api → backend)
```

Open http://localhost:3847

## API keys

| Variable | scripts | backend | frontend |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | ✓ | ✓ | |
| `TIGERDATA_DATABASE_URL` | ✓ | ✓ | |
| `FEC_API_KEY` | ✓ | | |
| `BACKEND_URL` (optional) | | | ✓ |
