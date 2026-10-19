/* Read-only display model. Operations are not construction status, dates are never filled from collection times. */
(()=>{'use strict';
const id=p=>p.registry?.id||p.id;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const missing=v=>v===null||v===undefined||String(v).trim()===''||['미공개','미확인','unknown'].includes(String(v).trim());
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().startsWith(v);
const source=(url,label)=>url?`<a href="${esc(url)}" target="_blank" rel="noopener" data-preserve>${esc(label)} ↗</a>`:'';
const standard={
 '일반분양승인':['일반분양에 관한 승인 단계입니다.','일반분양 승인과 공식 분양 공고'],
 '정비계획 수립':['사업구역과 정비 방향을 계획하는 단계입니다.','정비계획 공람·결정 고시 원문'],
 '정비구역지정':['정비계획과 사업구역이 지정된 단계입니다.','구역 지정 고시와 추진주체 관련 자료'],
 '추진위원회승인':['조합 설립을 준비하는 추진위원회가 승인된 단계입니다.','추진위원회 승인과 조합 설립 관련 자료'],
 '조합설립인가':['사업을 추진할 조합 설립이 인가된 단계입니다.','조합 인가와 사업시행계획 관련 자료'],
 '사업시행인가':['건축·시설 등을 담은 사업시행계획이 인가된 단계입니다.','사업시행 인가 고시와 관리처분계획 관련 자료'],
 '관리처분인가':['종전 권리와 새 주택의 배분 계획이 인가된 단계입니다.','관리처분 인가 원문과 이주·철거 관련 자료'],
 '철거':['기존 건축물 철거에 관한 사업 단계입니다.','철거와 착공 관련 신고 자료'],
 '착공':['공사 시작에 관한 사업 단계입니다.','착공 신고와 공식 공사현황'],
 '준공인가':['완공된 사업을 인가된 계획과 대조하는 단계입니다.','준공 인가 고시와 이전고시 관련 자료'],
 '이전고시':['새 토지·건축물의 권리 이전을 고시하는 단계입니다.','이전고시 원문과 등기·해산·청산 관련 자료'],
 '조합해산':['조합 해산 절차에 관한 단계입니다.','해산과 청산 관련 공식 자료'],
 '조합청산':['조합의 채권·채무 등을 정리하는 마무리 단계입니다.','청산 관련 공식 자료']
};
const small={
 '조합설립인가':['소규모 사업을 추진할 조합이 인가된 단계입니다.','조합 인가와 해당 유형의 심의·사업시행계획 자료'],
 '사업시행인가':['관리처분계획을 포함한 소규모 사업시행계획 인가 단계입니다.','사업시행계획 인가 고시와 이주·착공 자료'],
 '착공':['소규모 사업의 공사 시작에 관한 단계입니다.','착공과 공식 공사현황'],
 '준공인가':['소규모 사업의 준공에 관한 단계입니다.','준공·입주와 청산 관련 공식 자료'],
 '조합해산':['소규모 사업 조합의 해산에 관한 단계입니다.','해산·청산 관련 공식 자료'],
 '조합청산':['소규모 사업 조합의 채권·채무 등을 정리하는 단계입니다.','청산 관련 공식 자료'],
 '청산 및 조합해산':['소규모 사업의 청산·해산에 관한 단계입니다.','청산·해산 관련 공식 자료']
};
function guidance(p,stage){
 let row,url;
 if(p.project_type==='재건축'){row=standard[stage];url='https://cleanup.seoul.go.kr/cleanup/view/rebuild.do';if(stage==='안전진단')row=['건축물 상태를 살펴 재건축 필요성을 판단하는 단계입니다.','진단 결과와 정비계획 관련 자료'];}
 else if(['재개발(주택정비형)','재개발(도시정비형)'].includes(p.project_type)){row=standard[stage];url='https://cleanup.seoul.go.kr/cleanup/view/redevelop.do';}
 else if(p.project_type==='가로주택정비'){row=small[stage];url='https://cleanup.seoul.go.kr/cleanup/view/garoHouse.do';}
 else if(p.project_type==='소규모재건축'){row=small[stage];url='https://cleanup.seoul.go.kr/cleanup/view/smallRcnstctn.do';}
 else if(p.project_type==='지역주택'){row={
 '조합규약작성':['조합 운영 규칙을 준비하는 단계입니다.','조합규약 원문과 조합원 모집 관련 자료'],
 '조합원 모집신고':['조합원 모집에 관한 신고 단계입니다. 사업계획이 확정됐다는 뜻은 아닙니다.','모집 신고 자료·가입계약서·조합규약'],
 '조합설립인가':['지역주택조합 설립이 인가된 단계입니다.','조합 인가와 사업계획 승인 자료'],
 '사업계획승인':['주택 건설을 위한 사업계획 승인 단계입니다.','사업계획 승인과 공사계약·착공 자료'],
 '착공':['주택 건설 공사 시작에 관한 단계입니다.','착공과 공식 공사현황']
 }[stage];url='https://cleanup.seoul.go.kr/cleanup/view/localHouse.do';}
 else if(p.project_type==='리모델링'){row={
 '조합설립인가':['리모델링을 추진할 조합이 인가된 단계입니다.','조합 인가와 해당 방식의 진단·심의 자료'],
 '안전진단(1차)':['리모델링을 위한 건축물 상태·구조 검토 단계입니다.','진단 결과와 해당 방식의 심의 자료'],
 '도시계획심의':['리모델링 계획을 도시계획 기준과 대조하는 심의 단계입니다.','심의 결과와 건축 심의·허가 자료'],
 '사업계획승인(리모델링 허가)':['리모델링 허가 또는 사업계획 승인에 관한 단계입니다.','허가·승인 원문과 이주·공사 관련 자료'],
 '착공':['리모델링 공사 시작에 관한 단계입니다.','착공과 공식 공사현황']
 }[stage];url='https://cleanup.seoul.go.kr/cleanup/view/remodeling.do';}
 else if(p.project_type==='모아타운'&&stage==='관리지역고시'){row=['모아타운 관리구역의 고시 기록입니다. 개별 조합의 공사·사업 단계와 구분합니다.','관리계획 고시 원문과 구역 내 개별 사업장 자료'];url=p.source;}
 return row?{meaning:row[0],next:row[1],source:url}:null;
}
function current(p){
 const key=id(p),check=window.RentRedevelopmentStageChecks?.[key],banghwa=key==='cleanup-banghwa6'?window.RentBanghwa6Verified:null;
 const raw=check?.stage||banghwa?.project.currentStage||p.status,known=!missing(raw);
 const stage=known?raw:'사업 단계 미확인';
 let date=null,dateSource=null;
 if(known&&check&&day(check.date)){date=check.date;dateSource=check.source;}
 else if(known&&p.project_type==='모아타운'&&day(p.status_date)){date=p.status_date;dateSource=p.source;}
 const events=(p.events||[]).filter(e=>(e.stage||e.event)===raw&&day(e.date)&&e.is_future!==true&&e.date<=new Date().toISOString().slice(0,10)).sort((a,b)=>b.date.localeCompare(a.date));
 return{stage,known,date,dateSource,recentStageEvent:date?null:events[0]?.date||null,checkedAt:check?.checked_at||(banghwa?'2026-10-13':null)||p.collected_at?.slice(0,10)||p.accessed_at?.slice(0,10)||null,source:check?.source||p.source,verificationNote:check?.note||null,sourceUnavailable:check?.home_unavailable===true,guidance:known?guidance(p,raw):null,isArea:p.project_type==='모아타운'};
}
function dateText(c){return c.date?'단계 발생일 '+c.date:c.recentStageEvent?'이 단계의 최근 확인 기록 '+c.recentStageEvent:c.known?'현재 단계 발생일 미확인':'공식 현재 단계 추가 확인 필요';}
function summary(p){const c=current(p);return c.stage+' · '+dateText(c);}
function renderCurrent(p){const c=current(p);return `<section class="project-stage-banner"><span class="pilot-label">${c.isArea?'공식 관리구역 단계':'현재 사업 단계'}</span><strong>${esc(c.stage)}</strong><p class="stage-date">${esc(dateText(c))}</p>${c.checkedAt?`<small>자료 확인일 ${esc(c.checkedAt)}</small>`:''}${c.sourceUnavailable?'<small>목록 기준 · 최신 공식 상세 단계 미확인</small>':''}</section><details class="stage-verification"><summary>단계 설명·확인 근거</summary>${c.guidance?`<p class="stage-meaning">${esc(c.guidance.meaning)}</p><p>다음 확인 자료: ${esc(c.guidance.next)}.</p><p class="coverage">해당 현장의 다음 일정이나 완료를 뜻하지 않습니다.</p>${source(c.guidance.source,'유형별 공식 절차')}`:'<p>이 유형·단계의 쉬운 설명과 다음 확인 자료는 추가 공식 확인이 필요합니다.</p>'}<p class="coverage">자료 확인일·같은 단계의 최근 사건은 단계 발생일과 구분합니다.</p>${c.dateSource?source(c.dateSource,'단계 날짜 확인 근거'):''}${c.verificationNote?`<p>${esc(c.verificationNote)}</p>`:''}</details>`;}
function operations(p){const raw=p.registry||p;if(p.project_type==='모아타운')return '';return `<section class="original-operations"><h3>원문 운영정보</h3><dl><dt>운영구분</dt><dd>${esc(raw.operation_status||'미확인')}</dd><dt>운영단계</dt><dd>${esc(raw.operation_stage||'미확인')}</dd></dl><p>원문 운영정보와 현재 사업 단계·공사 중단 여부는 구분합니다.${raw.operation_status==='일시중단'?' ‘일시중단’의 구체적인 사유는 확인되지 않았습니다. 이 값만으로 공사 중단을 판단하지 않습니다.':''}</p>${source(raw.list_source||raw.source,'운영정보 원문')}${raw.collected_at?`<small>목록 확인일 ${esc(raw.collected_at.slice(0,10))}</small>`:''}</section>`;}
function sourceDate(p){const raw=String(p.source_updated_at||'');return /^\d{4}-\d{2}-\d{2}T/.test(raw)?raw.slice(0,10).replace(/-/g,'.'):'';}
function sourceDateHelp(p){return sourceDate(p)?'<p class="coverage">공식자료 수정일은 원천 포털의 자료 수정일입니다. 사업 인가·착공일이나 이 페이지의 자료 수집일과 다를 수 있습니다.</p>':'';}
function coreFacts(p){const rows=(p.facts||[]).map(([key,value])=>String(key).startsWith('포털 데이터 수정시각')&&sourceDate(p)?['공식자료 수정일',sourceDate(p)]:[key,value]).filter(([key])=>!['운영구분','운영단계'].includes(String(key).replace(/\s/g,''))),check=window.RentRedevelopmentStageChecks?.[id(p)];if(check?.business_id)rows.push(['공식 사업 ID',check.business_id]);if(check?.cafe_id)rows.push(['공식 카페 ID',check.cafe_id]);return rows;}
window.RentRedevelopmentStatus={current,dateText,summary,renderCurrent,operations,coreFacts,guidance,sourceDate,sourceDateHelp};
})();
