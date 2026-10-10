from __future__ import annotations

import functools
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path.cwd()
ART = ROOT / 'test-artifacts' / 'home-three-fixes'
ART.mkdir(parents=True, exist_ok=True)

source = json.loads((ROOT / '.cache-home-stats/public_housing_notices.json').read_text(encoding='utf-8'))
current = json.loads((ROOT / 'public-housing/current.json').read_text(encoding='utf-8'))
routes = json.loads((ROOT / 'public-housing/routes.json').read_text(encoding='utf-8'))
items = current.get('items') or []
source_status = source.get('source_status') or {}

assert current.get('source_status') == source_status, 'source_status changed during generation'

sh311087 = [x for x in items if x.get('id') == 'SH:seq:311087']
assert len(sh311087) == 1, sh311087
sh311087 = sh311087[0]
assert sh311087.get('deadline_at') == '2026-10-22T15:00:00+09:00', sh311087
assert sh311087.get('deadline_precision') == 'minute', sh311087

newlywed2 = [x for x in items if '신혼·신생아 매입임대주택Ⅱ' in str(x.get('title') or '')]
assert len(newlywed2) == 1, [(x.get('id'), x.get('title')) for x in newlywed2]
assert newlywed2[0].get('id') == 'SH:seq:310653', newlywed2[0]
assert newlywed2[0].get('published_at') == '2026-09-30', newlywed2[0]
canonical = routes.get('routes', {}).get('SH:seq:310653')
alias_route = routes.get('routes', {}).get('SHYOUTH:23a63706ef0b942659cb')
assert canonical == '/public-housing/notices/sh-310653/', canonical
assert alias_route == canonical, (alias_route, canonical)

detail = (ROOT / 'public-housing/notices/sh-311087/index.html').read_text(encoding='utf-8')
assert '2026년 10월 22일 15:00 (한국시간)' in detail
assert '마감시간 미확인' not in detail
assert '마감시각은 확인되지 않았습니다' not in detail
alias_html = (ROOT / 'public-housing/notices/shyouth-23a63706ef0b942659cb/index.html').read_text(encoding='utf-8')
assert canonical in alias_html

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'

results = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in (390, 1280):
            ctx = browser.new_context(viewport={'width': width, 'height': 900})
            page = ctx.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            response = page.goto(base + '/', wait_until='networkidle')
            assert response and response.status == 200

            if width <= 600:
                menu = page.locator('#menuToggle')
                assert menu.count() == 1
                menu.click()
            opener = page.locator('[data-public-housing-open]:visible').first
            assert opener.count() == 1
            opener.click()
            page.wait_for_selector('#publicHousingModal:not([hidden])')
            page.wait_for_function("document.querySelector('#publicHousingNoticeList .notice-row')")
            footer = page.locator('#publicHousingModal footer').inner_text()
            assert '수집 상태 미제공' not in footer, footer
            assert '수집 상태:' in footer, footer

            lh = source_status.get('LH') or {}
            combined_errors = [str(x) for x in (lh.get('errors') or []) + (lh.get('diagnostic_errors') or [])]
            if lh.get('status') == '부분수집':
                assert 'LH 부분수집' in footer, footer
            if any('403' in x for x in combined_errors):
                assert 'API 403 오류' in footer, footer
            if combined_errors and (lh.get('html_count') or 0) > 0:
                assert '공식 HTML 대체 수집' in footer, footer
            if (lh.get('carried_count') or 0) > 0:
                assert '이전 자료 유지' in footer, footer

            page.locator('[data-filter="신혼·신생아"]').click()
            titles = page.locator('#publicHousingNoticeList .notice-title').all_inner_texts()
            ii = [t for t in titles if '신혼·신생아 매입임대주택Ⅱ' in t]
            assert len(ii) == 1, (width, titles)

            page.locator('[data-filter="청년"]').click()
            rows = page.locator('#publicHousingNoticeList .notice-row')
            matches = [rows.nth(i).inner_text() for i in range(rows.count()) if '청년창업가' in rows.nth(i).inner_text()]
            assert matches and any('15:00' in x for x in matches), (width, matches)

            assert not errors, errors
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
            page.screenshot(path=str(ART / f'popup-{width}.png'), full_page=True)

            page.locator('#publicHousingModal .notice-close').click()
            assert page.locator('#publicHousingModal').get_attribute('hidden') is not None

            response = page.goto(base + '/public-housing/notices/sh-311087/', wait_until='networkidle')
            assert response and response.status == 200
            body = page.locator('body').inner_text()
            assert '2026년 10월 22일 15:00 (한국시간)' in body
            assert '마감시간 미확인' not in body
            assert '마감시각은 확인되지 않았습니다' not in body
            page.screenshot(path=str(ART / f'sh311087-{width}.png'), full_page=True)

            page.goto(base + '/public-housing/notices/shyouth-23a63706ef0b942659cb/', wait_until='domcontentloaded')
            page.wait_for_timeout(300)
            assert page.url.endswith('/public-housing/notices/sh-310653/'), page.url

            results.append({
                'width': width,
                'popup': 'PASS',
                'source_status': footer,
                'newlywed_ii_cards': len(ii),
                'sh311087_deadline': '15:00',
                'legacy_alias_redirect': canonical,
                'page_errors': errors,
            })
            ctx.close()
        browser.close()
finally:
    server.shutdown()

(ART / 'result.json').write_text(json.dumps({
    'source_generated_at': source.get('generated_at'),
    'source_status': source_status,
    'recruitment_count': current.get('recruitment_count'),
    'checks': results,
    'status': 'PASS',
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('HOME_THREE_FIX_VALIDATION=PASS widths=390,1280')
print(json.dumps(results, ensure_ascii=False))
