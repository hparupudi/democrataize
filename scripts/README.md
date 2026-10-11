# Candidate ingestion scripts

Python pipeline that loads North Carolina candidates into TigerData.

```bash
cd scripts
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
pip install -e .
cp .env.example .env   # fill GEMINI_API_KEY, TIGERDATA_DATABASE_URL, FEC_API_KEY
python run.py
```

Requires Python 3.9+. Python 3.11+ is recommended (macOS: `brew install python@3.12`, then `python3.12 -m venv .venv`).

Useful filters:

```bash
python run.py --office-type us_senate --limit 3
```

After a crash (or to continue overnight), resume and skip anyone who already has a full set of issue scores:

```bash
git pull
pip install -e .
python run.py --resume
```

Gemini research/scoring retries empty or malformed responses. If Gemini cannot find usable public data for a candidate, **no issue scores are stored** and the candidate is marked `scoring_status=insufficient` (the website shows “Insufficient candidate information”). By default the pipeline logs a failure and continues; pass `--fail-fast` to stop on the first hard error.
