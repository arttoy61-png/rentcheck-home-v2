"""Browser evidence for scoped article changes; no writes to user data or external accounts."""
from __future__ import annotations
import argparse, csv, functools, hashlib, http.server, io, json, os, threading, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
from editorial_20260925 import PATHS, ROOT, OUT, MARK

def run(stage):
    live=stage=='live';server=None
    if live:base='https://rent-check.kr'
    else:
        handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT))
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
        threading.Thread(target=server.serve_forever,daemon=True).start()
        base=f'http://127.0.0.1:{server.server_port}'
    records=[]; observations=[]
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            for path in PATHS:
                route='/'+path.removesuffix('index.html')
                for width in [360,390,1280]:
                    page=browser.new_page(viewport={'width':width,'height':900});errors=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    row={'route':route,'width':width}
                    try:
                        response=page.goto(base+route,wait_until='domcontentloaded',timeout=25000)
                        page.wait_for_timeout(450)
                        row.update(status=response.status if response else None,errors=errors,overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+2'),review_marker=page.locator('[data-editorial-review="20260925"]').count(),h1=page.locator('h1').inner_text(),tables=page.locator('main table').count())
                        if width==390:
                            name=route.strip('/').replace('/','_')
                            page.screenshot(path=str(OUT/f'{stage}-{name}-390.png'),full_page=True)
                    except Exception as e:row['error']=str(e)[:500]
                    records.append(row);page.close()
            # Readability of the actual first HTML without JavaScript.
            ctx=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':900})
            for path in PATHS:
                page=ctx.new_page();route='/'+path.removesuffix('index.html')
                row={'route':route,'javascript':False}
                try:
                    response=page.goto(base+route,wait_until='domcontentloaded',timeout=25000)
                    row.update(status=response.status,review_marker=page.locator('[data-editorial-review="20260925"]').count(),text_characters=len(page.locator('main').inner_text()),overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+2'))
                except Exception as e:row['error']=str(e)[:500]
                records.append(row);page.close()
            ctx.close()
            # Observe existing popup close/scroll/navigation; do not redesign or disable it.
            for width in [390,1280]:
                page=browser.new_page(viewport={'width':width,'height':900});row={'kind':'home-navigation','width':width}
                try:
                    page.goto(base+'/',wait_until='domcontentloaded',timeout=25000);page.wait_for_timeout(1800)
                    close=page.locator('#rcNewHousingAlert .rc-new-alert__close')
                    row['popup_was_visible']=close.is_visible()
                    if close.is_visible():close.click()
                    page.wait_for_timeout(250)
                    row['popup_still_visible']=close.is_visible()
                    page.evaluate('window.scrollTo(0,500)');page.wait_for_timeout(150)
                    row['scroll_y']=page.evaluate('window.scrollY')
                    # Select a visible ordinary home entry, never force a blocked click.
                    candidates=page.locator('a[href="/tools/apartment/"]')
                    entry=next((candidates.nth(i) for i in range(candidates.count()) if candidates.nth(i).is_visible()),None)
                    assert entry is not None,'No visible apartment entry'
                    entry.click();page.wait_for_url('**/tools/apartment/**',timeout=15000)
                    row['apartment_reached']=page.url.split('?')[0].endswith('/tools/apartment/')
                    page.screenshot(path=str(OUT/f'{stage}-navigation-{width}.png'),full_page=True)
                except Exception as e:row['error']=str(e)[:500]
                observations.append(row);page.close()
            page=browser.new_page(viewport={'width':390,'height':900})
            try:
                page.goto(base+'/analysis/gangseo-jeonse-trend/',wait_until='domcontentloaded',timeout=25000)
                page.wait_for_function('document.querySelector("#dataStatus").textContent.includes("집계 완료") || getComputedStyle(document.querySelector("#errorBox")).display !== "none"',timeout=25000)
                observations.append({'kind':'existing-jeonse-chart','data_status':page.locator('#dataStatus').inner_text(),'answer':page.locator('#answerText').inner_text(),'bars':page.locator('.bar-item').count(),'error_visible':page.locator('#errorBox').is_visible()})
                page.screenshot(path=str(OUT/f'{stage}-existing-jeonse-chart.png'),full_page=True)
            except Exception as e:observations.append({'kind':'existing-jeonse-chart','error':str(e)[:500]})
            page.close();browser.close()
    finally:
        if server:server.shutdown()
    report={'stage':stage,'article_observations':records,'existing_feature_observations':observations,'scope':'Chromium viewport checks, not a physical iPhone or all possible inputs.'}
    (OUT/f'{stage}-editorial.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print('ARTICLE_BROWSER_'+stage.upper()+'='+json.dumps(report,ensure_ascii=False))
    for row in records:
        assert row.get('status')==200 and not row.get('error'),row
        assert not row.get('overflow') and not row.get('errors'),row
        if stage!='before':assert row['review_marker']==1,row
    # Preserve but do not disguise pre-existing features as freshly certified content.
    if stage!='before':
        for row in observations:
            if row['kind']=='home-navigation':
                assert row.get('apartment_reached') and not row.get('popup_still_visible') and row.get('scroll_y',0)>0,row
    print('ARTICLE_BROWSER_PASS='+str(len(records)))

def coverage():
    url='https://raw.githubusercontent.com/arttoy61-png/rent-check/main/molit_kangseo.csv'
    report={'source':url,'scope':'Read-only coverage check of the current CSV used by the existing 23-month chart; not a new collection run.'}
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'RentCheck-ReadOnlyAudit','Cache-Control':'no-cache'})
        with urllib.request.urlopen(req,timeout=30) as r:raw=r.read()
        text=raw.decode('utf-8-sig');rows=list(csv.DictReader(io.StringIO(text)))
        kinds={}
        for kind in ['아파트_전월세','연립다세대_전월세','오피스텔_전월세']:
            selected=[r for r in rows if r.get('deal_type')==kind]
            months=sorted({r.get('deal_ym','') for r in selected if r.get('deal_ym')})
            kinds[kind]={'rows':len(selected),'months':months,'min':min(months) if months else None,'max':max(months) if months else None}
        report.update(sha256=hashlib.sha256(raw).hexdigest(),total_rows=len(rows),types=kinds)
    except Exception as e:report['error']=str(e)[:500]
    (OUT/'existing-chart-source-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print('EXISTING_CHART_COVERAGE='+json.dumps(report,ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--stage',choices=['before','after','live']);parser.add_argument('--coverage',action='store_true');args=parser.parse_args()
    if args.stage:run(args.stage)
    if args.coverage:coverage()
