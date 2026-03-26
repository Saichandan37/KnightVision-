"""Analysis and LLM routers.

Routes:
    POST /api/analysis/upload       — accept PGN, return game_id (202)
    GET  /api/analysis/{game_id}    — retrieve game state, metadata, moves, accuracy
    WS   /ws/analysis/{game_id}     — stream analysis results, buffered replay
    POST /api/llm/provider          — switch the active LLM provider at runtime
    GET  /api/llm/status            — health of all three real providers + active name
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from ..llm import LLMUnavailableError, provider_registry
from ..llm.ollama_provider import OllamaProvider
from ..llm.groq_provider import GroqProvider
from ..llm.huggingface_provider import HuggingFaceProvider
from ..llm.prompt_builder import build_coaching_prompt
from ..models.api import AnalysisComplete, MoveResult, WSError, WSHeartbeat, WSMoveResult
from ..services.analysis_orchestrator import run_analysis
from ..services.pgn_parser import parse_pgn
from ..store.memory_store import game_store

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Analysis router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/analysis", tags=["analysis"])
ws_router = APIRouter(prefix="/ws", tags=["websocket"])


# ------------------------------------------------------------------
# POST /api/analysis/upload
# ------------------------------------------------------------------

class UploadResponse(BaseModel):
    game_id: str
    status: str


async def _extract_pgn(request: Request) -> str:
    """Extract PGN text from either a multipart/form-data or application/json body."""
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        pgn_file = form.get("pgn_file")
        pgn_text = form.get("pgn_text")

        if pgn_file is not None:
            raw = await pgn_file.read()
            return raw.decode("utf-8", errors="replace")
        if pgn_text is not None:
            return str(pgn_text)
        raise HTTPException(
            status_code=422,
            detail={"error": "Form body must include 'pgn_file' or 'pgn_text'"},
        )

    if "application/json" in content_type:
        body = await request.json()
        pgn_text = body.get("pgn_text", "")
        if not pgn_text:
            raise HTTPException(
                status_code=422,
                detail={"error": "JSON body must include non-empty 'pgn_text'"},
            )
        return pgn_text

    raise HTTPException(
        status_code=415,
        detail={"error": "Unsupported content type — use multipart/form-data or application/json"},
    )


@router.post("/upload", status_code=202, response_model=UploadResponse)
async def upload_pgn(request: Request) -> UploadResponse:
    """Accept a PGN file or text, validate it, store it, and return a game_id.

    Accepts:
        multipart/form-data with field 'pgn_file' (UploadFile) or 'pgn_text' (str)
        application/json    with field 'pgn_text' (str)

    Returns:
        202 {"game_id": "<uuid>", "status": "pending"}

    Raises:
        422 {"error": "Invalid PGN: <reason>"} when the PGN cannot be parsed.
        422 for missing required fields.
        415 for unsupported content type.
    """
    pgn = await _extract_pgn(request)

    try:
        parse_pgn(pgn)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"error": f"Invalid PGN: {exc}"},
        ) from exc

    game_id = str(uuid4())
    await game_store.create_game(game_id, pgn)
    logger.info("Game created — game_id=%s", game_id)
    return UploadResponse(game_id=game_id, status="pending")


# ------------------------------------------------------------------
# GET /api/analysis/{game_id}
# ------------------------------------------------------------------

class GameStateResponse(BaseModel):
    game_id: str
    status: str
    meta: Optional[object] = None
    moves: list
    white_accuracy: Optional[float] = None
    black_accuracy: Optional[float] = None


@router.get("/{game_id}", response_model=None)
async def get_game_state(game_id: str) -> dict:
    """Return current state of a game: status, metadata, moves, and accuracy.

    Returns partial moves if analysis is still in progress.
    Returns 404 if the game_id is not found.
    """
    try:
        status = await game_store.get_status(game_id)
    except KeyError:
        raise HTTPException(status_code=404, detail={"error": "Game not found"})

    moves = await game_store.get_moves(game_id)
    meta = await game_store.get_meta(game_id)
    result = await game_store.get_result(game_id)

    white_accuracy: Optional[float] = None
    black_accuracy: Optional[float] = None
    if result is not None:
        white_accuracy = result.white_accuracy
        black_accuracy = result.black_accuracy

    meta_dict = meta.model_dump() if meta is not None else None
    moves_list = [m.model_dump() for m in moves]

    return {
        "game_id": game_id,
        "status": status,
        "meta": meta_dict,
        "moves": moves_list,
        "white_accuracy": white_accuracy,
        "black_accuracy": black_accuracy,
    }


# ------------------------------------------------------------------
# WebSocket /ws/analysis/{game_id}
# ------------------------------------------------------------------

_HEARTBEAT_INTERVAL = 10.0  # seconds


async def _analysis_task(
    game_id: str,
    pgn: str,
    config,
    on_move_result,
) -> None:
    """Run analysis, store the final result, broadcast sentinel to all subscribers."""
    try:
        result = await run_analysis(game_id, pgn, config, on_move_result)
        await game_store.set_result(game_id, result)
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.exception("WebSocket analysis task failed — game_id=%s", game_id)
    finally:
        # Always broadcast None sentinel so subscribers know analysis has ended.
        await game_store.broadcast(game_id, None)


@ws_router.websocket("/analysis/{game_id}")
async def ws_analysis(websocket: WebSocket, game_id: str) -> None:
    """Stream analysis results for *game_id*.

    Behaviour:
    - If game is ``pending``: starts analysis, streams live moves (buffered=False).
    - If game is ``analysing`` or ``complete`` (late join): replays already-stored
      moves as buffered=True, then streams any remaining live moves (buffered=False).
    - Sends a heartbeat every 10 s during active streaming.
    - Sends ``AnalysisComplete`` when analysis finishes, then closes the socket.
    - Cancels the background analysis task if the client disconnects early.
    """
    await websocket.accept()

    # --- game existence check -------------------------------------------
    try:
        status = await game_store.get_status(game_id)
    except KeyError:
        await websocket.send_text(
            WSError(message=f"Game not found: {game_id}").model_dump_json()
        )
        await websocket.close()
        return

    config = getattr(websocket.app.state, "config", None)

    # Subscribe BEFORE reading buffered moves to avoid missing live broadcasts
    # that arrive between the two awaits.
    queue: asyncio.Queue = await game_store.subscribe(game_id)
    analysis_task: Optional[asyncio.Task] = None

    async def on_move_result(move: MoveResult) -> None:
        """Enrich move with LLM commentary, then broadcast to all subscribers."""
        try:
            comment, source = await provider_registry.generate_with_fallback(
                build_coaching_prompt(move)
            )
        except LLMUnavailableError:
            comment, source = "", "fallback"
        enriched = move.model_copy(update={"comment": comment, "comment_source": source})
        await game_store.broadcast(game_id, enriched)

    try:
        # --- start analysis if game is fresh --------------------------------
        if status == "pending":
            pgn = await game_store.get_pgn(game_id)
            analysis_task = asyncio.create_task(
                _analysis_task(game_id, pgn, config, on_move_result)
            )

        # --- replay buffered moves (late join) ------------------------------
        buffered_moves = await game_store.get_moves(game_id)
        buffered_count = len(buffered_moves)
        for move in buffered_moves:
            ws_move = WSMoveResult(**move.model_dump(), buffered=True)
            await websocket.send_text(ws_move.model_dump_json())

        # --- if already complete, send summary and close --------------------
        if status == "complete":
            result = await game_store.get_result(game_id)
            if result is not None:
                await websocket.send_text(result.model_dump_json())
            await websocket.close()
            return

        # --- stream live moves from the subscriber queue --------------------
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=_HEARTBEAT_INTERVAL)
            except asyncio.TimeoutError:
                hb = WSHeartbeat(timestamp=time.time())
                await websocket.send_text(hb.model_dump_json())
                continue

            if item is None:
                # Sentinel: analysis has ended
                result = await game_store.get_result(game_id)
                if result is not None:
                    await websocket.send_text(result.model_dump_json())
                break

            # Skip moves that were already sent in the buffered replay pass.
            # (Can happen if a move was broadcast between our subscribe() and
            # get_moves() calls and has since been appended to the store.)
            if item.move_index < buffered_count:
                continue

            ws_move = WSMoveResult(**item.model_dump(), buffered=False)
            await websocket.send_text(ws_move.model_dump_json())

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected — game_id=%s", game_id)
    except Exception:
        logger.exception("WebSocket error — game_id=%s", game_id)
    finally:
        await game_store.unsubscribe(game_id, queue)
        if analysis_task is not None and not analysis_task.done():
            analysis_task.cancel()
            try:
                await analysis_task
            except (asyncio.CancelledError, Exception):
                pass


# ---------------------------------------------------------------------------
# LLM router
# ---------------------------------------------------------------------------

llm_router = APIRouter(prefix="/api/llm", tags=["llm"])


# ------------------------------------------------------------------
# Request / response models
# ------------------------------------------------------------------

class ProviderSwitchRequest(BaseModel):
    provider: str


class ProviderSwitchResponse(BaseModel):
    active_provider: str


class ProviderHealthMap(BaseModel):
    ollama: bool
    groq: bool
    huggingface: bool


class LLMStatusResponse(BaseModel):
    providers: ProviderHealthMap
    active: Optional[str]


# ------------------------------------------------------------------
# POST /api/llm/provider
# ------------------------------------------------------------------

@llm_router.post("/provider", response_model=ProviderSwitchResponse)
async def switch_provider(body: ProviderSwitchRequest) -> ProviderSwitchResponse:
    """Switch the active LLM provider at runtime without restarting the server.

    Returns 400 if the requested provider is not registered (e.g. its API key
    was not present at startup).
    """
    try:
        provider_registry.set_provider(body.provider)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    logger.info("LLM provider switched to: %s", body.provider)
    return ProviderSwitchResponse(active_provider=body.provider)


# ------------------------------------------------------------------
# GET /api/llm/status
# ------------------------------------------------------------------

async def _check(name: str) -> bool:
    """Return health of the named provider if registered, else False."""
    provider = provider_registry._providers.get(name)  # noqa: SLF001
    if provider is None:
        return False
    try:
        return await provider.check_health()
    except Exception:
        return False


@llm_router.get("/status", response_model=LLMStatusResponse)
async def llm_status() -> LLMStatusResponse:
    """Return health booleans for all three real providers (concurrent) and
    the name of the currently active provider."""
    ollama_ok, groq_ok, hf_ok = await asyncio.gather(
        _check("ollama"),
        _check("groq"),
        _check("huggingface"),
    )
    return LLMStatusResponse(
        providers=ProviderHealthMap(
            ollama=ollama_ok,
            groq=groq_ok,
            huggingface=hf_ok,
        ),
        active=provider_registry.current_provider_name,
    )
