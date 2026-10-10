# BallotMatch NC

North Carolina midterm candidate matching: a Python ingestion pipeline plus a Next.js website in the same repository.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/nc_candidates/`, `run.py` | Ingest candidates, GeoCoder/TIGER boundaries, Gemini research & issue scores → TigerData |
| `web/` | Voter-facing site: questionnaire, voice, ranking, address lookup, match results + map |
| `config/questionnaire.yaml` | Nine scored issues (Abortion excluded) |
| `sql/schema.sql` | TigerData schema |

## Website (`web/`)

Flow:

1. **Questionnaire** — Side A / Side B / Neutral / **C custom**, with ElevenLabs read-aloud and speech-to-text  
2. **Address** — Census GeoCoder + TigerData candidate lookup for the voter’s districts  
3. **Rank issues** — drag-and-drop; weight = `10 − rank`  
4. **Results** — races sorted highest→lowest jurisdiction, map zoom, match %, stance scale, Gemini explanation, grassroots links  

Match formula: weighted average of squared stance distances, converted to a 0–100% match (`max distance²` on [-2, 2] is 16).

### Run the site

```bash
cd web
cp .env.local.example .env.local   # fill real keys
npm install
npm run dev                        # http://localhost:3847
```

Required env vars (no fallbacks): `GEMINI_API_KEY`, `TIGERDATA_DATABASE_URL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`.

## Pipeline (root)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env               # fill GEMINI_API_KEY, TIGERDATA_DATABASE_URL, FEC_API_KEY
python run.py
```

Populate TigerData before using address matching on the website.
