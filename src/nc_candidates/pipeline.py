from __future__ import annotations

import argparse
import logging
import sys
from typing import Sequence

import requests

from nc_candidates.config import load_questionnaire, load_settings
from nc_candidates.db.tigerdata import TigerDataStore
from nc_candidates.gemini.evaluate import GeminiEvaluator
from nc_candidates.gemini.research import GeminiResearcher
from nc_candidates.sources.census_geocoder import enrich_with_geocoder
from nc_candidates.sources.fec import enrich_federal_candidates
from nc_candidates.sources.ncsbe import fetch_ncsbe_candidates
from nc_candidates.sources.tiger_boundaries import fetch_district_boundaries

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("nc_candidates.pipeline")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Collect NC major-party candidates, district GeoJSON boundaries, "
            "Gemini research, and 9-issue scores into TigerData."
        )
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional cap on number of candidates processed (after filtering).",
    )
    parser.add_argument(
        "--office-type",
        action="append",
        dest="office_types",
        choices=[
            "us_house",
            "us_senate",
            "nc_house",
            "nc_senate",
            "statewide_executive",
            "statewide_judicial",
        ],
        help="Restrict to one or more office types. Repeatable.",
    )
    return parser


def run(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    # Fail immediately if credentials are missing — no mock/demo mode.
    settings = load_settings()
    questions = load_questionnaire()
    store = TigerDataStore(settings.tigerdata_database_url)
    store.apply_schema()

    session = requests.Session()
    session.headers.update({"User-Agent": "nc-candidates-pipeline/1.0"})

    candidates = fetch_ncsbe_candidates(session=session)
    if args.office_types:
        allowed = set(args.office_types)
        candidates = [c for c in candidates if c.office_type in allowed]
    if args.limit is not None:
        if args.limit <= 0:
            raise SystemExit("--limit must be a positive integer")
        candidates = candidates[: args.limit]

    logger.info("Processing %d candidates", len(candidates))

    geocoder = enrich_with_geocoder(candidates, session=session)
    boundaries = fetch_district_boundaries(candidates, session=session)
    fec_ids = enrich_federal_candidates(
        candidates, api_key=settings.fec_api_key, session=session
    )

    store.upsert_districts(boundaries)

    # Insert candidates before research/scores so foreign keys succeed.
    photo_urls: dict[str, str | None] = {c.candidate_id: None for c in candidates}
    store.upsert_candidates(candidates, geocoder, fec_ids, photo_urls)

    researcher = GeminiResearcher(settings.gemini_api_key, settings.gemini_model)
    evaluator = GeminiEvaluator(settings.gemini_api_key, settings.gemini_model)

    for index, candidate in enumerate(candidates, start=1):
        logger.info(
            "[%d/%d] Research + score %s",
            index,
            len(candidates),
            candidate.full_name,
        )
        research = researcher.research_candidate(candidate)
        photo_urls[candidate.candidate_id] = research.get("photo_url")
        store.upsert_research(candidate.candidate_id, research)
        scores = evaluator.evaluate_candidate(candidate, research, questions)
        store.upsert_issue_scores(candidate.candidate_id, scores)

    # Persist photo URLs discovered during Gemini research.
    store.upsert_candidates(candidates, geocoder, fec_ids, photo_urls)
    logger.info("Pipeline finished successfully for %d candidates", len(candidates))
    return 0


def main() -> None:
    try:
        raise SystemExit(run())
    except KeyboardInterrupt:
        print("Interrupted.", file=sys.stderr)
        raise SystemExit(130)


if __name__ == "__main__":
    main()
