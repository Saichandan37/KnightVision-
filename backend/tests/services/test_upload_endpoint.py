"""Upload endpoint AC gate tests.

AC: POST /api/analysis/upload with valid PGN → HTTP 202 with UUID game_id;
    invalid PGN → HTTP 422 with error field.
"""
import re

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

_VALID_PGN = """
[Event "Test"]
[White "W"]
[Black "B"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 *
""".strip()

_INVALID_PGN = "this is not a pgn"

client = TestClient(app)


def test_ac_valid_pgn_json_returns_202_with_uuid():
    """AC: valid PGN via JSON body → 202, UUID game_id."""
    resp = client.post(
        "/api/analysis/upload",
        json={"pgn_text": _VALID_PGN},
    )
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "pending"
    assert re.match(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        data["game_id"],
    ), f"game_id is not a valid UUID v4: {data['game_id']}"


def test_ac_invalid_pgn_returns_422_with_error_field():
    """AC: invalid PGN → 422 with 'error' field."""
    resp = client.post(
        "/api/analysis/upload",
        json={"pgn_text": _INVALID_PGN},
    )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert "error" in detail
    assert "Invalid PGN" in detail["error"]
