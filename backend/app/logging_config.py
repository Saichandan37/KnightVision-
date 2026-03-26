"""Logging configuration for KnightVision backend.

Call setup_logging() once at application startup (inside lifespan).
Every module should then use:

    import logging
    logger = logging.getLogger(__name__)
"""
import logging

LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
# No datefmt override — Python's default asctime format includes milliseconds:
# 2026-03-22 10:00:00,123 (matches the project spec)


def setup_logging(log_level: str = "info") -> None:
    """Configure the root logger with the project-standard format.

    Args:
        log_level: "debug" or "info" (case-insensitive). Anything else
                   defaults to INFO.
    """
    level = logging.DEBUG if log_level.lower() == "debug" else logging.INFO

    logging.basicConfig(
        level=level,
        format=LOG_FORMAT,
        force=True,  # Re-configure even if basicConfig was called before
    )
