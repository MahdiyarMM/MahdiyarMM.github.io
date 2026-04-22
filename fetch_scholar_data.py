"""Fetch citation metrics from Google Scholar and update scholar_data.json.

Hardened against the common failure modes of the unofficial scraper:

- Wraps the network call in try/except. On any error, exit non-zero
  *without* overwriting the existing file.
- Validates the parsed values: integer, > 0, and not lower than the
  previously recorded count (Scholar occasionally returns 0 when blocked).
- Logs everything to stderr for the GitHub Action to capture.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("scholar")

DATA_FILE = Path(__file__).parent / "scholar_data.json"
AUTHOR_ID = os.environ.get("SCHOLAR_AUTHOR_ID", "cXDt3NQAAAAJ")


def load_existing() -> dict[str, Any]:
    if not DATA_FILE.exists():
        return {}
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        log.warning("could not read existing scholar_data.json: %s", exc)
        return {}


def fetch(author_id: str) -> dict[str, int]:
    """Return {citations, h_index, i10_index} for the given Scholar author id."""
    from scholarly import scholarly  # imported lazily so tests can mock it

    author = scholarly.search_author_id(author_id)
    scholarly.fill(author, sections=["indices"])
    return {
        "citations": int(author["citedby"]),
        "h_index": int(author["hindex"]),
        "i10_index": int(author["i10index"]),
    }


def validate(new: dict[str, int], previous: dict[str, Any]) -> None:
    for key in ("citations", "h_index", "i10_index"):
        if key not in new:
            raise ValueError(f"missing key: {key}")
        if not isinstance(new[key], int):
            raise ValueError(f"{key} is not an integer: {new[key]!r}")
        if new[key] <= 0:
            raise ValueError(f"{key} must be positive, got {new[key]}")
        prev = previous.get(key)
        if isinstance(prev, int) and new[key] < prev:
            raise ValueError(
                f"{key} regression: previous={prev} new={new[key]} (likely a scraping failure)"
            )


def write(data: dict[str, int]) -> None:
    DATA_FILE.write_text(json.dumps(data) + "\n", encoding="utf-8")
    log.info("wrote %s -> %s", DATA_FILE.name, data)


def main() -> int:
    previous = load_existing()
    log.info("previous metrics: %s", previous)
    try:
        new = fetch(AUTHOR_ID)
    except Exception as exc:
        log.error("fetch failed: %s", exc)
        return 1
    log.info("fetched metrics: %s", new)
    try:
        validate(new, previous)
    except ValueError as exc:
        log.error("validation failed, refusing to overwrite: %s", exc)
        return 2
    if new == {k: previous.get(k) for k in new}:
        log.info("metrics unchanged; skipping write")
        return 0
    write(new)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
