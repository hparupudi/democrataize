# Candidate ingestion scripts

Python pipeline that loads North Carolina candidates into TigerData.

```bash
cd scripts
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env   # fill GEMINI_API_KEY, TIGERDATA_DATABASE_URL, FEC_API_KEY
python run.py
```

Useful filters:

```bash
python run.py --office-type us_senate --limit 3
```
