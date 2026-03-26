"""Upload endpoint broader tests — multipart, JSON, edge cases, store state."""
import io
import re

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.store.memory_store import game_store

client = TestClient(app)

_VALID_PGN = """[Event "Test"][White "W"][Black "B"][Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 *"""

_RUY_LOPEZ_PGN = """[Event "Classic"][White "Kasparov"][Black "Karpov"][Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0"""


# ---------------------------------------------------------------------------
# JSON body path
# ---------------------------------------------------------------------------

def test_json_upload_returns_202():
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    assert resp.status_code == 202


def test_json_upload_response_shape():
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    data = resp.json()
    assert set(data.keys()) == {"game_id", "status"}
    assert data["status"] == "pending"


def test_json_upload_game_id_is_uuid4():
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]
    assert re.match(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        game_id,
    )


def test_json_upload_each_call_produces_unique_game_id():
    id1 = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN}).json()["game_id"]
    id2 = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN}).json()["game_id"]
    assert id1 != id2


# ---------------------------------------------------------------------------
# Multipart form path — pgn_text field
# ---------------------------------------------------------------------------

def test_multipart_pgn_text_field_returns_202():
    resp = client.post(
        "/api/analysis/upload",
        data={"pgn_text": _VALID_PGN},
    )
    assert resp.status_code == 202
    assert resp.json()["status"] == "pending"


# ---------------------------------------------------------------------------
# Multipart form path — pgn_file upload
# ---------------------------------------------------------------------------

def test_multipart_file_upload_returns_202():
    pgn_bytes = _VALID_PGN.encode()
    resp = client.post(
        "/api/analysis/upload",
        files={"pgn_file": ("game.pgn", io.BytesIO(pgn_bytes), "text/plain")},
    )
    assert resp.status_code == 202
    assert resp.json()["status"] == "pending"


def test_multipart_file_upload_returns_valid_uuid():
    pgn_bytes = _VALID_PGN.encode()
    resp = client.post(
        "/api/analysis/upload",
        files={"pgn_file": ("game.pgn", io.BytesIO(pgn_bytes), "text/plain")},
    )
    game_id = resp.json()["game_id"]
    assert re.match(r"^[0-9a-f-]{36}$", game_id)


# ---------------------------------------------------------------------------
# Validation failures — 422
# ---------------------------------------------------------------------------

def test_empty_pgn_text_returns_422():
    resp = client.post("/api/analysis/upload", json={"pgn_text": ""})
    assert resp.status_code == 422


def test_missing_pgn_text_field_returns_422():
    resp = client.post("/api/analysis/upload", json={})
    assert resp.status_code == 422


def test_invalid_pgn_returns_422_with_error_field():
    resp = client.post("/api/analysis/upload", json={"pgn_text": "not a pgn"})
    assert resp.status_code == 422
    assert "error" in resp.json()["detail"]


def test_invalid_pgn_error_message_mentions_invalid_pgn():
    resp = client.post("/api/analysis/upload", json={"pgn_text": "garbage"})
    detail = resp.json()["detail"]
    assert "Invalid PGN" in detail["error"]


def test_pgn_with_no_moves_returns_422():
    no_moves_pgn = '[Event "Test"]\n\n*'
    resp = client.post("/api/analysis/upload", json={"pgn_text": no_moves_pgn})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Store state after upload
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_upload_creates_game_in_store():
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]
    status = await game_store.get_status(game_id)
    assert status == "pending"


@pytest.mark.asyncio
async def test_upload_stores_pgn_text():
    resp = client.post("/api/analysis/upload", json={"pgn_text": _RUY_LOPEZ_PGN})
    game_id = resp.json()["game_id"]
    stored_pgn = await game_store.get_pgn(game_id)
    assert "Kasparov" in stored_pgn


# ---------------------------------------------------------------------------
# Analysis is NOT started by upload
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_upload_does_not_start_analysis():
    """Status stays 'pending' after upload — analysis starts on WS connect."""
    resp = client.post("/api/analysis/upload", json={"pgn_text": _VALID_PGN})
    game_id = resp.json()["game_id"]
    status = await game_store.get_status(game_id)
    assert status == "pending"
    moves = await game_store.get_moves(game_id)
    assert moves == []
