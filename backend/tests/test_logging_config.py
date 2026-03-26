"""Tests for logging setup — format, level switching, no print() in backend."""
import logging
import re
import subprocess
import sys
from io import StringIO
from pathlib import Path

from backend.app.logging_config import setup_logging


def test_setup_logging_sets_info_level():
    setup_logging("info")
    assert logging.getLogger().level == logging.INFO


def test_setup_logging_sets_debug_level():
    setup_logging("debug")
    assert logging.getLogger().level == logging.DEBUG
    # Reset to INFO so other tests are not affected
    setup_logging("info")


def test_log_format_matches_spec(capsys):
    """Emitted log lines must match the exact format pattern."""
    setup_logging("debug")
    test_logger = logging.getLogger("test.format_check")
    test_logger.debug("format check message")

    captured = capsys.readouterr()
    output = captured.err  # logging defaults to stderr

    # Pattern: YYYY-MM-DD HH:MM:SS,mmm | LEVEL | name | message
    pattern = r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} \| DEBUG \| test\.format_check \| format check message"
    assert re.search(pattern, output), (
        f"Log output did not match expected format.\nActual: {output!r}"
    )
    setup_logging("info")  # reset


def test_no_print_calls_in_backend():
    """No print() calls should exist anywhere in backend/ Python files."""
    backend_dir = Path(__file__).parent.parent
    python_files = list(backend_dir.glob("app/**/*.py"))
    assert python_files, "No Python files found under backend/app/"

    violations = []
    for path in python_files:
        text = path.read_text()
        lines = text.splitlines()
        for lineno, line in enumerate(lines, start=1):
            stripped = line.strip()
            # Ignore comments and docstrings
            if stripped.startswith("#"):
                continue
            if re.search(r"\bprint\s*\(", stripped):
                violations.append(f"{path.relative_to(backend_dir)}:{lineno}: {stripped}")

    assert not violations, (
        "print() calls found in backend code:\n" + "\n".join(violations)
    )
