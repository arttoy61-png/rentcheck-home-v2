"""HOME map regression. Preview, Kakao and MOLIT traffic are blocked.
The Google tag is a stub: queue assertions do not claim GA receipt.
"""
import argparse,json,os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
P=argparse.ArgumentParser();P.add_argument('--base',default='http://127.0.0.1:8765');P.add_argument('--out',default='test-artifacts/home-map');args=P.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
base=args.base.rstrip('/');origin=urlsplit(base).netloc
reports=[]
with sync_playwright() as pw:
    executable=os.environ.get('CHROMIUM_EXECUTABLE')
    browser=pw.chromium.launch(headless=True,**({'executable_path':executable} if executable else {}))
    for name,width,height,mobile in [('pc',1440,1000,False),('mobile',390,844,True)]:
        context=browser.new_context(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile)
        context.add_init_script('window.__RC_MAP_ANALYTICS_TEST__=true;')
        errors=[];failed=[];preview=[];blocked=[];google_scripts=[];checks=[]
        def route(r):
            u=r.request.url;host=urlsplit(u).netloc
            if 'rentcheck-preview' in u:
                preview.append(u);r.abort();return
            if 'googletagmanager.com/gtag/js' in u:
                google_scripts.append(u);r.fulfill(status=200,content_type='text/javascript',body='/* Test-only queue validation: no analytics traffic. */');return
            if host==origin:r.continue_();return
            blocked.append(u.split('?')[0]);r.abort()
        context.route('**/*',route)
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:failed.append({'url':r.url,'status':r.status}) if urlsplit(r.url).netloc==origin and r.status>=400 else None)
        def check(value,label):
            assert value,label
            checks.append(label)
        def act(locator):
            if mobile:locator.tap(timeout=12000)
            else:locator.click(timeout=12000)
        try:
            page.goto(base+'/redevelopment/?utm_source=naver&utm_medium=referral',referer='https://blog.naver.com/spitoon61',wait_until='networkidle',timeout=60000)
            page.wait_for_selector('.site-card',timeout=30000)
            check(page.locator('.site-card').count()>0,'initial-list-rendered')
            check(page.locator('#map .district').count()==25,'25-district-svg-map')
            check('rent-check.kr/redevelopment/'==page.locator('link[rel=canonical]').get_attribute('href').split('://')[1],'home-canonical')
            check(page.locator('main').count()==1,'map-only-no-preview-products')
            page.screenshot(path=str(out/(name+'-start.png')),full_page=True)
            page.locator('#designDistrict').select_option(label='강서구')
            page.wait_for_timeout(150)
            check('강서구' in page.locator('#resultTitle').inner_text(),'district-filter')
            if mobile:
                act(page.locator('[data-open-search]'))
                page.locator('#mobileSearchQuery').fill('방화6')
                act(page.locator('[data-search-results]'))
            else:page.locator('#globalMapSearch').fill('방화6')
            page.wait_for_selector('.site-card',timeout=12000)
            check('방화' in page.locator('.site-card').first.inner_text(),'site-search')
            act(page.locator('.site-detail-link').first)
            page.wait_for_selector('#detailTitle',timeout=20000)
            page.wait_for_timeout(600)
            check('방화' in page.locator('#detailTitle').inner_text(),'site-detail-open')
            check(page.locator('.nearby-transactions').count()>0,'saved-nearby-data-rendered')
            direct=page.url
            check('?site=' in direct,'detail-direct-route')
            check('utm_source=naver' in direct and 'utm_medium=referral' in direct,'campaign-query-preserved')
            page.screenshot(path=str(out/(name+'-detail.png')),full_page=True)
            act(page.locator('#closeDetail'))
            page.wait_for_timeout(300)
            check(not page.locator('#detail').is_visible(),'return-to-list')
            if mobile:
                act(page.locator('[data-open-menu]'))
                check(page.locator('#mobileMenu').is_visible(),'mobile-menu-open')
                act(page.locator('[data-menu-close]'))
                act(page.locator('[data-open-search]'));page.locator('#mobileSearchQuery').fill('');act(page.locator('[data-search-results]'))
            else:page.locator('#globalMapSearch').fill('')
            page.locator('#designDistrict').select_option(label='서울 전체')
            page.wait_for_timeout(200)
            old_box=page.locator('#map').get_attribute('viewBox');act(page.locator('#zoomIn'))
            check(old_box!=page.locator('#map').get_attribute('viewBox'),'map-zoom')
            act(page.locator('#zoomOut'))
            commands=page.evaluate('(window.dataLayer||[]).map(x=>Array.from(x))')
            configs=[x for x in commands if x[0]=='config']
            check(len(configs)==1 and configs[0][1]=='G-MPRR3J99YQ','one-existing-home-google-config')
            check(len(google_scripts)==1,'one-google-script')
            check(configs[0][2]['page_referrer'].startswith('https://blog.naver.com/'),'external-referrer-preserved')
            check(not [x for x in commands if x[0]=='event' and x[1]=='page_view'],'no-manual-pageview-duplicates')
            check(not preview,'zero-preview-network-dependencies')
            check(not failed,'no-local-asset-http-errors')
            check(not errors,'no-browser-javascript-errors')
            check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'no-page-horizontal-overflow')
            page2=context.new_page();page2.goto(direct,wait_until='networkidle');page2.wait_for_selector('#detailTitle',timeout=20000)
            check('방화' in page2.locator('#detailTitle').inner_text(),'fresh-direct-detail-load')
            page2.close()
            reports.append({'device':name,'state':'passed','checks':checks,'blocked_external_domains':sorted(set(urlsplit(u).netloc for u in blocked)),'analytics':'stub-only, no Google transmission','mobile':'emulated touch, not physical device' if mobile else None})
        except Exception as e:
            page.screenshot(path=str(out/(name+'-failure.png')),full_page=True)
            reports.append({'device':name,'state':'failed','reason':str(e),'passed_checks':checks,'js_errors':errors,'http_errors':failed,'preview_requests':preview})
        finally:context.close()
    browser.close()
(out/'result.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
print(json.dumps(reports,ensure_ascii=False))
raise SystemExit(0 if all(r['state']=='passed' for r in reports) else 1)
