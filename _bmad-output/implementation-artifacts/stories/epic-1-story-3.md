# Story 1.3 — Logging Setup

## User Story
As a developer, I want structured logging configured at startup so that every module can emit logs with a consistent format and no `print()` calls are needed.

## Tasks
- [x] Create `backend/app/logging_config.py` with a `setup_logging(log_level: str)` function
- [x] Log format must be exactly: `%(asctime)s | %(levelname)s | %(name)s | %(message)s`
- [x] Default level is `INFO`; if `config.yaml` `server.log_level` is `debug`, set root logger to `DEBUG`
- [x] Call `setup_logging()` inside the lifespan startup in `main.py` before any other initialization
- [x] Every module must use `logger = logging.getLogger(__name__)` — no `print()` anywhere in backend code
- [x] Add a startup log line: `logger.info("KnightVision backend starting — config loaded")`

## Acceptance Criterion
Starting the server with `server.log_level: debug` in `config.yaml` produces log lines in the exact format `2026-03-22 10:00:00,000 | DEBUG | backend.app.main | KnightVision backend starting — config loaded` (timestamp will vary); no `print()` calls exist in any backend file.

## Relevant Skills
Read `.claude/skills/bmad-dev-story.md` before implementing.

---

## Dev Agent Record

### Implementation Notes
- `setup_logging()` uses `logging.basicConfig(force=True)` — the `force=True` argument re-configures the root logger even if it was previously configured (prevents handlers accumulating in tests)
- No `datefmt` override — Python's default `asctime` format already includes milliseconds with a comma separator (e.g. `2026-03-22 16:38:01,754`), matching the project spec. Using `datefmt="%Y-%m-%d %H:%M:%S"` would strip the milliseconds
- `setup_logging()` is called as the very first line of the lifespan block, before `app.state.config` is set — log level is read from the already-loaded config object
- `test_no_print_calls_in_backend` scans all `backend/app/**/*.py` files for bare `print(` calls, skipping comment lines

### Completion Notes
✅ All tasks complete. 14/14 tests pass (4 new + 10 regression). Log format confirmed: `2026-03-22 16:38:01,754 | DEBUG | test.format_check | format check message`. No `print()` calls in any backend file.

---

## File List
- `backend/app/logging_config.py` (new)
- `backend/app/main.py` (modified — added logging import, `setup_logging()` call in lifespan, startup log line, module-level logger)
- `backend/tests/test_logging_config.py` (new)

---

## Change Log
- 2026-03-22: Logging setup — `setup_logging()`, format enforcement, wired into lifespan, no-print scan test (Sai Chandan / Claude)

---

## Status
review
