(()=>{
  if(location.pathname!=='/'&&location.pathname!=='/index.html')return;

  const ITEMS=[
    {q:'부모님 집 있어도 청년임대 되나요?',keywords:['부모님 집','부모 유주택','청년임대','청년 매입임대'],cat:'청년·공공주택',answer:'가능한 경우가 있습니다. 다만 순위와 공고 유형에 따라 부모의 주택·소득·자산 기준을 함께 보는지가 달라질 수 있습니다.',action:'내 순위와 부모 기준 반영 여부를 먼저 확인한 뒤, 현재 모집 공고의 자격을 같이 보세요.',tool:'청년임대 계산기',url:'/tools/youth-score/',secondary:'현재 공고 보기',secondaryUrl:'/public-housing/'},
    {q:'청년안심주택 2순위와 3순위는 뭐가 다른가요?',keywords:['2순위 3순위','청년안심주택 순위','청년임대 순위'],cat:'청년·공공주택',answer:'순위별로 소득·자산과 부모 기준 적용 범위가 달라질 수 있습니다. 공고문에서 본인에게 해당하는 순위를 먼저 확인해야 합니다.',action:'청년임대 계산기로 내 순위를 확인하고, 해당 공고의 순위별 기준을 다시 확인하세요.',tool:'청년임대 계산기',url:'/tools/youth-score/',secondary:'현재 공고 보기',secondaryUrl:'/public-housing/'},
    {q:'LH 청년전세임대에서 부모님 자산도 보나요?',keywords:['lh 청년전세임대','부모 자산','부모님 자산'],cat:'청년·공공주택',answer:'순위에 따라 부모 자산을 함께 보는 경우가 있습니다. 같은 청년전세임대라도 신청 순위에 따라 기준이 달라질 수 있습니다.',action:'먼저 내 신청 순위를 확인한 뒤 해당 모집공고의 소득·자산 기준을 확인하세요.',tool:'현재 공고 보기',url:'/public-housing/'},
    {q:'청년임대 순위를 잘못 선택하면 탈락하나요?',keywords:['순위 잘못','신청한 순위','순위 다르면','탈락'],cat:'청년·공공주택',answer:'공고 기준과 다른 순위로 신청하면 심사 과정에서 불이익이 생길 수 있습니다. 실제 처리는 공고와 신청 시스템 기준을 확인해야 합니다.',action:'제출 전 내 순위와 신청 화면의 선택값을 다시 맞춰보세요.',tool:'청년임대 계산기',url:'/tools/youth-score/',secondary:'현재 공고 보기',secondaryUrl:'/public-housing/'},
    {q:'SH 청년주택 서류심사 대상이면 합격한 건가요?',keywords:['서류심사 대상','서류대상','sh 서류심사'],cat:'청년·공공주택',answer:'아직 최종 합격은 아닙니다. 서류심사 대상은 다음 심사를 위한 단계이고, 최종 당첨·계약까지 절차가 남아 있습니다.',action:'서류 제출기한과 제출방법을 먼저 확인하고 결과 발표일도 같이 저장해두세요.',tool:'현재 공고 보기',url:'/public-housing/'},
    {q:'LH 임대주택은 신청 횟수 제한이 있나요?',keywords:['신청 횟수','횟수 제한','lh 무주택'],cat:'청년·공공주택',answer:'공고 유형마다 중복신청·계약 제한이 다를 수 있습니다. 단순히 신청 횟수만으로 판단하면 안 됩니다.',action:'현재 신청하려는 공고의 중복신청 제한과 계약 단계 제한을 확인하세요.',tool:'현재 공고 보기',url:'/public-housing/'},
    {q:'모아타운 분담금 얼마 나올까요?',keywords:['모아타운 분담금','분담금 얼마','추가분담금'],cat:'재개발',answer:'분담금은 권리가액과 조합원 분양가 차이에서 시작합니다. 실제 금액은 사업비·평형·추가부담 조건에 따라 달라질 수 있습니다.',action:'현재 예상 권리가액과 조합원 분양가를 넣어 기본 분담금부터 확인하세요.',tool:'재개발 분담금 계산기',url:'/calc/'},
    {q:'빌라 재개발 분담금도 계산할 수 있나요?',keywords:['빌라 재개발','빌라 분담금','재개발 분담금 계산'],cat:'재개발',answer:'기본 구조는 계산할 수 있습니다. 다만 실제 정산액은 사업별 감정평가와 조합 기준을 함께 봐야 합니다.',action:'권리가액과 조합원 분양가를 기준으로 1차 계산한 뒤 사업별 자료와 비교하세요.',tool:'재개발 분담금 계산기',url:'/calc/'},
    {q:'관리처분인가 나면 언제 이사하나요?',keywords:['관리처분인가','언제 이사','이주기간','몇개월'],cat:'재개발',answer:'관리처분인가가 났다고 바로 같은 날 이사하는 것은 아닙니다. 이후 이주계획·이주개시 통지와 사업 일정에 따라 실제 이주시점이 정해집니다.',action:'조합이나 사업시행자가 안내한 이주개시일과 이주기간을 먼저 확인하세요.',tool:'재개발 글 보기',url:'/blog/redevelopment-tenant/'},
    {q:'재개발 세입자도 이사비를 받을 수 있나요?',keywords:['세입자 이사비','재개발 이사비','주거이전비'],cat:'재개발',answer:'조건에 따라 받을 수 있는 항목이 달라집니다. 세입자는 거주 시점과 사업 단계, 보상 기준을 따로 확인해야 합니다.',action:'내 전입일과 사업 기준일을 확인한 뒤 주거이전비·이사비 대상 여부를 구분해서 보세요.',tool:'재개발 글 보기',url:'/blog/redevelopment-tenant/'},
    {q:'계약갱신청구권 쓰기 전에 문자로 남겨야 하나요?',keywords:['계약갱신청구권','문자로','문자 남겨','갱신권'],cat:'전월세 계약',answer:'분쟁을 줄이려면 갱신 의사를 문자처럼 기록이 남는 방식으로 전달하는 것이 좋습니다. 실제 효력은 내용과 시점도 함께 봐야 합니다.',action:'갱신 의사와 계약 만료일이 드러나도록 짧고 분명하게 보내고 기록을 보관하세요.',tool:'전월세 문자 만들기',url:'/tools/tenant-message/'},
    {q:'보증금 1000·월세 60 중개수수료 얼마예요?',keywords:['1000 60','보증금 1000','월세 60','중개수수료','중개보수'],cat:'세금·비용',answer:'월세 계약의 중개보수는 보증금과 월세를 환산한 거래금액을 기준으로 상한을 계산합니다.',action:'보증금 1,000만원과 월세 60만원을 그대로 넣어 상한액을 확인하세요.',tool:'중개보수 계산기',url:'/tools/brokerage-fee/'},
    {q:'7억 아파트 사면 취득세 얼마예요?',keywords:['7억','취득세','아파트 사면'],cat:'세금·비용',answer:'취득세는 매수가격뿐 아니라 주택 수, 지역, 취득원인 등에 따라 달라집니다.',action:'7억원과 현재 주택 수를 넣어 취득세·지방교육세·농어촌특별세를 함께 확인하세요.',tool:'취득세 계산기',url:'/tools/acquisition-tax/'},
    {q:'전세가율 몇 퍼센트면 위험한가요?',keywords:['전세가율','몇 퍼센트','위험'],cat:'전월세 계약',answer:'전세가율이 높을수록 매매가 하락 시 보증금 여유가 줄어듭니다. 비율 하나만으로 안전 여부를 확정할 수는 없습니다.',action:'매매가와 전세보증금을 넣어 전세가율을 계산한 뒤 선순위 채권과 시세도 함께 보세요.',tool:'전세가율 계산기',url:'/tools/jeonse-ratio/'},
    {q:'전세랑 월세 중 뭐가 더 유리한가요?',keywords:['전세 월세','뭐가 더','유리'],cat:'전월세 계약',answer:'월세와 전세의 유불리는 보증금 차액의 자금비용과 실제 월세를 같은 월 기준으로 비교해야 합니다.',action:'두 계약의 보증금과 월세를 넣어 매달 체감비용을 비교하세요.',tool:'전세 vs 월세 비교',url:'/tools/rent-vs-monthly/'}
  ];

  const style=document.createElement('style');
  style.id='rcAskPopupStyle';
  style.textContent=`
    .rc-ask-fab{position:fixed;right:22px;bottom:22px;z-index:75;border:0;border-radius:999px;background:#0d1f3c;color:#fff;padding:15px 18px;box-shadow:0 16px 36px rgba(13,31,60,.28);font:900 13px/1.2 inherit;display:none;align-items:center;gap:10px}
    .rc-ask-fab i{width:10px;height:10px;border-radius:50%;background:#70b7ff;box-shadow:0 0 0 5px rgba(112,183,255,.15);display:block;flex:0 0 auto}
    .rc-ask-fab small{font-weight:700;opacity:.78}
    .rc-ask-backdrop{position:fixed;inset:0;z-index:190;background:rgba(8,20,38,.48);border:0;opacity:0;pointer-events:none;transition:.18s}
    .rc-ask-sheet{position:fixed;z-index:191;left:50%;top:50%;width:min(600px,calc(100vw - 28px));max-height:min(720px,calc(100vh - 36px));overflow:auto;transform:translate(-50%,-47%);background:#fff;border-radius:22px;box-shadow:0 24px 70px rgba(13,31,60,.26);opacity:0;pointer-events:none;transition:.18s;padding:24px}
    .rc-ask-open .rc-ask-backdrop{opacity:1;pointer-events:auto}.rc-ask-open .rc-ask-sheet{opacity:1;pointer-events:auto;transform:translate(-50%,-50%)}
    .rc-ask-close{position:absolute;right:15px;top:14px;width:36px;height:36px;border:1px solid #d9e0e8;border-radius:50%;background:#fff;color:#475467;font-size:20px}
    .rc-ask-kicker{margin:0 42px 5px 0;color:#1565c0;font-size:12px;font-weight:900}.rc-ask-title{margin:0 42px 4px 0;color:#0d1f3c;font-size:25px;letter-spacing:-.6px}.rc-ask-sub{margin:0 38px 16px 0;color:#667085;font-size:13px;line-height:1.55}
    .rc-ask-form{display:grid;grid-template-columns:1fr auto;gap:8px;border:2px solid #0d1f3c;border-radius:14px;padding:6px}.rc-ask-input{min-width:0;border:0;outline:0;padding:11px 10px;font-size:15px}.rc-ask-submit{border:0;border-radius:10px;background:#0d1f3c;color:#fff;font-weight:900;padding:0 16px}
    .rc-ask-label{margin:15px 0 8px;color:#344054;font-size:12px;font-weight:900}.rc-ask-chips{display:grid;grid-template-columns:1fr 1fr;gap:7px}.rc-ask-chip{border:1px solid #d9e0e8;background:#fff;border-radius:11px;padding:10px 11px;text-align:left;color:#344054;font-size:12px;line-height:1.4}
    .rc-ask-result{margin-top:16px}.rc-ask-card{border:1px solid #d9e0e8;border-radius:15px;padding:16px;background:#fff}.rc-ask-card small{color:#1565c0;font-weight:900}.rc-ask-card h3{margin:5px 0 8px;color:#0d1f3c;font-size:18px;line-height:1.45}.rc-ask-card p{margin:0;color:#344054;font-size:14px;line-height:1.65}.rc-ask-now{margin-top:12px;background:#eef5fc;border-left:4px solid #1565c0;border-radius:8px;padding:11px 12px;font-size:13px;line-height:1.55}.rc-ask-now b{display:block;color:#0d1f3c;margin-bottom:2px}.rc-ask-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.rc-ask-actions a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-radius:9px;padding:10px 12px;font-size:12px;font-weight:900}.rc-ask-primary{background:#0d1f3c;color:#fff}.rc-ask-secondary{border:1px solid #d9e0e8;color:#0d1f3c;background:#fff}
    @media(max-width:720px){.rc-ask-fab{display:flex;right:14px;bottom:max(14px,env(safe-area-inset-bottom));padding:14px 16px}.rc-ask-fab small{display:none}.rc-ask-sheet{left:0;right:0;top:auto;bottom:0;width:100%;max-height:88dvh;border-radius:22px 22px 0 0;transform:translateY(28px);padding:20px 17px calc(20px + env(safe-area-inset-bottom))}.rc-ask-open .rc-ask-sheet{transform:translateY(0)}.rc-ask-title{font-size:22px}.rc-ask-chips{grid-template-columns:1fr}.rc-ask-form{grid-template-columns:1fr auto}}
  `;
  document.head.append(style);

  const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='rc-ask-backdrop';backdrop.setAttribute('aria-label','물어보세요 닫기');
  const sheet=document.createElement('section');sheet.className='rc-ask-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','rcAskTitle');
  sheet.innerHTML=`<button class="rc-ask-close" type="button" aria-label="닫기">×</button><p class="rc-ask-kicker">질문 → 답 → 바로 확인</p><h2 class="rc-ask-title" id="rcAskTitle">Rent Check에 물어보세요</h2><p class="rc-ask-sub">부동산 용어를 몰라도 됩니다. 궁금한 걸 그대로 적어보세요.</p><form class="rc-ask-form"><input class="rc-ask-input" type="search" placeholder="예: 부모님 집 있어도 청년임대 되나요?" autocomplete="off"><button class="rc-ask-submit" type="submit">답 보기</button></form><p class="rc-ask-label">많이 물어볼 질문</p><div class="rc-ask-chips"></div><div class="rc-ask-result" aria-live="polite"></div>`;
  document.body.append(backdrop,sheet);

  const fab=document.createElement('button');fab.type='button';fab.className='rc-ask-fab';fab.innerHTML='<i></i><span>Rent Check에 물어보세요</span><small>→</small>';document.body.append(fab);
  const modalInput=sheet.querySelector('.rc-ask-input'),result=sheet.querySelector('.rc-ask-result'),chips=sheet.querySelector('.rc-ask-chips');
  ['부모님 집 있어도 청년임대 되나요?','모아타운 분담금 얼마 나올까요?','관리처분인가 나면 언제 이사하나요?','보증금 1000·월세 60 중개수수료 얼마예요?'].forEach(q=>{const b=document.createElement('button');b.type='button';b.className='rc-ask-chip';b.textContent=q;b.addEventListener('click',()=>{modalInput.value=q;answer(q)});chips.append(b)});

  function norm(v){return String(v||'').toLowerCase().replace(/\s+/g,' ').trim()}
  function best(q){const text=norm(q);let winner=null,max=0;ITEMS.forEach(item=>{let score=0;item.keywords.forEach(k=>{if(text.includes(norm(k)))score+=5});if(text.includes(norm(item.q))||norm(item.q).includes(text))score+=10;if(score>max){max=score;winner=item}});return max?winner:null}
  function answer(q){
    const item=best(q);
    if(!item){result.innerHTML=`<article class="rc-ask-card"><small>아직 등록되지 않은 질문</small><h3>${escapeHtml(q)}</h3><p>지금은 실제 유입에서 확인된 질문부터 답을 연결하고 있습니다. 아래 계산 도구나 분석 글에서 먼저 확인해보세요.</p><div class="rc-ask-actions"><a class="rc-ask-primary" href="#calculators">계산 도구 보기 →</a><a class="rc-ask-secondary" href="/analysis/">분석 글 보기</a></div></article>`;return}
    result.innerHTML=`<article class="rc-ask-card"><small>한 줄 요약 · ${escapeHtml(item.cat)}</small><h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.answer)}</p><div class="rc-ask-now"><b>지금 할 일</b>${escapeHtml(item.action)}</div><div class="rc-ask-actions"><a class="rc-ask-primary" href="${item.url}">${escapeHtml(item.tool)} →</a>${item.secondary?`<a class="rc-ask-secondary" href="${item.secondaryUrl}">${escapeHtml(item.secondary)}</a>`:''}</div></article>`;
  }
  function escapeHtml(v){return String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function open(q=''){document.documentElement.classList.add('rc-ask-open');if(q){modalInput.value=q;answer(q)}else result.innerHTML='';setTimeout(()=>modalInput.focus(),80)}
  function close(){document.documentElement.classList.remove('rc-ask-open')}
  backdrop.addEventListener('click',close);sheet.querySelector('.rc-ask-close').addEventListener('click',close);fab.addEventListener('click',()=>open());document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  sheet.querySelector('.rc-ask-form').addEventListener('submit',e=>{e.preventDefault();const q=modalInput.value.trim();if(q)answer(q)});

  const homeForm=document.querySelector('#searchForm'),homeInput=document.querySelector('#searchInput'),homePanel=document.querySelector('#searchResults');
  if(homeForm&&homeInput){
    homeInput.placeholder='부동산 궁금한 걸 그대로 물어보세요';homeInput.setAttribute('aria-label','부동산 궁금한 걸 그대로 물어보세요');
    const label=homeForm.querySelector('label');if(label)label.textContent='부동산 궁금한 걸 그대로 물어보세요';
    const suppress=e=>{if(homePanel)homePanel.hidden=true;e.stopImmediatePropagation()};
    homeInput.addEventListener('focus',suppress,true);homeInput.addEventListener('input',suppress,true);
    homeForm.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();if(homePanel)homePanel.hidden=true;open(homeInput.value.trim())},true);
  }
})();
