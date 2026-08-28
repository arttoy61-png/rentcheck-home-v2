#!/usr/bin/env python3
"""Audit visible article text length for sitemap blog/analysis pages.

Counts only reader-visible text from <article> when present, otherwise <main>.
Script/style/template/noscript/svg content is ignored. The conservative threshold
uses non-whitespace characters so a page does not pass only because of spacing.
"""
from __future__ import annotations

import csv
import html
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITEMAP = ROOT / "sitemap.xml"
OUT = ROOT / "content_length_audit.csv"
THRESHOLD = 1500
SKIP = {"script", "style", "template", "noscript", "svg"}


class VisibleTextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.article_depth = 0
        self.main_depth = 0
        self.skip_depth = 0
        self.article_chunks: list[str] = []
        self.main_chunks: list[str] = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in SKIP:
            self.skip_depth += 1
        if tag == "article":
            self.article_depth += 1
        if tag == "main":
            self.main_depth += 1

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "article" and self.article_depth:
            self.article_depth -= 1
        if tag == "main" and self.main_depth:
            self.main_depth -= 1
        if tag in SKIP and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data):
        if self.skip_depth:
            return
        text = html.unescape(data)
        if self.article_depth:
            self.article_chunks.append(text)
        if self.main_depth:
            self.main_chunks.append(text)

    def text(self) -> str:
        chunks = self.article_chunks if self.article_chunks else self.main_chunks
        return re.sub(r"\s+", " ", " ".join(chunks)).strip()


def sitemap_article_urls() -> list[str]:
    root = ET.parse(SITEMAP).getroot()
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = []
    for loc in root.findall("sm:url/sm:loc", ns):
        url = (loc.text or "").strip()
        path = urlparse(url).path
        parts = [p for p in path.split("/") if p]
        if len(parts) == 2 and parts[0] in {"blog", "analysis"}:
            urls.append(url)
    return urls


def page_file(url: str) -> Path:
    parts = [p for p in urlparse(url).path.split("/") if p]
    return ROOT / parts[0] / parts[1] / "index.html"


def audit(url: str) -> dict[str, object]:
    path = page_file(url)
    if not path.exists():
        return {
            "url": url,
            "file": str(path.relative_to(ROOT)),
            "title": "MISSING",
            "chars_with_spaces": 0,
            "chars_no_whitespace": 0,
            "status": "MISSING",
        }
    source = path.read_text(encoding="utf-8")
    parser = VisibleTextParser()
    parser.feed(source)
    text = parser.text()
    title_m = re.search(r"<title[^>]*>(.*?)</title>", source, re.I | re.S)
    title = re.sub(r"\s+", " ", html.unescape(title_m.group(1))).strip() if title_m else path.parent.name
    no_ws = len(re.sub(r"\s", "", text))
    return {
        "url": url,
        "file": str(path.relative_to(ROOT)),
        "title": title,
        "chars_with_spaces": len(text),
        "chars_no_whitespace": no_ws,
        "status": "PASS" if no_ws >= THRESHOLD else "SHORT",
    }


def main() -> int:
    rows = [audit(url) for url in sitemap_article_urls()]
    rows.sort(key=lambda r: (r["chars_no_whitespace"], r["url"]))
    with OUT.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"ARTICLE_COUNT={len(rows)}")
    print(f"THRESHOLD_NO_WHITESPACE={THRESHOLD}")
    short = [r for r in rows if r["status"] != "PASS"]
    print(f"SHORT_COUNT={len(short)}")
    print("\nchars_no_ws\tchars_with_spaces\tstatus\tfile\ttitle")
    for r in rows:
        print(f"{r['chars_no_whitespace']}\t{r['chars_with_spaces']}\t{r['status']}\t{r['file']}\t{r['title']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
