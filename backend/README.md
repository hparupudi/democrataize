# DemocratAIze backend

Next.js API server for scoring, candidate lookup, and explanations.

```bash
cd backend
cp .env.local.example .env.local
npm install
npm run dev    # http://localhost:3848
```

Required env: `GEMINI_API_KEY`, `TIGERDATA_DATABASE_URL`.

Routes: `/api/score-custom`, `/api/candidates`, `/api/explain`.
