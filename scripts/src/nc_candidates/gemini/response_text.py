from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def extract_response_text(response: Any) -> str:
    """Pull text from a Gemini response, including multi-part candidates."""
    direct = getattr(response, "text", None)
    if isinstance(direct, str) and direct.strip():
        return direct.strip()

    chunks: list[str] = []
    for candidate in getattr(response, "candidates", None) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", None) or []:
            text = getattr(part, "text", None)
            if isinstance(text, str) and text.strip():
                chunks.append(text.strip())
    if chunks:
        return "\n".join(chunks).strip()

    # Log finish reasons / safety when available to aid debugging.
    for candidate in getattr(response, "candidates", None) or []:
        finish = getattr(candidate, "finish_reason", None)
        safety = getattr(candidate, "safety_ratings", None)
        if finish or safety:
            logger.warning(
                "Gemini candidate finish_reason=%s safety=%s", finish, safety
            )
    prompt_feedback = getattr(response, "prompt_feedback", None)
    if prompt_feedback:
        logger.warning("Gemini prompt_feedback=%s", prompt_feedback)
    return ""
