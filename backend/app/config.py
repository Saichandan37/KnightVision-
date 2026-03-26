"""Configuration loading — reads config.yaml and returns a typed AppConfig model."""
from __future__ import annotations

from pathlib import Path
from typing import List, Optional

import yaml
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Nested config models
# ---------------------------------------------------------------------------

class StockfishConfig(BaseModel):
    path: Optional[str] = None
    depth: int = 18
    threads: int = 2
    multipv: int = 3


class ClassificationThresholds(BaseModel):
    brilliant_max_cp_loss: int = 0
    great_max_cp_loss: int = 5
    best_max_cp_loss: int = 10
    good_max_cp_loss: int = 20
    inaccuracy_max_cp_loss: int = 50
    mistake_max_cp_loss: int = 150

    @property
    def blunder_threshold(self) -> int:
        """Blunder = anything above mistake threshold."""
        return self.mistake_max_cp_loss


class ClassificationConfig(BaseModel):
    thresholds: ClassificationThresholds = ClassificationThresholds()


class OllamaConfig(BaseModel):
    base_url: str = "http://localhost:11434"
    model: str = "llama3.1:8b"


class GroqConfig(BaseModel):
    model: str = "llama3-8b-8192"


class HuggingFaceConfig(BaseModel):
    model: str = "mistralai/Mistral-7B-Instruct-v0.2"


class LLMConfig(BaseModel):
    default_provider: str = "ollama"
    timeout_seconds: int = 10
    ollama: OllamaConfig = OllamaConfig()
    groq: GroqConfig = GroqConfig()
    huggingface: HuggingFaceConfig = HuggingFaceConfig()


class ServerConfig(BaseModel):
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"
    cors_origins: List[str] = ["http://localhost:5173"]


class AccuracyConfig(BaseModel):
    max_cp_scale: int = 300


# ---------------------------------------------------------------------------
# Root config model
# ---------------------------------------------------------------------------

class AppConfig(BaseModel):
    stockfish: StockfishConfig = StockfishConfig()
    classification: ClassificationConfig = ClassificationConfig()
    llm: LLMConfig = LLMConfig()
    server: ServerConfig = ServerConfig()
    accuracy: AccuracyConfig = AccuracyConfig()


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

def load_config(config_path: Path) -> AppConfig:
    """Load config.yaml from *config_path* and return a validated AppConfig.

    Raises:
        FileNotFoundError: if *config_path* does not exist.
    """
    if not config_path.exists():
        raise FileNotFoundError(f"config.yaml not found at {config_path}")

    with open(config_path, "r") as f:
        raw = yaml.safe_load(f) or {}

    return AppConfig.model_validate(raw)


# ---------------------------------------------------------------------------
# Convenience: resolve config path relative to project root
# ---------------------------------------------------------------------------

def _find_config_path() -> Path:
    """Resolve config.yaml by walking up from this file's location."""
    # This file lives at backend/app/config.py → root is two levels up
    root = Path(__file__).parent.parent.parent
    candidate = root / "config.yaml"
    if candidate.exists():
        return candidate
    # Fallback: CWD (useful when running uvicorn from project root)
    cwd_candidate = Path.cwd() / "config.yaml"
    if cwd_candidate.exists():
        return cwd_candidate
    raise FileNotFoundError(
        "config.yaml not found. Expected at project root. "
        f"Looked in: {candidate}, {cwd_candidate}"
    )


def get_default_config() -> AppConfig:
    """Load config from the auto-resolved project-root path."""
    return load_config(_find_config_path())
