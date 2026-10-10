from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

import psycopg
from psycopg.rows import dict_row

from nc_candidates.config import SCHEMA_PATH
from nc_candidates.sources.ncsbe import CandidateRecord

logger = logging.getLogger(__name__)


class TigerDataStore:
    def __init__(self, database_url: str) -> None:
        if not database_url or not database_url.strip():
            raise SystemExit("TIGERDATA_DATABASE_URL is required and must not be empty.")
        banned = {
            "postgres://user:password@host:5432/db",
            "YOUR_TIGERDATA_DATABASE_URL",
            "changeme",
            "placeholder",
        }
        if database_url.strip() in banned:
            raise SystemExit(
                "TIGERDATA_DATABASE_URL looks like a placeholder. "
                "Provide a real TigerData / TimescaleDB connection URI."
            )
        self.database_url = database_url.strip()

    def connect(self) -> psycopg.Connection:
        try:
            return psycopg.connect(self.database_url, row_factory=dict_row)
        except Exception as exc:  # noqa: BLE001
            raise SystemExit(
                f"Failed to connect to TigerData using TIGERDATA_DATABASE_URL: {exc}"
            ) from exc

    def apply_schema(self, schema_path: Path = SCHEMA_PATH) -> None:
        sql = schema_path.read_text(encoding="utf-8")
        with self.connect() as conn:
            conn.execute(sql)
            conn.commit()
        logger.info("Applied schema from %s", schema_path)

    def upsert_districts(self, districts: dict[str, dict[str, Any]]) -> None:
        sql = """
            INSERT INTO districts (
                district_key, office_type, district_label, district_number,
                state_fips, geoid, boundary_geojson, source, fetched_at
            ) VALUES (
                %(district_key)s, %(office_type)s, %(district_label)s, %(district_number)s,
                %(state_fips)s, %(geoid)s, %(boundary_geojson)s::jsonb, %(source)s, NOW()
            )
            ON CONFLICT (district_key) DO UPDATE SET
                office_type = EXCLUDED.office_type,
                district_label = EXCLUDED.district_label,
                district_number = EXCLUDED.district_number,
                state_fips = EXCLUDED.state_fips,
                geoid = EXCLUDED.geoid,
                boundary_geojson = EXCLUDED.boundary_geojson,
                source = EXCLUDED.source,
                fetched_at = NOW()
        """
        with self.connect() as conn:
            with conn.cursor() as cur:
                for district in districts.values():
                    cur.execute(
                        sql,
                        {
                            **district,
                            "boundary_geojson": json.dumps(district["boundary_geojson"]),
                        },
                    )
            conn.commit()
        logger.info("Upserted %d districts", len(districts))

    def upsert_candidates(
        self,
        candidates: list[CandidateRecord],
        geocoder: dict[str, dict[str, Any]],
        fec_ids: dict[str, str],
        photo_urls: dict[str, str | None],
    ) -> None:
        sql = """
            INSERT INTO candidates (
                candidate_id, full_name, name_on_ballot, party_code, party_name,
                office_type, contest_name, district_key, district_label, election_date,
                photo_url, street_address, city, state, zip_code, email, phone,
                geocoder_lat, geocoder_lon, geocoder_districts, fec_candidate_id,
                source_row, created_at, updated_at
            ) VALUES (
                %(candidate_id)s, %(full_name)s, %(name_on_ballot)s, %(party_code)s, %(party_name)s,
                %(office_type)s, %(contest_name)s, %(district_key)s, %(district_label)s, %(election_date)s,
                %(photo_url)s, %(street_address)s, %(city)s, %(state)s, %(zip_code)s, %(email)s, %(phone)s,
                %(geocoder_lat)s, %(geocoder_lon)s, %(geocoder_districts)s::jsonb, %(fec_candidate_id)s,
                %(source_row)s::jsonb, NOW(), NOW()
            )
            ON CONFLICT (candidate_id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                name_on_ballot = EXCLUDED.name_on_ballot,
                party_code = EXCLUDED.party_code,
                party_name = EXCLUDED.party_name,
                office_type = EXCLUDED.office_type,
                contest_name = EXCLUDED.contest_name,
                district_key = EXCLUDED.district_key,
                district_label = EXCLUDED.district_label,
                election_date = EXCLUDED.election_date,
                photo_url = EXCLUDED.photo_url,
                street_address = EXCLUDED.street_address,
                city = EXCLUDED.city,
                state = EXCLUDED.state,
                zip_code = EXCLUDED.zip_code,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                geocoder_lat = EXCLUDED.geocoder_lat,
                geocoder_lon = EXCLUDED.geocoder_lon,
                geocoder_districts = EXCLUDED.geocoder_districts,
                fec_candidate_id = EXCLUDED.fec_candidate_id,
                source_row = EXCLUDED.source_row,
                updated_at = NOW()
        """
        with self.connect() as conn:
            with conn.cursor() as cur:
                for candidate in candidates:
                    geo = geocoder.get(candidate.candidate_id) or {}
                    election_date = _parse_date(candidate.election_date)
                    cur.execute(
                        sql,
                        {
                            "candidate_id": candidate.candidate_id,
                            "full_name": candidate.full_name,
                            "name_on_ballot": candidate.name_on_ballot,
                            "party_code": candidate.party_code,
                            "party_name": candidate.party_name,
                            "office_type": candidate.office_type,
                            "contest_name": candidate.contest_name,
                            "district_key": candidate.district_key,
                            "district_label": candidate.district_label,
                            "election_date": election_date,
                            "photo_url": photo_urls.get(candidate.candidate_id),
                            "street_address": candidate.street_address,
                            "city": candidate.city,
                            "state": candidate.state,
                            "zip_code": candidate.zip_code,
                            "email": candidate.email,
                            "phone": candidate.phone,
                            "geocoder_lat": geo.get("lat"),
                            "geocoder_lon": geo.get("lon"),
                            "geocoder_districts": json.dumps(geo.get("geographies") or {}),
                            "fec_candidate_id": fec_ids.get(candidate.candidate_id),
                            "source_row": json.dumps(candidate.source_row),
                        },
                    )
            conn.commit()
        logger.info("Upserted %d candidates", len(candidates))

    def upsert_research(self, candidate_id: str, research: dict[str, Any]) -> None:
        sql = """
            INSERT INTO candidate_research (
                candidate_id, social_media_posts, campaign_platform, wikipedia,
                speech_transcripts, photo_url, raw_gemini_response, researched_at
            ) VALUES (
                %(candidate_id)s, %(social_media_posts)s::jsonb, %(campaign_platform)s::jsonb,
                %(wikipedia)s::jsonb, %(speech_transcripts)s::jsonb, %(photo_url)s,
                %(raw_gemini_response)s, NOW()
            )
            ON CONFLICT (candidate_id) DO UPDATE SET
                social_media_posts = EXCLUDED.social_media_posts,
                campaign_platform = EXCLUDED.campaign_platform,
                wikipedia = EXCLUDED.wikipedia,
                speech_transcripts = EXCLUDED.speech_transcripts,
                photo_url = EXCLUDED.photo_url,
                raw_gemini_response = EXCLUDED.raw_gemini_response,
                researched_at = NOW()
        """
        with self.connect() as conn:
            conn.execute(
                sql,
                {
                    "candidate_id": candidate_id,
                    "social_media_posts": json.dumps(research.get("social_media_posts") or []),
                    "campaign_platform": json.dumps(research.get("campaign_platform") or {}),
                    "wikipedia": json.dumps(research.get("wikipedia") or {}),
                    "speech_transcripts": json.dumps(research.get("speech_transcripts") or []),
                    "photo_url": research.get("photo_url"),
                    "raw_gemini_response": research.get("_raw_text"),
                },
            )
            conn.commit()

    def upsert_issue_scores(self, candidate_id: str, scores: list[dict[str, Any]]) -> None:
        sql = """
            INSERT INTO candidate_issue_scores (
                candidate_id, issue_id, issue_title, score, rationale, evidence, evaluated_at
            ) VALUES (
                %(candidate_id)s, %(issue_id)s, %(issue_title)s, %(score)s,
                %(rationale)s, %(evidence)s::jsonb, NOW()
            )
            ON CONFLICT (candidate_id, issue_id) DO UPDATE SET
                issue_title = EXCLUDED.issue_title,
                score = EXCLUDED.score,
                rationale = EXCLUDED.rationale,
                evidence = EXCLUDED.evidence,
                evaluated_at = NOW()
        """
        with self.connect() as conn:
            with conn.cursor() as cur:
                for score in scores:
                    cur.execute(
                        sql,
                        {
                            "candidate_id": candidate_id,
                            "issue_id": score["issue_id"],
                            "issue_title": score["issue_title"],
                            "score": score["score"],
                            "rationale": score.get("rationale"),
                            "evidence": json.dumps(score.get("evidence") or []),
                        },
                    )
            conn.commit()


def _parse_date(value: str) -> datetime.date:
    # NCSBE uses MM/DD/YYYY
    return datetime.strptime(value, "%m/%d/%Y").date()
