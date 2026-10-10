"""Browser regression for static content. Run after render-core-content.mjs.
External requests are intercepted; no ads, analytics, or upstream API calls.
"""
import functools
import http.server
import json
import os
import subprocess
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path.cwd()
PAGES = ['index.html', 'tools/jeonse-ratio/index.html', 'analysis/ujangsan-hillstate/index.html']
FILES = PAGES + ['app.js', 'data/posts-loader.js', 'data/home-analysis-ui.js']
before = {p: (ROOT/p).read_bytes() for p in FILES}
subprocess.run(['node','scripts/render-core-content.mjs'], check=True)
assert before == {p: (ROOT/p).read_bytes() for p in FILES}, 'Build is not idempotent'
assert 'document.documentElement' not in (ROOT/'scripts/analysis-snapshot-runtime.js').read_text()
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = http.server.ThreadingHTTPServer(('127.0.0.1',0), functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
source_s=json.loads((ROOT/'.cache-home-stats/gangseo_apt_summary.json').read_text())
source_d=json.loads((ROOT/'.cache-home-stats/gangseo_apt_detail.json').read_text())
housing_current=json.loads((ROOT/'public-housing/current.json').read_text(encoding='utf-8'))
supplements=json.loads((ROOT/'public-housing/source-supplements.json').read_text(encoding='utf-8'))
current_by_id={str(item.get('id') or ''):item for item in housing_current.get('items',[]) if isinstance(item,dict)}
for item in supplements.get('items',[]):
    item_id=str(item.get('id') or '')
    assert item_id in current_by_id, f'supplemented housing notice missing from current feed: {item_id}'
    assert current_by_id[item_id].get('title')==item.get('title'), f'supplement title mismatch: {item_id}'
    if item.get('published_at'):
        assert current_by_id[item_id].get('published_at')==item.get('published_at'), f'supplement publish date mismatch: {item_id}'
alert_js=(ROOT/'data/new-housing-alert.js').read_text(encoding='utf-8')
assert "FEED_URL='/public-housing/current.json'" in alert_js, 'new housing alert must use canonical local feed first'
artifacts=ROOT/'test-artifacts/static-first'
artifacts.mkdir(parents=True,exist_ok=True)
metrics=[]
checks=0
# Isolated validation-branch checks for HOME three-fix patch.
subprocess.run(['python','-m','unittest','discover','-s','scripts','-p','test_sh_application_contract.py','-v'],check=True)
subprocess.run(['python','-m','unittest','discover','-s','scripts','-p','test_housing_display_regressions.py','-v'],check=True)
subprocess.run(['node','scripts/test-sh-application-consumers.cjs'],check=True)
REVIEW_PAGES=[
    ('/blog/','부동산 실전 가이드','.guide-card',10),
    ('/tools/youth-score/','청년임대 계산기','h1',1),
    ('/public-housing/','LH·SH 임대주택 모집공고','.housing-card',3),
    ('/about/','Rent Check','h1',1),
    ('/privacy.html','개인정보 처리방침','h1',1),
    ('/contact/','문의','h1',1),
]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch()
        for width in [360,390,768,1280,1440]:
            for js in [False,True]:
                for mode in (['offline','healthy','malformed'] if js else ['offline']):
                    ctx=browser.new_context(viewport={'width':width,'height':900},java_script_enabled=js)
                    def route_request(route):
                        url=route.request.url
                        if 'gangseo_apt_summary.json' in url:
                            if mode=='healthy': return route.fulfill(json=source_s)
                            if mode=='malformed': return route.fulfill(json={'meta':{'updated':'bad'}})
                            return route.abort()
                        if 'gangseo_apt_detail.json' in url:
                            if mode=='healthy': return route.fulfill(json=source_d)
                            if mode=='malformed': return route.fulfill(json={})
                            return route.abort()
                        if not url.startswith(base): return route.abort()
                        if mode=='offline' and '/data/posts' in url and '.json' in url: return route.abort()
                        return route.continue_()
                    ctx.route('**/*',route_request)
                    page=ctx.new_page()
                    page.goto(base+'/',wait_until='networkidle')
                    assert page.locator('#insightTrack .insight-home').count()==4
                    assert page.locator('#insightTrack .rc-insight-summary').count()==4
                    assert page.locator('#articleLibrary .article-row').count()>=9
                    assert page.locator('#articleLibrary .article-category').count()==4
                    assert page.locator('#rentcheck-value,.rc-value-card').count()==0
                    assert page.locator('#rc-featured-guide').count()==1
                    guide=page.locator('#rc-featured-guide .rc-guide-link')
                    assert guide.count()==1
                    href=guide.get_attribute('href')
                    assert href=='/blog/public-housing-application-documents/'
                    assert (ROOT/href.lstrip('/')/'index.html').exists()
                    assert guide.inner_text().strip().startswith('추천 가이드')
                    bounds=guide.bounding_box()
                    container=page.locator('#calculators > .container').bounding_box()
                    assert 44<=bounds['height']<=88, bounds
                    assert abs(bounds['x']-container['x'])<=1, (bounds,container)
                    assert abs(bounds['width']-container['width'])<=1, (bounds,container)
                    heading=page.locator('#calculators .section-head').bounding_box()
                    gap=heading['y']-bounds['y']-bounds['height']
                    assert abs(gap-(28 if width<=768 else 40))<=1, gap
                    assert page.locator('#rc-featured-guide').evaluate('(el)=>el.previousElementSibling.id')=='services'
                    assert page.locator('#rc-featured-guide').evaluate('(el)=>el.nextElementSibling.id')=='calculators'
                    for selector in ['.rc-guide-label','.rc-guide-title','.rc-guide-arrow']:
                        child=guide.locator(selector).bounding_box()
                        assert child['x']>=bounds['x'] and child['x']+child['width']<=bounds['x']+bounds['width']+1
                    for href in page.locator('#insightTrack a').evaluate_all('(xs)=>xs.map(x=>x.getAttribute("href"))'):
                        assert (ROOT/href.lstrip('/')/'index.html').exists(),href
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                    if js and mode=='healthy':
                        question_controls=page.locator('a,button').evaluate_all('(xs)=>xs.filter(x=>/무엇이든|물어보세요/.test(x.textContent)).map(x=>({text:x.textContent.trim(),id:x.id,classes:x.className}))')
                        record={'width':width,'guide_height':bounds['height'],'left':bounds['x'],'content_width':bounds['width'],'gap_to_calculators':gap,'question_controls':question_controls}
                        metrics.append(record)
                        print('LAYOUT '+json.dumps(record,ensure_ascii=False),flush=True)
                        page.screenshot(path=str(artifacts/f'home-{width}.png'),full_page=True)
                        guide.screenshot(path=str(artifacts/f'guide-{width}.png'))
                    checks+=1
                    page.goto(base+'/tools/jeonse-ratio/',wait_until='networkidle')
                    assert page.locator('.v2-content-guide').count()==1
                    assert page.locator('#v2-content-guide-title').count()==1
                    assert '매매가 3억원' in page.locator('.v2-content-guide').inner_text()
                    if js:
                        for sale,jeonse,expected in [('50000','35000','70.0%'),('30000','24000','80.0%'),('30000','15000','50.0%')]:
                            page.fill('#sale',sale);page.fill('#jeonse',jeonse);page.click('#calculate')
                            assert page.locator('#ratio').inner_text()==expected
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                    checks+=1
                    page.goto(base+'/analysis/ujangsan-hillstate/',wait_until='networkidle')
                    assert page.locator('#app .answer').count()==1
                    assert page.locator('#app .cards').count()==1
                    assert page.locator('#rc-recent-records table').count()==1
                    assert page.locator('#rc-recent-records tbody tr').count()>=1
                    assert '불러오는 중' not in page.locator('#app').inner_text()
                    assert '자료 생성' in page.locator('#updated').inner_text()
                    if js:
                        assert page.evaluate("typeof setTab === 'function'")
                        page.evaluate("setTab('trend')")
                        page.wait_for_function("document.querySelector('#app .panel') && document.querySelector('#app .panel').innerText.includes('매매 6개월 흐름')")
                        trend_rows=page.locator('#app .panel table.trend tbody tr').count()
                        assert 6<=trend_rows<=7, trend_rows
                        bands=page.locator('.bands button').count()
                        if bands>1:
                            page.evaluate("setBand(Number(document.querySelectorAll('.bands button')[1].textContent.match(/\\d+/)[0]))")
                            page.wait_for_timeout(100)
                        assert page.locator('#rc-recent-records table').count()==1
                        page.evaluate("setTab('compare')")
                        page.wait_for_function("document.querySelector('#app .panel') && (/주변|반경/.test(document.querySelector('#app .panel').innerText))")
                        assert page.locator('#rc-recent-records table').count()==1
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                    checks+=1

                    for path,needle,selector,min_count in REVIEW_PAGES:
                        page.goto(base+path,wait_until='networkidle')
                        body_text=page.locator('body').inner_text()
                        assert needle in body_text,(path,needle)
                        assert page.locator(selector).count()>=min_count,(path,selector,page.locator(selector).count())
                        assert len(body_text.strip())>=180,(path,len(body_text.strip()))
                        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),path
                        if path=='/public-housing/':
                            assert '최종 청약 경쟁률' not in body_text
                            assert '청약접수결과' not in body_text
                        if js and mode=='healthy' and width in [390,1280]:
                            slug=path.strip('/').replace('/','-') or 'home'
                            if path.endswith('.html'): slug=Path(path).stem
                            page.screenshot(path=str(artifacts/f'adsense-{slug}-{width}.png'),full_page=True)
                        checks+=1

                    print(f'PASS width={width} js={js} network={mode}: core + AdSense pages, no overflow',flush=True)
                    ctx.close()
        # Targeted real-browser checks for deadline time, alias de-dupe/redirect and source status.
        source_status=housing_current.get('source_status') or {}
        lh_status=source_status.get('LH') or {}
        for width in [390,1280]:
            ctx=browser.new_context(viewport={'width':width,'height':900})
            page=ctx.new_page()
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(base+'/',wait_until='networkidle')
            trigger=page.locator('[data-public-housing-open]').first
            assert trigger.count()==1
            trigger.click()
            page.wait_for_selector('#publicHousingModal:not([hidden])')
            footer=page.locator('#publicHousingModal footer').inner_text()
            assert '수집 상태 미제공' not in footer,footer
            assert '수집 상태:' in footer,footer
            if lh_status.get('status')=='부분수집': assert 'LH 부분수집' in footer,footer
            joined=' '.join(map(str,(lh_status.get('errors') or [])+(lh_status.get('diagnostic_errors') or [])))
            if '403' in joined: assert 'API 403 오류' in footer,footer
            if joined and (lh_status.get('html_count') or 0)>0: assert '공식 HTML 대체 수집' in footer,footer
            page.locator('[data-filter="신혼·신생아"]').click()
            titles=page.locator('#publicHousingNoticeList .notice-title').all_inner_texts()
            ii=[t for t in titles if '신혼·신생아 매입임대주택Ⅱ' in t]
            assert len(ii)==1,(width,titles)
            page.locator('[data-filter="청년"]').click()
            rows=page.locator('#publicHousingNoticeList .notice-row')
            matched=[rows.nth(i).inner_text() for i in range(rows.count()) if '청년창업가' in rows.nth(i).inner_text()]
            assert matched and any('15:00' in x for x in matched),(width,matched)
            assert not errors,errors
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
            page.screenshot(path=str(artifacts/f'three-fixes-popup-{width}.png'),full_page=True)
            page.locator('#publicHousingModal .notice-close').click()
            assert page.locator('#publicHousingModal').get_attribute('hidden') is not None
            page.goto(base+'/public-housing/notices/sh-311087/',wait_until='networkidle')
            text=page.locator('body').inner_text()
            assert '2026년 10월 22일 15:00 (한국시간)' in text
            assert '마감시간 미확인' not in text and '마감시각은 확인되지 않았습니다' not in text
            page.screenshot(path=str(artifacts/f'three-fixes-sh311087-{width}.png'),full_page=True)
            page.goto(base+'/public-housing/notices/shyouth-23a63706ef0b942659cb/',wait_until='networkidle')
            page.wait_for_timeout(200)
            assert page.url.endswith('/public-housing/notices/sh-310653/'),page.url
            ctx.close()
        (artifacts/'three-fixes-validation.json').write_text(json.dumps({'widths':[390,1280],'checks':['popup opens','source status','SHII dedupe','SH311087 15:00','legacy alias redirect'],'status':'PASS'},ensure_ascii=False,indent=2),encoding='utf-8')
        print('THREE_FIX_BROWSER=PASS widths=390,1280 popup/source-status/dedupe/deadline/redirect')
        browser.close()
finally:
    (artifacts/'layout.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8')
    server.shutdown()
print(f'PASS {checks} page checks; calculator 70/80/50%; public housing filtered; trust pages readable; no overflow')
