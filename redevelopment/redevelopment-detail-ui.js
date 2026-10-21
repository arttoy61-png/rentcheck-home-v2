/* HOME presentation adapter. Consumes existing renderers; owns no data fetching or map engine. */
(()=>{'use strict';
const tabs=new Map();let serial=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(p,html,ctx){
 const t=document.createElement('template');t.innerHTML=html;
 const root=t.content;
 const take=selector=>{const n=root.querySelector(selector);if(!n)return '';const h=n.outerHTML;n.remove();return h;};
 const heading=take('.project-card-heading')||take('.project-heading')||ctx.card.header(p);
 const stage=take('.project-stage-banner')||take('.pilot-current')||ctx.current(p);
 const stageHelp=take('.stage-verification');
 const progress=take('.project-progress')||ctx.card.progress(p);
 let history=take('.pilot-all');
 if(!history){history=take('.latest-events');for(const n of [...root.querySelectorAll('details')])if(n.querySelector('summary')?.textContent.includes('전체 이력')){history+=n.outerHTML;n.remove();}}
 if(!history)history=ctx.history(p)||'<p>확인된 추진 이력 자료가 없습니다. 미진행을 뜻하지 않습니다.</p>';
 const questions=take('.purchase-questions')||ctx.card.questions(p);
 const transactions=take('.project-transactions')||ctx.card.transactions(p);
 const overview=take('.project-overview')||ctx.overview(p)||'<p class="coverage">공식 사업개요 상세 수치는 수집되지 않았습니다.</p>';
 // Move existing construction information only when the record's own renderer provides it.
 let construction='';for(const n of [...root.querySelectorAll('.pilot-section')])if(/공사·입주/.test(n.querySelector('h3')?.textContent||'')){construction+=n.outerHTML;n.remove();}
 root.querySelectorAll('[data-project-map]').forEach(n=>n.remove());
 const map=document.createElement('template');map.innerHTML=ctx.mapControl(p);
 const locate=map.content.querySelector('[data-project-map]');if(locate){locate.removeAttribute('data-project-map');locate.setAttribute('data-detail-locate-map','');locate.textContent='해당 현장 위치 보기';}
 const id=p.registry?.id||p.id,active=tabs.get(id)||'overview',uid='rd-detail-'+(++serial),o=p.overview||{},status=window.RentRedevelopmentStatus.current(p);
 const metric=(name,v,unit)=>`<div><dt>${name}</dt><dd>${v===null||v===undefined||v===''?'미확인':esc(String(v))+unit}</dd></div>`;
 const tab=(key,label)=>`<button type="button" role="tab" id="${uid}-${key}-tab" aria-controls="${uid}-${key}" aria-selected="${active===key}" tabindex="${active===key?0:-1}" data-detail-tab="${key}">${label}</button>`;
 const panel=(key,body)=>`<section role="tabpanel" id="${uid}-${key}" aria-labelledby="${uid}-${key}-tab" data-detail-panel="${key}" ${active===key?'':'hidden'}>${body}</section>`;
 return `<div class="redevelopment-card redevelopment-detail-ui" data-detail-project="${esc(id)}"><div class="rd-top-actions"><button type="button" class="action" data-detail-browse-map>상세 닫고 지도 둘러보기</button>${map.innerHTML}<button type="button" class="action secondary" data-redevelopment-clear>전체 목록으로</button></div>${heading}${stage}<dl class="rd-metrics">${metric('구역면적',o.area_m2,'㎡')}${metric('조합원',o.members,'명')}${metric('지상',o.floors_above_ground,'층')}</dl><div class="rd-tabs" role="tablist" aria-label="현장 상세 정보">${tab('overview','사업 개요')}${tab('history','추진 이력')}${tab('transactions','주변 실거래')}</div>${panel('overview',construction+overview+`<p class="rd-next"><strong>다음에 확인할 자료</strong><br>${esc(status.guidance?.next||'현장 공식 자료와 최신 변경 공고')}<small>확정 일정이 아닌 확인 안내입니다.</small></p><details class="rd-fold"><summary>${ctx.card.isClosed(p)?'해산·청산 확인사항':'매수 전 확인사항'}</summary>${questions}</details><details class="rd-fold"><summary>공식 출처 · 기준일 · 위치 근거</summary>${stageHelp}${t.innerHTML}</details>`)}${panel('history',progress+history)}${panel('transactions',transactions)}</div>`;
}
function select(button){const root=button.closest('[data-detail-project]');if(!root)return;const key=button.dataset.detailTab;tabs.set(root.dataset.detailProject,key);root.querySelectorAll('[data-detail-tab]').forEach(b=>{const on=b===button;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});root.querySelectorAll('[data-detail-panel]').forEach(p=>p.hidden=p.dataset.detailPanel!==key);}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-detail-tab]');if(b)select(b);});
document.addEventListener('keydown',e=>{const b=e.target.closest?.('[data-detail-tab]');if(!b||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const list=[...b.parentElement.querySelectorAll('[data-detail-tab]')],i=list.indexOf(b),next=list[e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length];select(next);next.focus();});
window.RentRedevelopmentDetailUI={render};
})();
