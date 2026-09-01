(()=>{
  const FEED_URL='https://arttoy61-png.github.io/rent-check/public_housing_notices.json';
  const DISMISS_KEY='rentcheck:new-housing-alert-dismissed-v2';
  const ROUTES={
    'SH:seq:309337':'/public-housing/sh-happy-housing-2026-2/',
    'SH:seq:309403':'/public-housing/sh-long-vacant-purchase-2026-2/'
  };

  function datePartsKST(date=new Date()){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const map=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return {y:+map.year,m:+map.month,d:+map.day,iso:`${map.year}-${map.month}-${map.day}`};
  }
  function isoDate(value){
    const m=String(value||'').match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
    return m?`${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`:'';
  }
  function dayDiffFromToday(iso){
    const m=String(iso||'').match(/(20\d{2})-(\d{2})-(\d{2})/);if(!m)return 999;
    const t=datePartsKST();
    const a=Date.UTC(+t.y,t.m-1,t.d),b=Date.UTC(+m[1],+m[2]-1,+m[3]);
    return Math.round((a-b)/86400000);
  }
  function cleanTitle(title){return String(title||'').replace(/&nbsp;/gi,' ').replace(/^\s*(?:LH|SH)\s*/i,'').trim()}
  function isRecruitmentNotice(item){
    const title=cleanTitle(item?.title);
    if(!title)return false;
    if(/발표|결과|정정|변경|취소|당첨|선정결과|서류심사\s*대상자/i.test(title))return false;
    return /모집공고|입주자\s*모집|예비입주자\s*모집|행복주택.*모집|매입임대.*모집|전세임대.*모집|임대주택.*모집/i.test(title);
  }
  function internalUrl(item){return ROUTES[String(item?.id||'')]||`/public-housing/?id=${encodeURIComponent(item?.id||'')}`}
  function shortDate(value){
    const m=String(value||'').match(/20\d{2}[-./](\d{1,2})[-./](\d{1,2})/);return m?`${+m[1]}/${+m[2]}`:'';
  }
  function applicationText(item){
    const start=shortDate(item?.application_start),end=shortDate(item?.deadline);
    if(start&&end)return start===end?`신청 ${start}`:`신청 ${start}~${end}`;
    if(start)return `신청 ${start}부터`;
    return '신청 일정 확인 중';
  }
  function audienceText(item){
    const audiences=(item?.audiences||[]).filter(Boolean).slice(0,3);
    if(audiences.length)return audiences.join('·');
    const types=(item?.housing_types||[]).filter(Boolean).slice(0,2);
    return types.join('·');
  }
  function dismissedIds(){
    try{
      const saved=JSON.parse(localStorage.getItem(DISMISS_KEY)||'null');
      return new Set(Array.isArray(saved?.ids)?saved.ids.map(String):[]);
    }catch(_){return new Set()}
  }
  function storeDismiss(items){
    try{
      const ids=dismissedIds();
      items.forEach(item=>{if(item?.id)ids.add(String(item.id))});
      localStorage.setItem(DISMISS_KEY,JSON.stringify({ids:[...ids],at:Date.now()}));
    }catch(_){}
  }
  function close(root){root.hidden=true;document.documentElement.classList.remove('rc-new-alert-open')}
  function render(items,pubDate){
    if(!items.length)return;
    const root=document.createElement('div');root.className='rc-new-alert';root.hidden=true;root.id='rcNewHousingAlert';
    const shown=items.slice(0,3),extra=Math.max(0,items.length-shown.length);
    root.innerHTML=`<button class="rc-new-alert__backdrop" type="button" aria-label="신규공고 알림 닫기"></button><section class="rc-new-alert__sheet" role="dialog" aria-modal="true" aria-labelledby="rcNewHousingAlertTitle"><div class="rc-new-alert__handle"></div><header class="rc-new-alert__head"><p class="rc-new-alert__eyebrow"><span class="rc-new-alert__dot"></span>Rent Check 신규공고 <span class="rc-new-alert__count">${items.length}건</span></p><h2 id="rcNewHousingAlertTitle">새 임대주택 공고가 나왔어요</h2><p class="rc-new-alert__sub">신청은 공고일과 다를 수 있어요. 접수일을 먼저 확인하세요.</p><button class="rc-new-alert__close" type="button" aria-label="닫기">×</button></header><div class="rc-new-alert__body"><div class="rc-new-alert__list"></div>${extra?`<p class="rc-new-alert__more">외 ${extra}건은 모집공고 모음에서 확인할 수 있습니다.</p>`:''}</div><footer class="rc-new-alert__foot"><a class="rc-new-alert__all" href="/public-housing/">신규공고 ${items.length}건 모두 보기 →</a><button class="rc-new-alert__dismiss" type="button">이 신규공고는 다시 보지 않기</button></footer><p class="rc-new-alert__hint">공고 카드를 누르면 Rent Check 내부 페이지로 이동합니다.</p></section>`;
    const list=root.querySelector('.rc-new-alert__list');
    shown.forEach(item=>{
      const a=document.createElement('a');a.className='rc-new-alert__item';a.href=internalUrl(item);
      const agency=item.agency||item.agency_group||'임대주택',aud=audienceText(item);
      a.innerHTML=`<div class="rc-new-alert__item-head"><span class="rc-new-alert__agency"></span><span class="rc-new-alert__new">신규</span></div><strong></strong><div class="rc-new-alert__meta"><b></b>${aud?' · <span></span>':''}</div><div class="rc-new-alert__go"><span>일정·자격 간단히 보기</span><span>→</span></div>`;
      a.querySelector('.rc-new-alert__agency').textContent=agency;
      a.querySelector('strong').textContent=cleanTitle(item.title);
      a.querySelector('.rc-new-alert__meta b').textContent=applicationText(item);
      const span=a.querySelector('.rc-new-alert__meta span');if(span)span.textContent=aud;
      list.append(a);
    });
    root.querySelector('.rc-new-alert__backdrop').addEventListener('click',()=>close(root));
    root.querySelector('.rc-new-alert__close').addEventListener('click',()=>close(root));
    root.querySelector('.rc-new-alert__dismiss').addEventListener('click',()=>{storeDismiss(items);close(root)});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!root.hidden)close(root)});
    document.body.append(root);
    setTimeout(()=>{root.hidden=false;document.documentElement.classList.add('rc-new-alert-open')},550);
  }
  async function init(){
    if(location.pathname!=='/'&&location.pathname!=='/index.html')return;
    try{
      const res=await fetch(`${FEED_URL}?v=${Date.now()}`,{cache:'no-store'});if(!res.ok)return;
      const data=await res.json();
      const recruit=(data.items||[]).filter(isRecruitmentNotice).map(item=>({...item,_pub:isoDate(item.published_at)})).filter(item=>item._pub);
      if(!recruit.length)return;
      const latest=[...new Set(recruit.map(x=>x._pub))].sort().pop();
      const age=dayDiffFromToday(latest);
      if(age<0||age>2)return;
      const hidden=dismissedIds();
      const items=recruit.filter(x=>x._pub===latest&&!hidden.has(String(x.id||''))).sort((a,b)=>String(a.agency||'').localeCompare(String(b.agency||''),'ko'));
      if(items.length)render(items,latest);
    }catch(_){/* 신규공고 알림 실패는 홈 이용을 막지 않는다. */}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

(()=>{
  function loadAskPopup(){
    if(location.pathname!=='/'&&location.pathname!=='/index.html')return;
    if(document.querySelector('script[data-rc-ask-popup]'))return;
    const script=document.createElement('script');
    script.src='/data/ask-popup.js?v=20260901-1';
    script.defer=true;
    script.dataset.rcAskPopup='1';
    document.head.append(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadAskPopup,{once:true});else loadAskPopup();
})();
