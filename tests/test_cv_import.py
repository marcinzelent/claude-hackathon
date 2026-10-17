from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import cv_import

PDF = b"%PDF-1.4 fake cv"


class FakeMessages:
    def __init__(self, result=None, error=None):
        self.result, self.error, self.calls = result, error, []

    async def parse(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.result


@pytest.fixture
def client_with(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    def make(result=None, error=None):
        messages = FakeMessages(result, error)
        monkeypatch.setattr(cv_import, "_get_client", lambda: SimpleNamespace(beta=SimpleNamespace(messages=messages)))
        app = FastAPI()
        app.include_router(cv_import.router)
        return TestClient(app), messages

    return make


def upload(client, data=PDF):
    return client.post("/api/profile_from_cv", files={"file": ("cv.pdf", data, "application/pdf")})


def test_returns_profile_and_sends_pdf_to_claude(client_with):
    parsed = cv_import.CvProfile(profile="Data analyst, 4 years.", suggested_goal="I want to meet people hiring ML engineers.", tip=None)
    client, messages = client_with(SimpleNamespace(stop_reason="end_turn", parsed_output=parsed))

    res = upload(client)

    assert res.status_code == 200
    assert res.json() == parsed.model_dump()
    doc = messages.calls[0]["messages"][0]["content"][0]
    assert doc["type"] == "document" and doc["source"]["media_type"] == "application/pdf"


def test_rejects_non_pdf(client_with):
    client, messages = client_with()
    res = upload(client, b"hello")
    assert res.status_code == 400
    assert messages.calls == []


def test_rejects_huge_file(client_with):
    client, _ = client_with()
    res = upload(client, PDF + b"x" * cv_import.MAX_PDF_BYTES)
    assert res.status_code == 413


def test_refusal_gives_friendly_error(client_with):
    client, _ = client_with(SimpleNamespace(stop_reason="refusal", parsed_output=None))
    res = upload(client)
    assert res.status_code == 502
    assert "Paste your profile" in res.json()["detail"]
