"""Pin a historical article to a verified 2026-08-23 source. Never runs collectors."""
from __future__ import annotations
import argparse,csv,hashlib,html,io,json,math,re,urllib.request
from pathlib import Path
from bs4 import BeautifulSoup
from editorial_20260925 import ROOT,OUT
PAGE='analysis/gangseo-jeonse-trend/index.html'
DATA='analysis/gangseo-jeonse-trend/data-20260823.json'
SHA='90793879b7ee9294bda02114ea9af006b5e4a257'
SOURCE=f'https://raw.githubusercontent.com/arttoy61-png/rent-check/{SHA}/molit_kangseo.csv'
MONTHS=[f'{y}{m:02}' for y in range(2024,2027) for m in range(1,13) if '202409'<=f'{y}{m:02}'<='202607']
TYPES={'apt':('아파트','아파트_전월세'),'house':('주택(연립·다세대)','연립다세대_전월세'),'off':('오피스텔','오피스텔_전월세')}
MARK='data-historical-snapshot="20260823"'
def num(v):return float(str(v or '').replace(',','').strip() or 0)
def fmt(n):return f'{math.floor(n+.5):,}'
def cf(n):return ('+' if n>=0 else '')+f'{n:.1f}%'
def classification(j,w):
    # The pre-existing article's 5% descriptive rule is unchanged.
    if j<=-5 and w>=5:return '월세 이동 신호'
    if j>=5 and w>=5:return '전세·월세 함께 증가'
    if j<=-5 and w<=-5:return '전세·월세 함께 감소'
    if j>=5 and w<=-5:return '전세 쪽이 상대적으로 강함'
    return '뚜렷한 이동은 아님'
def snapshot():
    with urllib.request.urlopen(SOURCE,timeout=45) as r:raw=r.read()
    rows=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
    data={'source_commit':SHA,'source_url':SOURCE,'source_sha256':hashlib.sha256(raw).hexdigest(),'source_as_of':'2026-08-23','reviewed_at':'2026-09-25','period':['202409','202607'],'months':MONTHS,'method':'cdeal_type O excluded; monthly_rent 0 = jeonse, >0 = wolse; first 11 vs last 12 monthly means; 5 percent is an editorial descriptive threshold, not an official standard.','types':{}}
    total=0
    for key,(label,kind) in TYPES.items():
        available={r.get('deal_ym') for r in rows if r.get('deal_type')==kind}
        missing=set(MONTHS)-available
        assert not missing,(kind,'Archive does not cover every month',sorted(missing))
        valid=[r for r in rows if r.get('deal_type')==kind and r.get('deal_ym') in MONTHS and str(r.get('cdeal_type','')).strip()!='O']
        series=[{'month':m,'j':0,'w':0} for m in MONTHS];by={x['month']:x for x in series}
        for r in valid:by[r['deal_ym']]['w' if num(r.get('monthly_rent'))>0 else 'j']+=1
        avg=lambda part,k:sum(x[k] for x in part)/len(part)
        fj,lj=avg(series[:11],'j'),avg(series[11:],'j');fw,lw=avg(series[:11],'w'),avg(series[11:],'w')
        assert fj>0 and fw>0
        jc,wc=(lj-fj)/fj*100,(lw-fw)/fw*100
        data['types'][key]={'label':label,'series':series,'count':len(valid),'first_jeonse_mean':fj,'last_jeonse_mean':lj,'first_wolse_mean':fw,'last_wolse_mean':lw,'jeonse_change_percent':jc,'wolse_change_percent':wc,'judgment':classification(jc,wc)}
        total+=len(valid)
    data['total_count']=total
    return data

def replace_id(s,tag,ident,body):
    pattern=r'(<'+tag+r'\b[^>]*\bid="'+re.escape(ident)+r'"[^>]*>).*?(</'+tag+r'>)'
    s,n=re.subn(pattern,lambda m:m.group(1)+body+m.group(2),s,flags=re.S)
    assert n==1,(tag,ident,n)
    return s

def apply():
    old=(ROOT/PAGE).read_text(encoding='utf-8')
    if MARK in old:
        verify();return
    data=snapshot();s=old
    scripts=list(re.finditer(r'<script>(.*?)</script>',s,re.S))
    targets=[m for m in scripts if "const DATA='https://raw.githubusercontent.com/arttoy61-png/rent-check/main/molit_kangseo.csv'" in m.group(1)]
    assert len(targets)==1
    m=targets[0];s=s[:m.start()]+s[m.end():]
    phrases=[]
    for key,d in data['types'].items():
        fj,lj,fw,lw=[d[k] for k in ['first_jeonse_mean','last_jeonse_mean','first_wolse_mean','last_wolse_mean']]
        jc,wc=d['jeonse_change_percent'],d['wolse_change_percent']
        summary=f'앞 11개월 월평균 전세 <strong>{fmt(fj)}건</strong> → 뒤 12개월 <strong>{fmt(lj)}건</strong> ({cf(jc)}), 월세는 <strong>{fmt(fw)}건</strong> → <strong>{fmt(lw)}건</strong> ({cf(wc)}). <strong>{d["judgment"]}</strong>으로 읽힙니다.'
        s=replace_id(s,'div',key+'Summary',summary)
        s=replace_id(s,'strong',key+'Judge',d['judgment'])
        s=replace_id(s,'span',key+'Compare',f'전세 {fmt(fj)}→{fmt(lj)}건/월 ({cf(jc)}) · 월세 {fmt(fw)}→{fmt(lw)}건/월 ({cf(wc)})')
        phrases.append(f'{d["label"]}는 전세 {cf(jc)}, 월세 {cf(wc)}')
        for field,suffix,cls in [('j','J','jeonse'),('w','W','wolse')]:
            mx=max(max(x[field] for x in d['series']),1);parts=[]
            for x in d['series']:
                month=x['month'];value=x[field];height=max(2,value/mx*100)
                parts.append(f'<div class="bar-item" title="{month[:4]}.{month[4:]} · {fmt(value)}건"><span class="bar {cls}" style="height:{height:.8f}%"><span class="bar-value">{fmt(value)}</span></span><span class="bar-month">{month[2:4]}.{month[4:]}</span></div>')
            s=replace_id(s,'div',key+suffix,''.join(parts))
    overall=' · '.join(phrases)+'입니다. 같은 기간을 나눠 계산한 월평균 계약 건수 변화이며, 개별 주택이 전세에서 월세로 전환됐는지를 추적한 결과는 아닙니다.'
    s=replace_id(s,'p','answerText','<strong>'+overall+'</strong> 유형별 월간 수치는 아래 여섯 그래프에서 확인하세요.')
    s=replace_id(s,'strong','rcConclusion',overall)
    s=replace_id(s,'div','dataStatus',f'집계 완료 · 2024.09~2026.07 · {fmt(data["total_count"])}건 · 2026.08.23 원본 기준 고정 집계 · 취소 신고 제외')
    # Old runtime error UI is no longer needed: all results are present in first HTML.
    s=re.sub(r'<div class="error-box" id="errorBox">.*?</div>','',s,flags=re.S)
    note=f'<section {MARK}><h2>과거 분석의 기준일과 원본을 고정했습니다</h2><p>이 글은 2026년 8월 23일 저장된 원본에서 2024년 9월~2026년 7월 23개월을 집계한 과거 분석입니다. 최신 수집 파일은 보유 기간이 이동하므로, 과거 글에 그대로 연결하면 첫 달 자료가 빠질 수 있습니다. 자료가 없는 달을 0건으로 간주하지 않도록 <strong>세 주택유형 모두 23개월 자료가 있는 원본</strong>으로 계산하고 표와 그래프를 본문에 저장했습니다.</p><p>2026년 9월 25일 이 기준을 보완했습니다. 이후 신고·정정이 반영된 최신 시장 수치와는 다를 수 있습니다. 앞 11개월과 뒤 12개월은 월평균으로 비교하며, 그래프의 건수는 실제 계약 건수이고 매물 수가 아닙니다. ‘이동 신호’ 등의 구분에 쓰는 5%는 이 글의 설명용 기준으로 공식 판정 기준이 아닙니다.</p><p>재현 자료: <a href="{SOURCE}">2026.08.23 고정 CSV 원본</a> · <a href="/analysis/gangseo-jeonse-trend/data-20260823.json">23개월 집계값과 계산 기준(JSON)</a> · 원본 커밋 <code>{SHA[:12]}</code></p></section>'
    anchor='<h2>그래프를 볼 때 이것은 구분해야 합니다</h2>'
    assert s.count(anchor)==1;s=s.replace(anchor,note+anchor,1)
    s=re.sub(r'("dateModified"\s*:\s*")[^"]+("|$)',r'\g<1>2026-09-25\2',s)
    a,b=BeautifulSoup(old,'html.parser'),BeautifulSoup(s,'html.parser')
    assert str(a.h1)==str(b.h1)
    assert [str(x) for x in a.select('style,link[rel=stylesheet]')]==[str(x) for x in b.select('style,link[rel=stylesheet]')]
    assert a.select_one('link[rel=canonical]')['href']==b.select_one('link[rel=canonical]')['href']
    assert re.findall(r'"datePublished"\s*:\s*"([^"]*)"',old)==re.findall(r'"datePublished"\s*:\s*"([^"]*)"',s)
    backup=OUT/'originals'/PAGE;backup.parent.mkdir(parents=True,exist_ok=True);backup.write_text(old,encoding='utf-8')
    (ROOT/PAGE).write_text(s,encoding='utf-8');(ROOT/DATA).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    sitemap=(ROOT/'sitemap.xml').read_text(encoding='utf-8')
    sitemap,n=re.subn(r'(<url>\s*<loc>https://rent-check.kr/analysis/gangseo-jeonse-trend/</loc>.*?<lastmod>)[^<]+(</lastmod>)',r'\g<1>2026-09-25\2',sitemap,flags=re.S)
    assert n==1;(ROOT/'sitemap.xml').write_text(sitemap,encoding='utf-8')
    manifest=OUT/'changed-files.json';paths=json.loads(manifest.read_text()) if manifest.exists() else []
    for p in [PAGE,DATA,'sitemap.xml']:
        if p not in paths:paths.append(p)
    manifest.write_text(json.dumps(paths,ensure_ascii=False,indent=2),encoding='utf-8')
    (OUT/'historical-chart-repair.json').write_text(json.dumps({'page':PAGE,'source':SOURCE,'source_sha256':data['source_sha256'],'total':data['total_count'],'months':len(MONTHS),'bars':138,'input_scope_change':'rolling main CSV replaced by original dated archive; aggregation periods, rental-type split and 5 percent classification threshold preserved'},ensure_ascii=False,indent=2),encoding='utf-8')
    print('HISTORICAL_CHART_REPAIRED='+json.dumps({'months':len(MONTHS),'count':data['total_count'],'source':SOURCE},ensure_ascii=False))

def verify():
    data=json.loads((ROOT/DATA).read_text(encoding='utf-8'));s=(ROOT/PAGE).read_text(encoding='utf-8');soup=BeautifulSoup(s,'html.parser')
    assert MARK in s and SOURCE in s and 'rent-check/main/molit_kangseo.csv' not in s
    assert data['months']==MONTHS and len(MONTHS)==23 and data['source_commit']==SHA
    assert len(soup.select('.bar-item'))==138
    assert '계산 중' not in soup.select_one('#answerText').get_text()
    assert data['total_count']==sum(d['count'] for d in data['types'].values())
    for key,d in data['types'].items():
        assert [x['month'] for x in d['series']]==MONTHS
        assert sum(x['j']+x['w'] for x in d['series'])==d['count']
        for field,suffix in [('j','J'),('w','W')]:
            rendered=[int(x.get_text().replace(',','')) for x in soup.select('#'+key+suffix+' .bar-value')]
            assert rendered==[x[field] for x in d['series']],(key,field)
    print('HISTORICAL_CHART_VERIFY=PASS: 23 months, 138 bars, all values present without JavaScript')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');p.add_argument('--verify',action='store_true');args=p.parse_args()
    if args.apply:apply()
    if args.verify:verify()
