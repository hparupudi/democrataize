from __future__ import annotations

import logging
from typing import Any

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

from nc_candidates.config import FEC_API_BASE
from nc_candidates.sources.ncsbe import CandidateRecord

logger = logging.getLogger(__name__)


class FecClient:
    def __init__(self, api_key: str, session: requests.Session | None = None) -> None:
        if not api_key or not api_key.strip():
            raise SystemExit("FEC_API_KEY is required and must not be empty.")
        # Reject common placeholder / demo values so the script cannot run without a real key.
        banned = {"DEMO_KEY", "YOUR_FEC_API_KEY", "changeme", "placeholder"}
        if api_key.strip() in banned:
            raise SystemExit(
                "FEC_API_KEY looks like a placeholder/demo value. "
                "Provide a real OpenFEC API key from https://api.open.fec.gov/developers/."
            )
        self.api_key = api_key.strip()
        self.session = session or requests.Session()

    @retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, min=1, max=20))
    def search_candidate(self, name: str, office: str | None = None) -> dict[str, Any] | None:
        params: dict[str, Any] = {
            "api_key": self.api_key,
            "q": name,
            "state": "NC",
            "per_page": 5,
            "sort": "-receipts",
        }
        if office:
            params["office"] = office
        resp = self.session.get(f"{FEC_API_BASE}/candidates/search/", params=params, timeout=60)
        if resp.status_code in (401, 403):
            raise SystemExit(
                f"FEC API rejected FEC_API_KEY (HTTP {resp.status_code}). "
                "Provide a valid OpenFEC API key."
            )
        resp.raise_for_status()
        results = resp.json().get("results") or []
        return results[0] if results else None


def enrich_federal_candidates(
    candidates: list[CandidateRecord],
    api_key: str,
    session: requests.Session | None = None,
) -> dict[str, str]:
    """Map candidate_id -> FEC candidate_id for US House / US Senate races."""
    client = FecClient(api_key, session=session)
    mapping: dict[str, str] = {}
    for candidate in candidates:
        if candidate.office_type not in {"us_house", "us_senate"}:
            continue
        office = "H" if candidate.office_type == "us_house" else "S"
        match = client.search_candidate(candidate.full_name, office=office)
        if match and match.get("candidate_id"):
            mapping[candidate.candidate_id] = match["candidate_id"]
            logger.info(
                "FEC match %s -> %s", candidate.full_name, match["candidate_id"]
            )
        else:
            logger.warning("No FEC match for federal candidate %s", candidate.full_name)
    return mapping
