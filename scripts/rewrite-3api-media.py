#!/usr/bin/env python3
"""Rewrite 3api JSON image URLs to same-origin /media/ for UAT deploy."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "3api"

REPLACEMENTS = (
    ("https:\\/\\/www.three.com.hk\\/media\\/", "\\/media\\/"),
    ("https://www.three.com.hk/media/", "/media/"),
)


def main() -> None:
    n = 0
    for path in API.rglob("*.json"):
        text = path.read_text(encoding="utf-8")
        original = text
        for old, new in REPLACEMENTS:
            text = text.replace(old, new)
        if text != original:
            path.write_text(text, encoding="utf-8")
            n += 1
    print(f"Updated {n} JSON file(s) under {API.relative_to(ROOT)}")


if __name__ == "__main__":
    main()