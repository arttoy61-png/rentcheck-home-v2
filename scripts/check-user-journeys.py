"""Read-only browser and source checks for the user-journey patch."""
from __future__ import annotations
import argparse, functools, hashlib, http.server, json, os, threading
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
ROOT=Path.cwd()
OUT=Path(os.environ.get('JOURNEY_OUT','/tmp/rentcheck-journeys'));OUT.mkdir(parents=True,exist_ok=True)
TOOLS=[t for t in json.loads((ROOT/'data/tools.json').read_text()) if t['status']=='available' and t.get('url')]
ROUTES=['/'+t['url'].strip('/')+'/' for t in TOOLS]

def source_state():
    state={}
    for route in ROUTES:
        rel=route.lstrip('/')+'index.html';soup=BeautifulSoup((ROOT/rel).read_text(),'html.parser')
        state[rel]={
          'inline_scripts':[hashlib.sha256(x.encode_contents()).hexdigest() for x in soup.select('script:not([src])')],
          'canonical':soup.select_one('link[rel=canonical]')['href'],
          'h1':soup.h1.get_text(' ',strip=True),
          'robots':[x.get('content','') for x in soup.select('meta[name=robots]')],
          'inputs':[str(x) for x in soup.select('input,select,textarea')],
          'original_hrefs':[x['href'] for x in soup.select('a[href]') if not x.find_parent(class_='v2-content-guide')],
        }
    for relative in ['data','public-housing','blog','analysis']:
        for p in (ROOT/relative).rglob('*'):
            if p.is_file():state[str(p.relative_to(ROOT))]={'hash':hashlib.sha256(p.read_bytes()).hexdigest()}
    for p in ['styles.css','mobile-fix.css','sitemap.xml','robots.txt','tools/tool-design.css','tools/tool-shell.css']:
        state[p]={'hash':hashlib.sha256((ROOT/p).read_bytes()).hexdigest()}
    return state

def check_sources(phase):
    now=source_state()
    if phase=='before':
        (OUT/'source-before.json').write_text(json.dumps(now,ensure_ascii=False,indent=2))
        return
    previous=json.loads((OUT/'source-before.json').read_text()) if (OUT/'source-before.json').exists() else None
    if previous:
        for p,old in previous.items():
            current=now[p]
            if 'hash' in old:assert old==current,p
            else:
                for k,v in old.items():
                    if k=='original_hrefs':assert set(v)<=set(current[k]),(p,k)
                    else:assert v==current[k],(p,k)
    for route in ROUTES:
        s=BeautifulSoup((ROOT/route.lstrip('/')/'index.html').read_text(),'html.parser')
        assert len(s.select('.v2-content-guide'))==1,route
        assert len(s.select('#rc-guide-interpretation'))==1,route
        assert len(s.select('[data-primary-guide]'))==1,route
        for a in s.select('.v2-content-guide a[href]'):
            u=urlsplit(urljoin('https://rent-check.kr'+route,a['href']))
            if u.hostname=='rent-check.kr':
                p=ROOT/u.path.lstrip('/');assert p.is_file() or (p/'index.html').is_file(),a
    home=BeautifulSoup((ROOT/'index.html').read_text(),'html.parser')
    assert len(home.select('#services a'))==5
    print('SOURCE_PROTECTION=PASS (form inputs, original inline scripts, H1/canonical/robots, feeds, all existing articles, sitemap and base CSS preserved)')

def sample(page,route):
    def fill(id,value):page.locator('#'+id).fill(str(value))
    def outputs(ids):return {i:page.locator('#'+i).inner_text() for i in ids}
    if route=='/tools/rent-vs-monthly/':
        for k,v in {'jeonse':30000,'mDeposit':5000,'monthly':100,'rate':4}.items():fill(k,v)
        page.locator('#calculate').click();return outputs(['jCost','mCost','diff','verdict'])
    if route=='/tools/rent-conversion/':
        for k,v in {'depositChange':1000,'rate':4,'currentRent':50,'baseRate':3}.items():fill(k,v)
        page.locator('#calculate').click();a=outputs(['changeValue','rateValue','legalValue','newRent'])
        page.locator('[data-value="up"]').click();page.locator('#calculate').click();return {'down':a,'up':outputs(['changeValue','rateValue','legalValue','newRent'])}
    if route=='/tools/brokerage-fee/':
        page.locator('[data-value="monthly"]').click();fill('deposit',1000);fill('monthly',50);page.locator('#calculate').click()
        return outputs(['feeValue','dealValue','rateValue','capValue'])
    if route=='/tools/rent-yield/':
        for k,v in {'price':30000,'deposit':3000,'rent':100,'loanRatio':0,'interestRate':0,'taxRate':0}.items():fill(k,v)
        page.locator('#calculate').click();return outputs(['yieldValue','equityValue','netIncomeValue','grossYieldValue'])
    if route=='/tools/youth-score/':
        page.locator('#rankBox label[data-r="3"]').click();page.locator('.chk[data-k="parent_nohouse"]').click();page.locator('#payq label[data-p="3"]').click();page.locator('#showBtn').click()
        return outputs(['mScore'])
    return None

def close_housing_popup(page):
    close=page.locator('.rc-new-alert__close')
    if close.count() and close.is_visible():close.click();page.wait_for_timeout(100)

def home_clicks(page,base):
    found=[]
    for n in range(5):
        page.goto(base+'/',wait_until='domcontentloaded',timeout=30000);page.wait_for_timeout(500);close_housing_popup(page)
        target=page.locator('#services a').nth(n)
        expected=urlsplit(urljoin(base+'/',target.get_attribute('href')))
        label=target.inner_text();target.click();page.wait_for_timeout(500)
        actual=urlsplit(page.url)
        assert (actual.path,actual.fragment)==(expected.path,expected.fragment),(expected,actual)
        assert page.locator('h1').count(),page.url
        found.append({'label':label,'path':actual.path,'fragment':actual.fragment})
    return found

def browser(phase,live=False):
    server=None
    if live:base='https://rent-check.kr'
    else:
        handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT))
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
        threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
    rows=[]
    try:
      with sync_playwright() as p:
        b=p.chromium.launch()
        for route in ['/']+ROUTES+['/contact/']:
          for width in [390,1280]:
            context=b.new_context(viewport={'width':width,'height':900})
            context.route('**/*',lambda r:r.abort() if any(h in (urlsplit(r.request.url).hostname or '') for h in ['googletagmanager','google-analytics','doubleclick','googlesyndication','wcs.naver','wcs.pstatic']) else r.continue_())
            page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            row={'route':route,'width':width,'javascript':True}
            try:
              res=page.goto(base+route,wait_until='domcontentloaded',timeout=30000);page.wait_for_timeout(900)
              if route=='/':close_housing_popup(page)
              row.update(status=res.status,overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+2'),guides=page.locator('.v2-content-guide').count(),errors=errors)
              if row['overflow']:
                  row['overflow_elements']=page.evaluate("Array.from(document.body.querySelectorAll('*')).map(e=>({tag:e.tagName,cls:e.className,id:e.id,right:e.getBoundingClientRect().right})).filter(e=>e.right>innerWidth+2).slice(0,12)")
              row['sample']=sample(page,route)
              if phase!='before' and route in ROUTES:
                row['primary_href']=page.locator('[data-primary-guide]').get_attribute('href')
                row['guide_visible']=page.locator('.v2-content-guide').is_visible()
                nexts=page.locator('.v2-result-next.is-visible')
                if row['sample'] and route!='/tools/youth-score/':row['result_context_link']=nexts.locator('a[href="#rc-guide-interpretation"]').count()
                if route!='/tools/youth-score/':
                    page.locator('.rc-tool-reading-nav a[href="#rc-guide-interpretation"]').click();page.wait_for_timeout(150)
                    row['interpretation_anchor']=urlsplit(page.url).fragment
              if route=='/':row['service_links']=page.locator('#services a').evaluate_all('(els)=>els.map(x=>({text:x.innerText,href:x.getAttribute("href")}))')
              if route in ['/','/tools/rent-check/','/tools/rent-vs-monthly/','/tools/brokerage-fee/','/contact/']:
                page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(100)
                filename=f'{phase}-'+route.strip('/').replace('/','_')+'-'+str(width)+'.png';page.screenshot(path=str(OUT/filename),full_page=True);row['screenshot']=filename
              if phase!='before' and route=='/':row['clicked_entries']=home_clicks(page,base)
              if phase!='before' and route in ['/tools/rent-vs-monthly/','/tools/brokerage-fee/']:
                expected=urljoin(page.url,row['primary_href'])
                page.locator('[data-primary-guide]').click();page.wait_for_timeout(300)
                assert urlsplit(page.url).path==urlsplit(expected).path
                row['clicked_guide_h1']=page.locator('h1').first.inner_text()
            except Exception as e:row['error']=str(e)[:800]
            rows.append(row);context.close()
        if phase!='before':
          context=b.new_context(java_script_enabled=False,viewport={'width':360,'height':800})
          for route in ['/']+ROUTES:
            page=context.new_page();row={'route':route,'width':360,'javascript':False}
            try:
              res=page.goto(base+route,wait_until='domcontentloaded',timeout=30000)
              row.update(status=res.status,overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+2'),guides=page.locator('.v2-content-guide').count())
              if route=='/':row['service_count']=page.locator('#services a').count()
              else:
                row['guide_visible']=page.locator('.v2-content-guide').is_visible();row['primary_href']=page.locator('[data-primary-guide]').get_attribute('href')
              if row['overflow']:row['overflow_elements']=page.evaluate("Array.from(document.body.querySelectorAll('*')).map(e=>({tag:e.tagName,cls:e.className,id:e.id,right:e.getBoundingClientRect().right})).filter(e=>e.right>innerWidth+2).slice(0,12)")
            except Exception as e:row['error']=str(e)[:500]
            rows.append(row);page.close()
          context.close()
        b.close()
    finally:
      if server:server.shutdown()
    (OUT/f'{phase}.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
    print('JOURNEY_BROWSER_'+phase.upper()+'='+json.dumps(rows,ensure_ascii=False))
    if phase!='before':
      previous=json.loads((OUT/'before.json').read_text()) if (OUT/'before.json').exists() else []
      for r in rows:
        assert r.get('status')==200 and not r.get('error'),r
        old=next((v for v in previous if v['route']==r['route'] and v['width']==r['width']),{})
        assert not (set(r.get('errors',[]))-set(old.get('errors',[]))),r
        assert not r.get('overflow'),r
        if r['route'] in ROUTES:
          assert r['guides']==1 and r['guide_visible'],r
          if r.get('sample') and previous:assert r['sample']==old.get('sample'),r
          if 'result_context_link' in r:assert r['result_context_link']>=1,r
        if r['route']=='/':
          if not r['javascript']:assert r['service_count']==5,r
          else:assert len(r['clicked_entries'])==5,r
      print(f'JOURNEY_BROWSER_CHECK=PASS ({len(rows)} observations; 5 home entries and related guides clicked; original calculation examples preserved; static content works without JavaScript)')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['before','after','live'],required=True);args=parser.parse_args()
    if args.phase!='live':check_sources(args.phase)
    browser(args.phase,live=args.phase=='live')
