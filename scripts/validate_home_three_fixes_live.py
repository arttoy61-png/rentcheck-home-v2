from __future__ import annotations

import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'https://rent-check.kr'
ART = Path('test-artifacts/home-three-fixes-live')
ART.mkdir(parents=True, exist_ok=True)

def wait_for_deploy(page):
    deadline = time.time() + 300
    last = ''
    while time.time() < deadline:
        try:
            response = page.goto(BASE + '/public-housing/current.json?live=' + str(int(time.time())), wait_until='networkidle', timeout=30000)
            if response and response.ok:
                data = response.json()
                item = next((x for x in data.get('items', []) if x.get('id') == 'SH:seq:311087'), None)
                ids = [x.get('id') for x in data.get('items', []) if '신혼·신생아 매입임대주택Ⅱ' in str(x.get('title') or '')]
                if item and item.get('deadline_at') == '2026-10-22T15:00:00+09:00' and ids == ['SH:seq:310653']:
                    return data
                last = json.dumps({'item': item, 'ids': ids}, ensure_ascii=False)
        except Exception as exc:
            last = repr(exc)
        time.sleep(10)
    raise AssertionError('production deployment not visible within 5 minutes: ' + last)

results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    bootstrap = browser.new_page()
    current = wait_for_deploy(bootstrap)
    bootstrap.close()
    lh = (current.get('source_status') or {}).get('LH') or {}
    combined_errors = [str(x) for x in (lh.get('errors') or []) + (lh.get('diagnostic_errors') or [])]

    for width in (390, 1280):
        ctx = browser.new_context(viewport={'width': width, 'height': 900})
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        response = page.goto(BASE + '/?live=' + str(int(time.time())), wait_until='networkidle', timeout=45000)
        assert response and response.ok, response.status if response else None

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
        page.screenshot(path=str(ART / f'live-popup-{width}.png'), full_page=True)

        page.locator('#publicHousingModal .notice-close').click()
        response = page.goto(BASE + '/public-housing/notices/sh-311087/?live=' + str(int(time.time())), wait_until='networkidle', timeout=45000)
        assert response and response.ok
        body = page.locator('body').inner_text()
        assert '2026년 10월 22일 15:00 (한국시간)' in body
        assert '마감시간 미확인' not in body
        assert '마감시각은 확인되지 않았습니다' not in body
        page.screenshot(path=str(ART / f'live-sh311087-{width}.png'), full_page=True)

        page.goto(BASE + '/public-housing/notices/shyouth-23a63706ef0b942659cb/?live=' + str(int(time.time())), wait_until='domcontentloaded', timeout=45000)
        page.wait_for_timeout(500)
        assert '/public-housing/notices/sh-310653/' in page.url, page.url

        results.append({
            'width': width,
            'popup': 'PASS',
            'source_status': footer,
            'newlywed_ii_cards': len(ii),
            'sh311087_deadline': '15:00',
            'alias_redirect_url': page.url,
            'page_errors': errors,
        })
        ctx.close()
    browser.close()

(ART / 'result.json').write_text(json.dumps({
    'production': BASE,
    'source_generated_at': current.get('source_generated_at') or current.get('generated_at'),
    'recruitment_count': current.get('recruitment_count'),
    'checks': results,
    'status': 'PASS',
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('HOME_THREE_FIX_LIVE=PASS widths=390,1280')
print(json.dumps(results, ensure_ascii=False))
