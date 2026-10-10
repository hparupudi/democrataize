from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any

from google import genai
from google.genai import types

from nc_candidates.sources.fec import FecClient
from nc_candidates.sources.ncsbe import CandidateRecord

logger = logging.getLogger(__name__)

FEC_STATUS_MAP = {
    "I": ("incumbent", True),
    "C": ("challenger", False),
    "O": ("open_seat", False),
}


@dataclass(frozen=True)
class IncumbencyInfo:
    is_incumbent: bool | None
    status: str  # incumbent | challenger | open_seat | unknown
    source: str  # fec | gemini
    detail: str | None = None


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start : end + 1])
        raise


def enrich_from_fec(
    candidates: list[CandidateRecord],
    api_key: str,
    session=None,
) -> tuple[dict[str, str], dict[str, IncumbencyInfo]]:
    """Return (fec_ids, incumbency) using OpenFEC for federal candidates."""
    client = FecClient(api_key, session=session)
    fec_ids: dict[str, str] = {}
    incumbency: dict[str, IncumbencyInfo] = {}

    for candidate in candidates:
        if candidate.office_type not in {"us_house", "us_senate"}:
            continue
        office = "H" if candidate.office_type == "us_house" else "S"
        match = client.search_candidate(candidate.full_name, office=office)
        if not match or not match.get("candidate_id"):
            logger.warning("No FEC match for federal candidate %s", candidate.full_name)
            continue

        fec_ids[candidate.candidate_id] = match["candidate_id"]
        code = (match.get("incumbent_challenge") or "").upper()
        status, is_incumbent = FEC_STATUS_MAP.get(code, ("unknown", None))
        detail = match.get("incumbent_challenge_full") or code or None
        incumbency[candidate.candidate_id] = IncumbencyInfo(
            is_incumbent=is_incumbent,
            status=status,
            source="fec",
            detail=detail,
        )
        logger.info(
            "FEC incumbency %s -> %s (%s)",
            candidate.full_name,
            status,
            match["candidate_id"],
        )

    return fec_ids, incumbency


class GeminiIncumbencyResolver:
    def __init__(self, api_key: str, model: str) -> None:
        if not api_key or not api_key.strip():
            raise SystemExit("GEMINI_API_KEY is required and must not be empty.")
        self.client = genai.Client(api_key=api_key.strip())
        self.model = model
        self._search_tool = types.Tool(google_search=types.GoogleSearch())

    def resolve(self, candidate: CandidateRecord) -> IncumbencyInfo:
        prompt = f"""
Determine whether this North Carolina candidate is the incumbent for the
specific office/contest they are seeking in the upcoming election.

Candidate:
- Name on ballot: {candidate.name_on_ballot}
- Full name: {candidate.full_name}
- Party: {candidate.party_name}
- Contest: {candidate.contest_name}
- District: {candidate.district_label}
- Office type: {candidate.office_type}
- Election date: {candidate.election_date}

Use Google Search. Prefer official sources (NCSBE, Ballotpedia, legislature/
Congress member pages, court bios).

Definitions:
- incumbent: currently holds THIS same office/seat they are running for
- challenger: running against a sitting officeholder for that seat
- open_seat: no incumbent is running for that seat (or seat is vacant/open)
- unknown: cannot determine from reliable sources

Return ONLY JSON:
{{
  "is_incumbent": true | false | null,
  "status": "incumbent" | "challenger" | "open_seat" | "unknown",
  "detail": "short evidence note with source names/URLs if possible"
}}
"""
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[self._search_tool],
                temperature=0.1,
            ),
        )
        text = (response.text or "").strip()
        if not text:
            return IncumbencyInfo(None, "unknown", "gemini", "empty Gemini response")
        parsed = _extract_json(text)
        status = str(parsed.get("status") or "unknown").strip().lower()
        if status not in {"incumbent", "challenger", "open_seat", "unknown"}:
            status = "unknown"
        is_incumbent = parsed.get("is_incumbent")
        if status == "incumbent":
            is_incumbent = True
        elif status in {"challenger", "open_seat"}:
            is_incumbent = False
        elif is_incumbent is not None:
            is_incumbent = bool(is_incumbent)
        else:
            is_incumbent = None
        return IncumbencyInfo(
            is_incumbent=is_incumbent,
            status=status,
            source="gemini",
            detail=str(parsed.get("detail") or "") or None,
        )


def resolve_incumbency(
    candidates: list[CandidateRecord],
    *,
    fec_api_key: str,
    gemini_api_key: str,
    gemini_model: str,
    session=None,
) -> tuple[dict[str, str], dict[str, IncumbencyInfo]]:
    """
    Prefer OpenFEC incumbent_challenge for federal races.
    Fall back to Gemini + Google Search for everyone else (and federal misses).
    """
    fec_ids, incumbency = enrich_from_fec(candidates, fec_api_key, session=session)
    resolver = GeminiIncumbencyResolver(gemini_api_key, gemini_model)

    for candidate in candidates:
        if candidate.candidate_id in incumbency:
            continue
        info = resolver.resolve(candidate)
        incumbency[candidate.candidate_id] = info
        logger.info(
            "Gemini incumbency %s -> %s (%s)",
            candidate.full_name,
            info.status,
            info.detail,
        )

    return fec_ids, incumbency
