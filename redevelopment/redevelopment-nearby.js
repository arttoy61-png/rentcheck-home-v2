/* Local Seoul snapshot: source coverage and coordinate coverage are separate. */
(()=>{'use strict';
let snapshot=null,failed=false,updateStatus=null;
const settings=new Map(),defaults={radius:1000,property:'all',deal:'all'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=37.4&&p[0]<=37.75&&p[1]>=126.7&&p[1]<=127.25;
const projectId=p=>p?.registry?.id||p?.id;
const number=n=>Number(n||0).toLocaleString('ko-KR');
function distance(a,b){if(!valid(a)||!valid(b))return null;const rad=n=>n*Math.PI/180,x=rad(a[0]),y=rad(b[0]),h=Math.sin((y-x)/2)**2+Math.cos(x)*Math.cos(y)*Math.sin(rad(b[1]-a[1])/2)**2;return 6371008.8*2*Math.asin(Math.sqrt(Math.min(1,h)));}
function matches(p){return !!p&&typeof p.district==='string';}
function options(id){return settings.get(id)||{...defaults};}
function query(p,data,selection=defaults){
  if(data?.version!==2||!data.meta?.collection_complete||data.meta.successful_partitions!==data.meta.expected_partitions||![150,300,450].includes(data.meta.expected_partitions)||data.meta.complete_districts!==25||!Array.isArray(data.rows))return{status:'invalid-data'};
  const id=projectId(p),center=data.projects?.[id],point=p?.map_point;
  const samePoint=point&&center&&distance(center.point,[point.lat,point.lng]);
  if(!center?.verified||!center.source||!valid(center.point)||samePoint===null||samePoint===false||!Number.isFinite(samePoint)||samePoint>1)return{status:'unverified-point'};
  const radius=Number(selection.radius),property=selection.property,deal=selection.deal;
  if(![500,1000,2000].includes(radius)||!['all','아파트','연립다세대','오피스텔'].includes(property)||!['all','매매','전월세'].includes(deal))return{status:'invalid-filter'};
  const services=data.services.filter(s=>(property==='all'||s.split('_')[0]===property)&&(deal==='all'||s.split('_')[1]===deal));
  const totals={raw:0,eligible:0,excluded_cancelled:0,coordinate_unlinked:0,coordinate_linked:0,invalid_value:0};
  for(const service of services)for(const field of Object.keys(totals))totals[field]+=data.counts?.[service]?.[field]||0;
  const period=data.meta.period;
  const rows=data.rows.filter(r=>services.includes(r.type)&&r.coordinate_source&&r.coordinate_checked_at&&r.date>=period[0]&&r.date<=period[1]&&Number.isFinite(r.area_m2)&&Number.isFinite(r.floor)&&
    (r.type.endsWith('_매매')?Number.isFinite(r.deal_amount):Number.isFinite(r.deposit)&&Number.isFinite(r.monthly_rent)))
    .map(r=>({...r,metres:distance(center.point,[r.lat,r.lng])})).filter(r=>r.metres!==null&&r.metres<=radius);
  const groups=new Map();for(const row of rows){if(!groups.has(row.complex_id))groups.set(row.complex_id,{...row,transactions:[]});groups.get(row.complex_id).transactions.push(row);}
  const complexes=[...groups.values()].sort((a,b)=>a.metres-b.metres||a.complex_id.localeCompare(b.complex_id));
  for(const c of complexes)c.transactions.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  return{status:'ready',radius,totals,complexes,recordCount:rows.length,displayCount:complexes.reduce((n,c)=>n+Math.min(3,c.transactions.length),0),center};
}
async function ensureLoaded(read,signal){if(snapshot)return;const results=await Promise.allSettled([read('data/redevelopment-nearby-seoul.json',signal),read('data/redevelopment-nearby-status.json',signal)]);try{if(results[0].status==='rejected')throw results[0].reason;const data=results[0].value;if(data?.version!==2||!data.meta?.collection_complete||!Array.isArray(data.rows))throw Error('invalid snapshot');snapshot=data;updateStatus=results[1].status==='fulfilled'?results[1].value:null;failed=false;}catch(e){if(e.name==='AbortError')throw e;failed=true;}}
function updateBanner(meta,status,now=Date.now()){
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
  const id=projectId(p),head=`<section class="project-transactions nearby-transactions" data-nearby-project="${esc(id)}"><h3>사업 표시점 주변 실거래</h3>`;
  if(!snapshot)return head+'<p role="status">'+(failed?'주변 거래 자료를 불러오지 못했습니다. 거래 0건을 뜻하지 않습니다.':'주변 거래 자료를 불러오는 중입니다.')+'</p></section>';
  const m=snapshot.meta,chosen=options(id),r=query(p,snapshot,chosen);
  const freshness=updateBanner(m,updateStatus)+`<p class="coverage">계약일 ${esc(m.period.join(' ~ '))} · 원천 최신 계약 ${esc(m.latest_contract_date)}<br>자료 확인 ${esc(checkedDate(m.source_checked_at))} (한국시간)</p>`;
  if(r.status!=='ready')return head+freshness+`<p class="connection-state">${r.status==='unverified-point'?'사업 기준 위치 미확인':'거래 자료 확인 필요'}</p><p>확인된 사업 표시점이 없어 주변 거리와 거래를 표시하지 않았습니다. 서울 25구 원천 수집과 사업별 위치 연결은 구분합니다.</p></section>`;
  const controls='<div class="nearby-filters">'+select('radius','반경',[[500,'500m'],[1000,'1km'],[2000,'2km']],chosen.radius)+select('property','주택 유형',[['all','전체'],['아파트','아파트'],['연립다세대','연립·다세대'],['오피스텔','오피스텔']],chosen.property)+select('deal','거래 유형',[['all','전체'],['매매','매매'],['전월세','전·월세']],chosen.deal)+'</div>';
  const counts=r.recordCount?`<div class="nearby-count" role="status" aria-live="polite"><strong>주소 위치가 확인된 주변 ${number(r.complexes.length)}곳 · 거래 ${number(r.recordCount)}건</strong><span>최근 ${number(r.displayCount)}건 먼저 표시 · 나머지는 각 주소에서 펼쳐보기</span></div>`:'<div class="nearby-count" role="status" aria-live="polite"><strong>이 조건의 주변 거래 연결 미완료</strong><span>위치가 확인된 자료에서 해당하는 거래를 찾지 못했습니다.</span></div>';
  const missing=`<p class="nearby-coverage-note">선택 유형의 서울 수집 자료 ${number(r.totals.eligible)}건 중 좌표 미연결 ${number(r.totals.coordinate_unlinked)}건은 거리 계산에서 빠졌습니다.${r.totals.invalid_value?' 금액·면적 확인이 필요한 '+number(r.totals.invalid_value)+'건도 표시에서 제외했습니다.':''} 미연결 수는 서울 전체 기준이며, 이 반경 안의 거래 수가 아닙니다. 주변 전체 거래를 모두 표시한 결과가 아닙니다.</p>`;
  const content=r.complexes.length?r.complexes.map(c=>`<article class="nearby-complex"><h4>${esc(c.name||'건물명 미제공')} <small>약 ${number(Math.round(c.metres/10)*10)}m</small></h4><p>${esc(c.address)} · 주소 위치 대조</p>${c.transactions.slice(0,3).map(transaction).join('')}${c.transactions.length>3?`<details class="nearby-more"><summary>이 주소의 나머지 ${number(c.transactions.length-3)}건 보기</summary>${c.transactions.slice(3).map(transaction).join('')}</details>`:''}</article>`).join(''):'<p class="trade-empty">이 조건에서 위치가 확인된 주변 거래를 찾지 못했습니다. 좌표가 연결되지 않은 자료가 있어 실제 거래가 없다는 뜻은 아닙니다.</p>';
  return head+controls+freshness+counts+missing+content+`<details class="nearby-sources"><summary>거리·수집 범위 확인</summary><p>${number(m.complete_districts)}개 구 · ${esc((m.period||[]).join(" ~ "))} · ${number(snapshot.services?.length||0)}개 거래 유형 ${number(m.successful_partitions)}/${number(m.expected_partitions)}개 조합의 API 페이지를 확인했습니다. 원천 ${number(m.raw_rows)}건 중 취소표시 ${number(m.excluded_cancelled)}건을 제외했습니다. 이 수는 위 반경 안의 거래 수가 아닙니다.</p><p>사업의 공식 경계 표시 중심점에서 거래 주소 좌표까지의 직선거리입니다. 사업구역 안의 거래나 입주권 거래로 해석하지 않습니다. 건물 동·호수나 필지 경계를 검증한 좌표가 아닙니다.</p><p>${esc(m.cancellation_limit)} 같은 내용의 원천행은 별개 계약일 수 있어 자동으로 합치지 않았습니다.</p><p>${esc(m.coordinate_limit)} 주소 좌표 확인일 ${esc([...new Set(snapshot.rows.map(x=>x.coordinate_checked_at.slice(0,10)))].sort().join(', '))}.</p><p><a href="${esc(m.raw_source)}" target="_blank" rel="noopener" data-preserve>국토교통부 실거래가 공개시스템 ↗</a></p><p class="coverage">자료는 조회 시점까지 신고된 계약입니다. 이후 신고·취소로 달라질 수 있습니다.</p></details></section>`;
}
if(typeof document!=='undefined')document.addEventListener('change',event=>{const control=event.target.closest?.('[data-nearby-filter]');if(!control)return;const section=control.closest('[data-nearby-project]'),id=section?.dataset.nearbyProject,p=window.PROJECTS?.find(p=>projectId(p)===id);if(!p)return;const name=control.dataset.nearbyFilter,next={...options(id),[name]:name==='radius'?Number(control.value):control.value};settings.set(id,next);section.outerHTML=render(p);document.querySelector(`[data-nearby-project="${CSS.escape(id)}"] [data-nearby-filter="${name}"]`)?.focus();});
window.RentRedevelopmentNearby={matches,query,distance,ensureLoaded,render,amount,updateBanner};
})();
