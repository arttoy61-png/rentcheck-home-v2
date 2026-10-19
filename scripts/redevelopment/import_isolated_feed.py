"""Read one immutable minimal map feed; no raw source, secrets or API collection."""
from pathlib import Path
from datetime import datetime, timezone, timedelta, date
from hashlib import sha256
from collections import Counter
import argparse, json, math, os, re, tempfile, urllib.request

ROOT='https://api.github.com/repos/arttoy61-png/rent-check'
EPOCH='redevelopment-20261016-total600-v1'
NAMES=['redevelopment-nearby-seoul.json','redevelopment-nearby-status.json']
DISTRICTS=dict(zip(['11110','11140','11170','11200','11215','11230','11260','11290','11305','11320','11350','11380','11410','11440','11470','11500','11530','11545','11560','11590','11620','11650','11680','11710','11740'],['종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구','관악구','서초구','강남구','송파구','강동구']))
ROW_FIELDS={'id','complex_id','lawd_cd','gu_name','name','type','date','address','lat','lng','coordinate_source','coordinate_checked_at','coordinate_basis','area_m2','floor','deal_amount','deposit','monthly_rent'}

class FeedError(RuntimeError):pass

def read(path):return json.loads(Path(path).read_text(encoding='utf8'))
def iso(value):
    try:d=datetime.fromisoformat(value)
    except (ValueError,TypeError):raise FeedError('bad_source_timestamp') from None
    if not d.tzinfo:raise FeedError('missing_source_timezone')
    return d

def fetch(url,limit):
    req=urllib.request.Request(url,headers={'Accept':'application/vnd.github+json','User-Agent':'RedevelopmentPreviewFeed/1'})
    try:
        with urllib.request.urlopen(req,timeout=60) as r:data=r.read(limit+1)
    except Exception:raise FeedError('public_map_feed_unavailable') from None
    if len(data)>limit:raise FeedError('feed_too_large')
    return data

def pinned_feed(fetcher=fetch):
    ref=json.loads(fetcher(ROOT+'/git/ref/heads/redevelopment-map-state',1024*1024));commit=ref.get('object',{}).get('sha','')
    if not re.fullmatch('[a-f0-9]{40}',commit):raise FeedError('invalid_feed_commit')
    base='https://raw.githubusercontent.com/arttoy61-png/rent-check/'+commit+'/feed/'
    manifest=json.loads(fetcher(base+'manifest.json',1024*1024))
    if manifest.get('version')!=1 or manifest.get('approval_epoch')!=EPOCH or set(manifest.get('files',{}))!=set(NAMES):raise FeedError('invalid_feed_manifest')
    files={}
    for name in NAMES:
        content=fetcher(base+name,40*1024*1024 if name==NAMES[0] else 1024*1024)
        if sha256(content).hexdigest()!=manifest['files'][name]:raise FeedError('feed_digest_mismatch')
        files[name]=json.loads(content)
    return commit,files

def validate(data,now=None,require_fresh=True):
    now=now or datetime.now(timezone.utc)
    if set(data)!={'version','meta','districts','services','counts','district_counts','projects','rows'} or data.get('version')!=2:raise FeedError('unexpected_map_shape')
    m=data['meta'];rows=data['rows']
    if not m.get('collection_complete') or m.get('complete_districts')!=25 or m.get('successful_partitions')!=450 or m.get('expected_partitions')!=450:raise FeedError('incomplete_source')
    t=iso(m.get('source_checked_at'))
    if t>now+timedelta(minutes=5):raise FeedError('future_source')
    if require_fresh and now-t>timedelta(hours=48):raise FeedError('stale_source')
    if not isinstance(rows,list) or not rows or not data['projects'] or len(data['districts'])!=25 or len(data['services'])!=6:raise FeedError('invalid_map_content')
    if m.get('coordinate_linked_rows')!=len(rows) or m['eligible_rows']!=len(rows)+m['coordinate_unlinked_rows']+m.get('invalid_value_rows',0) or m['raw_rows']!=m['eligible_rows']+m['excluded_cancelled']+m.get('excluded_unknown_cancel',0):raise FeedError('count_mismatch')
    if bool(m.get('coordinate_coverage_complete'))!=(m['coordinate_unlinked_rows']==0 and m.get('invalid_value_rows',0)==0):raise FeedError('coverage_mismatch')
    if m.get('raw_source')!='https://rt.molit.go.kr/':raise FeedError('unexpected_source_link')
    services=data['services']
    expected={'아파트_매매','아파트_전월세','연립다세대_매매','연립다세대_전월세','오피스텔_매매','오피스텔_전월세'}
    if set(services)!=expected or set(data['counts'])!=expected or set(data['district_counts'])!=set(data['districts']):raise FeedError('count_scope_mismatch')
    names=['raw','eligible','excluded_cancelled','excluded_unknown_cancel','coordinate_linked','coordinate_unlinked','invalid_value']
    for d in data['district_counts'].values():
        if set(d)!=expected:raise FeedError('district_service_missing')
        for c in d.values():
            if any(k not in names or type(v) is not int or v<0 for k,v in c.items()):raise FeedError('invalid_count')
    for service,c in data['counts'].items():
        if any(k not in names or type(v) is not int or v<0 for k,v in c.items()):raise FeedError('invalid_count')
        for k in names:
            if c.get(k,0)!=sum(d[service].get(k,0) for d in data['district_counts'].values()):raise FeedError('district_count_mismatch')
    for k,mk in [('raw','raw_rows'),('eligible','eligible_rows'),('excluded_cancelled','excluded_cancelled'),('excluded_unknown_cancel','excluded_unknown_cancel'),('coordinate_unlinked','coordinate_unlinked_rows'),('invalid_value','invalid_value_rows')]:
        if sum(c.get(k,0) for c in data['counts'].values())!=m.get(mk,0):raise FeedError('aggregate_count_mismatch')
    if sum(c.get('coordinate_linked',0) for c in data['counts'].values())!=len(rows)+m.get('invalid_value_rows',0):raise FeedError('linked_count_mismatch')
    if data['districts']!=DISTRICTS:raise FeedError('district_identity_mismatch')
    if not isinstance(data['projects'],dict):raise FeedError('invalid_project_evidence')
    for pid,p in data['projects'].items():
        if not isinstance(pid,str) or not pid or not isinstance(p,dict) or set(p)!={'verified','source','basis','point'}:raise FeedError('invalid_project_evidence')
        if p['verified'] is not True or p['basis']!='verified_official_boundary_centroid' or not isinstance(p['source'],str) or not p['source'].startswith(('https://urban.seoul.go.kr/','https://cleanup.seoul.go.kr/')):raise FeedError('invalid_project_evidence')
        point=p['point']
        if not isinstance(point,list) or len(point)!=2 or any(type(v) not in [int,float] or not math.isfinite(v) for v in point) or not 37.4<=point[0]<=37.75 or not 126.7<=point[1]<=127.25:raise FeedError('invalid_project_coordinate')
    row_counts=Counter();ids=set()
    start,end=map(date.fromisoformat,m['period'])
    if start.day!=1 or (end.year*12+end.month)-(start.year*12+start.month)!=2:raise FeedError('invalid_three_month_period')
    for r in rows:
        if set(r)!=ROW_FIELDS:raise FeedError('unexpected_row_field')
        if r['lawd_cd'] not in data['districts'] or r['type'] not in data['services'] or not r['complex_id'].startswith(r['lawd_cd']+'-'):raise FeedError('invalid_row_identity')
        if not isinstance(r['id'],str) or not r['id'] or r['id'] in ids:raise FeedError('duplicate_or_invalid_row_id')
        ids.add(r['id']);row_counts[(r['lawd_cd'],r['type'])]+=1
        if r['gu_name']!=DISTRICTS[r['lawd_cd']]:raise FeedError('row_district_name_mismatch')
        if not isinstance(r['address'],str) or not r['address'].startswith('서울특별시 '+r['gu_name']+' '):raise FeedError('row_address_district_mismatch')
        if not start<=date.fromisoformat(r['date'])<=end:raise FeedError('invalid_contract_date')
        if not r['coordinate_source'] or not r['coordinate_checked_at']:raise FeedError('coordinate_evidence_missing')
        for k in ['lat','lng','area_m2','floor']:
            if type(r[k]) not in [int,float] or not math.isfinite(r[k]):raise FeedError('invalid_numeric')
        if not 37.4<=r['lat']<=37.75 or not 126.7<=r['lng']<=127.25 or r['area_m2']<=0:raise FeedError('invalid_coordinate')
        required=['deal_amount'] if r['type'].endswith('_매매') else ['deposit','monthly_rent']
        if any(type(r[k]) not in [int,float] or not math.isfinite(r[k]) or r[k]<0 for k in required):raise FeedError('invalid_price')
    for code,counts in data['district_counts'].items():
        for service,c in counts.items():
            if row_counts[(code,service)]!=c.get('coordinate_linked',0)-c.get('invalid_value',0):raise FeedError('actual_row_count_mismatch')
    if m.get('coordinate_addresses')!=len({r['address'] for r in rows}):raise FeedError('coordinate_address_count_mismatch')
    return data

def atomic(path,obj):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix=path.name+'.',suffix='.tmp',dir=path.parent)
    try:
        with os.fdopen(fd,'w',encoding='utf8') as f:json.dump(obj,f,ensure_ascii=False,separators=(',',':'));f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def run(directory,fetcher=fetch,now=None):
    now=now or datetime.now(timezone.utc);directory=Path(directory)
    old=validate(read(directory/NAMES[0]),now,require_fresh=False)
    status={'version':1,'state':'failed','mode':'isolated_engine_feed','attempted_at':now.isoformat(),'last_good_source_at':old['meta']['source_checked_at'],'execution_environment':'github_actions','scheduled_run':os.environ.get('GITHUB_EVENT_NAME')=='schedule','scheduler_registered_locally':False,'kept_previous':True,'network_requests':0}
    try:
        commit,files=pinned_feed(fetcher);data=validate(files[NAMES[0]],now);upstream=files[NAMES[1]]
        if upstream.get('state')!='ready':raise FeedError('upstream_failed_keep_last_good')
        if upstream.get('last_good_source_at')!=data['meta']['source_checked_at']:raise FeedError('feed_status_source_mismatch')
        if iso(data['meta']['source_checked_at'])<iso(old['meta']['source_checked_at']):raise FeedError('source_rollback')
        atomic(directory/NAMES[0],data)
        status.update(state='ready',source_feed_commit=commit,last_good_source_at=data['meta']['source_checked_at'],coordinate_coverage_complete=data['meta']['coordinate_coverage_complete'],kept_previous=False)
    except Exception as exc:status['reason']=str(exc) if isinstance(exc,FeedError) else type(exc).__name__
    atomic(directory/NAMES[1],status)
    return status

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--map-dir',required=True);a=p.parse_args()
    result=run(a.map_dir);print(json.dumps(result));raise SystemExit(0 if result['state']=='ready' else 1)
