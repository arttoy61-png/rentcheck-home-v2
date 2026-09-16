from __future__ import annotations

import html
import json
import re
from datetime import date
from pathlib import Path

CURRENT_PATH = Path('public-housing/current.json')
ROUTES_PATH = Path('public-housing/routes.json')
SITEMAP_PATH = Path('public-housing/sitemap.xml')
NOTICE_ROOT = Path('public-housing/notices')

CURATED_ROUTES = {
    '/public-housing/sh-happy-housing-2026-2/',
    '/public-housing/sh-long-vacant-purchase-2026-2/',
    '/public-housing/sh-longterm-jeonse-51/',
}

NON_RECRUIT_TITLE = re.compile(
    r'최종\s*청약\s*경쟁률|청약\s*경쟁률|청약\s*접수\s*결과|청약접수결과|'
    r'접수\s*결과|접수\s*마감\s*안내|계약\s*결과|계약결과|공동생활수칙|'
    r'서류심사\s*대상자|당첨자\s*발표|선정결과|입주안내문|재계약\s*안내',
    re.I,
)


def clean(value: object) -> str:
    return re.sub(r'\s+', ' ', str(value or '').replace('&nbsp;', ' ')).strip()


def is_non_recruitment(item: dict) -> bool:
    event = clean(item.get('event'))
    title = clean(item.get('title'))
    if re.search(r'결과', event, re.I):
        return True
    return bool(NON_RECRUIT_TITLE.search(title))


def notice_path(route: str) -> Path | None:
    m = re.fullmatch(r'/public-housing/notices/([^/]+)/', route)
    if not m:
        return None
    return NOTICE_ROOT / m.group(1) / 'index.html'


def make_noindex(path: Path) -> None:
    if not path.exists():
        return
    text = path.read_text(encoding='utf-8')
    changed = text.replace(
        '<meta name="robots" content="index,follow">',
        '<meta name="robots" content="noindex,follow">',
        1,
    )
    if changed != text:
        path.write_text(changed, encoding='utf-8')


def retired_page(item: dict) -> str:
    title = clean(item.get('title')) or '후속 안내'
    route = clean(item.get('route')) or '/public-housing/'
    official = clean(item.get('official_url') or item.get('url'))
    official_link = ''
    if official.startswith('http'):
        official_link = f'<a href="{html.escape(official, quote=True)}" target="_blank" rel="noopener">기관 원문 확인 →</a>'
    canonical = f'https://rent-check.kr{route}' if route.startswith('/') else 'https://rent-check.kr/public-housing/'
    return f'''<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <title>후속 공지 안내 | Rent Check</title>
  <meta name="description" content="모집공고가 아닌 경쟁률·접수결과·계약결과·생활안내 등 후속 공지는 Rent Check 모집공고 목록에서 분리합니다.">
  <link rel="canonical" href="{html.escape(canonical, quote=True)}">
  <link rel="stylesheet" href="/public-housing/public-housing.css?v=20260913-3">
</head>
<body>
<header class="site-head"><div class="site-head-inner"><a class="brand" href="/">Rent Check <b>강서</b></a><a class="home-link" href="/">홈으로</a></div></header>
<main class="housing-detail">
  <a class="housing-back" href="/public-housing/">← 임대주택 모집공고</a>
  <article>
    <section class="housing-hero">
      <p class="kicker">모집공고 목록 제외</p>
      <h1>{html.escape(title)}</h1>
      <p class="lead">이 주소는 경쟁률·접수결과·계약결과·생활안내 등 모집 자체가 아닌 후속 공지로 확인되어 Rent Check의 현재 모집공고 목록에서 분리했습니다.</p>
    </section>
    <section class="section">
      <h2>지금 확인할 곳</h2>
      <p>새로 신청할 임대주택을 찾는다면 최신 모집공고 목록을 확인하세요. 이미 신청한 공고의 결과를 찾는 경우에는 기관 원문을 기준으로 확인합니다.</p>
      <div class="housing-links"><a href="/public-housing/">최신 LH·SH 모집공고 →</a>{official_link}</div>
    </section>
  </article>
</main>
</body>
</html>
'''


def write_sitemap(items: list[dict]) -> None:
    today = date.today().isoformat()
    routes: dict[str, str] = {
        '/public-housing/': today,
        '/public-housing/sh-happy-housing-2026-2/': today,
        '/public-housing/sh-long-vacant-purchase-2026-2/': today,
        '/public-housing/sh-longterm-jeonse-51/': today,
    }
    for item in items:
        route = clean(item.get('route'))
        if not route or not item.get('indexable'):
            continue
        published = clean(item.get('published_at'))
        routes[route] = published[:10] if re.fullmatch(r'20\d{2}-\d{2}-\d{2}', published[:10]) else today

    body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for route, lastmod in routes.items():
        body.append(f'  <url><loc>https://rent-check.kr{html.escape(route)}</loc><lastmod>{lastmod}</lastmod></url>')
    body.append('</urlset>')
    SITEMAP_PATH.write_text('\n'.join(body) + '\n', encoding='utf-8')


def main() -> None:
    if not CURRENT_PATH.exists() or not ROUTES_PATH.exists():
        raise SystemExit('public housing manifest is missing')

    current = json.loads(CURRENT_PATH.read_text(encoding='utf-8'))
    routes_data = json.loads(ROUTES_PATH.read_text(encoding='utf-8'))
    items = [item for item in current.get('items', []) if isinstance(item, dict)]

    removed: list[dict] = []
    kept: list[dict] = []
    for item in items:
        if is_non_recruitment(item):
            removed.append(item)
            continue

        route = clean(item.get('route'))
        if route.startswith('/public-housing/notices/') and item.get('editorial_ready') is not True:
            item['indexable'] = False
            path = notice_path(route)
            if path:
                make_noindex(path)
        kept.append(item)

    current['items'] = kept
    current['recruitment_count'] = len(kept)
    CURRENT_PATH.write_text(json.dumps(current, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    route_map = routes_data.get('routes') or {}
    for item in removed:
        item_id = clean(item.get('id'))
        if item_id:
            route_map.pop(item_id, None)
        path = notice_path(clean(item.get('route')))
        if path:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(retired_page(item), encoding='utf-8')

    routes_data['routes'] = route_map
    routes_data['recruitment_count'] = len(kept)
    routes_data['generated_count'] = sum(
        1 for item in kept if clean(item.get('route')) not in CURATED_ROUTES
    )
    routes_data['source_recruitment_count'] = len(kept) + int(routes_data.get('duplicate_count') or 0)
    ROUTES_PATH.write_text(json.dumps(routes_data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    active_routes = {clean(item.get('route')) for item in kept}
    active_paths = {notice_path(route) for route in active_routes}
    if NOTICE_ROOT.exists():
        for folder in NOTICE_ROOT.iterdir():
            if not folder.is_dir():
                continue
            page = folder / 'index.html'
            if page in active_paths or not page.exists():
                continue
            text = page.read_text(encoding='utf-8')
            if '<meta name="robots" content="index,follow">' in text:
                make_noindex(page)

    write_sitemap(kept)
    print(
        f'public housing quality gate: kept={len(kept)}, removed_non_recruitment={len(removed)}, '
        f'indexable={sum(1 for item in kept if item.get("indexable"))}'
    )


if __name__ == '__main__':
    main()
