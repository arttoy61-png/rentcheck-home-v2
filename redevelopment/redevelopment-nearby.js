/* Local Seoul snapshot: source coverage and coordinate coverage are separate. */
(()=>{'use strict';
let snapshot=null,failed=false,updateStatus=null,projectCenters=null,statusLoaded=false,centersLoaded=false;
const settings=new Map(),defaults={radius:500,property:'all',deal:'all'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=37.4&&p[0]<=37.75&&p[1]>=126.7&&p[1]<=127.25;
const projectId=p=>p?.registry?.id||p?.id;
const number=n=>Number(n||0).toLocaleString('ko-KR');
function distance(a,b){if(!valid(a)||!valid(b))return null;const rad=n=>n*Math.PI/180,x=rad(a[0]),y=rad(b[0]),h=Math.sin((y-x)/2)**2+Math.cos(x)*Math.cos(y)*Math.sin(rad(b[1]-a[1])/2)**2;return 6371008.8*2*Math.asin(Math.sqrt(Math.min(1,h)));}
function matches(p){return !!p&&typeof p.district==='string';}
function options(id){return settings.get(id)||{...defaults};}
function validSnapshot(data){return data?.version===2&&data.meta?.collection_complete===true&&data.meta.successful_partitions===data.meta.expected_partitions&&[150,300,450].includes(data.meta.expected_partitions)&&data.meta.complete_districts===25&&Array.isArray(data.rows)&&Array.isArray(data.services)&&data.services.length>0&&data.services.every(s=>typeof s==='string')&&Array.isArray(data.meta.period)&&data.meta.period.length===2&&data.meta.period.every(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d))&&data.meta.period[0]<=data.meta.period[1];}
function query(p,data,selection=defaults,centers=projectCenters){
  if(!validSnapshot(data))return{status:'invalid-data'};
  const id=projectId(p),saved=data.projects?.[id],extra=centers?.[id],point=p?.map_point;
  const center=window.RentRedevelopmentCenters.resolveCenter(p,saved,extra);
  const samePoint=point&&center&&distance(center.point,[point.lat,point.lng]);
  if(!center||point?.basis!==center.basis||(window.RentRedevelopmentCenters.isReference(center)?point.source!==center.source:point.source!==undefined&&point.source!==center.source)||samePoint===null||samePoint===false||!Number.isFinite(samePoint)||samePoint>1)return{status:'unverified-point'};
  const radius=Number(selection.radius),property=selection.property,deal=selection.deal;
  if(![500,1000,1500,2000].includes(radius)||!['all','아파트','연립다세대','오피스텔'].includes(property)||!['all','매매','전월세'].includes(deal))return{status:'invalid-filter'};
  const services=data.services.filter(s=>(property==='all'||s.split('_')[0]===property)&&(deal==='all'||s.split('_')[1]===deal));
  const totals={raw:0,eligible:0,excluded_cancelled:0,coordinate_unlinked:0,coordinate_linked:0,invalid_value:0};
  for(const service of services)for(const field of Object.keys(totals))totals[field]+=data.counts?.[service]?.[field]||0;
  const period=data.meta.period;
  const rows=data.rows.filter(r=>services.includes(r.type)&&r.coordinate_source&&(r.coordinate_basis==='approved_saved_address_cache'?(r.lawd_cd==='11500'&&r.coordinate_checked_at===null&&r.coordinate_source==='기존 강서 주소 대조 좌표 캐시 (원좌표 확인일 미보존)'&&r.coordinate_cache_recorded_at==='2026-10-19T16:27:01Z'):r.coordinate_checked_at)&&r.date>=period[0]&&r.date<=period[1]&&Number.isFinite(r.area_m2)&&Number.isFinite(r.floor)&&
    (r.type.endsWith('_매매')?Number.isFinite(r.deal_amount):Number.isFinite(r.deposit)&&Number.isFinite(r.monthly_rent)))
    .map(r=>({...r,metres:distance(center.point,[r.lat,r.lng])})).filter(r=>r.metres!==null&&r.metres<=radius);
  const groups=new Map();for(const row of rows){if(!groups.has(row.complex_id))groups.set(row.complex_id,{...row,transactions:[]});groups.get(row.complex_id).transactions.push(row);}
  const complexes=[...groups.values()].sort((a,b)=>a.metres-b.metres||a.complex_id.localeCompare(b.complex_id));
  for(const c of complexes)c.transactions.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  return{status:'ready',radius,totals,complexes,recordCount:rows.length,displayCount:complexes.reduce((n,c)=>n+Math.min(3,c.transactions.length),0),center};
}
function validStatus(s){return s?.version===1&&['ready','failed'].includes(s.state)&&typeof s.attempted_at==='string'&&Number.isFinite(Date.parse(s.attempted_at))&&typeof s.last_good_source_at==='string'&&Number.isFinite(Date.parse(s.last_good_source_at));}
async function ensureLoaded(read,signal){
  await window.RentRedevelopmentCenters.ensureLoaded(read,signal);
  const jobs=[];
  if(!snapshot)jobs.push(['snapshot','data/redevelopment-nearby-seoul.json']);
  if(!statusLoaded)jobs.push(['status','data/redevelopment-nearby-status.json']);
  if(!centersLoaded)jobs.push(['centers','data/redevelopment-project-centers.json']);
  const results=await Promise.allSettled(jobs.map(([,url])=>Promise.resolve().then(()=>read(url,signal))));
  for(let i=0;i<results.length;i++){
    const result=results[i],kind=jobs[i][0];
    if(result.status==='rejected'){if(result.reason?.name==='AbortError')throw result.reason;if(kind==='snapshot')failed=true;continue;}
    const value=result.value;
    if(kind==='snapshot'){if(validSnapshot(value)){snapshot=value;failed=false;}else failed=true;}
    else if(kind==='status'){if(validStatus(value)){updateStatus=value;statusLoaded=true;}}
    else if(value&&typeof value==='object'&&!Array.isArray(value)){projectCenters=value;centersLoaded=true;}
  }
}

function updateBanner(meta,status,now=Date.now()){
  status=validStatus(status)?status:null;
  const sourceTime=Date.parse(meta.source_checked_at),attempt=Date.parse(status?.attempted_at),old=Number.isFinite(sourceTime)&&now-sourceTime>48*3600000;
  if(status?.state==='failed'&&(!Number.isFinite(attempt)||attempt>=sourceTime))return '<p class="nearby-update warning" role="status">최근 갱신에 실패해 마지막 정상자료를 표시합니다. 아래 자료 확인일을 확인해 주세요.</p>';
  if(old)return '<p class="nearby-update warning" role="status">자료 확인 후 48시간이 지났습니다. 마지막 정상자료이며 최신 전체 자료로 표시하지 않습니다.</p>';
  if(!status||status.version!==1)return '<p class="nearby-update coverage">자동 갱신 상태 미확인 · 아래 자료 확인일 기준입니다.</p>';
  if(status.execution_environment==='local')return '<p class="nearby-update coverage">자동 갱신 연결 검증본 · 예약 실행 전</p>';
  return '<p class="nearby-update coverage">최근 자료 갱신 확인 · 위치가 연결된 거래만 표시</p>';
}
function checkedDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):'미확인';}
function amount(won10k){const value=Number(won10k);return value>=10000?number(Math.floor(value/10000))+'억'+(value%10000?' '+number(value%10000)+'만원':'원'):number(value)+'만원';}
function transaction(r){const price=r.type.endsWith('_매매')?'매매 '+amount(r.deal_amount):r.monthly_rent===0?'전세 '+amount(r.deposit):'보증금 '+amount(r.deposit)+' / 월 '+amount(r.monthly_rent);return `<div class="nearby-sale"><time>계약 ${esc(r.date)}</time><strong>${esc(price)}</strong><span>${esc(r.type.split('_')[0])} · 전용 ${number(r.area_m2)}㎡ · ${number(r.floor)}층</span></div>`;}
function select(name,label,values,current){return `<label>${label}<select data-nearby-filter="${name}">${values.map(([value,text])=>`<option value="${esc(value)}" ${String(current)===String(value)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;}
function render(p){
  const id=projectId(p),representative=[window.RentRedevelopmentCenters.REPRESENTATIVE,window.RentRedevelopmentCenters.OVERVIEW,window.RentRedevelopmentCenters.AREA,window.RentRedevelopmentCenters.PLAN].includes(window.RentRedevelopmentCenters.reference(p)?.basis),head=`<section class="project-transactions nearby-transactions" data-nearby-project="${esc(id)}"><h3>${representative?'대표 위치 기준 약'+number(options(id).radius)+'m 주변 실거래':'사업 표시점 주변 실거래'}</h3>`;
  if(!snapshot)return head+'<p role="status">'+(failed?'주변 거래 자료를 불러오지 못했습니다. 거래 0건을 뜻하지 않습니다.':'주변 거래 자료를 불러오는 중입니다.')+'</p></section>';
  const m=snapshot.meta,chosen=options(id),r=query(p,snapshot,chosen);
  const freshness=updateBanner(m,updateStatus)+`<p class="coverage">계약일 ${esc(m.period.join(' ~ '))} · 원천 최신 계약 ${esc(m.latest_contract_date)}<br>자료 확인 ${esc(checkedDate(m.source_checked_at))} (한국시간)</p>`;
  if(r.status!=='ready')return head+freshness+`<p class="connection-state">${r.status==='unverified-point'?'사업 기준 위치 미확인':'거래 자료 확인 필요'}</p><p>${r.status==='unverified-point'?'확인된 사업 표시점이 없어 주변 거리와 거래를 표시하지 않았습니다. 서울 25구 원천 수집과 사업별 위치 연결은 구분합니다.':'거래 자료 형식 또는 조회 조건을 확인할 수 없습니다. 거래 0건을 뜻하지 않습니다.'}</p></section>`;
  const controls='<div class="nearby-filters">'+select('radius','반경',[[500,'500m'],[1000,'1km'],[1500,'1.5km'],[2000,'2km']],chosen.radius)+select('property','주택 유형',[['all','전체'],['아파트','아파트'],['연립다세대','연립·다세대'],['오피스텔','오피스텔']],chosen.property)+select('deal','거래 유형',[['all','전체'],['매매','매매'],['전월세','전·월세']],chosen.deal)+'</div>';
  const counts=r.recordCount?`<div class="nearby-count" role="status" aria-live="polite"><strong>주소 위치가 연결된 주변 ${number(r.complexes.length)}곳 · 거래 ${number(r.recordCount)}건</strong></div>`:'<div class="nearby-count" role="status" aria-live="polite"><strong>이 조건에 맞는 확인된 거래를 찾지 못했습니다.</strong></div>';
  const missing=`<p class="nearby-coverage-note nearby-coverage-desktop">선택 유형의 서울 수집 자료 ${number(r.totals.eligible)}건 중 좌표 미연결 ${number(r.totals.coordinate_unlinked)}건은 거리 계산에서 빠졌습니다.${r.totals.invalid_value?' 금액·면적 확인이 필요한 '+number(r.totals.invalid_value)+'건도 표시에서 제외했습니다.':''} 미연결 수는 서울 전체 기준이며, 이 반경 안의 거래 수가 아닙니다. 주변 전체 거래를 모두 표시한 결과가 아닙니다.</p><div class="nearby-coverage-mobile"><p>위치가 연결된 거래만 표시합니다. 주변 전체 거래가 아니며, 좌표 미연결 자료는 거리 계산에서 제외됩니다.</p><details><summary>자료 범위와 제외 건수 보기</summary><p>선택 유형의 서울 수집 자료 ${number(r.totals.eligible)}건 중 좌표 미연결 ${number(r.totals.coordinate_unlinked)}건입니다.${r.totals.invalid_value?' 금액·면적 확인이 필요한 '+number(r.totals.invalid_value)+'건도 표시에서 제외했습니다.':''} 미연결 수는 서울 전체 기준이며, 이 반경 안의 거래 수가 아닙니다.</p></details></div>`;
  const content=r.complexes.length?r.complexes.map(c=>`<article class="nearby-complex"><h4>${esc(c.name||'건물명 미제공')} <small>약 ${number(Math.round(c.metres/10)*10)}m</small></h4><p>${esc(c.address)} · 주소 위치 대조</p>${c.transactions.slice(0,3).map(transaction).join('')}${c.transactions.length>3?`<details class="nearby-more"><summary>이 주소의 나머지 ${number(c.transactions.length-3)}건 보기</summary>${c.transactions.slice(3).map(transaction).join('')}</details>`:''}</article>`).join(''):'';
  const referenceWarning=window.RentRedevelopmentCenters.isReference(r.center)?'<p class="reference-distance-warning warning">'+esc(window.RentRedevelopmentCenters.label(r.center))+(r.center.basis===window.RentRedevelopmentCenters.ADDRESS?' · 원좌표 조회일 미보존':'')+'에서 계산한 참고 거리입니다.</p>':'';
  const caution='<p class="nearby-compact-warning">좌표 연결 거래만 표시합니다. 누락·미연결 자료가 있어 주변 전체 거래나 실제 거래 없음으로 해석하지 않습니다.</p>';
  const update=updateBanner(m,updateStatus),warning=update.includes('warning')?update:'';
  return head+controls+referenceWarning+warning+counts+caution+content+`<details class="nearby-sources"><summary>자료 기준·누락 범위 확인</summary>${freshness}${missing}${window.RentRedevelopmentCenters.evidenceHTML(p)}<p>최근 ${number(r.displayCount)}건 먼저 표시 · 나머지는 각 주소에서 펼쳐보기</p><p>${number(m.complete_districts)}개 구 · ${esc((m.period||[]).join(" ~ "))} · ${number(snapshot.services?.length||0)}개 거래 유형 ${number(m.successful_partitions)}/${number(m.expected_partitions)}개 조합의 API 페이지를 확인했습니다. 원천 ${number(m.raw_rows)}건 중 취소표시 ${number(m.excluded_cancelled)}건을 제외했습니다. 이 수는 위 반경 안의 거래 수가 아닙니다.</p><p>${esc(window.RentRedevelopmentCenters.distanceNote(r.center))} 사업구역 안의 거래나 입주권 거래로 해석하지 않습니다. 건물 동·호수나 필지 경계를 검증한 좌표가 아닙니다.</p><p>${esc(m.cancellation_limit)} 같은 내용의 원천행은 별개 계약일 수 있어 자동으로 합치지 않았습니다.</p><p>${esc(m.coordinate_limit)} 개별 주소 좌표 확인일 ${esc([...new Set(snapshot.rows.filter(x=>x.coordinate_checked_at).map(x=>x.coordinate_checked_at.slice(0,10)))].sort().join(', ')||'미확인')}.</p>${snapshot.rows.some(x=>x.coordinate_basis==='approved_saved_address_cache')?'<p>기존 강서 주소캐시도 정확히 일치하는 동·지번에 연결했습니다. 캐시 보존 기준일 '+esc([...new Set(snapshot.rows.filter(x=>x.coordinate_cache_recorded_at).map(x=>checkedDate(x.coordinate_cache_recorded_at)))].sort().join(', '))+' · 이 캐시의 원좌표 확인일은 미보존이며, 새로 조회·검증한 좌표가 아닙니다.</p>':''}<p><a href="${esc(m.raw_source)}" target="_blank" rel="noopener" data-preserve>국토교통부 실거래가 공개시스템 ↗</a></p><p class="coverage">자료는 조회 시점까지 신고된 계약입니다. 이후 신고·취소로 달라질 수 있습니다.</p></details></section>`;
}
if(typeof document!=='undefined')document.addEventListener('change',event=>{const control=event.target.closest?.('[data-nearby-filter]');if(!control)return;const section=control.closest('[data-nearby-project]'),id=section?.dataset.nearbyProject,p=window.PROJECTS?.find(p=>projectId(p)===id);if(!p)return;const name=control.dataset.nearbyFilter,next={...options(id),[name]:name==='radius'?Number(control.value):control.value};settings.set(id,next);section.outerHTML=render(p);document.querySelector(`[data-nearby-project="${CSS.escape(id)}"] [data-nearby-filter="${name}"]`)?.focus();});
window.RentRedevelopmentNearby={matches,query,distance,ensureLoaded,render,amount,updateBanner};
})();





