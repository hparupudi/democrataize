from __future__ import annotations

import logging
from typing import Any

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

from nc_candidates.config import (
    TIGER_LAYER_NC_HOUSE,
    TIGER_LAYER_NC_SENATE,
    TIGER_LAYER_US_HOUSE,
    TIGERWEB_LEGISLATIVE,
)
from nc_candidates.sources.ncsbe import CandidateRecord

logger = logging.getLogger(__name__)

NC_STATE_FIPS = "37"

# Approximate statewide NC outline used for statewide offices (GeoJSON Polygon).
# Source: simplified Census state outline via TIGERweb States layer query.
STATE_LAYER_URL = (
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/0/query"
)


@retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, min=1, max=20))
def _query_geojson(
    session: requests.Session,
    url: str,
    where: str,
    out_fields: str,
) -> dict[str, Any]:
    params = {
        "where": where,
        "outFields": out_fields,
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson",
    }
    resp = session.get(url, params=params, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    if "features" not in data:
        raise RuntimeError(f"TIGERweb response missing features for where={where!r}: {data}")
    return data


def _feature_collection_for_district(
    session: requests.Session,
    office_type: str,
    district_number: str | None,
) -> tuple[dict[str, Any], str | None, str]:
    if office_type == "us_house":
        if not district_number:
            raise ValueError("US House district_number is required")
        url = f"{TIGERWEB_LEGISLATIVE}/{TIGER_LAYER_US_HOUSE}/query"
        where = f"STATE='{NC_STATE_FIPS}' AND CD120='{district_number}'"
        data = _query_geojson(session, url, where, "GEOID,NAME,CD120,STATE")
        if not data["features"]:
            raise RuntimeError(f"No TIGER boundary for US House {district_number}")
        props = data["features"][0]["properties"]
        return data, props.get("GEOID"), props.get("NAME") or f"Congressional District {district_number}"

    if office_type == "nc_senate":
        if not district_number:
            raise ValueError("NC Senate district_number is required")
        url = f"{TIGERWEB_LEGISLATIVE}/{TIGER_LAYER_NC_SENATE}/query"
        where = f"STATE='{NC_STATE_FIPS}' AND SLDU='{district_number}'"
        data = _query_geojson(session, url, where, "GEOID,NAME,SLDU,STATE")
        if not data["features"]:
            raise RuntimeError(f"No TIGER boundary for NC Senate {district_number}")
        props = data["features"][0]["properties"]
        return data, props.get("GEOID"), props.get("NAME") or f"State Senate District {district_number}"

    if office_type == "nc_house":
        if not district_number:
            raise ValueError("NC House district_number is required")
        url = f"{TIGERWEB_LEGISLATIVE}/{TIGER_LAYER_NC_HOUSE}/query"
        where = f"STATE='{NC_STATE_FIPS}' AND SLDL='{district_number}'"
        data = _query_geojson(session, url, where, "GEOID,NAME,SLDL,STATE")
        if not data["features"]:
            raise RuntimeError(f"No TIGER boundary for NC House {district_number}")
        props = data["features"][0]["properties"]
        return data, props.get("GEOID"), props.get("NAME") or f"State House District {district_number}"

    # Statewide races: full NC state polygon.
    where = f"STATE='{NC_STATE_FIPS}'"
    data = _query_geojson(session, STATE_LAYER_URL, where, "GEOID,NAME,STUSAB,STATE")
    if not data["features"]:
        raise RuntimeError("No TIGER boundary for North Carolina statewide polygon")
    props = data["features"][0]["properties"]
    return data, props.get("GEOID"), props.get("NAME") or "North Carolina"


def fetch_district_boundaries(
    candidates: list[CandidateRecord],
    session: requests.Session | None = None,
) -> dict[str, dict[str, Any]]:
    """Fetch GeoJSON boundaries keyed by district_key for later map reconstruction."""
    sess = session or requests.Session()
    needed: dict[str, CandidateRecord] = {}
    for candidate in candidates:
        if candidate.district_key and candidate.district_key not in needed:
            needed[candidate.district_key] = candidate

    boundaries: dict[str, dict[str, Any]] = {}
    for district_key, sample in needed.items():
        logger.info("Fetching boundary for %s", district_key)
        geojson, geoid, name = _feature_collection_for_district(
            sess, sample.office_type, sample.district_number
        )
        boundaries[district_key] = {
            "district_key": district_key,
            "office_type": sample.office_type,
            "district_label": sample.district_label or name,
            "district_number": sample.district_number,
            "state_fips": NC_STATE_FIPS,
            "geoid": geoid,
            "boundary_geojson": geojson,
            "source": "census_tigerweb",
        }
    logger.info("Fetched %d district boundaries", len(boundaries))
    return boundaries
