"""Tests for config loading — verifies AppConfig is populated from config.yaml."""
import pytest
from pathlib import Path

from backend.app.config import load_config, AppConfig


CONFIG_PATH = Path(__file__).parent.parent.parent / "config.yaml"


def test_load_config_returns_app_config():
    cfg = load_config(CONFIG_PATH)
    assert isinstance(cfg, AppConfig)


def test_stockfish_depth_matches_config_yaml():
    cfg = load_config(CONFIG_PATH)
    assert cfg.stockfish.depth == 18


def test_classification_thresholds_present():
    cfg = load_config(CONFIG_PATH)
    assert cfg.classification.thresholds.mistake_max_cp_loss == 150
    assert cfg.classification.thresholds.blunder_threshold == 150


def test_llm_default_provider():
    cfg = load_config(CONFIG_PATH)
    assert cfg.llm.default_provider == "ollama"
    assert cfg.llm.timeout_seconds == 10


def test_server_config():
    cfg = load_config(CONFIG_PATH)
    assert cfg.server.port == 8000
    assert cfg.server.log_level == "info"


def test_load_config_missing_file_raises():
    with pytest.raises(FileNotFoundError):
        load_config(Path("/nonexistent/config.yaml"))
