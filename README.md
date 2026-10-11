<<<<<<< HEAD
# DemocratAIze (NC)

North Carolina midterm candidate matching, with a frontend styled after
[hparupudi/democrataize](https://github.com/hparupudi/democrataize).

| Folder | Role |
| --- | --- |
| [`scripts/`](scripts/) | Python pipeline: NCSBE + GeoCoder + TIGER boundaries + FEC/Gemini incumbency + Gemini research/scoring → TigerData |
| [`backend/`](backend/) | Next.js API: Gemini scoring/explanations, TigerData candidate lookup |
| [`frontend/`](frontend/) | Next.js UI (DemocratAIze design): issues → priorities → address → matches + map |

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
=======
# Democratize Code

coonect to my github repository called democrataize

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a1e378e7-0202-423b-8725-2c4bc025437e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
>>>>>>> github/main
