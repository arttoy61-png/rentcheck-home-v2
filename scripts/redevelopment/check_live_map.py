"""One explicitly selected post-deployment check. No geocoding/data collection.
Collect endpoints returning HTTP 2xx are transport evidence, not GA report receipt.
"""
import argparse,json,time,urllib.request,hashlib
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright
P=argparse.ArgumentParser();P.add_argument('--out',default='test-artifacts/home-map/live');a=P.parse_args()
out=Path(a.out);out.mkdir(parents=True,exist_ok=True);base='https://rent-check.kr';root=Path(__file__).resolve().parents[2]
expected=hashlib.sha256((root/'redevelopment/map-analytics.js').read_bytes()).hexdigest()
ready=False
for attempt in range(36):
 try:
  with urllib.request.urlopen(base+'/redevelopment/map-analytics.js?verify=home-migration',timeout=15) as r:data=r.read()
  if hashlib.sha256(data).hexdigest()==expected:ready=True;break
 except Exception:pass
 time.sleep(5)
if not ready:
 (out/'result.json').write_text(json.dumps({'state':'not_deployed_or_unreachable','expected_analytics_sha256':expected}));raise SystemExit(1)
report={'state':'running','GA_report_receipt':'not_verified','physical_mobile':'not_tested'}
with sync_playwright() as pw:
 browser=pw.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':1000})
 ctx.add_init_script("window.dataLayer=window.dataLayer||[];(function(){window.dataLayer.push(arguments)})('set','debug_mode',true);")
 events=[];preview=[];blocked=[];errors=[]
 def route(r):
  u=r.request.url
  if 'rentcheck-preview' in u:preview.append(u);r.abort();return
  if '/v2/local/' in u or 'apis.data.go.kr' in u or 'api.vworld.kr' in u:
   blocked.append(u.split('?')[0]);r.abort();return
  r.continue_()
 ctx.route('**/*',route)
 def receive(response):
  request=response.request;u=request.url
  if 'google-analytics.com/g/collect' not in u and 'analytics.google.com/g/collect' not in u:return
  common={k:v[-1] for k,v in parse_qs(urlsplit(u).query).items()}
  for line in (request.post_data or '').splitlines() or ['']:
   p={**common,**{k:v[-1] for k,v in parse_qs(line).items()}}
   events.append({k:p.get(k) for k in ['en','tid','dl','dr','cid','sid','_dbg'] }|{'status':response.status})
 ctx.on('response',receive);page=ctx.new_page();page.set_default_timeout(20000);page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(base+'/?utm_source=naver&utm_medium=referral&utm_campaign=rc_migration_debug',referer='https://blog.naver.com/spitoon61',wait_until='networkidle',timeout=60000)
  page.wait_for_timeout(3500)
  if page.locator('.rc-new-alert__close').is_visible():page.locator('.rc-new-alert__close').click()
  home_views=[e for e in events if e['en']=='page_view' and urlsplit(e.get('dl') or '').path=='/']
  assert len(home_views)==1,('home_initial_page_views',len(home_views))
  page.locator('#rc-redevelopment-map a').click();page.wait_for_selector('.site-card',state='attached',timeout=30000);page.wait_for_timeout(5000)
  map_views=[e for e in events if e['en']=='page_view' and urlsplit(e.get('dl') or '').path=='/redevelopment/']
  assert len(map_views)==1,('map_initial_page_views',len(map_views))
  assert map_views[0]['tid']=='G-MPRR3J99YQ'
  assert 200<=map_views[0]['status']<300
  report['initial_page_view_count']=1;report['home_to_map_same_client']=home_views[0]['cid']==map_views[0]['cid'];report['home_to_map_same_session']=home_views[0]['sid']==map_views[0]['sid']
  assert report['home_to_map_same_client'] and report['home_to_map_same_session']
  report['initial_external_referrer_preserved']=(home_views[0].get('dr') or '').startswith('https://blog.naver.com/')
  report['map_referrer']=map_views[0].get('dr')
  report['kakao_connected']=page.evaluate('Boolean(window.RentKakaoSession?.isActive?.())')
  report['kakao_status']=page.locator('#kakaoConnectionStatus').inner_text()
  report['rendered_kakao_images']=page.locator('#kakaoMap img').count()
  page.screenshot(path=str(out/'live-map-PC.png'),full_page=True)
  page.locator('#designDistrict').select_option(label='강서구');page.locator('#redevelopmentShell [data-open-search]').click();page.locator('#mobileSearchQuery').fill('방화6');page.locator('[data-search-results]').click();page.locator('.site-detail-link').first.click();page.wait_for_selector('#detailTitle');page.wait_for_timeout(2500)
  assert '방화' in page.locator('#detailTitle').inner_text()
  assert page.locator('.nearby-update').count()>0
  report['nearby_update_notice']=page.locator('.nearby-update').first.inner_text()
  page.locator('[data-nearby-filter="radius"]').select_option('500');page.wait_for_timeout(300)
  assert page.locator('[data-nearby-filter="radius"]').input_value()=='500'
  page.locator('[data-nearby-filter="property"]').select_option('아파트');page.locator('[data-nearby-filter="deal"]').select_option('매매');page.wait_for_timeout(300)
  report['nearby_filter_clicks']='passed';page.screenshot(path=str(out/'live-map-detail-PC.png'),full_page=True)
  page.wait_for_timeout(3000)
  map_views=[e for e in events if e['en']=='page_view' and urlsplit(e.get('dl') or '').path=='/redevelopment/']
  report['map_page_views_after_detail']=len(map_views)
  assert len(map_views)<=2,('unexpected_repeated_map_page_views',len(map_views))
  report['map_site_open_events']=len([e for e in events if e['en']=='map_site_open'])
  assert not preview,preview
  assert not blocked,blocked
  report['state']='passed';report['preview_requests']=len(preview);report['new_geocoding_requests']=len(blocked)
  report['javascript_errors']=errors
 except Exception as e:
  report['state']='failed';report['reason']=str(e);report['javascript_errors']=errors
  page.screenshot(path=str(out/'live-failure.png'),full_page=True)
 finally:
  report['google_transport_events']=[{k:v for k,v in e.items() if k not in ['cid','sid']} for e in events]
  ctx.close();browser.close()
(out/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
raise SystemExit(0 if report['state']=='passed' else 1)
