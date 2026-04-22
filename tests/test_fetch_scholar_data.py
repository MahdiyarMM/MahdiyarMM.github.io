"""Tests for the hardened Google Scholar fetcher.

These tests do NOT hit the network; ``scholarly`` is monkey-patched.
"""

from __future__ import annotations

import json
import sys
import types
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


@pytest.fixture
def scholar(monkeypatch, tmp_path):
    """Return the freshly imported module wired to a temp data file."""
    import fetch_scholar_data as module

    data_file = tmp_path / "scholar_data.json"
    monkeypatch.setattr(module, "DATA_FILE", data_file)
    return module, data_file


def _make_scholarly(stub_author):
    """Build a minimal ``scholarly`` shim that returns a fixed author dict."""

    fake = types.SimpleNamespace()
    fake.search_author_id = lambda _aid: dict(stub_author)
    fake.fill = lambda *_a, **_k: None
    pkg = types.ModuleType("scholarly")
    pkg.scholarly = fake
    return pkg


def install_scholarly(monkeypatch, stub_author):
    monkeypatch.setitem(sys.modules, "scholarly", _make_scholarly(stub_author))


def test_writes_when_metrics_grow(monkeypatch, scholar):
    module, data_file = scholar
    data_file.write_text(
        json.dumps({"citations": 600, "h_index": 10, "i10_index": 10}) + "\n"
    )
    install_scholarly(monkeypatch, {"citedby": 612, "hindex": 11, "i10index": 10})

    rc = module.main()

    assert rc == 0
    written = json.loads(data_file.read_text())
    assert written == {"citations": 612, "h_index": 11, "i10_index": 10}


def test_writes_first_run_when_no_existing_file(monkeypatch, scholar):
    module, data_file = scholar
    assert not data_file.exists()
    install_scholarly(monkeypatch, {"citedby": 100, "hindex": 5, "i10_index": 4, "i10index": 4})

    rc = module.main()

    assert rc == 0
    assert data_file.exists()


def test_refuses_to_overwrite_on_regression(monkeypatch, scholar):
    module, data_file = scholar
    data_file.write_text(
        json.dumps({"citations": 600, "h_index": 10, "i10_index": 10}) + "\n"
    )
    install_scholarly(monkeypatch, {"citedby": 0, "hindex": 0, "i10index": 0})

    rc = module.main()

    assert rc == 2
    on_disk = json.loads(data_file.read_text())
    assert on_disk["citations"] == 600


def test_returns_nonzero_when_fetch_raises(monkeypatch, scholar):
    module, data_file = scholar
    data_file.write_text(
        json.dumps({"citations": 600, "h_index": 10, "i10_index": 10}) + "\n"
    )

    def boom(_aid):
        raise RuntimeError("scholar blocked")

    fake = types.SimpleNamespace(search_author_id=boom, fill=lambda *a, **k: None)
    pkg = types.ModuleType("scholarly")
    pkg.scholarly = fake
    monkeypatch.setitem(sys.modules, "scholarly", pkg)

    rc = module.main()

    assert rc == 1
    on_disk = json.loads(data_file.read_text())
    assert on_disk["citations"] == 600


def test_no_write_when_metrics_unchanged(monkeypatch, scholar):
    module, data_file = scholar
    initial = {"citations": 609, "h_index": 10, "i10_index": 10}
    data_file.write_text(json.dumps(initial) + "\n")
    mtime_before = data_file.stat().st_mtime_ns
    install_scholarly(monkeypatch, {"citedby": 609, "hindex": 10, "i10index": 10})

    rc = module.main()

    assert rc == 0
    assert data_file.stat().st_mtime_ns == mtime_before
