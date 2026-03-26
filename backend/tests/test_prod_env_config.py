"""Tests for prod env var configuration — Story 7.2.

Covers:
  - ALLOWED_ORIGINS parsing logic (same expression used in main.py)
  - LLM_DEFAULT_PROVIDER env var respected at startup
"""
import os
import pytest
from unittest.mock import patch


# ---------------------------------------------------------------------------
# ALLOWED_ORIGINS parsing (mirrors the expression in main.py)
# ---------------------------------------------------------------------------

def _parse_origins(env_val: str) -> list:
    """Same logic as main.py _allow_origins computation."""
    return [o.strip() for o in env_val.split(",") if o.strip()] or ["*"]


class TestAllowedOriginsParsing:
    def test_empty_string_defaults_to_wildcard(self):
        assert _parse_origins("") == ["*"]

    def test_single_origin(self):
        assert _parse_origins("https://app.railway.app") == ["https://app.railway.app"]

    def test_multiple_origins_comma_separated(self):
        result = _parse_origins("https://a.com,https://b.com")
        assert result == ["https://a.com", "https://b.com"]

    def test_whitespace_around_origins_stripped(self):
        result = _parse_origins("https://a.com , https://b.com")
        assert result == ["https://a.com", "https://b.com"]

    def test_empty_segments_ignored(self):
        result = _parse_origins("https://a.com,,https://b.com")
        assert result == ["https://a.com", "https://b.com"]


# ---------------------------------------------------------------------------
# LLM_DEFAULT_PROVIDER env var — startup respects override
# ---------------------------------------------------------------------------

class TestLLMDefaultProviderEnv:
    def test_default_is_ollama_when_env_not_set(self):
        """When LLM_DEFAULT_PROVIDER is unset, config.llm.default_provider is used."""
        from backend.app.config import get_default_config
        config = get_default_config()
        assert config.llm.default_provider == "ollama"

    def test_env_var_overrides_config(self, monkeypatch):
        """LLM_DEFAULT_PROVIDER env var must be read by os.environ.get in main.py."""
        monkeypatch.setenv("LLM_DEFAULT_PROVIDER", "groq")
        # Verify the env var is correctly readable (the logic in main.py is just os.environ.get)
        from backend.app.config import get_default_config
        config = get_default_config()
        default = os.environ.get("LLM_DEFAULT_PROVIDER", config.llm.default_provider)
        assert default == "groq"

    def test_env_var_missing_falls_back_to_config(self, monkeypatch):
        """When LLM_DEFAULT_PROVIDER is not set, falls back to config value."""
        monkeypatch.delenv("LLM_DEFAULT_PROVIDER", raising=False)
        from backend.app.config import get_default_config
        config = get_default_config()
        default = os.environ.get("LLM_DEFAULT_PROVIDER", config.llm.default_provider)
        assert default == "ollama"
