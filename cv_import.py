"""CV / LinkedIn PDF import: turns an uploaded PDF into the "my profile" text.

Mounted by server.py with two lines:

    from cv_import import router as cv_router
    app.include_router(cv_router)

POST /api/profile_from_cv  (multipart form, field "file": a PDF)
-> {"profile": "...", "suggested_goal": "...", "tip": null}

The PDF is sent to Claude and then dropped. Nothing is written to disk.
"""

import base64
import os
from pathlib import Path

import anthropic
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

MODEL = "claude-opus-5-5"
MAX_PDF_BYTES = 10 * 1024 * 1024
PROMPT_PATH = Path(__file__).parent / "prompts" / "cv_import.md"

router = APIRouter()
_client: anthropic.AsyncAnthropic | None = None


class CvProfile(BaseModel):
    profile: str
    suggested_goal: str
    tip: str | None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic()
    return _client


@router.post("/api/profile_from_cv")
async def profile_from_cv(file: UploadFile = File(...)) -> dict:
    data = await file.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(413, detail="That file is over 10 MB. Try LinkedIn's 'Save to PDF' version.")
    if not data.startswith(b"%PDF"):
        raise HTTPException(400, detail="Please upload a PDF (your CV, or LinkedIn's 'Save to PDF').")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(500, detail="Add ANTHROPIC_API_KEY to .env and restart the server.")

    try:
        response = await _get_client().beta.messages.parse(
            model=MODEL,
            max_tokens=4000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={"effort": "low"},
            output_format=CvProfile,
            # Read at request time so prompt edits apply without a restart.
            system=PROMPT_PATH.read_text(encoding="utf-8"),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": base64.standard_b64encode(data).decode(),
                            },
                        },
                        {"type": "text", "text": "Here is my CV. Write my profile."},
                    ],
                }
            ],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(500, detail="The server's ANTHROPIC_API_KEY is missing or invalid.")
    except anthropic.RateLimitError:
        raise HTTPException(429, detail="Claude is busy right now. Try again in a minute.")
    except anthropic.BadRequestError:
        raise HTTPException(400, detail="Claude couldn't read that PDF. Try another file, or paste your profile instead.")
    except anthropic.APIError:
        raise HTTPException(502, detail="Couldn't reach the AI, try again.")

    if response.stop_reason == "refusal" or response.parsed_output is None:
        raise HTTPException(502, detail="Couldn't read that CV. Paste your profile instead.")
    return response.parsed_output.model_dump()
