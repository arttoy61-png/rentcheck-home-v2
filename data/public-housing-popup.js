(()=>{
  const FEED_URL='https://arttoy61-png.github.io/rent-check/public_housing_notices.json';
  const STORAGE_KEY='rentcheck:public-housing-feed-signature';
  const WEEKDAYS=['일','월','화','수','목','금','토'];
  let feed=null,activeFilter='전체',activeDate='',loadingPromise=null;
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 20V8l6-4 6 4v12"/><path d="M9 11h6M9 15h6"/></svg>';

  function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}
  function pad(v){return String(v).padStart(2,'0')}
  function isoLocal(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
  function parseDate(value){const m=String(value||'').match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);if(!m)return null;const d=new Date(+m[1],+m[2]-1,+m[3]);return Number.isNaN(d.getTime())?null:d}
  function titleDate(item){const m=String(item?.title||'').match(/(?:^|[^0-9])(20\d{2}|\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})(?:[^0-9]|$)/);if(!m)return null;let y=+m[1];if(y<100)y+=2000;const d=new Date(y,+m[2]-1,+m[3]);return Number.isNaN(d.getTime())?null:d}
  function publishedDate(item){return parseDate(item?.published_at)||titleDate(item)}
  function applicationStartDate(item){return parseDate(item?.application_start)}
  function deadlineDate(item){return parseDate(item?.deadline)}
  function dayStart(d=new Date()){return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
  function daysUntil(date){if(!date)return null;return Math.round((dayStart(date)-dayStart())/86400000)}
  function ddayLabel(date){const diff=daysUntil(date);if(diff===null)return'';if(diff===0)return'D-DAY';if(diff>0)return`D-${diff}`;return'마감'}
  function shortDate(date){return date?`${date.getMonth()+1}/${date.getDate()}`:''}
  function sameDate(date,iso){return Boolean(date&&isoLocal(date)===iso)}
  function isApplicationOpenOn(item,iso){
    const start=applicationStartDate(item),deadline=deadlineDate(item);
    if(!start)return false;
    const target=parseDate(iso);if(!target)return false;
    const t=dayStart(target).getTime(),s=dayStart(start).getTime();
    if(deadline)return t>=s&&t<=dayStart(deadline).getTime();
    return t===s;
  }
  function isApplicationStartOn(item,iso){return sameDate(applicationStartDate(item),iso)}
  function isDeadlineOn(item,iso){return sameDate(deadlineDate(item),iso)}
  function isPublishedOn(item,iso){return sameDate(publishedDate(item),iso)}
  function internalNoticeUrl(item){return `/public-housing/?id=${encodeURIComponent(item?.id||'')}`}
  function cleanTitle(title){
    let out=String(title||'').replace(/&nbsp;/gi,' ').trim();
    for(let i=0;i<6;i++){
      const before=out;
      out=out.replace(/^\s*(?:lh|sh|공지|수요)(?=[가-힣0-9[(])/i,'').trim();
      out=out.replace(/^\s*국민(?=20\d{2}년)/,'').trim();
      out=out.replace(/^\s*장기(?=제\d+차)/,'').trim();
      out=out.replace(/^\s*두레(?=20\d{2}-\d+차)/,'').trim();
      if(out===before)break;
    }
    return out;
  }
  function isRecruitmentNotice(item){
    const title=cleanTitle(item?.title);
    if(!title)return false;
    if(/발표|결과|정정|변경|취소|당첨|선정결과|서류심사\s*대상자/i.test(title))return false;
    return /모집공고|입주자\s*모집|예비입주자\s*모집|행복주택.*모집|매입임대.*모집|전세임대.*모집|임대주택.*모집/i.test(title);
  }
  function recruitmentItems(){return (feed?.items||[]).filter(isRecruitmentNotice)}
  function isPublishedRecruitmentOn(item,iso){return isRecruitmentNotice(item)&&isPublishedOn(item,iso)}

  function displayState(item){
    const start=applicationStartDate(item),deadline=deadlineDate(item),today=dayStart();
    const startDay=start?dayStart(start):null,deadlineDay=deadline?dayStart(deadline):null;
    if(deadlineDay&&deadlineDay<today)return'마감';
    if(startDay&&startDay.getTime()===today.getTime()){
      if(deadlineDay&&deadlineDay.getTime()===today.getTime())return'오늘 접수일';
      return'오늘 접수 시작';
    }
    if(startDay&&startDay>today)return'접수예정';
    if(deadlineDay){
      if(deadlineDay.getTime()===today.getTime())return'오늘 접수마감';
      const diff=daysUntil(deadline);return diff!==null&&diff<=3?'마감임박':'접수중';
    }
    if(item?.open_state==='마감')return'마감';
    return'일정 확인 중';
  }
  function stateRank(item){return{'오늘 접수 시작':0,'오늘 접수일':0,'오늘 접수마감':0,'마감임박':1,'접수중':2,'접수예정':3,'일정 확인 중':4,'마감':5}[displayState(item)]??4}
  function sortItems(items){return [...items].sort((a,b)=>{const rank=stateRank(a)-stateRank(b);if(rank)return rank;const ad=deadlineDate(a),bd=deadlineDate(b);if(ad&&bd)return ad-bd;if(ad)return-1;if(bd)return 1;const as=applicationStartDate(a),bs=applicationStartDate(b);if(as&&bs)return as-bs;if(as)return-1;if(bs)return 1;return String(b.published_at||'').localeCompare(String(a.published_at||''))})}
  function signature(data){return(data?.items||[]).map(item=>`${item.id}:${item.content_signature||''}:${item.application_start||''}:${item.deadline||''}`).sort().join('|')}

  async function loadFeed(){
    if(feed)return feed;if(loadingPromise)return loadingPromise;
    loadingPromise=fetch(`${FEED_URL}?v=${Date.now()}`,{cache:'no-store'}).then(res=>{if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json()}).then(data=>{feed=data;updateBadge();return data}).finally(()=>{loadingPromise=null});
    return loadingPromise;
  }
  function updateBadge(){const badge=document.querySelector('#publicHousingNoticeBadge'),count=document.querySelector('#publicHousingNoticeCount');if(!badge||!feed)return;if(count)count.textContent=`${recruitmentItems().length}건`;const current=signature(feed);let previous='';try{previous=localStorage.getItem(STORAGE_KEY)||''}catch(_){}if(!previous){try{localStorage.setItem(STORAGE_KEY,current)}catch(_){}badge.hidden=true;return}badge.hidden=previous===current}

  function categoryItems(){
    const items=recruitmentItems();
    let filtered=items;
    if(activeFilter==='청년')filtered=items.filter(item=>(item.audiences||[]).includes('청년'));
    else if(activeFilter==='신혼·신생아')filtered=items.filter(item=>(item.audiences||[]).some(v=>v==='신혼부부'||v==='신생아'));
    else if(activeFilter==='임대주택')filtered=items.filter(item=>(item.housing_types||[]).some(v=>v!=='주거비지원'));
    return sortItems(filtered);
  }
  function itemHasDate(item,iso){return isPublishedRecruitmentOn(item,iso)||isApplicationOpenOn(item,iso)||isDeadlineOn(item,iso)}
  function filteredItems(){
    const items=categoryItems();
    if(!activeDate)return items;
    const eventItems=new Map(eventsForDate(parseDate(activeDate)).map(event=>[event.item.id,event.item]));
    return items.filter(item=>eventItems.has(item.id)||itemHasDate(item,activeDate));
  }

  function metaText(item){
    const parts=[item.agency||item.agency_group,(item.housing_types||[])[0]].filter(Boolean);
    const start=applicationStartDate(item),deadline=deadlineDate(item),state=displayState(item);
    if(['접수예정','오늘 접수 시작','오늘 접수일'].includes(state)&&start)parts.push(`${shortDate(start)} 접수 시작`);
    if(deadline){parts.push(`${shortDate(deadline)} 마감`);const dday=ddayLabel(deadline);if(dday&&dday!=='마감')parts.push(dday)}
    return [...new Set(parts.filter(Boolean))].join(' · ');
  }
  function selectedDateLabel(item){
    if(!activeDate)return displayState(item);
    if(isDeadlineOn(item,activeDate))return activeDate===isoLocal(new Date())?'오늘 접수마감':'접수마감일';
    if(activeDate===isoLocal(new Date())&&isApplicationStartOn(item,activeDate))return'오늘 접수 시작';
    if(isApplicationOpenOn(item,activeDate))return'접수가능';
    if(isPublishedRecruitmentOn(item,activeDate))return'신규공고';
    return displayState(item);
  }
  function selectedDateFoot(item){
    const pub=publishedDate(item),start=applicationStartDate(item),deadline=deadlineDate(item);
    if(activeDate&&isDeadlineOn(item,activeDate))return `접수마감일 · ${shortDate(deadline)}`;
    if(activeDate===isoLocal(new Date())&&isApplicationStartOn(item,activeDate))return `오늘 접수 시작 · ${shortDate(start)}`;
    if(activeDate&&isApplicationOpenOn(item,activeDate))return `접수 가능 · ${shortDate(start)}~${shortDate(deadline||start)}`;
    if(activeDate&&isPublishedRecruitmentOn(item,activeDate))return `신규공고 · ${shortDate(pub)}`;
    return pub?`공고 ${shortDate(pub)}`:'공고일 확인 중';
  }
  function nearestDeadline(){return categoryItems().map(item=>({item,date:deadlineDate(item)})).filter(x=>x.date&&daysUntil(x.date)>=0).sort((a,b)=>a.date-b.date)[0]||null}

  function renderSummary(){
    const root=document.querySelector('#publicHousingSummary');if(!root||!feed)return;root.replaceChildren();const items=recruitmentItems();
    const openStates=['오늘 접수 시작','오늘 접수일','오늘 접수마감','접수중','마감임박'];
    [['전체',items.length],['접수중',items.filter(x=>openStates.includes(displayState(x))).length],['청년',items.filter(x=>(x.audiences||[]).includes('청년')).length],['강서',items.filter(x=>x.is_gangseo).length]].forEach(([label,value])=>{const card=el('div','notice-summary-card');card.append(el('span','',label),el('strong','',`${value}건`));root.append(card)});
  }
  function renderFilterCounts(){
    if(!feed)return;
    const items=recruitmentItems();
    const counts={
      '전체':items.length,
      '청년':items.filter(item=>(item.audiences||[]).includes('청년')).length,
      '신혼·신생아':items.filter(item=>(item.audiences||[]).some(v=>v==='신혼부부'||v==='신생아')).length,
      '임대주택':items.filter(item=>(item.housing_types||[]).some(v=>v!=='주거비지원')).length
    };
    document.querySelectorAll('#publicHousingModal [data-filter-count]').forEach(node=>{const key=node.dataset.filterCount;node.textContent=`${counts[key]??0}건`});
  }
  function renderNextDeadline(){
    const root=document.querySelector('#publicHousingNextDeadline');if(!root)return;root.replaceChildren();const next=nearestDeadline();
    if(!next){const box=el('div','notice-deadline-card muted');box.append(el('span','notice-deadline-kicker','다음 마감'),el('strong','notice-deadline-title','확인된 마감 일정이 없습니다.'),el('small','',activeFilter==='전체'?'일정을 확인 중인 모집공고는 아래에서 확인하세요.':`${activeFilter} 모집공고 중 확인된 마감 일정이 없습니다.`));root.append(box);return}
    const {item,date}=next,box=el('div','notice-deadline-card'),top=el('div','notice-deadline-top'),dday=el('b','notice-dday',ddayLabel(date));if(daysUntil(date)<=1)dday.classList.add('urgent');top.append(el('span','notice-deadline-kicker',activeFilter==='전체'?'다음 마감':`${activeFilter} 다음 마감`),dday);box.append(top,el('strong','notice-deadline-title',cleanTitle(item.title)),el('small','',`${item.agency||item.agency_group||''} · ${date.getMonth()+1}월 ${date.getDate()}일 마감`));root.append(box);
  }
  function weekDates(){const base=dayStart(),day=base.getDay(),offset=day===0?-6:1-day,monday=new Date(base);monday.setDate(base.getDate()+offset);return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d})}
  function eventsForDate(date){
    const iso=isoLocal(date),events=[];
    categoryItems().forEach(item=>{
      if(isPublishedRecruitmentOn(item,iso))events.push({item,kind:'신규'});
      if(isApplicationOpenOn(item,iso))events.push({item,kind:'접수'});
      if(isDeadlineOn(item,iso))events.push({item,kind:'마감'});
    });
    return events;
  }
  function renderCalendar(){
    const root=document.querySelector('#publicHousingCalendar'),range=document.querySelector('#publicHousingWeekRange'),note=document.querySelector('#publicHousingCalendarNote');if(!root)return;root.replaceChildren();const dates=weekDates();if(range)range.textContent=`${dates[0].getMonth()+1}.${dates[0].getDate()}–${dates[6].getMonth()+1}.${dates[6].getDate()}`;const todayIso=isoLocal(new Date());let weekEventCount=0;
    dates.forEach(date=>{
      const iso=isoLocal(date),events=eventsForDate(date),button=el('button','notice-day');weekEventCount+=events.length;button.type='button';button.dataset.date=iso;if(iso===todayIso)button.classList.add('today');if(activeDate===iso)button.classList.add('active');if(events.length)button.classList.add('has-event');button.append(el('span','notice-day-week',WEEKDAYS[date.getDay()]),el('strong','notice-day-number',String(date.getDate())));
      const markers=el('span','notice-day-events'),newCount=events.filter(x=>x.kind==='신규').length,openCount=events.filter(x=>x.kind==='접수').length,closeCount=events.filter(x=>x.kind==='마감').length;
      if(newCount)markers.append(el('i','new',`신규 ${newCount}`));
      if(openCount)markers.append(el('i','open',`접수 ${openCount}`));
      if(closeCount)markers.append(el('i','close',`마감 ${closeCount}`));
      if(!events.length)markers.append(el('i','empty','—'));
      button.append(markers);button.addEventListener('click',()=>{activeDate=activeDate===iso?'':iso;renderCalendar();renderList()});root.append(button)
    });
    if(note){
      const count=categoryItems().length;
      if(activeFilter!=='전체'&&count>0&&weekEventCount===0)note.textContent=`${activeFilter} 모집공고 ${count}건이 있지만 이번 주 신청 일정은 확인되지 않았습니다. 일정 확인 중인 공고는 아래 목록에서 확인하세요.`;
      else note.textContent='신규는 실제 모집공고가 올라온 날, 접수는 신청기간의 모든 날짜에 표시합니다. 마지막 날은 접수와 마감을 함께 표시합니다.';
    }
  }
  function renderList(){
    const list=document.querySelector('#publicHousingNoticeList'),total=document.querySelector('#publicHousingModalTotal'),listTitle=document.querySelector('#publicHousingListTitle');if(!list)return;list.replaceChildren();const items=filteredItems();if(total)total.textContent=`${recruitmentItems().length}건`;
    if(listTitle){
      if(activeDate){const events=eventsForDate(parseDate(activeDate)),n=events.filter(x=>x.kind==='신규').length,o=events.filter(x=>x.kind==='접수').length,c=events.filter(x=>x.kind==='마감').length;listTitle.textContent=`${Number(activeDate.slice(5,7))}/${Number(activeDate.slice(8,10))} 일정 · 신규 ${n} · 접수 ${o} · 마감 ${c}`}
      else listTitle.textContent=activeFilter==='전체'?'전체 모집공고':`${activeFilter} 모집공고`;
    }
    if(!items.length){list.append(el('p','notice-empty',activeDate?'선택한 날짜에 해당하는 모집공고가 없습니다.':'해당 조건의 모집공고가 없습니다.'));return}
    items.slice(0,30).forEach(item=>{
      const row=el('article','notice-row'),top=el('div','notice-row-top'),state=selectedDateLabel(item),isDeadline=['접수마감일','오늘 접수마감','마감'].includes(state),isOpen=['접수중','마감임박','접수가능','오늘 접수 시작','오늘 접수일'].includes(state),status=el('span',`notice-status${isDeadline?' deadline':isOpen?' open':''}`,state);
      if(isDeadline)row.classList.add('deadline-row');
      top.append(status,el('span','notice-meta',metaText(item)));
      const title=el('strong','notice-title',cleanTitle(item.title)),tags=el('div','notice-tags');[...(item.housing_types||[]),...(item.audiences||[])].slice(0,3).forEach(tag=>tags.append(el('span','',tag)));
      const foot=el('div','notice-row-foot');foot.append(el('span','notice-published',selectedDateFoot(item)));
      const link=el('a','notice-go','Rent Check에서 보기 →');link.href=internalNoticeUrl(item);foot.append(link);
      row.append(top,title,tags,foot);list.append(row)
    });
  }
  function refreshView(){renderSummary();renderFilterCounts();renderNextDeadline();renderCalendar();renderList()}

  function ensureDeadlineStyles(){
    if(document.querySelector('style[data-public-housing-deadline]'))return;
    const style=document.createElement('style');style.dataset.publicHousingDeadline='1';style.textContent=`
      .notice-day-events i.close{background:#d92d20!important;color:#fff!important;box-shadow:0 0 0 1px #b42318 inset}
      .notice-status.deadline{background:#d92d20!important;color:#fff!important;border:1px solid #b42318}
      .notice-row.deadline-row{margin:0 -8px;padding-left:10px;padding-right:10px;background:#fff5f3;box-shadow:inset 3px 0 #d92d20}
      .notice-dday.urgent{background:#d92d20!important;color:#fff!important}
      .notice-filter button span{margin-left:4px;font-size:9px;font-weight:800;opacity:.78}
      .notice-filter button.active span{opacity:1}
    `;document.head.appendChild(style);
  }

  function ensureModal(){
    if(document.querySelector('#publicHousingModal'))return;ensureDeadlineStyles();const wrap=el('div','notice-modal');wrap.id='publicHousingModal';wrap.hidden=true;wrap.innerHTML=`<button class="notice-backdrop" type="button" aria-label="닫기"></button><section class="notice-sheet" role="dialog" aria-modal="true" aria-labelledby="publicHousingModalTitle"><header class="notice-sheet-head"><div><p>LH·SH 임대주택 모집공고 <span id="publicHousingModalTotal"></span></p><h2 id="publicHousingModalTitle">이번 주 신청 일정</h2></div><button class="notice-close" type="button" aria-label="닫기">×</button></header><div class="notice-body"><div class="notice-summary" id="publicHousingSummary"></div><div id="publicHousingNextDeadline"></div><div class="notice-filter" role="tablist" aria-label="공고 필터"><button class="active" type="button" data-filter="전체">전체 <span data-filter-count="전체">—</span></button><button type="button" data-filter="청년">청년 <span data-filter-count="청년">—</span></button><button type="button" data-filter="신혼·신생아">신혼·신생아 <span data-filter-count="신혼·신생아">—</span></button><button type="button" data-filter="임대주택">임대주택 <span data-filter-count="임대주택">—</span></button></div><section class="notice-calendar-block"><div class="notice-subhead"><strong>이번 주 캘린더</strong><span id="publicHousingWeekRange"></span></div><div class="notice-calendar" id="publicHousingCalendar"></div><p class="notice-calendar-note" id="publicHousingCalendarNote">신규는 실제 모집공고가 올라온 날, 접수는 신청기간의 모든 날짜에 표시합니다. 마지막 날은 접수와 마감을 함께 표시합니다.</p></section><section class="notice-list-block"><div class="notice-subhead"><strong id="publicHousingListTitle">전체 모집공고</strong></div><div class="notice-list" id="publicHousingNoticeList"><p class="notice-empty">공고를 불러오는 중입니다.</p></div></section></div><footer>먼저 Rent Check에서 핵심 일정을 확인하고, 세부 자격은 공고별 상세 페이지에서 확인하세요.</footer></section>`;
    document.body.append(wrap);wrap.querySelector('.notice-backdrop').addEventListener('click',closeModal);wrap.querySelector('.notice-close').addEventListener('click',closeModal);wrap.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;activeDate='';wrap.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===button));renderNextDeadline();renderCalendar();renderList()}));document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!wrap.hidden)closeModal()});
  }
  async function openModal(){ensureModal();const modal=document.querySelector('#publicHousingModal');modal.hidden=false;document.body.classList.add('notice-modal-open');try{await loadFeed();refreshView();try{localStorage.setItem(STORAGE_KEY,signature(feed))}catch(_){}const badge=document.querySelector('#publicHousingNoticeBadge');if(badge)badge.hidden=true}catch(_){const list=document.querySelector('#publicHousingNoticeList');if(list)list.innerHTML='<p class="notice-empty">공고를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>'}}
  function closeModal(){const modal=document.querySelector('#publicHousingModal');if(modal)modal.hidden=true;document.body.classList.remove('notice-modal-open')}
  function bindNavOpeners(){document.querySelectorAll('[data-public-housing-open]').forEach(link=>{if(link.dataset.noticeBound)return;link.dataset.noticeBound='1';link.addEventListener('click',event=>{event.preventDefault();openModal()})})}
  function buildServiceItem(){const button=el('button','service-item notice-service-item');button.type='button';button.id='publicHousingNoticeButton';button.style.setProperty('--tone','#1565c0');button.style.setProperty('--tint','#eef5fc');const iconWrap=el('span','service-icon');iconWrap.innerHTML=icon;const copy=el('span','service-copy'),title=el('strong','','임대주택 공고'),sub=el('small','');sub.append(document.createTextNode('LH·SH 일정 확인 '),el('b','notice-count','—'));sub.querySelector('b').id='publicHousingNoticeCount';copy.append(title,sub);const badge=el('span','notice-new','NEW');badge.id='publicHousingNoticeBadge';badge.hidden=true;button.append(iconWrap,copy,badge);button.addEventListener('click',openModal);return button}
  function ensureServiceItem(){const services=document.querySelector('#services');if(!services)return false;services.classList.add('notice-ready');if(!services.querySelector('#publicHousingNoticeButton'))services.append(buildServiceItem());return true}
  function watchServices(){const services=document.querySelector('#services');if(!services)return;ensureServiceItem();bindNavOpeners();const observer=new MutationObserver(()=>{if(!services.querySelector('#publicHousingNoticeButton'))services.append(buildServiceItem())});observer.observe(services,{childList:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchServices,{once:true});else watchServices();setTimeout(()=>loadFeed().catch(()=>{}),500);
})();
