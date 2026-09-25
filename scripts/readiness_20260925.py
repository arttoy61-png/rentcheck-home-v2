"""Narrow, repeatable repairs and read-only evidence. Never submits to AdSense."""
from __future__ import annotations
import argparse, collections, hashlib, html, json, os, re, subprocess
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote

ROOT = Path.cwd()
OUT = Path(os.environ.get('READINESS_OUT', '/tmp/rentcheck-readiness'))
OUT.mkdir(parents=True, exist_ok=True)
GUIDES = {
    'LH:panId:2015122300020753': '/blog/gangseo-yeomchang-integrated-public-rental-2026/',
    'LH:panId:2015122300020759': '/blog/lh-seoul-youth-purchase-rental-2026-3/',
    'LH:panId:2015122300020750': '/blog/lh-seoul-newlywed-purchase-rental-1-2026-3/',
    'LH:panId:2015122300020749': '/blog/lh-seoul-newlywed-purchase-rental-2-2026-3/',
}
LABEL = '이 공고의 신청 가이드 →'
CORE = 'scripts/render-core-content.mjs'
GEN = 'scripts/generate-public-housing-pages.py'

def read(path):
    return Path(path).read_text(encoding='utf-8')

def once(text, old, new, label):
    if old not in text and new in text:
        return text
    if text.count(old) != 1:
        raise AssertionError(f'{label}: expected exactly one anchor, got {text.count(old)}')
    return text.replace(old, new, 1)

def button(url):
    return f'<a class="alt" href="{html.escape(url, quote=True)}">{LABEL}</a>'

def apply():
    """Stage all transformations before writing; no feeds, formulas or CSS edits."""
    paths = ['app.js', 'index.html', CORE, GEN]
    paths += [f'public-housing/notices/lh-{key.rsplit(":",1)[1]}/index.html' for key in GUIDES]
    originals = {p: read(p) for p in paths}
    updates = dict(originals)
    updates['app.js'] = once(updates['app.js'],
        "function resolveToolLinks(){$('[data-tool-link]').forEach(",
        "function resolveToolLinks(){$$('[data-tool-link]').forEach(", 'tool-link selector')
    replacements = {
        '<span>발행 분석 글</span><strong id="publishedCount">': '<span>네이버 발행 글</span><strong id="publishedCount">',
        '<p class="kicker">분석 글</p><h2>발행 글 찾아보기</h2>': '<p class="kicker">네이버 블로그</p><h2>네이버 발행 글</h2>',
        '<p>홈 자체 분석과 네이버 발행 글을 주제별로 찾습니다. 자체 분석은 위에서 먼저 확인할 수 있습니다.</p>': '<p>Rent Check가 네이버 블로그에 발행한 글을 주제별로 모았습니다. 홈페이지 자체 분석은 위 ‘Rent Check 자체 분석’에서 확인하세요.</p>',
        'src="app.js?v=static-first-20260908"': 'src="app.js?v=readiness-20260925"',
    }
    for old, new in replacements.items():
        updates['index.html'] = once(updates['index.html'], old, new, 'initial HTML label/cache')
    # Apply the same approved labels after the regular static generator has rendered.
    label_code = '\n// Keep initial HTML consistent with the existing site-stats-loader labels.\n'
    for old, new in list(replacements.items())[:3]:
        label_code += 'home=home.replace(' + json.dumps(old, ensure_ascii=False) + ',' + json.dumps(new, ensure_ascii=False) + ');\n'
    anchor = "outputs.set('index.html',home);"
    if '// Keep initial HTML consistent with the existing site-stats-loader labels.' not in updates[CORE]:
        updates[CORE] = once(updates[CORE], anchor, label_code + anchor, 'static generator labels')
    updates[CORE] = once(updates[CORE],
        '`src="${name}?v=static-first-20260908"`',
        '`src="${name}?v=${name===\'app.js\'?\'readiness-20260925\':\'static-first-20260908\'}"`',
        'static generator app cache')
    mapping = '\n# Existing editorial guides; schedules and public notice routes are unchanged.\nEDITORIAL_GUIDES = ' + repr(GUIDES) + '\n\n'
    gen = updates[GEN]
    if 'EDITORIAL_GUIDES = ' not in gen:
        gen = once(gen, 'def render_page(item: dict, route: str) -> str:', mapping + 'def render_page(item: dict, route: str) -> str:', 'guide mapping')
    line = "    canonical = f'https://rent-check.kr{route}'"
    insertion = (
        "    guide_url = EDITORIAL_GUIDES.get(str(item.get('id') or ''), '')\n"
        "    editorial_button = (\n"
        "        f'<a class=\"alt\" href=\"{esc(guide_url)}\">이 공고의 신청 가이드 →</a>'\n"
        "        if guide_url and Path(guide_url.lstrip('/') + 'index.html').is_file() else ''\n"
        "    )\n"
    )
    if '    guide_url = EDITORIAL_GUIDES.get' not in gen:
        # The canonical line also occurs in render_redirect: patch only inside render_page.
        start = gen.index('def render_page(')
        before, body = gen[:start], gen[start:]
        pos = body.index(line)
        body = body[:pos] + insertion + body[pos:]
        gen = before + body
    gen = once(gen, '<div class="housing-links">{official_button}', '<div class="housing-links">{editorial_button}{official_button}', 'generated guide button')
    updates[GEN] = gen
    current = json.loads(read('public-housing/current.json'))
    items = {x['id']: x for x in current['items']}
    for key, url in GUIDES.items():
        target = read(url.lstrip('/') + 'index.html')
        assert key.rsplit(':',1)[1] in target, f'Guide has no matching official notice ID: {url}'
        assert 'https://rent-check.kr' + url in target, f'Canonical missing: {url}'
        path = f'public-housing/notices/lh-{key.rsplit(":",1)[1]}/index.html'
        assert items[key]['route'] == '/' + path.removesuffix('index.html')
        updates[path] = once(updates[path], '<div class="housing-links">', '<div class="housing-links">' + button(url), 'existing notice link') if button(url) not in updates[path] else updates[path]
    compile(updates[GEN], GEN, 'exec')
    changed = []
    for path, text in updates.items():
        if text == originals[path]:
            continue
        (OUT/'originals'/path).parent.mkdir(parents=True, exist_ok=True)
        (OUT/'originals'/path).write_text(originals[path], encoding='utf-8')
        Path(path).write_text(text, encoding='utf-8')
        changed.append(path)
    (OUT/'changed-files.json').write_text(json.dumps(changed, ensure_ascii=False, indent=2))
    print('REPAIR_FILES=' + json.dumps(changed, ensure_ascii=False))

def verify():
    assert "function resolveToolLinks(){$$('[data-tool-link]').forEach(" in read('app.js')
    assert '<span>네이버 발행 글</span><strong id="publishedCount">' in read('index.html')
    assert re.search(r'src="app\.js\?v=(?:readiness|journeys)-20260925"', read('index.html'))
    # An empty selection is a valid page state, not an initialization error.
    import runpy
    namespace = runpy.run_path(GEN, run_name='readiness_generator_test')
    items = {x['id']:x for x in json.loads(read('public-housing/current.json'))['items']}
    for key,url in GUIDES.items():
        item=items[key]
        rendered=namespace['render_page'](item,item['route'])
        existing=read(item['route'].lstrip('/')+'index.html')
        assert button(url) in rendered and button(url) in existing
        assert item['official_url'].replace('&','&amp;') in rendered
    assert button(next(iter(GUIDES.values()))) not in namespace['render_page']({'id':'unknown','title':'테스트'},'/test/')
    for path in ['app.js',CORE]:
        subprocess.run(['node','--check',path], check=True)
    print('TARGETED_CHECKS=PASS (selector, initial labels, cache, four rendered/existing links, official URLs, syntax)')

def inventory():
    from bs4 import BeautifulSoup
    rows, missing = [], []
    for path in sorted(ROOT.rglob('*.html')):
        relative=path.relative_to(ROOT)
        if any(part.startswith('.') or part in {'node_modules','test-artifacts'} for part in relative.parts):
            continue
        soup=BeautifulSoup(read(path),'html.parser')
        main=soup.find('main') or soup.find('body') or soup
        robots=soup.find('meta',attrs={'name':'robots'})
        canonical=soup.find('link',rel='canonical')
        for tag in main.select('script,style,nav,header,footer'):
            tag.decompose()
        text=main.get_text(' ',strip=True)
        url='/'+str(relative).removesuffix('index.html')
        broken=[]
        for tag in soup.select('a[href]'):
            href=tag.get('href','')
            full=urlsplit(urljoin('https://rent-check.kr'+url,href))
            if full.hostname!='rent-check.kr' or full.scheme not in {'http','https'}:
                continue
            p=ROOT/unquote(full.path).lstrip('/')
            exists=p.is_file() or (p/'index.html').is_file()
            if not exists:
                broken.append(full.path)
        row={'path':str(relative),'title':soup.title.get_text(strip=True) if soup.title else '',
             'robots':robots.get('content','') if robots else '',
             'canonical':canonical.get('href','') if canonical else '',
             'main_text_characters':len(text),'broken_internal_targets':sorted(set(broken))}
        rows.append(row)
        if broken:missing.append({'path':str(relative),'targets':row['broken_internal_targets']})
    report={'note':'Read-only inventory; text length is not an approval threshold or a content-quality verdict.',
            'html_count':len(rows),'noindex_count':sum('noindex' in r['robots'] for r in rows),
            'broken_link_pages':missing,'pages':rows}
    (OUT/'inventory.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print('INVENTORY_SUMMARY='+json.dumps({k:v for k,v in report.items() if k!='pages'},ensure_ascii=False))

def browser(stage, live=False):
    import functools, http.server, threading
    from playwright.sync_api import sync_playwright
    server=None
    if live:
        base='https://rent-check.kr'
    else:
        handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT))
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
        threading.Thread(target=server.serve_forever,daemon=True).start()
        base=f'http://127.0.0.1:{server.server_port}'
    results=[]
    routes=['/','/blog/','/blog/all/','/analysis/','/public-housing/','/tools/youth-score/','/tools/apartment/','/calc/']
    routes += [f'/public-housing/notices/lh-{k.rsplit(":",1)[1]}/' for k in GUIDES]
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            for route in routes:
                for width in ([360,390,768,1280] if route=='/' else [390]):
                    page=browser.new_page(viewport={'width':width,'height':900})
                    errors=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    row={'route':route,'width':width}
                    try:
                        response=page.goto(base+route,wait_until='domcontentloaded',timeout=25000)
                        page.wait_for_timeout(1600)
                        row.update(status=response.status if response else None,title=page.title(),errors=errors,
                          overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+2'),
                          h1=page.locator('h1').first.inner_text() if page.locator('h1').count() else '')
                        if route=='/':
                            row['nav_apartment']=page.locator('a[href="/tools/apartment/"]').count()
                            row['post_label']=page.locator('#publishedCount').evaluate('(e)=>e.parentElement.querySelector("span").textContent')
                            page.screenshot(path=str(OUT/f'{stage}-home-{width}.png'),full_page=True)
                        if route=='/tools/youth-score/':
                            page.locator('#rankBox label[data-r="3"]').click()
                            page.locator('.chk[data-k="parent_nohouse"]').click()
                            page.locator('#payq label[data-p="3"]').click()
                            page.locator('#showBtn').click()
                            row['calculated_score']=page.locator('#mScore').inner_text()
                        if '/notices/lh-' in route:
                            key='LH:panId:'+route.rstrip('/').split('-')[-1]
                            row['editorial_link']=page.locator(f'a[href="{GUIDES[key]}"]').count()
                    except Exception as e:
                        row['error']=str(e)[:500]
                    results.append(row)
                    page.close()
            # Confirm source HTML remains useful with JavaScript disabled.
            context=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':900})
            page=context.new_page()
            try:
                response=page.goto(base+'/',wait_until='domcontentloaded',timeout=25000)
                results.append({'route':'/','javascript':False,'status':response.status,
                    'post_label':page.locator('#publishedCount').evaluate('(e)=>e.parentElement.querySelector("span").textContent'),
                    'curated_internal_links':page.locator('#insightTrack a[href^="/analysis/"]').count()})
                page.screenshot(path=str(OUT/f'{stage}-home-nojs.png'),full_page=True)
            except Exception as e:results.append({'route':'/','javascript':False,'error':str(e)[:500]})
            context.close();browser.close()
    finally:
        if server:server.shutdown()
    (OUT/f'{stage}.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    print('BROWSER_'+stage.upper()+'='+json.dumps(results,ensure_ascii=False))
    if stage=='after' and not live:
        before=json.loads((OUT/'before.json').read_text())
        for row in results:
            old=next((r for r in before if r.get('route')==row['route'] and r.get('width')==row.get('width') and r.get('javascript')==row.get('javascript')), {})
            assert row.get('status')==200, row
            assert not row.get('error'), row
            assert not set(row.get('errors',[]))-set(old.get('errors',[])), row
            assert not row.get('overflow') or old.get('overflow'), row
            if row['route']=='/':
                assert row['post_label']=='네이버 발행 글', row
                assert not any('forEach' in e for e in row.get('errors',[])), row
            if '/notices/lh-' in row['route']:assert row['editorial_link']==1, row
            if row['route']=='/tools/youth-score/':assert row['calculated_score']=='5점', row
        print('BROWSER_REGRESSION=PASS (no new page errors/overflow; home labels; four links; unchanged score=5)')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--verify',action='store_true')
    parser.add_argument('--inventory',action='store_true')
    parser.add_argument('--browser',choices=['before','after','live'])
    args=parser.parse_args()
    if args.apply:apply()
    if args.verify:verify()
    if args.inventory:inventory()
    if args.browser:browser(args.browser,live=args.browser=='live')
