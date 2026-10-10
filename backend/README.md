# BallotMatch NC backend

Next.js API server for voice, scoring, candidate lookup, and explanations.

```bash
cd backend
cp .env.local.example .env.local
npm install
npm run dev    # http://localhost:3848
```

Required env: `GEMINI_API_KEY`, `TIGERDATA_DATABASE_URL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`.

Routes: `/api/tts`, `/api/stt`, `/api/score-custom`, `/api/candidates`, `/api/explain`.
