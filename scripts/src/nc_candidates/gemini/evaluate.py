from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from google import genai
from google.genai import types

from nc_candidates.gemini.research_quality import research_has_usable_data
from nc_candidates.gemini.response_text import extract_response_text
from nc_candidates.sources.ncsbe import CandidateRecord

logger = logging.getLogger(__name__)

_INSUFFICIENT_HINTS = (
    "insufficient",
    "no evidence",
    "not enough evidence",
    "unclear",
    "no attributable",
    "could not find",
    "unable to find",
    "no public",
    "no usable",
)


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


def _looks_insufficient_rationale(text: str) -> bool:
    lowered = text.lower()
    return any(hint in lowered for hint in _INSUFFICIENT_HINTS)


def _all_scores_lack_evidence(scores: list[dict[str, Any]]) -> bool:
    if not scores:
        return True
    for item in scores:
        score = int(item["score"])
        evidence = item.get("evidence") or []
        rationale = str(item.get("rationale") or "")
        if score != 0:
            return False
        if evidence:
            return False
        if rationale and not _looks_insufficient_rationale(rationale):
            return False
    return True


class GeminiEvaluator:
    def __init__(self, api_key: str, model: str, max_attempts: int = 4) -> None:
        if not api_key or not api_key.strip():
            raise SystemExit("GEMINI_API_KEY is required and must not be empty.")
        self.client = genai.Client(api_key=api_key.strip())
        self.model = model
        self.max_attempts = max_attempts
        self._search_tool = types.Tool(google_search=types.GoogleSearch())

    def evaluate_candidate(
        self,
        candidate: CandidateRecord,
        research: dict[str, Any],
        questions: list[dict],
    ) -> list[dict[str, Any]]:
        if not research_has_usable_data(research):
            logger.warning(
                "Skipping scores for %s: research packet has no usable data",
                candidate.full_name,
            )
            return []

        question_block = []
        for q in questions:
            question_block.append(
                f"- id: {q['id']}\n"
                f"  title: {q['title']}\n"
                f"  side_a: {q['side_a']}\n"
                f"  side_b: {q['side_b']}"
            )
        research_json = json.dumps(
            {k: v for k, v in research.items() if k != "_raw_text"},
            ensure_ascii=False,
            indent=2,
        )
        prompt = f"""
Evaluate this North Carolina candidate on each political issue below.
Use the Google Search tool plus the research packet. Base scores only on evidence
from their social posts, campaign platform, introduced/sponsored legislation,
speeches, voting record, or other attributable public statements. Do not use
Wikipedia.

If you cannot find enough attributable public information to score ANY issue
with confidence, return:
{{
  "insufficient_information": true,
  "scores": []
}}
Do not invent positions. Do not fill the scale with neutrals when evidence is
missing across the board.

If some issues have evidence and others do not:
- score evidenced issues normally
- for issues without evidence, use score 0 and say so in the rationale

Scoring scale (integer only):
-2 = strongly support Side A
-1 = somewhat support Side A
 0 = Neutral / unclear / insufficient evidence
 1 = somewhat support Side B
 2 = strongly support Side B

Candidate:
- Name: {candidate.full_name} ({candidate.name_on_ballot})
- Party: {candidate.party_name}
- Contest: {candidate.contest_name}
- District: {candidate.district_label}

Research packet:
{research_json}

Issues:
{chr(10).join(question_block)}

Return ONLY valid JSON in one of these shapes:
{{
  "insufficient_information": true,
  "scores": []
}}
or
{{
  "insufficient_information": false,
  "scores": [
    {{
      "issue_id": "...",
      "issue_title": "...",
      "score": -2,
      "rationale": "1-3 sentences citing evidence",
      "evidence": [{{"url": "https://...", "note": "..."}}]
    }}
  ]
}}
When insufficient_information is false, include exactly one score object for
every issue id listed above.
"""
        logger.info("Gemini evaluation: %s", candidate.full_name)
        last_error: Exception | None = None

        for attempt in range(1, self.max_attempts + 1):
            try:
                use_search = attempt < self.max_attempts
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[self._search_tool] if use_search else None,
                        temperature=0.1,
                    ),
                )
                text = extract_response_text(response)
                if not text:
                    raise RuntimeError("empty response text")
                parsed = _extract_json(text)
                if parsed.get("insufficient_information") is True:
                    logger.warning(
                        "Gemini reported insufficient information for %s; storing no scores",
                        candidate.full_name,
                    )
                    return []

                scores = parsed.get("scores")
                if not isinstance(scores, list):
                    raise RuntimeError(f"Invalid evaluation payload: {parsed}")
                if len(scores) == 0:
                    logger.warning(
                        "Gemini returned empty scores for %s; storing no scores",
                        candidate.full_name,
                    )
                    return []

                by_id = {
                    item.get("issue_id"): item for item in scores if isinstance(item, dict)
                }
                normalized: list[dict[str, Any]] = []
                for q in questions:
                    item = by_id.get(q["id"])
                    if not item:
                        raise RuntimeError(f"Missing score for issue {q['id']}")
                    score = int(item["score"])
                    if score < -2 or score > 2:
                        raise RuntimeError(f"Score out of range for {q['id']}: {score}")
                    normalized.append(
                        {
                            "issue_id": q["id"],
                            "issue_title": q["title"],
                            "score": score,
                            "rationale": item.get("rationale") or "",
                            "evidence": item.get("evidence") or [],
                        }
                    )

                if _all_scores_lack_evidence(normalized):
                    logger.warning(
                        "All scores for %s lack usable evidence; storing no scores",
                        candidate.full_name,
                    )
                    return []
                return normalized
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                wait = min(2**attempt, 20)
                logger.warning(
                    "Evaluation attempt %d/%d failed for %s: %s (retry in %ss)",
                    attempt,
                    self.max_attempts,
                    candidate.full_name,
                    exc,
                    wait,
                )
                time.sleep(wait)

        logger.error(
            "Evaluation failed for %s after %d attempts (%s); storing no scores",
            candidate.full_name,
            self.max_attempts,
            last_error,
        )
        return []
