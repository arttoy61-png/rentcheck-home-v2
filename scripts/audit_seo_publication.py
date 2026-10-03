"""Read-only publication checks; no content, workflow or index policy rewrites.

Default: inspect existing HTML/sitemaps, warn about manual source review.
--article blog/name/index.html: require an explicit source link for a new article.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://rent-check.kr/'
SOURCE_DOMAINS = ('law.go.kr', 'molit.go.kr', 'rt.molit.go.kr', 'lh.or.kr',
                  'i-sh.co.kr', 'housing.seoul.go.kr', 'seoul.go.kr',
                  'hf.go.kr', 'khug.or.kr', 'reb.or.kr', 'kosis.kr', 'data.go.kr')

# Narrow, reviewed exceptions; any HTML change restores mandatory source review.
SOURCE_REVIEW_EXCEPTIONS = {
  "blog/apartment-84sqm-pyeong/index.html": {
    "sha256": "92158b1a32aff142514da6236917b12f035af7679634ea1afbbfdaedd4b879dc",
    "reason": "Explicit unit conversion (1 pyeong = 3.3058 m2) and hypothetical supply areas; existing original Naver article attribution retained."
  },
  "blog/jeonse-vs-monthly-cost/index.html": {
    "sha256": "2d311c4817a56b4f78007feb39dcea6885a6a6ac54462667472dcbfa5a2af895",
    "reason": "Own monthly opportunity-cost arithmetic with an explicitly assumed 4% cost; no claimed statutory rate."
  },
  "blog/maintenance-fee-rent-compare/index.html": {
    "sha256": "a81b228faea8670717727db77e3429d9600f17345a6e5428b2c8e563386032fb",
    "reason": "Own addition of rent, fixed maintenance and deposit costs; illustrative amounts and a contract checklist."
  },
  "blog/monthly-rent-deposit-compare/index.html": {
    "sha256": "0704aeb108964204200d20f71abe138fc039df30c71f7a58838ddf0248e01cdb",
    "reason": "Own deposit-cost comparison; explicitly says the 4% assumption is not a statutory conversion rate."
  },
  "blog/rent-conversion-check/index.html": {
    "sha256": "ea7a6a9926ddcf068e551a8bcfb4d4dbbd50223330b0a37e3fa57297dfb09691",
    "reason": "Own annual-to-monthly arithmetic with a hypothetical 4%; tells readers to check actual applicable legal limits separately."
  },
  "blog/rent-yield-good-rate/index.html": {
    "sha256": "a55881fcf0048866d9466af83d645b168e9b2270028350fc173ebfe57017c41f",
    "reason": "Own disclosed gross/net cash-yield formulas and hypothetical amounts; no universal return threshold or fixed current tax policy asserted."
  }
}

class Page(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=True)
        self.title = self.description = self.robots = ''
        self.canonicals, self.links, self.h1, self.schemas = [], [], [], []
        self._tag = None
        self._script = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('title', 'h1'):
            self._tag = tag
            if tag == 'h1': self.h1.append('')
        if tag == 'meta':
            if a.get('name') == 'description': self.description = a.get('content', '')
            if a.get('name') == 'robots': self.robots = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonicals.append(a.get('href', ''))
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag == 'script' and a.get('type') == 'application/ld+json': self._script = ''

    def handle_data(self, data):
        if self._tag == 'title': self.title += data
        if self._tag == 'h1': self.h1[-1] += data
        if self._script is not None: self._script += data

    def handle_endtag(self, tag):
        if tag == self._tag: self._tag = None
        if tag == 'script' and self._script is not None:
            try: self.schemas.append(json.loads(self._script))
            except ValueError: self.schemas.append({'_invalid_json': True})
            self._script = None

def page_url(relative: str) -> str:
    return SITE + ('' if relative == 'index.html' else relative.removesuffix('index.html'))

def source_links(page: Page) -> list[str]:
    found = []
    for href in page.links:
        u = urlparse(urljoin(SITE, href))
        if any(u.hostname == d or (u.hostname or '').endswith('.' + d) for d in SOURCE_DOMAINS):
            found.append(href)
        elif u.hostname == 'rent-check.kr' and u.path.startswith('/assets/data/'):
            if (ROOT / unquote(u.path.lstrip('/'))).is_file(): found.append(href)
        elif u.hostname == 'raw.githubusercontent.com' and u.path.startswith('/arttoy61-png/rent-check/'):
            found.append(href)
    return found

def source_review_exception(relative: str, source: str) -> str | None:
    item = SOURCE_REVIEW_EXCEPTIONS.get(relative)
    digest = hashlib.sha256(source.replace('\r\n', '\n').encode('utf-8')).hexdigest()
    return item['reason'] if item and item['sha256'] == digest else None

def check_article(page: Page, url: str, sitemap_urls: set[str], strict_source=False, reviewed_explanation=None) -> dict:
    errors, warnings = [], []
    if not page.title.strip(): errors.append('missing_title')
    if not page.description.strip(): errors.append('missing_description')
    if not any(h.strip() for h in page.h1): errors.append('missing_initial_h1')
    if page.canonicals != [url]: errors.append('missing_or_conflicting_self_canonical')
    if 'noindex' not in page.robots.lower() and url not in sitemap_urls:
        errors.append('indexable_article_missing_from_sitemap')
    internal = [h for h in page.links if urlparse(urljoin(url, h)).hostname == 'rent-check.kr']
    if not internal: errors.append('missing_internal_link')
    sources = source_links(page)
    if not sources and not reviewed_explanation:
        (errors if strict_source else warnings).append('source_link_needs_manual_review')
    return {'errors': errors, 'warnings': warnings, 'source_links': sources, 'reviewed_explanation': reviewed_explanation}

def audit(article: str | None = None) -> dict:
    sitemap_urls = set()
    errors, warnings, articles = [], [], []
    for path in ROOT.rglob('*sitemap*.xml'):
        if '.staging' in path.parts: continue
        try:
            for node in ET.parse(path).getroot().iter():
                if node.tag.endswith('}loc') or node.tag == 'loc':
                    value = (node.text or '').strip()
                    if value and not value.endswith('.xml'): sitemap_urls.add(value)
        except ET.ParseError as exc: errors.append({'path': str(path.relative_to(ROOT)), 'issue': str(exc)})
    paths = [ROOT / article] if article else sorted(ROOT.rglob('*.html'))
    pages = {}
    for path in paths:
        if '.staging' in path.parts: continue
        if not path.is_file() or not path.resolve().is_relative_to(ROOT):
            errors.append({'path': str(path), 'issue': 'missing_or_outside_repository'}); continue
        rel = path.relative_to(ROOT).as_posix()
        source = path.read_text(encoding='utf-8')
        page = Page(source)
        url = page_url(rel)
        pages[url] = page
        for schema in page.schemas:
            if isinstance(schema, dict) and schema.get('_invalid_json'):
                errors.append({'path': rel, 'issue': 'invalid_json_ld'})
        is_article = rel.startswith('blog/') and len(Path(rel).parts) == 3 and Path(rel).name == 'index.html' and '/all/' not in rel
        if article and not is_article:
            errors.append({'path': rel, 'issue': 'publication_gate_requires_a_blog_article'})
        if article and 'noindex' in page.robots.lower():
            errors.append({'path': rel, 'issue': 'publication_article_marked_noindex'})
        if is_article and 'noindex' not in page.robots.lower():
            result = check_article(page, url, sitemap_urls, strict_source=article is not None, reviewed_explanation=source_review_exception(rel, source))
            articles.append({'path': rel, **result})
            errors.extend({'path': rel, 'issue': x} for x in result['errors'])
            warnings.extend({'path': rel, 'issue': x} for x in result['warnings'])
        for href in page.links:
            u = urlparse(urljoin(url, href))
            if u.hostname != 'rent-check.kr': continue
            target = ROOT / unquote(u.path.lstrip('/'))
            if target.is_dir() or u.path.endswith('/'): target /= 'index.html'
            if not target.exists(): errors.append({'path': rel, 'issue': 'broken_internal_target', 'href': href})
    if not article:
        for url in sorted(sitemap_urls):
            page = pages.get(url)
            if page is None: errors.append({'url': url, 'issue': 'sitemap_target_missing'})
            elif 'noindex' in page.robots.lower(): errors.append({'url': url, 'issue': 'sitemap_noindex_conflict'})
            elif page.canonicals and page.canonicals != [url]: errors.append({'url': url, 'issue': 'sitemap_canonical_conflict'})
    return {'mode': 'READ_ONLY; source warnings require editorial review, not automatic rewriting',
            'html_checked': len(pages), 'sitemap_urls': len(sitemap_urls), 'articles_checked': len(articles),
            'errors': errors, 'warnings': warnings, 'articles': articles,
            'limits': 'Local HTML only. No claim about HTTP status, actual indexing, source accuracy, ranking, or AdSense approval.'}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--article', help='New blog article path; missing source link becomes a blocking check')
    ap.add_argument('--json', help='Write review evidence; the audit never edits publication files')
    args = ap.parse_args()
    result = audit(args.article)
    if args.json: Path(args.json).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: result[k] for k in ('html_checked', 'sitemap_urls', 'articles_checked', 'errors', 'warnings')}, ensure_ascii=False, indent=2))
    return 1 if result['errors'] else 0

if __name__ == '__main__': sys.exit(main())
