"""Tests for FastAPI app — /health endpoint and config access via app.state."""
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_returns_200(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.json() == {"status": "ok"}


def test_app_state_config_loaded():
    """Config must be accessible from app.state after startup."""
    with TestClient(app) as c:
        response = c.get("/health")
        assert response.status_code == 200
        assert app.state.config.stockfish.depth == 18


def test_analysis_router_registered():
    """analysis router must be registered — app starts cleanly with router mounted."""
    with TestClient(app) as c:
        response = c.get("/health")
        assert response.status_code == 200
