from __future__ import annotations

from typing import Any


def research_has_usable_data(research: dict[str, Any]) -> bool:
    """True when the research packet has any attributable public material."""
    if research.get("_insufficient"):
        return False
    raw = str(research.get("_raw_text") or "")
    if raw.startswith("empty_or_failed_research:"):
        return False

    if research.get("photo_url"):
        return True
    if research.get("social_media_posts"):
        return True
    if research.get("introduced_legislation"):
        return True
    if research.get("speech_transcripts"):
        return True

    platform = research.get("campaign_platform") or {}
    if not isinstance(platform, dict):
        return False
    if platform.get("website_url"):
        return True
    if platform.get("platform_summary"):
        return True
    if platform.get("key_positions"):
        return True
    return False
