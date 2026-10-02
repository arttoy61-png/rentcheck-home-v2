(()=>{
  // Feed belongs to public-housing-popup.js; never independently refetch it.
  let feed=window.RentCheckHousingFeed?.get()||null;

  function parseDate(value){const m=String(value||'').match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);if(!m)return null;const d=new Date(+m[1],+m[2]-1,+m[3]);return Number.isNaN(d.getTime())?null:d}
  function koreanToday(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return new Date(+p.year,+p.month-1,+p.day)}
  function dayStart(d=koreanToday()){return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
  function cleanTitle(title){return String(title||'').replace(/&nbsp;/gi,' ').trim()}
  function isRecruitment(item){const title=cleanTitle(item?.title);if(!title)return false;if(/발표|결과|정정|변경|취소|당첨|선정결과|서류심사\s*대상자/i.test(title))return false;return /모집공고|입주자\s*모집|예비입주자\s*모집|행복주택.*모집|매입임대.*모집|전세임대.*모집|임대주택.*모집/i.test(title)}
  function recruitmentItems(){return feed?.items||[]}

  function weekBounds(){const today=dayStart(),day=today.getDay(),offset=day===0?-6:1-day,monday=new Date(today);monday.setDate(today.getDate()+offset);const sunday=new Date(monday);sunday.setDate(monday.getDate()+6);return [monday,sunday]}
  function summaryCounts(){
    const items=recruitmentItems(),today=dayStart(),[weekStart,weekEnd]=weekBounds(),counts=window.RentCheckHousingList.counts(items);
    let open=0,upcoming=0,weekDeadline=0;
    items.forEach(item=>{
      const start=parseDate(item.application_start),deadline=parseDate(item.deadline);
      const s=start?dayStart(start):null,d=deadline?dayStart(deadline):null;
      if(s&&s>today)upcoming++;
      if(s&&s<=today&&(!d||d>=today))open++;
      else if(!s&&(!d||d>=today)&&['접수중','마감임박'].includes(item.open_state))open++;
      if(d&&d>=weekStart&&d<=weekEnd)weekDeadline++;
    });
    return [['보관 공고',items.length],['접수중',counts.open],['접수예정',counts.upcoming],['일정 확인 중',counts.unknown]];
  }

  function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}

  function updateSummary(){
    const root=document.querySelector('#publicHousingSummary');if(!root||!feed)return;
    const cards=[...root.querySelectorAll('.notice-summary-card')],counts=summaryCounts();
    counts.forEach(([label,value],i)=>{
      const card=cards[i];if(!card)return;
      setText(card.querySelector('span'),label);
      setText(card.querySelector('strong'),`${value}건`);
      card.classList.toggle('week-deadline',label==='이번 주 마감'&&value>0);
    });
  }

  function emphasizeEmptySchedule(){
    const note=document.querySelector('#publicHousingCalendarNote');if(!note)return;
    const text=note.textContent||'';
    const empty=/이번 주 신청 일정은 확인되지 않았습니다|확인된 신청 일정 없음/.test(text);
    note.classList.toggle('schedule-empty',empty);
    if(empty&&!text.startsWith('확인된 신청 일정 없음'))setText(note,`확인된 신청 일정 없음 · ${text}`);
  }

  function apply(){
    document.querySelectorAll('.desktop-nav a,.mobile-nav a').forEach(a=>{
      if((a.dataset.publicHousingOpen!==undefined||a.textContent.trim()==='임대주택')&&a.textContent!=='LH·SH 공고')a.textContent='LH·SH 공고';
    });
    updateSummary();
    emphasizeEmptySchedule();
  }

  const style=document.createElement('style');
  style.textContent=`
    #publicHousingSummary .notice-summary-card.week-deadline{border-color:#f2b8b5;background:#fff5f3}
    #publicHousingSummary .notice-summary-card.week-deadline strong{color:#b42318}
    #publicHousingCalendarNote.schedule-empty{margin:8px 0 13px;padding:10px 11px;border:1px solid #f2c6c2;border-radius:9px;background:#fff7f5;color:#b42318;font-size:11px;font-weight:800;line-height:1.55}
  `;
  document.head.appendChild(style);

  function applySoon(){setTimeout(apply,30)}
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-public-housing-open],#publicHousingNoticeButton,#publicHousingModal [data-filter],#publicHousingCalendar .notice-day'))applySoon();
  },true);

  document.addEventListener('rentcheck:housing-feed',event=>{feed=event.detail;applySoon()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();