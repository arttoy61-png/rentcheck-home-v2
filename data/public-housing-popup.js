(()=>{
  const FEED_URL='https://arttoy61-png.github.io/rent-check/public_housing_notices.json';
  const STORAGE_KEY='rentcheck:public-housing-feed-signature';
  let feed=null;
  let activeFilter='전체';
  let activeDate='';
  let loadingPromise=null;

  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 20V8l6-4 6 4v12"/><path d="M9 11h6M9 15h6"/></svg>';
  const WEEKDAYS=['일','월','화','수','목','금','토'];

  function el(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }

  function pad(value){return String(value).padStart(2,'0')}
  function isoLocal(date){return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`}
  function parseDate(value){
    const match=String(value||'').match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
    if(!match)return null;
    const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
    return Number.isNaN(date.getTime())?null:date;
  }
  function titleDate(item){
    const match=String(item?.title||'').match(/(?:^|[^0-9])(20\d{2}|\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})(?:[^0-9]|$)/);
    if(!match)return null;
    let year=Number(match[1]);
    if(year<100)year+=2000;
    const date=new Date(year,Number(match[2])-1,Number(match[3]));
    return Number.isNaN(date.getTime())?null:date;
  }
  function publishedDate(item){return parseDate(item?.published_at)||titleDate(item)}
  function deadlineDate(item){return parseDate(item?.deadline)}

  function signature(data){
    return (data?.items||[]).map(item=>`${item.id}:${item.content_signature||''}`).sort().join('|');
  }

  async function loadFeed(){
    if(feed)return feed;
    if(loadingPromise)return loadingPromise;
    loadingPromise=fetch(`${FEED_URL}?v=${Date.now()}`,{cache:'no-store'})
      .then(res=>{if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json();})
      .then(data=>{feed=data;updateBadge();return data;})
      .finally(()=>{loadingPromise=null;});
    return loadingPromise;
  }

  function updateBadge(){
    const badge=document.querySelector('#publicHousingNoticeBadge');
    const count=document.querySelector('#publicHousingNoticeCount');
    if(!badge||!feed)return;
    if(count)count.textContent=`${feed?.summary?.total||feed?.items?.length||0}건`;
    const current=signature(feed);
    let previous='';
    try{previous=localStorage.getItem(STORAGE_KEY)||'';}catch(_){/* ignore */}
    if(!previous){
      try{localStorage.setItem(STORAGE_KEY,current);}catch(_){/* ignore */}
      badge.hidden=true;
      return;
    }
    badge.hidden=previous===current;
  }

  function categoryItems(){
    const items=feed?.items||[];
    if(activeFilter==='전체')return items;
    if(activeFilter==='청년')return items.filter(item=>(item.audiences||[]).includes('청년'));
    if(activeFilter==='신혼·신생아')return items.filter(item=>(item.audiences||[]).some(v=>v==='신혼부부'||v==='신생아'));
    if(activeFilter==='임대주택')return items.filter(item=>(item.housing_types||[]).some(v=>v!=='주거비지원'));
    return items;
  }

  function itemHasDate(item,iso){
    const pub=publishedDate(item),deadline=deadlineDate(item);
    return (pub&&isoLocal(pub)===iso)||(deadline&&isoLocal(deadline)===iso);
  }
  function filteredItems(){
    const items=categoryItems();
    if(!activeDate)return items;
    return items.filter(item=>itemHasDate(item,activeDate));
  }

  function daysUntil(date){
    if(!date)return null;
    const today=new Date();
    const start=new Date(today.getFullYear(),today.getMonth(),today.getDate());
    const target=new Date(date.getFullYear(),date.getMonth(),date.getDate());
    return Math.round((target-start)/86400000);
  }
  function ddayLabel(date){
    const diff=daysUntil(date);
    if(diff===null)return'';
    if(diff===0)return'D-DAY';
    if(diff>0)return`D-${diff}`;
    return`마감`;
  }

  function cleanTitle(title){
    return String(title||'').replace(/^(lh|sh|공지|국민|수요)/i,'').trim();
  }

  function metaText(item){
    const parts=[item.agency||item.agency_group,item.open_state];
    const deadline=deadlineDate(item);
    if(deadline)parts.push(`${deadline.getMonth()+1}/${deadline.getDate()} 마감`,ddayLabel(deadline));
    else parts.push('일정 원문 확인');
    return parts.filter(Boolean).join(' · ');
  }

  function nearestDeadline(){
    return [...(feed?.items||[])]
      .map(item=>({item,date:deadlineDate(item)}))
      .filter(x=>x.date&&daysUntil(x.date)>=0)
      .sort((a,b)=>a.date-b.date)[0]||null;
  }

  function renderSummary(){
    const root=document.querySelector('#publicHousingSummary');
    if(!root||!feed)return;
    root.replaceChildren();
    const items=feed.items||[];
    const values=[
      ['전체',items.length],
      ['접수중',items.filter(x=>x.open_state==='접수중').length],
      ['청년',items.filter(x=>(x.audiences||[]).includes('청년')).length],
      ['강서',items.filter(x=>x.is_gangseo).length]
    ];
    values.forEach(([label,value])=>{
      const card=el('div','notice-summary-card');
      card.append(el('span','',label),el('strong','',`${value}건`));
      root.append(card);
    });
  }

  function renderNextDeadline(){
    const root=document.querySelector('#publicHousingNextDeadline');
    if(!root)return;
    root.replaceChildren();
    const next=nearestDeadline();
    if(!next){
      const box=el('div','notice-deadline-card muted');
      box.append(el('span','notice-deadline-kicker','다음 마감'),el('strong','notice-deadline-title','확인된 마감 일정이 없습니다.'),el('small','', '공고 원문에서 신청 기간을 확인하세요.'));
      root.append(box);
      return;
    }
    const {item,date}=next;
    const box=el('div','notice-deadline-card');
    const top=el('div','notice-deadline-top');
    top.append(el('span','notice-deadline-kicker','다음 마감'),el('b','notice-dday',ddayLabel(date)));
    box.append(top,el('strong','notice-deadline-title',cleanTitle(item.title)),el('small','',`${item.agency||''} · ${date.getMonth()+1}월 ${date.getDate()}일 마감`));
    root.append(box);
  }

  function weekDates(){
    const today=new Date();
    const base=new Date(today.getFullYear(),today.getMonth(),today.getDate());
    const day=base.getDay();
    const mondayOffset=day===0?-6:1-day;
    const monday=new Date(base);
    monday.setDate(base.getDate()+mondayOffset);
    return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d;});
  }

  function eventsForDate(date){
    const iso=isoLocal(date);
    const events=[];
    categoryItems().forEach(item=>{
      const pub=publishedDate(item),deadline=deadlineDate(item);
      if(pub&&isoLocal(pub)===iso)events.push({item,kind:'공고'});
      if(deadline&&isoLocal(deadline)===iso)events.push({item,kind:'마감'});
    });
    return events;
  }

  function renderCalendar(){
    const root=document.querySelector('#publicHousingCalendar');
    const range=document.querySelector('#publicHousingWeekRange');
    if(!root)return;
    root.replaceChildren();
    const dates=weekDates();
    if(range){
      const first=dates[0],last=dates[6];
      range.textContent=`${first.getMonth()+1}.${first.getDate()}–${last.getMonth()+1}.${last.getDate()}`;
    }
    const todayIso=isoLocal(new Date());
    dates.forEach(date=>{
      const iso=isoLocal(date),events=eventsForDate(date),button=el('button','notice-day');
      button.type='button';
      button.dataset.date=iso;
      if(iso===todayIso)button.classList.add('today');
      if(activeDate===iso)button.classList.add('active');
      if(events.length)button.classList.add('has-event');
      button.append(el('span','notice-day-week',WEEKDAYS[date.getDay()]),el('strong','notice-day-number',String(date.getDate())));
      const markers=el('span','notice-day-events');
      const openCount=events.filter(x=>x.kind==='공고').length;
      const closeCount=events.filter(x=>x.kind==='마감').length;
      if(openCount)markers.append(el('i','open',`공고 ${openCount}`));
      if(closeCount)markers.append(el('i','close',`마감 ${closeCount}`));
      if(!events.length)markers.append(el('i','empty','—'));
      button.append(markers);
      button.addEventListener('click',()=>{
        activeDate=activeDate===iso?'':iso;
        renderCalendar();
        renderList();
      });
      root.append(button);
    });
  }

  function renderList(){
    const list=document.querySelector('#publicHousingNoticeList');
    const total=document.querySelector('#publicHousingModalTotal');
    const listTitle=document.querySelector('#publicHousingListTitle');
    if(!list)return;
    list.replaceChildren();
    const items=filteredItems();
    if(total)total.textContent=`${feed?.summary?.total||feed?.items?.length||0}건`;
    if(listTitle)listTitle.textContent=activeDate?`${Number(activeDate.slice(5,7))}/${Number(activeDate.slice(8,10))} 일정`:'전체 공고';
    if(!items.length){
      list.append(el('p','notice-empty',activeDate?'선택한 날짜의 공고 일정이 없습니다.':'해당 조건의 공고가 없습니다.'));
      return;
    }
    items.slice(0,20).forEach(item=>{
      const row=el('article','notice-row');
      const top=el('div','notice-row-top');
      const status=el('span',`notice-status${item.open_state==='접수중'?' open':''}`,item.open_state||'확인필요');
      top.append(status,el('span','notice-meta',metaText(item)));
      const title=el('strong','notice-title',cleanTitle(item.title));
      const tags=el('div','notice-tags');
      [...(item.housing_types||[]),...(item.audiences||[])].slice(0,3).forEach(tag=>tags.append(el('span','',tag)));
      const foot=el('div','notice-row-foot');
      const pub=publishedDate(item);
      foot.append(el('span','notice-published',pub?`공고 ${pub.getMonth()+1}/${pub.getDate()}`:'공고일 확인 필요'));
      const link=el('a','notice-go','공식 공고 보기 →');
      link.href=item.url||'#';
      link.target='_blank';
      link.rel='noopener noreferrer';
      foot.append(link);
      row.append(top,title,tags,foot);
      list.append(row);
    });
  }

  function refreshView(){
    renderSummary();
    renderNextDeadline();
    renderCalendar();
    renderList();
  }

  function ensureModal(){
    if(document.querySelector('#publicHousingModal'))return;
    const wrap=el('div','notice-modal');
    wrap.id='publicHousingModal';
    wrap.hidden=true;
    wrap.innerHTML=`<button class="notice-backdrop" type="button" aria-label="닫기"></button><section class="notice-sheet" role="dialog" aria-modal="true" aria-labelledby="publicHousingModalTitle"><header class="notice-sheet-head"><div><p>공공주거 캘린더 <span id="publicHousingModalTotal"></span></p><h2 id="publicHousingModalTitle">이번 주 모집 일정</h2></div><button class="notice-close" type="button" aria-label="닫기">×</button></header><div class="notice-body"><div class="notice-summary" id="publicHousingSummary"></div><div id="publicHousingNextDeadline"></div><div class="notice-filter" role="tablist" aria-label="공고 필터"><button class="active" type="button" data-filter="전체">전체</button><button type="button" data-filter="청년">청년</button><button type="button" data-filter="신혼·신생아">신혼·신생아</button><button type="button" data-filter="임대주택">임대주택</button></div><section class="notice-calendar-block"><div class="notice-subhead"><strong>이번 주 캘린더</strong><span id="publicHousingWeekRange"></span></div><div class="notice-calendar" id="publicHousingCalendar"></div><p class="notice-calendar-note">공고일·마감일이 확인된 일정만 달력에 표시합니다.</p></section><section class="notice-list-block"><div class="notice-subhead"><strong id="publicHousingListTitle">전체 공고</strong><span>Rent Check 정리</span></div><div class="notice-list" id="publicHousingNoticeList"><p class="notice-empty">공고를 불러오는 중입니다.</p></div></section></div><footer>자격·신청기간은 공식 공고 원문이 최종 기준입니다.</footer></section>`;
    document.body.append(wrap);
    wrap.querySelector('.notice-backdrop').addEventListener('click',closeModal);
    wrap.querySelector('.notice-close').addEventListener('click',closeModal);
    wrap.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
      activeFilter=button.dataset.filter;
      activeDate='';
      wrap.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===button));
      renderCalendar();
      renderList();
    }));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!wrap.hidden)closeModal();});
  }

  async function openModal(){
    ensureModal();
    const modal=document.querySelector('#publicHousingModal');
    modal.hidden=false;
    document.body.classList.add('notice-modal-open');
    try{
      await loadFeed();
      refreshView();
      try{localStorage.setItem(STORAGE_KEY,signature(feed));}catch(_){/* ignore */}
      const badge=document.querySelector('#publicHousingNoticeBadge');
      if(badge)badge.hidden=true;
    }catch(_){
      const list=document.querySelector('#publicHousingNoticeList');
      if(list)list.innerHTML='<p class="notice-empty">공고를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>';
    }
  }

  function closeModal(){
    const modal=document.querySelector('#publicHousingModal');
    if(modal)modal.hidden=true;
    document.body.classList.remove('notice-modal-open');
  }

  function buildServiceItem(){
    const button=el('button','service-item notice-service-item');
    button.type='button';
    button.id='publicHousingNoticeButton';
    button.style.setProperty('--tone','#1565c0');
    button.style.setProperty('--tint','#eef5fc');
    const iconWrap=el('span','service-icon');
    iconWrap.innerHTML=icon;
    const copy=el('span','service-copy');
    const title=el('strong','', '공공주거 공고');
    const sub=el('small','');
    sub.append(document.createTextNode('LH·SH 일정 확인 '),el('b','notice-count','—'));
    sub.querySelector('b').id='publicHousingNoticeCount';
    copy.append(title,sub);
    const badge=el('span','notice-new','NEW');
    badge.id='publicHousingNoticeBadge';
    badge.hidden=true;
    button.append(iconWrap,copy,badge);
    button.addEventListener('click',openModal);
    return button;
  }

  function ensureServiceItem(){
    const services=document.querySelector('#services');
    if(!services)return false;
    services.classList.add('notice-ready');
    if(!services.querySelector('#publicHousingNoticeButton'))services.append(buildServiceItem());
    return true;
  }

  function watchServices(){
    const services=document.querySelector('#services');
    if(!services)return;
    ensureServiceItem();
    const observer=new MutationObserver(()=>{
      if(!services.querySelector('#publicHousingNoticeButton'))services.append(buildServiceItem());
    });
    observer.observe(services,{childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchServices,{once:true});
  else watchServices();
  setTimeout(()=>loadFeed().catch(()=>{}),500);
})();
