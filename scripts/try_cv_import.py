"""Try the CV import on its own, before server.py exists.

    pip install fastapi uvicorn anthropic python-multipart python-dotenv
    python scripts/try_cv_import.py      # then open http://localhost:8001
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import uvicorn  # noqa: E402
from dotenv import load_dotenv  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.responses import FileResponse, HTMLResponse  # noqa: E402

load_dotenv(ROOT / ".env")

from cv_import import router  # noqa: E402

app = FastAPI()
app.include_router(router)

PAGE = """<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CV import test</title>
<style>body{font-family:system-ui;max-width:560px;margin:24px auto;padding:0 16px}
textarea,input{width:100%;box-sizing:border-box;font:inherit;padding:8px;margin:4px 0 12px}
.cv-upload-button{display:inline-block;background:#5b4bdb;color:#fff;padding:10px 14px;border-radius:8px;cursor:pointer}
.cv-hint,.cv-status{color:#555}</style>
<h1>CV import test</h1>
<section id="cv-import" data-profile-target="#my-profile" data-goal-target="#goal"></section>
<label>My profile<textarea id="my-profile" rows="8"></textarea></label>
<label>What I want tonight<input id="goal"></label>
<script src="/cv_upload.js"></script>"""


@app.get("/")
def page() -> HTMLResponse:
    return HTMLResponse(PAGE)


@app.get("/cv_upload.js")
def widget() -> FileResponse:
    return FileResponse(ROOT / "public" / "cv_upload.js", media_type="text/javascript")


if __name__ == "__main__":
    uvicorn.run(app, port=8001)
