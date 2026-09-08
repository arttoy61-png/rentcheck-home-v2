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
checks=0
try:
    with sync_playwright() as p:
        browser=p.chromium.launch()
        for width in [390,1280]:
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
                    for href in page.locator('#insightTrack a').evaluate_all('(xs)=>xs.map(x=>x.getAttribute("href"))'):
                        assert (ROOT/href.lstrip('/')/'index.html').exists(),href
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
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
                        page.locator('.tabs button').nth(1).click()
                        assert page.locator('#app table.trend tbody tr').count()==6
                        bands=page.locator('.bands button').count()
                        if bands>1: page.locator('.bands button').nth(1).click()
                        assert page.locator('#rc-recent-records table').count()==1
                        page.locator('.tabs button').nth(2).click()
                        assert '주변' in page.locator('#app .panel').inner_text() or '반경' in page.locator('#app .panel').inner_text()
                        assert page.locator('#rc-recent-records table').count()==1
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                    checks+=1
                    print(f'PASS width={width} js={js} network={mode}: three pages, no duplicate, no overflow')
                    ctx.close()
        browser.close()
finally:
    server.shutdown()
print(f'PASS {checks} page checks; calculator 70/80/50%; offline tabs; byte-identical repeat build')
