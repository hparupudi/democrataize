from __future__ import annotations

import csv
import hashlib
import io
import logging
import re
from dataclasses import asdict, dataclass
from typing import Iterable

import requests

from nc_candidates.config import ALLOWED_PARTY_CODES, MAJOR_PARTY_CODES, NCSBE_CANDIDATE_CSV_URL

logger = logging.getLogger(__name__)

# NCSBE file mixes primary and general filings; keep the November general ballot.
GENERAL_ELECTION_DATE = "11/03/2026"

STATEWIDE_EXECUTIVE = {
    "GOVERNOR",
    "LIEUTENANT GOVERNOR",
    "ATTORNEY GENERAL",
    "SECRETARY OF STATE",
    "STATE AUDITOR",
    "STATE TREASURER",
    "SUPERINTENDENT OF PUBLIC INSTRUCTION",
    "COMMISSIONER OF AGRICULTURE",
    "COMMISSIONER OF INSURANCE",
    "COMMISSIONER OF LABOR",
}

US_HOUSE_RE = re.compile(r"^US HOUSE OF REPRESENTATIVES DISTRICT\s+(\d+)$", re.I)
NC_HOUSE_RE = re.compile(r"^NC HOUSE OF REPRESENTATIVES DISTRICT\s+(\d+)$", re.I)
NC_SENATE_RE = re.compile(r"^NC STATE SENATE DISTRICT\s+(\d+)$", re.I)
SUPREME_RE = re.compile(r"^NC SUPREME COURT", re.I)
APPEALS_RE = re.compile(r"^NC COURT OF APPEALS", re.I)


@dataclass(frozen=True)
class CandidateRecord:
    candidate_id: str
    full_name: str
    name_on_ballot: str
    party_code: str
    party_name: str
    office_type: str
    contest_name: str
    district_key: str | None
    district_label: str | None
    district_number: str | None
    election_date: str
    street_address: str
    city: str
    state: str
    zip_code: str
    email: str
    phone: str
    source_row: dict


def _join_name(row: dict) -> str:
    parts = [
        row.get("first_name", "").strip().title(),
        row.get("middle_name", "").strip().title(),
        row.get("last_name", "").strip().title(),
    ]
    name = " ".join(p for p in parts if p)
    suffix = row.get("name_suffix_lbl", "").strip()
    if suffix:
        name = f"{name} {suffix}"
    return name or row.get("name_on_ballot", "").strip()


def classify_contest(contest_name: str) -> tuple[str, str | None, str | None, str | None] | None:
    """Return (office_type, district_key, district_label, district_number) or None."""
    name = contest_name.strip()
    upper = name.upper()

    if upper.startswith("US SENATE"):
        return ("us_senate", "nc:us_senate", "North Carolina (statewide)", None)

    m = US_HOUSE_RE.match(name)
    if m:
        num = int(m.group(1))
        key = f"nc:us_house:{num:02d}"
        return ("us_house", key, f"US House District {num}", f"{num:02d}")

    m = NC_HOUSE_RE.match(name)
    if m:
        num = int(m.group(1))
        key = f"nc:nc_house:{num:03d}"
        return ("nc_house", key, f"NC House District {num}", f"{num:03d}")

    m = NC_SENATE_RE.match(name)
    if m:
        num = int(m.group(1))
        key = f"nc:nc_senate:{num:03d}"
        return ("nc_senate", key, f"NC Senate District {num}", f"{num:03d}")

    if upper in STATEWIDE_EXECUTIVE:
        slug = upper.lower().replace(" ", "_")
        return ("statewide_executive", f"nc:{slug}", name.title(), None)

    if SUPREME_RE.search(name):
        return ("statewide_judicial", f"nc:supreme:{_slug(name)}", name, None)

    if APPEALS_RE.search(name):
        return ("statewide_judicial", f"nc:appeals:{_slug(name)}", name, None)

    return None


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def _candidate_id(contest: str, name: str, party: str) -> str:
    raw = f"{contest}|{name}|{party}".encode()
    return hashlib.sha256(raw).hexdigest()[:24]


def fetch_ncsbe_candidates(session: requests.Session | None = None) -> list[CandidateRecord]:
    sess = session or requests.Session()
    logger.info("Downloading NCSBE candidate list from %s", NCSBE_CANDIDATE_CSV_URL)
    resp = sess.get(NCSBE_CANDIDATE_CSV_URL, timeout=120)
    resp.raise_for_status()

    reader = csv.DictReader(io.StringIO(resp.text))
    seen: set[tuple[str, str, str]] = set()
    out: list[CandidateRecord] = []

    for row in reader:
        election_dt = (row.get("election_dt") or "").strip()
        if election_dt != GENERAL_ELECTION_DATE:
            continue

        contest = (row.get("contest_name") or "").strip()
        party = (row.get("party_candidate") or "").strip().upper()
        ballot = (row.get("name_on_ballot") or "").strip()
        if not contest or not ballot:
            continue
        if party not in ALLOWED_PARTY_CODES:
            continue

        classified = classify_contest(contest)
        if classified is None:
            continue

        dedupe_key = (contest, ballot, party)
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        office_type, district_key, district_label, district_number = classified
        full_name = _join_name(row)
        out.append(
            CandidateRecord(
                candidate_id=_candidate_id(contest, ballot, party),
                full_name=full_name,
                name_on_ballot=ballot,
                party_code=party if party != "IND" else "UNA",
                party_name=MAJOR_PARTY_CODES[party],
                office_type=office_type,
                contest_name=contest,
                district_key=district_key,
                district_label=district_label,
                district_number=district_number,
                election_date=row.get("election_dt", "").strip(),
                street_address=(row.get("street_address") or "").strip(),
                city=(row.get("city") or "").strip(),
                state=(row.get("state") or "").strip(),
                zip_code=(row.get("zip_code") or "").strip(),
                email=(row.get("email") or "").strip(),
                phone=(row.get("phone") or row.get("office_phone") or "").strip(),
                source_row=dict(row),
            )
        )

    logger.info("Loaded %d unique major-party candidates for target contests", len(out))
    if not out:
        raise RuntimeError(
            "NCSBE returned no candidates for the configured NC contests/parties."
        )
    return out


def candidates_as_dicts(candidates: Iterable[CandidateRecord]) -> list[dict]:
    return [asdict(c) for c in candidates]
