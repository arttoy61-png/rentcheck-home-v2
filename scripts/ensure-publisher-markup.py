"""Maintain publisher tags and truthful author attribution in existing HTML.

No ad units, account settings, indexing changes, or content rewrites.
Noindex/redirect/staging pages stay outside advertising integration.
"""
from __future__ import annotations

import argparse
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
CLIENT = 'ca-pub-8959488096156116'
SRC = f'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={CLIENT}'
TAG = f'<script async src="{SRC}" crossorigin="anonymous"></script>'
AUTHOR = ('\n<!-- rc-author-profile -->\n'
          '<aside class="rc-author-profile" aria-label="작성·운영 안내" '
          'style="max-width:960px;margin:28px auto;padding:20px;border:1px solid #d7dce3;'
          'border-radius:12px;background:#f7f8fa;color:#334155;font-size:14px;line-height:1.8">'
          '<strong>작성·운영: Rent Check 강서</strong>'
          '<p style="margin:8px 0">서울 강서구 실거래와 주거정책을 중심으로 데이터 확인, '
          '계산도구 기준 관리, 자체 분석과 가이드 편집을 맡는 독립 운영 서비스입니다.</p>'
          '<a href="/about/" rel="author">운영자 소개·자료 검토 기준 →</a>'
          '</aside>\n<!-- /rc-author-profile -->\n')


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.noindex = self.redirect = False
        self.ads = []
        self.links = []
        self.head = False
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'head':
            self.head = True
        if tag == 'meta':
            if a.get('name', '').lower() in ('robots', 'googlebot'):
                self.noindex |= 'noindex' in a.get('content', '').lower()
            self.redirect |= a.get('http-equiv', '').lower() == 'refresh'
        if tag == 'script' and 'adsbygoogle.js' in a.get('src', ''):
            self.ads.append((a, self.head))
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])

    def handle_endtag(self, tag):
        if tag == 'head':
            self.head = False


def registered_articles():
    paths = set()
    for relative, base in [('blog/all/index.html', '/blog/all/'),
                           ('analysis/index.html', '/analysis/')]:
        for href in Page((ROOT / relative).read_text()).links:
            u = urlparse(urljoin('https://rent-check.kr' + base, href))
            if u.netloc == 'rent-check.kr' and re.fullmatch(r'/(blog|analysis)/[^/]+/', u.path):
                if u.path != '/blog/all/':
                    paths.add(u.path.lstrip('/') + 'index.html')
    return paths


def update(text, article=False):
    p = Page(text)
    if p.ads:
        assert len(p.ads) == 1, 'Duplicate AdSense loader'
        attrs, in_head = p.ads[0]
        assert attrs.get('src') == SRC and in_head, 'Unexpected AdSense publisher or placement'
        assert 'async' in attrs and attrs.get('crossorigin') == 'anonymous', 'Invalid loader attributes'
    else:
        assert re.search(r'</head\s*>', text, re.I), 'Missing closing head'
        text = re.sub(r'</head\s*>', TAG + '\n</head>', text, count=1, flags=re.I)
    if article and '<!-- rc-author-profile -->' not in text:
        anchor = '</main>' if '</main>' in text else '</body>'
        assert anchor in text, 'Missing article footer anchor'
        text = text.replace(anchor, AUTHOR + anchor, 1)
    return text


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    articles = registered_articles()
    changed = []
    eligible = attributed = skipped = 0
    for path in sorted(ROOT.rglob('*.html')):
        rel = path.relative_to(ROOT)
        if any(part.startswith('.') or part in ('node_modules', 'vendor', 'test-artifacts') for part in rel.parts):
            continue
        old = path.read_text(encoding='utf8')
        p = Page(old)
        if rel.parts[0] == 'lab' or path.name == '404.html' or p.noindex or p.redirect:
            skipped += 1
            continue
        eligible += 1
        article = rel.as_posix() in articles
        attributed += article
        new = update(old, article)
        if new != old:
            changed.append(rel.as_posix())
            if not args.check:
                path.write_text(new, encoding='utf8')
    print(f'eligible_pages={eligible} attributed_articles={attributed} excluded_pages={skipped} changed={len(changed)}')
    if args.check and changed:
        raise SystemExit('Publisher markup missing: ' + ', '.join(changed))


if __name__ == '__main__':
    main()
