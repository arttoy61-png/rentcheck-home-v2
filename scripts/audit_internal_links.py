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


def scan_home_regressions() -> list[str]:
    broken: list[str] = []
    required_assets = [
        ROOT / "data" / "public-housing-popup.css",
        ROOT / "data" / "public-housing-popup.js",
        ROOT / "data" / "new-housing-alert.css",
        ROOT / "data" / "new-housing-alert.js",
    ]
    for path in required_assets:
        if not path.exists():
            broken.append(f"required home housing asset missing: {path.relative_to(ROOT)}")

    ui_path = ROOT / "data" / "home-analysis-ui.js"
    if not ui_path.exists():
        broken.append("data/home-analysis-ui.js missing")
    else:
        ui = ui_path.read_text(encoding="utf-8", errors="replace")
        for token in (
            "public-housing-popup.css",
            "public-housing-popup.js",
            "new-housing-alert.css",
            "new-housing-alert.js",
        ):
            if token not in ui:
                broken.append(f"home housing loader missing: {token}")

    tools_path = ROOT / "data" / "tools.json"
    stats_path = ROOT / "data" / "site_stats.json"
    if tools_path.exists() and stats_path.exists():
        tools = json.loads(tools_path.read_text(encoding="utf-8"))
        stats = json.loads(stats_path.read_text(encoding="utf-8"))
        available = sum(1 for tool in tools if tool.get("status") == "available")
        if stats.get("available_tools") != available:
            broken.append(
                f"available tool count mismatch: tools.json={available}, site_stats.json={stats.get('available_tools')}"
            )
        index = (ROOT / "index.html").read_text(encoding="utf-8", errors="replace")
        match = re.search(r'id=["\']availableToolCount["\'][^>]*>\s*(\d+)\s*<', index)
        if match and int(match.group(1)) != available:
            broken.append(
                f"available tool count mismatch: tools.json={available}, index.html={match.group(1)}"
            )

    alert_path = ROOT / "data" / "new-housing-alert.js"
    if alert_path.exists():
        alert = alert_path.read_text(encoding="utf-8", errors="replace")
        if "dayDiffFromToday(latest)>" in alert:
            broken.append("new housing alert must not expire automatically by age; dismissal/signature should control visibility")
    return broken


def main() -> int:
    html_broken, warnings = scan_html()
    broken = html_broken + scan_tools_json() + scan_sitemap() + scan_css_urls() + scan_home_regressions()
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
    print("\nOK: no broken local links/assets or guarded home regressions found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
