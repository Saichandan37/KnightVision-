# Story 1.3 — Logging Setup

## User Story
As a developer, I want structured logging configured at startup so that every module can emit logs with a consistent format and no `print()` calls are needed.

## Tasks
- Create `backend/app/logging_config.py` with a `setup_logging(log_level: str)` function
- Log format must be exactly: `%(asctime)s | %(levelname)s | %(name)s | %(message)s`
- Default level is `INFO`; if `config.yaml` `server.log_level` is `debug`, set root logger to `DEBUG`
- Call `setup_logging()` inside the lifespan startup in `main.py` before any other initialization
- Every module must use `logger = logging.getLogger(__name__)` — no `print()` anywhere in backend code
- Add a startup log line: `logger.info("KnightVision backend starting — config loaded")`

## Acceptance Criterion
Starting the server with `server.log_level: debug` in `config.yaml` produces log lines in the exact format `2026-03-22 10:00:00,000 | DEBUG | backend.app.main | KnightVision backend starting — config loaded` (timestamp will vary); no `print()` calls exist in any backend file.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.
