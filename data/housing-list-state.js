(()=>{
  const labels={active:'접수중·예정',all:'전체 보관 공고',open:'접수중',upcoming:'접수예정',closed:'접수 마감',unknown:'일정 확인 중'};
  function parse(value){const m=String(value||'').match(/^(20\d{2})-(\d{2})-(\d{2})$/);if(!m)return null;const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return d.toISOString().slice(0,10)===m[0]?m[0]:null}
  function today(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
  function isSH(item){if(/^(?:SH:|SHYOUTH:)/i.test(String(item?.id||''))||[item?.agency_group,item?.agency].some(v=>String(v||'').toUpperCase()==='SH'))return true;try{const u=new URL(item?.official_url||item?.url||'');return u.protocol==='https:'&&['www.i-sh.co.kr','i-sh.co.kr'].includes(u.hostname)}catch(_){return false}}
  const trusted=new Set(['verified_official_pdf','official_detail_html','verified_regression','verified_application_windows']);
  const guarded=new Set(['SH:seq:310673','SH:seq:310041']);
  function guardedNotice(item){if(guarded.has(item.id)||/신정도시마을.*잔여세대|2026년.*재개발임대주택.*일반모집/.test(item.title||''))return true;try{const u=new URL(item.official_url||item.url||'');return u.protocol==='https:'&&['www.i-sh.co.kr','i-sh.co.kr'].includes(u.hostname)&&guarded.has('SH:seq:'+u.searchParams.get('seq'))}catch(_){return false}}
  function instant(v){if(typeof v!=='string'||!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!parse(v.slice(0,10)))return null;const n=Date.parse(v);return Number.isFinite(n)?n:null}
  function validWindow(w){if(!w||typeof w!=='object'||!parse(w.start)||!parse(w.end)||w.start>w.end||typeof w.conditional!=='boolean'||typeof w.restricted!=='boolean')return false;if(w.precision==='minute'){const a=instant(w.start_at),b=instant(w.end_at);return a!==null&&b!==null&&a<b&&today(new Date(a))===w.start&&today(new Date(b))===w.end}return !w.start_at&&!w.end_at}
  function windowPeriod(w){const short=v=>`${+v.slice(5,7)}/${+v.slice(8,10)}`;if(w.precision==='minute'){const stamp=v=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(v)).map(x=>[x.type,x.value]));return`${+p.month}/${+p.day} ${p.hour}:${p.minute}`};return`${stamp(w.start_at)}~${stamp(w.end_at)} (한국시간)${w.daily_hours?' · 매일 '+w.daily_hours:''}`}return`${short(w.start)}${w.start===w.end?'':'~'+short(w.end)} · 시간 미확인${w.end_rule==='received_by'?' · 마감일까지 도착 기준':''}`}
  function nonRecruitment(item){return ['result','move_in'].includes(item.notice_kind)||item.schedule_type==='not_applicable'||/결과/.test(item.event||'')||/발표|당첨|선정결과|서류심사\s*대상자|입주안내문|재계약\s*안내|최종\s*청약접수\s*결과/.test(item.title||'')}
  function withheld(item,type='unknown'){return {...item,application_start:'',deadline:'',application_windows:[],schedule_type:type,open_state:type==='not_applicable'?'해당 없음':'일정 확인',status_text:type==='not_applicable'?'신규 접수 대상 아님':'일정 확인 중'}}
  function evidencedDeadlineAt(item){
    const e=item.schedule_evidence;
    if(!e||item.schedule_source!=='official_detail_html'||e.kind!=='official_notice_body'||e.url!==(item.official_url||item.url))return'';
    try{const u=new URL(e.url);if(u.protocol!=='https:'||!['www.i-sh.co.kr','i-sh.co.kr'].includes(u.hostname))return''}catch(_){return''}
    const day=String.raw`(20\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\s*\.?\s*(?:\([월화수목금토일]\))?\s*`;
    const m=String(e.excerpt||'').match(new RegExp(String.raw`^\s*(?:접수|신청)기간\s*[:：]\s*`+day+String.raw`[~～∼]\s*`+day+String.raw`(\d{1,2})(?::([0-5]\d)|시(?:\s*([0-5]?\d)분)?)\s*까지\s*\.?\s*$`));
    if(!m)return'';
    const pad=v=>String(v).padStart(2,'0'),start=`${m[1]}-${pad(m[2])}-${pad(m[3])}`,end=`${m[4]}-${pad(m[5])}-${pad(m[6])}`,hour=+m[7],minute=+(m[8]||m[9]||0);
    if(!parse(start)||!parse(end)||start!==item.application_start||end!==item.deadline||hour>23||minute>59)return'';
    return`${end}T${pad(hour)}:${pad(minute)}:00+09:00`;
  }
  const deadlineClock=x=>x.deadline_at?x.deadline_at.slice(11,16):'';
  function normalize(item){
    if(!isSH(item))return item;
    item={...item};delete item.deadline_at;
    if(nonRecruitment(item))return withheld(item,'not_applicable');
    const source=String(item.schedule_source||''),type=String(item.schedule_type||'');
    if(!trusted.has(source)||['unknown','not_applicable'].includes(type))return withheld(item);
    if(type==='rolling')return {...withheld(item,'rolling'),open_state:'상시모집',status_text:'상시모집 · 모집 여부 확인'};
    const ws=item.application_windows;
    if(Array.isArray(ws)&&ws.length){
      if(!ws.every(validWindow))return withheld(item);
      return {...item,application_start:'',deadline:'',application_windows:ws.map(w=>({...w})),schedule_type:'windows',open_state:'대상별 일정 확인',status_text:'대상별 일정 확인'};
    }
    if(guardedNotice(item)||['windows','ranked','conditional','multiple','multi_window'].includes(type))return withheld(item);
    const start=parse(item.application_start),end=parse(item.deadline);
    if(!start||!end||start>end)return withheld(item);
    const result={...item,application_start:start,deadline:end,application_windows:[],schedule_type:'single'},at=evidencedDeadlineAt(result);
    if(at){result.deadline_at=at;result.deadline_precision='minute'}else if(result.deadline_precision==='minute')result.deadline_precision='date';
    return result;
  }
  function shDetailIdentity(item){
    const m=String(item.id||'').match(/^SH:seq:(\d+)$/);
    try{const u=new URL(item.official_url||item.url||'');return Boolean(m&&u.protocol==='https:'&&['www.i-sh.co.kr','i-sh.co.kr'].includes(u.hostname)&&u.pathname.endsWith('/view.do')&&u.searchParams.getAll('seq').length===1&&u.searchParams.get('seq')===m[1])}catch(_){return false}
  }
  function shAliasKey(item){
    if(!(shDetailIdentity(item)||String(item.id||'').startsWith('SHYOUTH:'))||!isSH(item))return'';
    const title=String(item.title||'').replace(/&nbsp;/g,' ').trim().replace(/^매입(?=20\d{2}년)/,''),m=title.match(/\((20\d{2})\.(\d{2})\.(\d{2})\.?\)$/);
    if(!m)return'';
    const published=parse(`${m[1]}-${m[2]}-${m[3]}`),explicit=parse(item.published_at),start=parse(item.application_start),end=parse(item.deadline);
    if(!published||(explicit&&explicit!==published)||!start||!end||start>end||item.schedule_type!=='single')return'';
    return JSON.stringify([title.replace(/\s+/g,''),published,start,end]);
  }
  function dedupeShAliases(items){
    const identities=new Map(),groups=new Map(),out=[];
    for(const item of items){const key=shAliasKey(item);if(key&&shDetailIdentity(item)){if(!identities.has(key))identities.set(key,new Set());identities.get(key).add(item.id)}}
    for(const item of items){
      const key=shAliasKey(item);
      if(!key||identities.get(key)?.size!==1){out.push(item);continue}
      if(!groups.has(key)){groups.set(key,out.length);out.push(item);continue}
      const pos=groups.get(key),previous=out[pos],preferred=shDetailIdentity(item)?item:previous,other=preferred===item?previous:item;
      out[pos]=!parse(preferred.published_at)&&parse(other.published_at)?{...preferred,published_at:other.published_at}:preferred;
    }
    return out;
  }
  const recruitment=item=>!isSH(item)||!nonRecruitment(item);
  function windows(item){const x=normalize(item);return isSH(x)&&x.schedule_type==='windows'?x.application_windows:[]}
  function phase(w,day,now){if(day===today(now)&&w.precision==='minute'){if(+now<instant(w.start_at))return'upcoming';if(+now>=instant(w.end_at))return'ended'}else{if(day<w.start)return'upcoming';if(day>w.end)return'ended'}return w.conditional?'conditional':w.restricted?'scoped':'open'}
  function state(item,day=today(),now=new Date()){
    const x=normalize(item);
    if(isSH(x)){
      if(x.schedule_type==='rolling')return'rolling';
      if(['unknown','not_applicable'].includes(x.schedule_type))return'unknown';
      if(x.schedule_type==='single'&&day===today(now)&&x.deadline_at&&+now>=instant(x.deadline_at))return'closed';
      const ws=windows(x);
      if(ws.length){const phases=ws.map(w=>phase(w,day,now));if(phases.every(s=>s==='ended'))return'closed';if(phases.includes('open'))return'open';if(phases.includes('scoped'))return'scoped';if(ws.some((w,i)=>!w.conditional&&phases[i]==='upcoming'))return'upcoming';return'unknown'}
    }
    const start=parse(x.application_start),end=parse(x.deadline);if(end&&end<day)return'closed';if(!start||!end||start>end)return x.open_state==='마감'?'closed':'unknown';if(start>day)return'upcoming';return'open';
  }
  function displayLabel(item,day=today(),now=new Date()){
    if(!isSH(item))return labels[state(item,day)];
    const x=normalize(item),s=state(x,day,now);
    if(x.schedule_type==='not_applicable')return'신규 접수 대상 아님';
    if(s==='rolling')return'상시모집 · 모집 여부 확인';
    if(windows(x).length){if(s==='closed')return'확인된 일정 종료';if(windows(x).some(w=>phase(w,day,now)==='conditional'))return'조건부 일정 · 시행 여부 확인';return'대상별 접수일정 확인'}
    if(s==='open'&&x.deadline_at&&x.application_start===day)return'접수기간 · 시작시각 확인';
    if(s==='open'&&x.deadline_precision==='date')return x.deadline===day?'오늘 접수마감일 · 시간 확인':'접수기간 · 시간 확인';
    return labels[s];
  }
  function scheduleText(item){
    const x=normalize(item),short=v=>parse(v)?`${+v.slice(5,7)}/${+v.slice(8,10)}`:'확인 중';
    if(x.schedule_type==='not_applicable')return'신규 신청일정 없음';
    if(x.schedule_type==='rolling')return['상시모집 · 정해진 최종 마감일 없음',x.schedule_note||'현재 모집 여부는 운영기관 확인'].join(' · ');
    const ws=windows(x);
    if(ws.length)return ws.map(w=>`${w.label||'접수'} ${windowPeriod(w)}${w.conditional?' (조건부 · 시행 여부 확인)':''}${w.restricted?' (대상 제한)':''}`).join(' · ')+(x.schedule_note?' · '+x.schedule_note:'');
    if(x.schedule_type==='unknown')return'신청 일정 확인 중';
    const s=short(x.application_start),e=short(x.deadline);return`${s}${s===e?'':'~'+e} 신청${x.deadline_at?' · '+deadlineClock(x)+' 마감 (한국시간) · 시작시각 미확인':x.deadline_precision==='date'?' · 마감시간 미확인':''}`;
  }
  function activeOn(item,day){const x=normalize(item);if(!isSH(x)||!parse(day))return false;const ws=windows(x);if(ws.length)return ws.some(w=>!w.conditional&&!w.restricted&&w.start<=day&&day<=w.end);return x.schedule_type==='single'&&x.application_start<=day&&day<=x.deadline}
  function deadlineDays(item){const x=normalize(item);if(!isSH(x))return[];const ws=windows(x);if(ws.length)return [...new Set(ws.filter(w=>!w.conditional&&!w.restricted).map(w=>w.end))];return x.schedule_type==='single'?[x.deadline]:[]}
  function matches(item,filter,day){const s=state(item,day);return filter==='all'||(filter==='active'?['open','upcoming','rolling','scoped'].includes(s):s===filter)}
  function counts(items,day){return Object.fromEntries(Object.keys(labels).map(k=>[k,items.filter(i=>matches(i,k,day)).length]))}
  window.RentCheckHousingList=Object.freeze({labels,today,state,matches,counts,pageSize:6,isSH,normalize,recruitment,windows,displayLabel,scheduleText,activeOn,deadlineDays,dedupeShAliases});
})();
