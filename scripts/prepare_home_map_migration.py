"""One-time pinned-source extraction; remove this tool before production merge."""
from pathlib import Path
import argparse,json,re,shutil
P=argparse.ArgumentParser();P.add_argument('--home',type=Path,required=True);P.add_argument('--source',type=Path,required=True);a=P.parse_args()
home=a.home;source=a.source/'app';dest=home/'redevelopment';dest.mkdir(exist_ok=True)
assert (home/'CNAME').read_text().strip()=='rent-check.kr'
assert not (dest/'index.html').exists(),'Do not overwrite an existing migration'
files=['LICENSE-DATA.txt','favicon.svg','districts.geojson','style.css','ui-polish.css','ui-polish.js','redevelopment-pilot.css','redevelopment-shell.css','redevelopment-seoul-nearby.css','redevelopment-status.js','redevelopment-nearby.js','redevelopment-card.js','redevelopment-pilot.js','redevelopment-shell.js','redevelopment-external-links.js','kakao-map-engine.js','kakao-session.js','kakao-autoconnect.js','config.public.js','data/projects.js','data/redevelopment-stage-checks.js','data/banghwa6-pilot.js','data/redevelopment-evidence.json','data/seoul-projects.json','data/moa-projects.json','data/gangseo-redevelopment-enrichment.json','data/redevelopment-map-points.json','data/redevelopment-nearby-seoul.json','data/redevelopment-nearby-status.json','data/redevelopment-nearby-pilot.json','data/geometry-manifest.json']
manifest=json.loads((source/'data/geometry-manifest.json').read_text());files+=['data/'+v['path'] for v in manifest.values() if v.get('verified') and v.get('path')];files=list(dict.fromkeys(files))
for f in files:
 p=source/f;assert p.is_file(),f
 out=dest/f;out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,out)
tools=json.loads((home/'data/tools.json').read_text());tool=next(t for t in tools if t['id']=='redevelopment');(dest/'data/tools_registry.json').write_text(json.dumps([tool],ensure_ascii=False),encoding='utf8')
text=(source/'index.html').read_text();text=text.replace('<meta name="robots" content="noindex,nofollow">','<meta name="robots" content="index,follow">')
text=re.sub(r'<title>.*?</title>','<title>서울 재개발·모아타운 지도 | Rent Check</title><meta name="description" content="서울 재개발·모아타운의 공식 등록 정보, 사업 단계와 확인된 경계를 지도·목록으로 찾고 주변 실거래의 수집일과 위치 연결 범위를 확인합니다."><link rel="canonical" href="https://rent-check.kr/redevelopment/">',text,count=1)
for ident in ('toolsPage','articlesPage','readerPage'):
 text,n=re.subn(r'<main id="'+ident+r'"[^>]*>.*?</main>','',text,flags=re.S);assert n==1,ident
text=re.sub(r'<nav class="topnav".*?</nav>','<nav class="topnav" aria-label="주요 메뉴"><a href="/">HOME</a><button data-page="map" aria-current="page">재개발 지도</button><a href="/#calculators">계산 도구</a><a href="/blog/">부동산 가이드</a></nav>',text,count=1,flags=re.S)
text=re.sub(r'<a class="header-calendar".*?</a>','',text,count=1,flags=re.S)
text=text.replace('<span class="private">비공개 검수중</span>','<span class="private">재개발 지도</span>')
text=re.sub(r'<div class="tabs" role="tablist".*?</div>','<div class="tabs" role="tablist" aria-label="지도 주제"><button role="tab" data-tab="redevelopment" aria-selected="true">재개발·모아타운</button></div>',text,count=1,flags=re.S)
text=re.sub(r'<footer>.*?</footer>','<footer><a class="brand small" href="/"><b>Rc</b> Rent Check HOME</a><button id="aboutBtn">자료·검토 범위</button><a href="/privacy.html">개인정보처리방침</a><a href="/contact/">문의</a><span>자료별 확인일·갱신 상태는 현장 상세에 표시</span></footer>',text,count=1,flags=re.S)
for name in ('home-calendar-ui.css','home-calendar-link.js','housing-list-state.js','housing-supply.js'):
 text=re.sub(r'<link\b[^>]*href="'+re.escape(name)+r'[^"]*"[^>]*>','',text)
 text=re.sub(r'<script\b[^>]*src="'+re.escape(name)+r'[^"]*"[^>]*>\s*</script>','',text)
text=text.replace('<script src="app.js?v=20261016-resize2" defer></script>','<script src="map-analytics.js" defer></script><script src="map-app.js?v=home-20261019" defer></script>')
text=text.replace('</head>','<link rel="stylesheet" href="home-map.css"></head>',1)
text=re.sub(r'<div class="aboutbody">.*?</div></dialog>','<div class="aboutbody"></div></dialog>',text,flags=re.S)
(dest/'index.html').write_text(text,encoding='utf8')
js=(source/'app.js').read_text()
def one(old,new):
 global js
 assert js.count(old)==1,(old[:100],js.count(old));js=js.replace(old,new,1)
one("const names={transactions:'실거래',housing:'공공주택',redevelopment:'재개발',sale:'분양',auction:'경매'};","const names={redevelopment:'재개발'};")
start=js.index('function parseRoute(');end=js.index('\nfunction navigate(',start)
js=js[:start]+"function parseRoute(hash){const query=String(hash||'').split('?')[1]||'',site=new URLSearchParams(query).get('site');return{page:'map',tab:'redevelopment',sub:'sites',selected:site||null,detailOpen:!!site};}"+js[end:]
one("function navigate(patch,{push=true}={}){","function navigate(patch,{push=true}={}){patch.page='map';patch.tab='redevelopment';")
js=js.replace('rentcheck-renewal-state-review9','rentcheck-home-map-state-v1').replace("window.RentCheckHousingList.today().slice(0,7)","new Date().toISOString().slice(0,7)")
resources={'geo':'districts.geojson','siteEvidence':'data/redevelopment-evidence.json','registry':'data/tools_registry.json','projectsCatalog':'data/seoul-projects.json','geometryManifest':'data/geometry-manifest.json','moaProjects':'data/moa-projects.json','gangseoEnrichment':'data/gangseo-redevelopment-enrichment.json','redevelopmentMapPoints':'data/redevelopment-map-points.json'}
js,n=re.subn(r'const resourceUrls=\{[^\n]+\};','const resourceUrls='+json.dumps(resources,ensure_ascii=False)+';',js,count=1);assert n==1
one("for(const p of ['map','tools','articles','reader'])$('#'+p+'Page').hidden=state.page!==p;","$('#mapPage').hidden=false;")
needle="function onClick(e){const el=e.target.closest('button,a,summary[data-filter-toggle],[data-district],[data-dong],[data-id]');if(!el)return;"
one(needle,needle+"if(el.dataset.page&&el.dataset.page!=='map'){e.preventDefault();location.href=el.dataset.page==='tools'?'/#calculators':'/blog/';return;}")
for selector in ('#articleSearch','#backReader','#articleFrame'):js=js.replace("$('"+selector+"').addEventListener","$('"+selector+"')?.addEventListener")
one("await render();$('#results').setAttribute('aria-busy','false');refreshHomeCalendar();scheduleHousingClock();","await render();$('#results').setAttribute('aria-busy','false');window.RentHomeMapAnalytics?.ready();")
js=js.replace('renderCalendarDialog();renderDesignControls();renderHomeCalendarStatus();','renderDesignControls();window.RentHomeMapAnalytics?.observe(state);')
js=js.replace("if(history.state?.schema===9)state={...defaults,...history.state.state};","if(history.state?.schema===9)state={...defaults,...history.state.state,page:'map',tab:'redevelopment'};")
js=js.replace("const explicit=parseRoute(location.hash);","state.page='map';state.tab='redevelopment';const explicit=parseRoute(location.hash);")
js=js.replace('<button data-page="tools">계산도구</button><button data-page="articles">글 모아보기</button>','<a href="/#calculators">계산도구</a><a href="/blog/">부동산 가이드</a>')
about='<p>서울시 공식 정비사업 등록 자료와 모아타운 관리구역을 구분해 표시합니다. 등록 건과 관리구역은 단위가 달라 합산하지 않습니다. 확인된 공식 경계와 위치만 표시합니다.</p><p>사업 단계·등록 목록·경계는 각 자료의 확인일 기준입니다. 자동 수집이 새 공식 사업 이력을 모두 갱신한다는 뜻은 아닙니다.</p><p>주변 실거래는 별도 수집 결과를 HOME으로 가져옵니다. 수집 실패·오래된 자료·주소 위치 미연결은 현장 상세에서 별도로 표시하며, 미연결을 거래 0건으로 해석하지 않습니다.</p><p>HOME과 같은 Google Analytics 속성을 사용합니다. 검색 입력 내용·개인 위치를 분석 이벤트에 보내지 않습니다. <a href="/privacy.html">개인정보처리방침</a></p><p>기존 카카오 지도 연결을 유지합니다. 주소 좌표를 새로 조회하지 않습니다. 내 위치는 사용자가 명시적으로 선택할 때만 브라우저 권한을 요청합니다.</p><p>경계자료 이용조건: SGIS · vuski/admdongkor, CC BY 4.0. <a href="LICENSE-DATA.txt">이용조건</a></p>'
js,n=re.subn(r"\$\('#about \.aboutbody'\)\.innerHTML=`.*?`;","$('#about .aboutbody').innerHTML=`"+about+"`;",js,count=1,flags=re.S);assert n==1
(dest/'map-app.js').write_text(js,encoding='utf8')
kakao=(dest/'kakao-session.js').read_text().replace('검수중 · 카카오 연결','재개발 지도 · 카카오 연결').replace('다섯 지도 탭에서 공통 지도를 사용합니다.','재개발 지도에 연결됐습니다.');(dest/'kakao-session.js').write_text(kakao,encoding='utf8')
(dest/'home-map.css').write_text('''/* HOME map only: no styles escape this document. */
.topnav>a{display:inline-flex;align-items:center;padding:8px 12px;color:inherit;text-decoration:none;font-size:13px;font-weight:700;white-space:nowrap}
.menu-links>a{display:block;padding:12px;color:inherit;text-decoration:none}footer>a{color:inherit}.tabs{min-height:40px}
@media(max-width:700px){header .topnav>a{display:none}footer{flex-wrap:wrap}.topnav button{min-width:44px}}
''',encoding='utf8')
(dest/'map-analytics.js').write_text('''/* One Google tag, same HOME property. No hand-sent page_view events. */
(()=>{'use strict';const id='G-MPRR3J99YQ';let initialized=false,lastSite=null;
function ready(){if(initialized)return;initialized=true;if(!['rent-check.kr','www.rent-check.kr'].includes(location.hostname)&&!window.__RC_MAP_ANALYTICS_TEST__)return;
window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
gtag('js',new Date());gtag('config',id,{page_location:location.href,page_referrer:document.referrer,debug_mode:new URLSearchParams(location.search).get('rc_debug')==='1'});
const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;script.dataset.rentcheckMapAnalytics='true';document.head.append(script);}
function observe(state){if(!initialized||typeof window.gtag!=='function')return;const site=state.selected||null;if(site===lastSite)return;lastSite=site;if(site)gtag('event','map_site_open',{site_id:String(site),map_section:'redevelopment',send_to:id});}
window.RentHomeMapAnalytics={ready,observe};})();
''',encoding='utf8')
scripts=home/'scripts/redevelopment';scripts.mkdir(parents=True,exist_ok=True)
for n in ('import_isolated_feed.py','validate_map_file.py','test_isolated_feed.py'):shutil.copyfile(a.source/'scripts/seoul-redevelopment'/n,scripts/n)
f=home/'index.html';h=f.read_text();old='https://arttoy61-png.github.io/rentcheck-preview/#map/redevelopment';assert h.count(old)==1;f.write_text(h.replace(old,'/redevelopment/'),encoding='utf8')
f=home/'sitemap-base-20260930.xml';s=f.read_text();assert 'https://rent-check.kr/redevelopment/' not in s;s=s.replace('</urlset>','  <url><loc>https://rent-check.kr/redevelopment/</loc><lastmod>2026-10-19</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>\n</urlset>');f.write_text(s)
f=home/'.github/workflows/update-home-stats.yml';w=f.read_text();needle='      - name: Build internal search index from existing pages\n';assert w.count(needle)==1
w=w.replace(needle,'''      - name: Import redevelopment feed directly from existing public source
        id: redevelopment
        continue-on-error: true
        run: python scripts/redevelopment/import_isolated_feed.py --map-dir redevelopment/data
      - name: Report preserved redevelopment data on upstream failure
        if: steps.redevelopment.outcome == 'failure'
        run: echo "::warning::Redevelopment upstream/import is not current. Previous good map retained; see redevelopment/data/redevelopment-nearby-status.json."
'''+needle)
needle='          git diff --cached --quiet || git commit';assert w.count(needle)==1;w=w.replace(needle,'          git add -- redevelopment/data/redevelopment-nearby-seoul.json redevelopment/data/redevelopment-nearby-status.json\n'+needle);f.write_text(w)
report={'home_base':'780ac78c3f45c1e449a641ec5823978991c05132','map_source_revision':'c1200eb6c8e0799ae0a664bf74569539d3c5d557','new_path':'/redevelopment/','files_copied':files,'google_measurement_id':'G-MPRR3J99YQ','upstream':'arttoy61-png/rent-check@redevelopment-map-state','collector_modified':False,'new_geocoding_requests':0,'limitations':['Registry and boundaries keep their existing as-of dates.','Importer preserves last good map when source collection fails.','Real GA receipt needs account-side validation.','Existing Kakao key/domain settings not changed.']}
(home/'docs/redevelopment-home-migration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'copied_files':len(files),'map_bytes':sum(p.stat().st_size for p in dest.rglob('*') if p.is_file()),'path':str(dest)},ensure_ascii=False))
