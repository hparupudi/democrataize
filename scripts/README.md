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
