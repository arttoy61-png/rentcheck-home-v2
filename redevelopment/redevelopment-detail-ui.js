/* HOME presentation adapter. Consumes existing renderers; owns no data fetching or map engine. */
(()=>{'use strict';
const tabs=new Map();let serial=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Presentation normalization only: keep source values and management-area meaning.
const factKeys=['area_m2','members','owners','floors_below_ground','floors_above_ground','total_units','building_area_m2','gross_floor_area_m2','floor_area_ratio_percent','building_coverage_ratio_percent'];
const validFact=v=>typeof v==='number'?Number.isFinite(v)&&v>=0:typeof v==='string'&&/^\d+(?:\.\d+)?$/.test(v.trim().replace(/,/g,''));
function mergeOverview(p,enrichment){
 const catalog=p.registry||p,incoming=catalog.overview||{},provided=catalog.overview_sources||{},legacy=enrichment?.o,values={...(legacy||incoming)},sources=legacy?{}:{...provided},conflicts=[];
 for(const key of factKeys){if(!validFact(incoming[key]))continue;
  if(!validFact(values[key])){values[key]=incoming[key];if(provided[key])sources[key]=provided[key];}
  else if(Number(String(values[key]).replace(/,/g,''))===Number(String(incoming[key]).replace(/,/g,''))){if(provided[key])sources[key]=provided[key];}
  else conflicts.push({field:key,retained_value:values[key],incoming_value:incoming[key],incoming_source:provided[key]||null});
 }
 return {values,sources,conflicts};
}
function facts(p){
 const o=p.overview||{},moa=p.project_type==='모아타운',rows=[],add=(key,label,value,unit)=>{if(!validFact(value))return;const source=p.overview_sources?.[key],raw=source?.raw_label||'',approx=/약/.test(source?.raw_value||'');if(key==='floors_above_ground'&&/최고/.test(raw))label='최고 지상';if(moa&&source?.value_basis==='plan'&&key!=='area_m2')label='관리계획 '+label;rows.push({key,label,value,unit,source,approx});};
 add('area_m2',moa?'관리지역 면적':'구역면적',moa?p.area_m2:o.area_m2,'㎡');add('members','조합원',o.members,'명');add('owners','토지등소유자',o.owners,'명');
 add('floors_below_ground','지하',o.floors_below_ground,'층');add('floors_above_ground','지상',o.floors_above_ground,'층');add('total_units','총 세대수',o.total_units,'세대');add('building_area_m2','건축면적',o.building_area_m2,'㎡');add('gross_floor_area_m2','연면적',o.gross_floor_area_m2,'㎡');add('floor_area_ratio_percent','용적률',o.floor_area_ratio_percent,'%');add('building_coverage_ratio_percent','건폐율',o.building_coverage_ratio_percent,'%');return rows;
}
const factValue=r=>(r.approx?'약 ':'')+Number(String(r.value).replace(/,/g,'')).toLocaleString('ko-KR',{maximumFractionDigits:10})+r.unit;
function overviewHTML(p){const rows=facts(p);if(!rows.length)return '';return `<section class="project-overview"><h3>공식 사업개요</h3><dl>${rows.map(r=>`<dt>${esc(r.label)}</dt><dd>${esc(factValue(r))}</dd>`).join('')}</dl></section>`;}
function factsSummary(p,closed){const rows=facts(p),parts=rows.filter(r=>['area_m2','gross_floor_area_m2','members'].includes(r.key)||(r.key==='owners'&&!rows.some(f=>f.key==='members'))).map(r=>esc(r.label)+' '+esc(factValue(r))),floors=rows.filter(r=>['floors_below_ground','floors_above_ground'].includes(r.key)).map(r=>esc(r.label)+' '+esc(factValue(r)));if(floors.length)parts.push(floors.join(' / '));if(!parts.length)return '';const notes=[];if(closed)notes.push('기존 공식 사업개요 기록');if(p.project_type==='모아타운')notes.push('관리지역 자료 기준 · 개별 사업장과 구분');if(rows.some(r=>r.source?.value_basis==='plan'))notes.push('층수·규모는 공식 건축계획 기재 기준');return `<section class="rd-facts-summary" aria-label="건축개요"><h3>건축개요</h3><p>${parts.join(' · ')}</p>${notes.length?'<small>'+esc(notes.join(' · '))+'</small>':''}</section>`;}
function factSourcesHTML(p){const sources=[...new Map([...Object.values(p.overview_sources||{}),...(p.overview_conflicts||[]).map(c=>c.incoming_source)].filter(s=>s?.source_url).map(s=>[s.source_url+'|'+s.checked_at,s])).values()],notes=[...(p.conflicts||[])];if(facts(p).some(r=>Number(String(r.value).replace(/,/g,''))===0))notes.push('0은 공식 원문 기재값입니다.');for(const c of p.overview_conflicts||[])notes.push(`${facts(p).find(r=>r.key===c.field)?.label||c.field}: 기존 연결값 ${c.retained_value}, 추가 원문값 ${c.incoming_value}. 원문 기준 차이로 기존값을 유지했습니다.`);const safe=u=>{try{const v=new URL(u);return v.protocol==='https:'?v.href:'';}catch{return '';}};return sources.map(s=>{const url=safe(s.source_url);return url?`<p class="coverage"><a data-preserve href="${esc(url)}" target="_blank" rel="noopener noreferrer">사업개요 수치 원문 ↗</a><br>열람 확인: ${esc(s.checked_at||'기록 없음')} · 원문 변경일: ${esc(s.source_date||'원문 미표기')}<br>열람일은 사업 변경일이나 인가일이 아닙니다.</p>`:'';}).join('')+notes.map(n=>'<p class="coverage">'+esc(n)+'</p>').join('');}
function render(p,html,ctx){
 const t=document.createElement('template');t.innerHTML=html;
 const root=t.content;
 const take=selector=>{const n=root.querySelector(selector);if(!n)return '';const h=n.outerHTML;n.remove();return h;};
 let heading=take('.project-card-heading')||take('.project-heading')||ctx.card.header(p);
 // The selected list and open detail coexist in DOM; only the detail owns detailTitle.
 const headingTemplate=document.createElement('template');headingTemplate.innerHTML=heading;
 const title=headingTemplate.content.querySelector('#detailTitle');if(title)title.id=ctx.titleId||'detailTitle';
 heading=headingTemplate.innerHTML;
 const stage=take('.project-stage-banner')||take('.pilot-current')||ctx.current(p);
 const stageHelp=take('.stage-verification');
 const progress=take('.project-progress')||ctx.card.progress(p);
 let history=take('.pilot-all');
 if(!history){history=take('.latest-events');for(const n of [...root.querySelectorAll('details')])if(n.querySelector('summary')?.textContent.includes('전체 이력')){history+=n.outerHTML;n.remove();}}
 if(!history)history=ctx.history(p)||'<p>확인된 추진 이력 자료가 없습니다. 미진행을 뜻하지 않습니다.</p>';
 const questions=take('.purchase-questions')||ctx.card.questions(p);
 const transactions=take('.project-transactions')||ctx.card.transactions(p);
 take('.project-overview');const overview=overviewHTML(p);
 // Move existing construction information only when the record's own renderer provides it.
 let construction='';for(const n of [...root.querySelectorAll('.pilot-section')])if(/공사·입주/.test(n.querySelector('h3')?.textContent||'')){construction+=n.outerHTML;n.remove();}
 root.querySelectorAll('[data-project-map]').forEach(n=>n.remove());
 const map=document.createElement('template');map.innerHTML=ctx.mapControl(p);
 const locate=map.content.querySelector('[data-project-map]');if(locate){locate.removeAttribute('data-project-map');locate.setAttribute('data-detail-locate-map','');locate.textContent='해당 현장 위치 보기';}
 const id=p.registry?.id||p.id,active=tabs.get(id)||'overview',uid='rd-detail-'+(++serial),status=window.RentRedevelopmentStatus.current(p);
 const tab=(key,label)=>`<button type="button" role="tab" id="${uid}-${key}-tab" aria-controls="${uid}-${key}" aria-selected="${active===key}" tabindex="${active===key?0:-1}" data-detail-tab="${key}">${label}</button>`;
 const panel=(key,body)=>`<section role="tabpanel" id="${uid}-${key}" aria-labelledby="${uid}-${key}-tab" data-detail-panel="${key}" ${active===key?'':'hidden'}>${body}</section>`;
 return `<div class="redevelopment-card redevelopment-detail-ui" data-detail-project="${esc(id)}"><div class="rd-top-actions"><button type="button" class="action" data-detail-browse-map>상세 닫고 지도 둘러보기</button>${map.innerHTML}<button type="button" class="action secondary" data-redevelopment-clear>전체 목록으로</button></div>${heading}${id==='cleanup-biwonhyundai'?'<p class="warning" role="note">점선은 2024-05-08 고시 도면과 대조한 개별 A-3 사업 참고외곽입니다. 현재 확정 경계·측량 확정이 아닙니다. <a href="https://www.gangseo.seoul.kr/gs040301/view?mgtNo=58396" target="_blank" rel="noopener noreferrer">개별사업 고시 원문 ↗</a></p>':''}${window.RentRedevelopmentCenters?.isReference(p.map_point)?'<p class="reference-location-warning warning" role="note">'+esc(window.RentRedevelopmentCenters.label(p.map_point))+(p.map_point.basis===window.RentRedevelopmentCenters.ADDRESS?' · 원좌표 조회일 미보존':'')+'</p>':''}${stage}${factsSummary(p,ctx.card.isClosed(p))}<div class="rd-tabs" role="tablist" aria-label="현장 상세 정보">${tab('overview','사업 개요')}${tab('history','추진 이력')}${tab('transactions','주변 실거래')}</div>${panel('overview',construction+overview+`<p class="rd-next"><strong>다음에 확인할 자료</strong><br>${esc(status.guidance?.next||'현장 공식 자료와 최신 변경 공고')}<small>확정 일정이 아닌 확인 안내입니다.</small></p><details class="rd-fold"><summary>${ctx.card.isClosed(p)?'해산·청산 확인사항':'매수 전 확인사항'}</summary>${questions}</details><details class="rd-fold"><summary>공식 출처 · 기준일 · 위치 근거</summary>${stageHelp}${factSourcesHTML(p)}${t.innerHTML}</details>`)}${panel('history',progress+history)}${panel('transactions',transactions)}</div>`;
}
function select(button){const root=button.closest('[data-detail-project]');if(!root)return;const key=button.dataset.detailTab;tabs.set(root.dataset.detailProject,key);root.querySelectorAll('[data-detail-tab]').forEach(b=>{const on=b===button;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});root.querySelectorAll('[data-detail-panel]').forEach(p=>p.hidden=p.dataset.detailPanel!==key);}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-detail-tab]');if(b)select(b);});
document.addEventListener('keydown',e=>{const b=e.target.closest?.('[data-detail-tab]');if(!b||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const list=[...b.parentElement.querySelectorAll('[data-detail-tab]')],i=list.indexOf(b),next=list[e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length];select(next);next.focus();});
window.RentRedevelopmentDetailUI={render,facts,overviewHTML,mergeOverview};
})();

