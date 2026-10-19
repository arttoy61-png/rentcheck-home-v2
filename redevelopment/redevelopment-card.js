/* Shared redevelopment card sections. No transaction/eligibility inference. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source=(url,label)=>url?`<a href="${esc(url)}" target="_blank" rel="noopener" data-preserve>${esc(label)} ↗</a>`:'';
const standard=[['계획·구역',['정비계획 수립','정비구역지정','안전진단','안전진단(1차)']],['조합',['추진위원회승인','추진위구성','조합설립인가']],['사업·분양계획',['사업시행인가','관리처분인가']],['철거·공사',['철거','철거 및 착공','착공','분양','일반분양승인']],['준공·권리이전',['부분준공인가','준공인가','이전고시']],['해산·청산',['조합해산','조합청산','청산 및 조합해산']]];
const small=[['조합',['조합설립인가']],['심의·사업계획',['사업시행인가']],['이주·공사',['철거','철거 및 착공','착공','분양']],['준공·입주',['준공인가','부분준공인가']],['해산·청산',['조합해산','조합청산','청산 및 조합해산']]];
const localHouse=[['추진·모집',['추진위구성','조합규약작성','조합원 모집신고']],['조합',['조합설립인가','조합창립총회']],['사업계획',['사업계획승인']],['공사·분양',['착공','조합원 동 호수 추첨, 일반분양']],['사용검사·입주',['사용검사']],['해산·청산',['조합해산','조합청산','청산 및 조합해산']]];
const remodeling=[['조합',['조합설립인가']],['진단·심의',['안전진단(1차)','도시계획심의']],['허가·계획',['사업계획승인(리모델링 허가)']],['이주·공사',['철거','착공']],['사용검사',['준공인가']]];
function header(p){return `<header class="project-card-heading"><span class="badge blue">${esc(p.project_type||'사업 유형 미확인')}</span><h2 id="detailTitle">${esc(p.official_name||p.title)}</h2><p class="project-address">${esc(p.location?.representative_address||p.address||'대표주소 미확인')}</p>${brand(p)}</header>`;}
function progress(p){const c=window.RentRedevelopmentStatus.current(p),t=p.project_type;let groups=null,url=null;
if(['재건축','재개발(주택정비형)','재개발(도시정비형)'].includes(t)){groups=standard;url='https://cleanup.seoul.go.kr/cleanup/view/'+(t==='재건축'?'rebuild':'redevelop')+'.do';}
else if(['가로주택정비','소규모재건축'].includes(t)){groups=small;url='https://cleanup.seoul.go.kr/cleanup/view/'+(t==='가로주택정비'?'garoHouse':'smallRcnstctn')+'.do';}
else if(t==='지역주택'){groups=localHouse;url='https://cleanup.seoul.go.kr/cleanup/view/localHouse.do';}
else if(t==='리모델링'){groups=remodeling;url='https://cleanup.seoul.go.kr/cleanup/view/remodeling.do';}
const index=groups?.findIndex(([,stages])=>stages.includes(c.stage))??-1;
return `<section class="project-progress"><h3>${t==='모아타운'?'관리구역 기록':'사업 유형별 진행도'}</h3>${groups?`<ol class="pilot-track" aria-label="${esc(t)} 일반 절차상 현재 위치">${groups.map(([label],i)=>`<li ${i===index?'aria-current="step"':''}><span class="progress-node" aria-hidden="true"></span><span class="progress-label">${esc(label)}${i===index?'<b>현재</b>':''}</span></li>`).join('')}</ol><p class="coverage">${index<0?'현재 단계는 이 요약 절차에 대응하지 않아 위치를 표시하지 않았습니다. ':''}일반 절차 요약 · 앞 단계 완료나 남은 기간을 뜻하지 않습니다.</p><details class="progress-source"><summary>유형별 절차 근거</summary>${source(url,'공식 절차 원문')}</details>`:`<p class="coverage">${t==='모아타운'?'관리계획 단계는 구역 내 개별 사업의 공사 진행도와 다릅니다. 개별 사업장별로 확인해야 합니다.':'이 유형의 공식 절차를 추가 확인해야 합니다. 다른 사업의 단계를 복사해 진행도로 표시하지 않았습니다.'}</p>`}</section>`;}
function isClosed(p){return ['조합해산','조합청산','청산 및 조합해산'].includes(window.RentRedevelopmentStatus.current(p).stage);}
function aliases(p){return (p.registry?.id||p.id)==='cleanup-banghwa6'?['방화6재정비촉진구역','방화6구역','래미안 엘라비네','방화동 608-97']:[];}
function searchText(p){return [p.title,p.official_name,p.address,...aliases(p)].filter(Boolean).join(' ');}
function matches(p,query){const norm=s=>String(s||'').replace(/\s/g,'').toLowerCase(),hay=norm(searchText(p));return String(query||'').trim().split(/\s+/).filter(Boolean).every(q=>hay.includes(norm(q)));}
function mapItems(rows){return rows.map(p=>isClosed(p)?{...p,official_name:'[종료] '+(p.official_name||p.title)}:p);}
function brand(p){return aliases(p).length?'<p class="project-brand">래미안 엘라비네 · 방화6구역 (방화6단지와 별개)</p>'+source('https://www.raemian.co.kr/sales/sub/s/elravine?menuSeq=10583','브랜드·주소 확인 자료'):'';}
function questions(p){if(isClosed(p))return `<section class="purchase-questions closed-project"><h3>해산·청산 기록 확인</h3><p>공식 현재 단계는 ${esc(window.RentRedevelopmentStatus.current(p).stage)}입니다. 기존 사업 이력과 공식 자료를 먼저 확인하세요.</p><p class="coverage">새 조합원 승계나 신규 분양을 진행 중인 사업으로 안내하지 않습니다. 해산일은 위 단계 날짜의 확인 상태를 따릅니다.</p><article class="purchase-question"><h4>확인 자료와 문의</h4><p>해산·청산 관련 고시와 기존 사업 이력을 ${esc(p.district||'관할')} 구청 정비사업 담당 부서에 확인하세요.</p><p>질문: 이 사업의 해산·청산 기록과 현재 자료 확인 담당자는 누구인가요?</p></article>${source(p.source,'기존 사업 공식 자료')}</section>`;
return `<section class="purchase-questions"><h3>지금 매수하면?</h3><p class="coverage">단계만으로 개인의 승계·분양 자격을 확정할 수 없습니다. 아래 자료와 질문으로 확인하세요.</p>${[
 ['조합원 지위 승계','소유·취득 이력과 조합원 관련 자료','조합·추진주체와 관할 구청','이 매물의 취득 이력에 적용되는 승계 기준과 확인 자료는 무엇인가요?'],
 ['새 주택 분양대상','해당 필지의 분양대상 자료·사업계획','조합·사업시행자와 관할 구청','이 필지가 분양대상에 포함되는지 확인할 원문과 기준은 무엇인가요?'],
 ['계약 전 서류 대조','등기사항증명서·건축물대장·토지대장과 구역·사업계획 고시','매도인에게 서류 요청 후 관할 구청에 사업자료 확인','서류의 주소·소유 이력과 공식 사업자료가 서로 일치하나요?']
 ].map(([q,doc,office,question])=>`<article class="purchase-question"><div class="question-heading"><h4>${q}</h4><span class="check-needed">개별 확인</span></div><p><b>자료</b> ${doc}</p><p><b>문의</b> ${office}</p><details><summary>문의할 질문</summary><p>${question}</p></details></article>`).join('')}<details class="question-sources"><summary>공식 확인 자료</summary>${source(p.source,'현장 원문')}${source('https://cleanup.seoul.go.kr/cleanup/view/rebuild.do','서울시 정비사업 절차·담당 기관')}<p class="coverage">개인별 적용 법적 조건·자격은 확인되지 않았습니다. 구역 포함 여부는 공식 경계와 검증 위치를 대조해야 하며, 이 지도로 필지의 법적 지위를 판정하지 않습니다.</p></details></section>`;}
function transactions(p){if(window.RentRedevelopmentNearby?.matches(p))return window.RentRedevelopmentNearby.render(p);return `<section class="project-transactions"><h3>주변 실거래</h3><p class="connection-state">현장별 실거래 미연결</p><div class="trade-empty"><strong>구역 안 거래 · 확인 필요</strong><p>공식 경계와 필지를 대조한 거래 자료가 연결되지 않았습니다.</p></div><div class="trade-empty"><strong>주변 일반 주택 거래 · 미연결</strong><p>구역 밖 주변 거래는 별도로 확인해야 합니다. 입주권 거래와 구분합니다.</p></div><p class="coverage">확인된 거래 건수·금액이 없어 표와 가격을 표시하지 않습니다.</p>${p?.district==='강서구'?'<p class="coverage">기존 강서구 일반 주택 자료는 계약일 기준 2026-04-08~2026-10-08입니다. 사업 ID·구역별 필지 연결과 개별 거래 취소 여부가 없어 이 현장의 거래로 확정할 수 없습니다.</p><button class="action secondary" data-tab="transactions">강서구 일반 주택 실거래 탐색</button>':''}</section>`;}
window.RentRedevelopmentCard={header,progress,questions,transactions,isClosed,aliases,searchText,mapItems,matches};
})();
