#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE_HOSTS = {"rent-check.kr", "www.rent-check.kr"}
SKIP_DIRS = {".git", "node_modules", "vendor"}
DYNAMIC_MARKERS = ("${", "{{", "}}")
LEGACY_PATTERNS = {
    "old_home_github": "arttoy61-png.github.io/rent-check-home",
    "naver_direct": "blog.naver.com",
}


class AttrParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for key, value in attrs:
            if value and key.lower() in {"href", "src"}:
                self.refs.append((key.lower(), value.strip()))


def is_skipped_file(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)


def resolve_local(source: Path, raw: str) -> Path | None:
    if not raw or raw.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    if any(marker in raw for marker in DYNAMIC_MARKERS):
        return None
    if raw.startswith("//"):
        return None

    parsed = urlparse(raw)
    if parsed.scheme in {"http", "https"}:
        if parsed.netloc not in SITE_HOSTS:
            return None
        path_text = unquote(parsed.path or "/")
        target = ROOT / path_text.lstrip("/")
    elif parsed.scheme:
        return None
    else:
        path_text = unquote(parsed.path)
        if not path_text:
            return None
        if path_text.startswith("/"):
            target = ROOT / path_text.lstrip("/")
        else:
            target = source.parent / path_text

    try:
        target = target.resolve()
    except FileNotFoundError:
        target = target.absolute()

    if target.is_dir() or str(parsed.path).endswith("/"):
        target = target / "index.html"
    return target


def scan_html() -> tuple[list[str], list[str]]:
    broken: list[str] = []
    warnings: list[str] = []
    for path in ROOT.rglob("*.html"):
        if is_skipped_file(path):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        parser = AttrParser()
        try:
            parser.feed(text)
        except Exception as exc:
            broken.append(f"HTML_PARSE {path.relative_to(ROOT)}: {exc}")
            continue
        for attr, raw in parser.refs:
            target = resolve_local(path, raw)
            if target is None:
                continue
            if not target.exists():
                broken.append(f"{path.relative_to(ROOT)} {attr}={raw} -> {target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}")
        for label, pattern in LEGACY_PATTERNS.items():
            if pattern in text:
                warnings.append(f"{label}: {path.relative_to(ROOT)}")
    return broken, warnings


def scan_tools_json() -> list[str]:
    broken: list[str] = []
    path = ROOT / "data" / "tools.json"
    if not path.exists():
        return ["data/tools.json missing"]
    tools = json.loads(path.read_text(encoding="utf-8"))
    for tool in tools:
        if tool.get("status") != "available":
            continue
        raw = str(tool.get("url") or "").strip()
        if not raw:
            broken.append(f"available tool has no URL: {tool.get('id')}")
            continue
        target = resolve_local(ROOT / "index.html", raw)
        if target is None or not target.exists():
            broken.append(f"tool {tool.get('id')} -> {raw}")
    return broken


def scan_sitemap() -> list[str]:
    broken: list[str] = []
    path = ROOT / "sitemap.xml"
    if not path.exists():
        return ["sitemap.xml missing"]
    tree = ET.parse(path)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    for loc in tree.findall(".//sm:loc", ns):
        raw = (loc.text or "").strip()
        target = resolve_local(path, raw)
        if target is None or not target.exists():
            broken.append(f"sitemap -> {raw}")
    return broken


def scan_css_urls() -> list[str]:
    broken: list[str] = []
    url_re = re.compile(r"url\((['\"]?)([^)'\"]+)\1\)", re.I)
    for path in ROOT.rglob("*.css"):
        if is_skipped_file(path):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for _, raw in url_re.findall(text):
            raw = raw.strip()
            target = resolve_local(path, raw)
            if target is not None and not target.exists():
                broken.append(f"{path.relative_to(ROOT)} url({raw})")
    return broken


def main() -> int:
    html_broken, warnings = scan_html()
    broken = html_broken + scan_tools_json() + scan_sitemap() + scan_css_urls()
    print("== Rent Check internal link audit ==")
    print(f"broken={len(broken)} warnings={len(warnings)}")
    if warnings:
        print("\n[WARNINGS]")
        for item in sorted(set(warnings)):
            print("-", item)
    if broken:
        print("\n[BROKEN]")
        for item in sorted(set(broken)):
            print("-", item)
        return 1
    print("\nOK: no broken local href/src, tool URL, sitemap URL, or CSS asset URL found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
