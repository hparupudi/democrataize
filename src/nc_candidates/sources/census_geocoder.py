from __future__ import annotations

import logging
from typing import Any

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

from nc_candidates.config import (
    CENSUS_GEOCODER_BENCHMARK,
    CENSUS_GEOCODER_URL,
    CENSUS_GEOCODER_VINTAGE,
)
from nc_candidates.sources.ncsbe import CandidateRecord

logger = logging.getLogger(__name__)


@retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, min=1, max=20))
def _geocode_address(
    session: requests.Session,
    street: str,
    city: str,
    state: str,
    zip_code: str,
) -> dict[str, Any] | None:
    params = {
        "street": street,
        "city": city,
        "state": state,
        "zip": zip_code,
        "benchmark": CENSUS_GEOCODER_BENCHMARK,
        "vintage": CENSUS_GEOCODER_VINTAGE,
        "format": "json",
    }
    resp = session.get(CENSUS_GEOCODER_URL, params=params, timeout=60)
    resp.raise_for_status()
    payload = resp.json()
    matches = payload.get("result", {}).get("addressMatches") or []
    if not matches:
        return None
    match = matches[0]
    coords = match.get("coordinates") or {}
    geographies = match.get("geographies") or {}
    return {
        "matched_address": match.get("matchedAddress"),
        "lat": coords.get("y"),
        "lon": coords.get("x"),
        "geographies": {
            key: [
                {
                    "name": item.get("NAME") or item.get("BASENAME"),
                    "geoid": item.get("GEOID"),
                    "basename": item.get("BASENAME"),
                    "cd120": item.get("CD120"),
                    "sldu": item.get("SLDU"),
                    "sldl": item.get("SLDL"),
                }
                for item in (values or [])
            ]
            for key, values in geographies.items()
        },
    }


def enrich_with_geocoder(
    candidates: list[CandidateRecord],
    session: requests.Session | None = None,
) -> dict[str, dict[str, Any]]:
    """Geocode each candidate mailing/residence address via Census GeoCoder."""
    sess = session or requests.Session()
    results: dict[str, dict[str, Any]] = {}
    for idx, candidate in enumerate(candidates, start=1):
        if not candidate.street_address or not candidate.city or not candidate.state:
            logger.warning(
                "Skipping geocode for %s — incomplete address", candidate.full_name
            )
            continue
        try:
            geo = _geocode_address(
                sess,
                candidate.street_address,
                candidate.city,
                candidate.state,
                candidate.zip_code,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("GeoCoder failed for %s: %s", candidate.full_name, exc)
            raise
        if geo is None:
            logger.warning("No GeoCoder match for %s", candidate.full_name)
            continue
        results[candidate.candidate_id] = geo
        if idx % 25 == 0:
            logger.info("Geocoded %d / %d candidates", idx, len(candidates))
    logger.info("GeoCoder enrichment complete for %d candidates", len(results))
    return results
