"""KnightVision FastAPI application entry point."""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_default_config
from .llm import provider_registry
from .llm.fallback_provider import FallbackProvider
from .llm.groq_provider import GroqProvider
from .llm.huggingface_provider import HuggingFaceProvider
from .llm.ollama_provider import OllamaProvider
from .logging_config import setup_logging
from .routers.analysis import llm_router, router as analysis_router, ws_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load config once at startup; store on app.state for all routes."""
    config = get_default_config()
    # Logging must be configured before any other log emission
    setup_logging(config.server.log_level)
    app.state.config = config

    # Register providers — fallback always available; ollama first, groq second
    provider_registry.register("ollama", OllamaProvider(timeout_seconds=config.llm.timeout_seconds))
    try:
        provider_registry.register("groq", GroqProvider(timeout_seconds=config.llm.timeout_seconds))
        logger.info("Groq provider registered")
    except RuntimeError as exc:
        logger.warning("Groq provider skipped: %s", exc)
    try:
        provider_registry.register("huggingface", HuggingFaceProvider(timeout_seconds=config.llm.timeout_seconds))
        logger.info("HuggingFace provider registered")
    except RuntimeError as exc:
        logger.warning("HuggingFace provider skipped: %s", exc)
    provider_registry.register("fallback", FallbackProvider())
    default_provider = os.environ.get("LLM_DEFAULT_PROVIDER", config.llm.default_provider)
    try:
        provider_registry.set_provider(default_provider)
        logger.info("LLM provider registry initialised — active: %s", default_provider)
    except ValueError:
        provider_registry.set_provider("fallback")
        logger.warning("Requested provider %s not registered, defaulting to fallback", default_provider)

    logger.info("KnightVision backend starting — config loaded")
    yield
    # No teardown needed for Phase 1


app = FastAPI(
    title="KnightVision",
    description="Chess game analysis — Stockfish accuracy + LLM coaching commentary.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — configurable via ALLOWED_ORIGINS env var (comma-separated list).
# Defaults to ["*"] when not set (permissive dev mode).
_origins_env = os.environ.get("ALLOWED_ORIGINS", "")
_allow_origins = [o.strip() for o in _origins_env.split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(analysis_router)
app.include_router(llm_router)
app.include_router(ws_router)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok"}
