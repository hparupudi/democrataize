from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import yaml
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIG_DIR = ROOT_DIR / "config"
QUESTIONNAIRE_PATH = CONFIG_DIR / "questionnaire.yaml"
SCHEMA_PATH = ROOT_DIR / "sql" / "schema.sql"

NCSBE_CANDIDATE_CSV_URL = (
    "https://dl.ncsbe.gov/Elections/2026/Candidate%20Filing/Candidate_Listing_2026.csv"
)

CENSUS_GEOCODER_URL = (
    "https://geocoding.geo.census.gov/geocoder/geographies/address"
)
CENSUS_GEOCODER_BENCHMARK = "Public_AR_Current"
CENSUS_GEOCODER_VINTAGE = "Current_Current"

TIGERWEB_LEGISLATIVE = (
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer"
)
# Layer IDs from TIGERweb Legislative MapServer (Current / 2026).
TIGER_LAYER_US_HOUSE = 0  # 120th Congressional Districts
TIGER_LAYER_NC_SENATE = 1  # 2026 State Legislative Districts - Upper
TIGER_LAYER_NC_HOUSE = 2  # 2026 State Legislative Districts - Lower

FEC_API_BASE = "https://api.open.fec.gov/v1"

MAJOR_PARTY_CODES = {
    "DEM": "Democratic",
    "REP": "Republican",
    "LIB": "Libertarian",
    "GRE": "Green",
    "UNA": "Independent",
    "IND": "Independent",
}

ALLOWED_PARTY_CODES = set(MAJOR_PARTY_CODES)


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str
    tigerdata_database_url: str
    fec_api_key: str
    gemini_model: str


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if value is None or not value.strip():
        raise SystemExit(
            f"Missing required environment variable {name}. "
            f"Copy .env.example to .env and provide a real value. "
            "This pipeline does not run without API credentials."
        )
    return value.strip()


def load_settings() -> Settings:
    """Load settings from the environment. Fails hard if keys are absent."""
    load_dotenv(ROOT_DIR / ".env", override=False)

    model = os.environ.get("GEMINI_MODEL", "").strip()
    if not model:
        model = "gemini-3.8-flash"

    return Settings(
        gemini_api_key=_require_env("GEMINI_API_KEY"),
        tigerdata_database_url=_require_env("TIGERDATA_DATABASE_URL"),
        fec_api_key=_require_env("FEC_API_KEY"),
        gemini_model=model,
    )


def load_questionnaire(path: Path = QUESTIONNAIRE_PATH) -> list[dict]:
    if not path.is_file():
        raise SystemExit(f"Questionnaire file not found: {path}")
    with path.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    questions = data.get("questions") if isinstance(data, dict) else None
    if not questions or not isinstance(questions, list):
        raise SystemExit(f"Questionnaire at {path} has no questions list.")
    if len(questions) != 9:
        raise SystemExit(
            f"Expected exactly 9 questionnaire issues (Abortion excluded), "
            f"found {len(questions)} in {path}."
        )
    for q in questions:
        for field in ("id", "title", "side_a", "side_b"):
            if not q.get(field):
                raise SystemExit(f"Questionnaire question missing {field}: {q!r}")
        if q["id"] == "abortion" or q["title"].strip().lower() == "abortion":
            raise SystemExit("Abortion must not be included in the questionnaire.")
    return questions
