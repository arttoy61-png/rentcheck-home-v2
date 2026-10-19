"""Click-test existing HOME paths; analytics and external data APIs are blocked."""
import argparse,json,os,functools,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
P=argparse.ArgumentParser();P.add_argument('--base');P.add_argument('--out',default='test-artifacts/home-map/existing');a=P.parse_args()
root=Path(__file__).resolve().parents[2];server=None
if not a.base:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(root)))
 threading.Thread(target=server.serve_forever,daemon=True).start();a.base=f'http://127.0.0.1:{server.server_port}'
base=a.base.rstrip('/');origin=urlsplit(base).netloc;out=Path(a.out);out.mkdir(parents=True,exist_ok=True);results=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(**({'executable_path':os.environ['CHROMIUM_EXECUTABLE']} if os.environ.get('CHROMIUM_EXECUTABLE') else {}))
  for mobile in [False,True]:
   ctx=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000},is_mobile=mobile,has_touch=mobile)
   ctx.route('**/*',lambda r:r.continue_() if urlsplit(r.request.url).netloc==origin else r.abort())
   page=ctx.new_page();page.set_default_timeout(15000);errors=[];checks=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def act(x):x.tap() if mobile else x.click()
   def check(v,s):
    assert v,s
    checks.append(s)
   def home():
    page.goto(base+'/',wait_until='networkidle')
    if page.locator('.rc-new-alert__close').is_visible():act(page.locator('.rc-new-alert__close'))
   try:
    home();act(page.locator('.site-header .brand'));page.wait_for_load_state('networkidle');home()
    check(page.locator('#articleLibrary .article-category').count()==4,'home-four-categories')
    check(page.locator('#rc-redevelopment-map a').get_attribute('href')=='/redevelopment/','home-map-link-local')
    if mobile:
     act(page.locator('#menuToggle'));check(page.locator('#mobileNav').is_visible(),'mobile-menu');act(page.locator('#menuToggle'))
    for selector in ['.product-link','.service-strip a[href="/tools/apartment/"]']:
     home();act(page.locator(selector));page.wait_for_selector('.card.dc')
     act(page.locator('.card.dc').filter(has_text='화곡동'));page.wait_for_selector('.card.ac');act(page.locator('.card.ac').first)
     page.wait_for_selector('.det .tabs button')
     for kind in ['sale','jeonse','wolse']:
      act(page.locator(f'.det .tabs button[onclick="setTab(\'{kind}\')"]'))
      page.wait_for_selector('.deals');check(page.locator('.det .tabs button.on').get_attribute('onclick')==f"setTab('{kind}')",selector+'-'+kind)
    home()
    guides=page.locator('#articleLibrary .article-row')
    dates=guides.evaluate_all('(xs)=>xs.map((x,i)=>({i,date:x.querySelector("small")?.textContent||""}))')
    newest=max(dates,key=lambda x:x['date']);act(guides.nth(newest['i']))
    page.wait_for_selector('main h1');check(len(page.locator('main').inner_text())>300,'latest-visible-guide-click')
    page.goto(base+'/public-housing/',wait_until='networkidle');page.wait_for_selector('.housing-card');link=page.locator('.housing-card[href^="/"]').first;href=link.get_attribute('href');act(link);page.wait_for_load_state('networkidle')
    check(urlsplit(page.url).path==href,'housing-detail-click')
    page.goto(base+'/tools/jeonse-ratio/',wait_until='networkidle');page.locator('#sale').fill('30000');page.locator('#jeonse').fill('24000');act(page.locator('#calculate'))
    check(page.locator('#ratio').inner_text()=='80.0%','calculator-input-result')
    check(not errors,'no-javascript-errors');check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'no-overflow')
    results.append({'device':'mobile-emulation' if mobile else 'PC','state':'passed','checks':checks,'data':'existing local snapshot fallback; external calls blocked'})
   except Exception as e:
    page.screenshot(path=str(out/('mobile-failure.png' if mobile else 'pc-failure.png')),full_page=True)
    results.append({'device':'mobile-emulation' if mobile else 'PC','state':'failed','reason':str(e),'checks':checks,'errors':errors})
   ctx.close()
  browser.close()
finally:
 if server:server.shutdown()
(out/'result.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
raise SystemExit(0 if all(r['state']=='passed' for r in results) else 1)
