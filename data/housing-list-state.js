(()=>{
  const labels={active:'접수중·예정',all:'전체 보관 공고',open:'접수중',upcoming:'접수예정',closed:'접수 마감',unknown:'일정 확인 중'};
  function parse(value){const m=String(value||'').match(/^(20\d{2})-(\d{2})-(\d{2})$/);if(!m)return null;const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return d.toISOString().slice(0,10)===m[0]?m[0]:null}
  function today(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
  function state(item,day=today()){const start=parse(item.application_start),end=parse(item.deadline);if(end&&end<day)return'closed';if(!start||!end||start>end)return item.open_state==='마감'?'closed':'unknown';if(start>day)return'upcoming';return'open'}
  function matches(item,filter,day){const s=state(item,day);return filter==='all'||(filter==='active'?s==='open'||s==='upcoming':s===filter)}
  function counts(items,day){return Object.fromEntries(Object.keys(labels).map(k=>[k,items.filter(i=>matches(i,k,day)).length]))}
  window.RentCheckHousingList=Object.freeze({labels,today,state,matches,counts,pageSize:6});
})();
