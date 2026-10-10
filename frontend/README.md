# BallotMatch NC frontend

Voter UI (questionnaire, ranking, results map). Proxies `/api/*` to the backend.

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev    # http://localhost:3847
```

Start `backend/` on port 3848 first (or set `BACKEND_URL`).
