from __future__ import annotations

import json
import logging
import re
from typing import Any

from google import genai
from google.genai import types

from nc_candidates.sources.ncsbe import CandidateRecord

logger = logging.getLogger(__name__)


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


class GeminiEvaluator:
    def __init__(self, api_key: str, model: str) -> None:
        if not api_key or not api_key.strip():
            raise SystemExit("GEMINI_API_KEY is required and must not be empty.")
        self.client = genai.Client(api_key=api_key.strip())
        self.model = model
        self._search_tool = types.Tool(google_search=types.GoogleSearch())

    def evaluate_candidate(
        self,
        candidate: CandidateRecord,
        research: dict[str, Any],
        questions: list[dict],
    ) -> list[dict[str, Any]]:
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
from their social posts, campaign platform, Wikipedia/wiki page, speeches, voting
record, or other attributable public statements. If evidence is insufficient for an
issue, score 0 (Neutral) and say so in the rationale.

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

Return ONLY valid JSON:
{{
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
Include exactly one score object for every issue id listed above.
"""
        logger.info("Gemini evaluation: %s", candidate.full_name)
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
            raise RuntimeError(
                f"Gemini returned empty evaluation response for {candidate.full_name}"
            )
        parsed = _extract_json(text)
        scores = parsed.get("scores")
        if not isinstance(scores, list):
            raise RuntimeError(f"Invalid evaluation payload for {candidate.full_name}: {parsed}")

        by_id = {item.get("issue_id"): item for item in scores if isinstance(item, dict)}
        normalized: list[dict[str, Any]] = []
        for q in questions:
            item = by_id.get(q["id"])
            if not item:
                raise RuntimeError(
                    f"Missing score for issue {q['id']} for candidate {candidate.full_name}"
                )
            try:
                score = int(item["score"])
            except (KeyError, TypeError, ValueError) as exc:
                raise RuntimeError(
                    f"Invalid score for {candidate.full_name} / {q['id']}: {item}"
                ) from exc
            if score < -2 or score > 2:
                raise RuntimeError(
                    f"Score out of range for {candidate.full_name} / {q['id']}: {score}"
                )
            normalized.append(
                {
                    "issue_id": q["id"],
                    "issue_title": q["title"],
                    "score": score,
                    "rationale": item.get("rationale") or "",
                    "evidence": item.get("evidence") or [],
                }
            )
        return normalized
