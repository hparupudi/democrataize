from __future__ import annotations

import json
import logging
import re
from typing import Any

from google import genai
from google.genai import types

from nc_candidates.sources.ncsbe import CandidateRecord

logger = logging.getLogger(__name__)

RESEARCH_SCHEMA_HINT = """
Return ONLY valid JSON (no markdown) with this exact shape:
{
  "photo_url": "https://... direct image URL of the candidate, or null",
  "social_media_posts": [
    {
      "platform": "X|Facebook|Instagram|YouTube|TikTok|Other",
      "url": "https://...",
      "summary": "short summary of the post or account relevance",
      "posted_at": "ISO date or null"
    }
  ],
  "campaign_platform": {
    "website_url": "https://... or null",
    "platform_summary": "summary of official campaign platform/issues",
    "key_positions": ["..."]
  },
  "introduced_legislation": [
    {
      "title": "bill title",
      "bill_id": "H.R. 123 / S. 45 / NC HB 12 / etc., or null",
      "url": "https://congress.gov or ncleg.gov (or equivalent) bill page",
      "chamber": "US House|US Senate|NC House|NC Senate|Other",
      "status": "introduced|in committee|passed|enacted|failed|unknown",
      "summary": "1-2 sentence description of what the bill does",
      "date": "ISO date or null"
    }
  ],
  "speech_transcripts": [
    {
      "title": "...",
      "url": "https://...",
      "date": "ISO date or null",
      "excerpt_or_summary": "..."
    }
  ]
}
Include as many real, source-backed items as you can find. Prefer official campaign
sites, Congress.gov / NC General Assembly bill pages, and primary-source speech
transcript pages. Do NOT use Wikipedia or other wiki pages as sources.
Use null/[] when nothing trustworthy is found. Do not invent URLs.
For non-incumbents or candidates with no sponsored bills, return an empty
introduced_legislation array.
"""


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


class GeminiResearcher:
    def __init__(self, api_key: str, model: str) -> None:
        if not api_key or not api_key.strip():
            raise SystemExit("GEMINI_API_KEY is required and must not be empty.")
        banned = {"YOUR_GEMINI_API_KEY", "changeme", "placeholder", "demo"}
        if api_key.strip() in banned:
            raise SystemExit(
                "GEMINI_API_KEY looks like a placeholder. Provide a real Google AI Studio key."
            )
        self.client = genai.Client(api_key=api_key.strip())
        self.model = model
        self._search_tool = types.Tool(google_search=types.GoogleSearch())

    def research_candidate(self, candidate: CandidateRecord) -> dict[str, Any]:
        prompt = f"""
You are researching a North Carolina political candidate for a voter-information app.
Use the Google Search tool extensively.

Candidate:
- Name on ballot: {candidate.name_on_ballot}
- Full name: {candidate.full_name}
- Party: {candidate.party_name} ({candidate.party_code})
- Contest: {candidate.contest_name}
- District: {candidate.district_label}
- Election date: {candidate.election_date}
- City/state: {candidate.city}, {candidate.state}

Find, when available:
1) A direct public URL to a candidate photo (campaign site, Ballotpedia, official
   government/campaign page — not Wikipedia).
2) Relevant social media posts or official campaign social accounts with example post URLs.
3) Their official campaign website and platform/issue positions.
4) Legislation they have introduced or sponsored (US Congress via Congress.gov, or
   NC General Assembly via ncleg.gov / equivalent). Prefer bills they sponsored or
   co-sponsored as the primary author when possible; include bill links and short summaries.
5) Transcripts or reliable write-ups of speeches (as many as applicable).

Do not use Wikipedia or other wiki pages as sources.

{RESEARCH_SCHEMA_HINT}
"""
        logger.info("Gemini research: %s (%s)", candidate.full_name, candidate.contest_name)
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[self._search_tool],
                temperature=0.2,
            ),
        )
        text = (response.text or "").strip()
        if not text:
            raise RuntimeError(
                f"Gemini returned empty research response for {candidate.full_name}"
            )
        parsed = _extract_json(text)
        parsed["_raw_text"] = text
        return parsed
