# NC Candidate Research Pipeline

Python pipeline that collects major-party North Carolina candidates for the 2026 general election, attaches Census district boundaries, researches each candidate with Google Gemini (Google Search grounding), scores them on nine political issues, and stores everything in a TigerData (TimescaleDB/PostgreSQL) database.

Abortion is intentionally excluded from scoring.

## What it collects

For Democratic, Republican, Libertarian, Green, and Independent/Unaffiliated candidates in:

- US Senate
- US House
- NC House
- NC Senate
- Statewide executive offices (when on the ballot)
- Statewide judicial offices elected by voters (NC Supreme Court, NC Court of Appeals)

Stored fields include:

- Candidate name, party, contest, district
- Candidate photo URL (discovered via Gemini web search)
- Census GeoCoder lat/lon + geography lookup from the candidate address
- District GeoJSON boundaries from Census TIGERweb (map-ready)
- Social media posts, campaign platform, Wikipedia/wiki page, speech transcripts
- Issue scores from **-2** (strongly Side A) to **2** (strongly Side B) for each of the nine questionnaire issues

## Required API keys

There is **no demo mode, mock data, or fallback**. The script exits immediately if any required key is missing, blank, or an obvious placeholder.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Google Gemini research + issue scoring with Google Search tool |
| `TIGERDATA_DATABASE_URL` | TigerData / TimescaleDB Postgres connection URI |
| `FEC_API_KEY` | OpenFEC lookup for federal candidate IDs |

Copy the template and fill in real values:

```bash
cp .env.example .env
```

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

Apply schema + run the full pipeline:

```bash
python run.py
```

Useful filters while iterating with real credentials:

```bash
# Only US Senate + US House
python run.py --office-type us_senate --office-type us_house

# Process a small batch first
python run.py --limit 3
```

## Data sources

| Source | Role |
| --- | --- |
| [NCSBE candidate CSV](https://dl.ncsbe.gov/Elections/2026/Candidate%20Filing/Candidate_Listing_2026.csv) | Official candidate roster (GeoCoder does not list candidates) |
| [Census GeoCoder](https://geocoding.geo.census.gov/geocoder/) | Address → coordinates + legislative/congressional geography |
| [Census TIGERweb Legislative](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer) | District polygons as GeoJSON |
| [OpenFEC](https://api.open.fec.gov/) | Federal candidate IDs |
| Google Gemini + Google Search | Photos, social posts, campaign platform, wiki pages, speech transcripts, issue scores |

## Questionnaire

The nine scored issues live in `config/questionnaire.yaml`, derived from `data/questionnaire/midterm_voting_app.pdf` with Abortion removed:

1. Cost of Living  
2. Trade  
3. Taxes and Social Programs  
4. Healthcare  
5. Immigration  
6. Artificial Intelligence  
7. Voting and Elections  
8. Public Safety  
9. Foreign Policy  

## Database tables

See `sql/schema.sql`:

- `districts` — GeoJSON boundaries
- `candidates` — core candidate + geocoder fields
- `candidate_research` — Gemini research packet
- `candidate_issue_scores` — one row per candidate × issue (`score` in `-2..2`)

## Project layout

```
config/questionnaire.yaml
sql/schema.sql
src/nc_candidates/
  config.py
  pipeline.py
  sources/          # NCSBE, GeoCoder, TIGER, FEC
  gemini/           # research + evaluation
  db/tigerdata.py
run.py
.env.example
```
