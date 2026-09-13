/* Preserve the last validated analysis when the network is unavailable.
 * Original analytical functions stay intact; the exact period published by the
 * public data builder is applied before rendering.
 */
let rcExactPeriodInstalled=false;
function rcEscape(value){return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function rcDateKey(value){return String(value||'').replaceAll('.','-').slice(0,10)}
function rcPeriodBounds(s){
  const p=s?.meta?.period;
  if(!Array.isArray(p)||p.length!==2)return null;
  const start=rcDateKey(p[0]),end=rcDateKey(p[1]);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)return null;
  return [start,end];
}
function rcRowsInPeriod(arr,s){
  const bounds=rcPeriodBounds(s);
  if(!bounds)return Array.isArray(arr)?arr:[];
  return (arr||[]).filter(row=>{const d=rcDateKey(row?.date);return d>=bounds[0]&&d<=bounds[1]});
}
function rcShiftMonthsISO(iso,delta){
  const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;
  const total=Number(m[1])*12+(Number(m[2])-1)+delta,year=Math.floor(total/12),month0=((total%12)+12)%12,month=month0+1;
  const last=new Date(Date.UTC(year,month,0)).getUTCDate(),day=Math.min(Number(m[3]),last);
  return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
}
function rcMonthKeysInPeriod(s){
  const bounds=rcPeriodBounds(s);if(!bounds)return null;
  const a=bounds[0].slice(0,7).replace('-',''),b=bounds[1].slice(0,7).replace('-','');
  let y=Number(a.slice(0,4)),m=Number(a.slice(4,6)),out=[];
  for(let guard=0;guard<24;guard++){
    const key=String(y)+String(m).padStart(2,'0');out.push(key);if(key===b)break;
    m+=1;if(m===13){m=1;y+=1}
  }
  return out;
}
function rcInstallExactPeriodCoreData(){
  if(rcExactPeriodInstalled||typeof coreData!=='function')return;
  const legacyCoreData=coreData;
  coreData=function(a){
    const source=(typeof S==='undefined'?null:S),bounds=rcPeriodBounds(source);
    if(!bounds)return legacyCoreData(a);
    const sale=rcRowsInPeriod(a.sale,source),je=rcRowsInPeriod(a.jeonse,source),wo=rcRowsInPeriod(a.wolse,source);
    const months=rcMonthKeysInPeriod(source)||[];
    const split=rcShiftMonthsISO(bounds[1],-3);
    const prev=sale.filter(x=>{const d=rcDateKey(x.date);return d>=bounds[0]&&d<split}).map(x=>x.amt);
    const recent=sale.filter(x=>{const d=rcDateKey(x.date);return d>=split&&d<=bounds[1]}).map(x=>x.amt);
    return{months,sale,je,wo,saleMed:median(sale.map(x=>x.amt)),jeMed:median(je.map(x=>x.dep)),lastSale:sale[0]||null,prev3:median(prev),last3:median(recent)};
  };
  rcExactPeriodInstalled=true;
}
function rcPeriodLabel(s){
  const bounds=rcPeriodBounds(s),basis=s?.meta?.period_basis||'계약일 기준';
  if(!bounds)return '최근 6개월 · '+basis;
  return '분석기간 '+bounds[0].replaceAll('-','.')+'~'+bounds[1].replaceAll('-','.')+' · '+basis;
}
function rcValidate(s,d){
  rcInstallExactPeriodCoreData();
  if(!s||!/^\d{6}$/.test(String(s.meta?.updated))||!Array.isArray(s.complexes)||!Number.isFinite(Date.parse(s.generated_at)))throw new Error('Invalid summary');
  const item=s.complexes.find(x=>norm(x.nm)===norm(TARGET));
  const a=item&&d?.[item.id];
  if(!a||!Array.isArray(a.areas)||!a.areas.length)throw new Error('Invalid target detail');
  if(s.complexes.some(x=>typeof x.nm!=='string'||/[<>]/.test(x.nm)))throw new Error('Invalid name');
  for(const area of a.areas){
    if(typeof area.m2!=='number'||!Number.isFinite(area.m2)||area.m2<=0)throw new Error('Invalid area');
    for(const type of ['sale','jeonse','wolse']){
      if(!Array.isArray(area[type]))throw new Error('Missing transaction group');
      for(const row of area[type]){
        const price=type==='sale'?row.amt:row.dep;
        if(!/^\d{4}\.\d{2}\.\d{2}$/.test(String(row.date))||typeof price!=='number'||!Number.isFinite(price)||price<0)throw new Error('Invalid transaction');
      }
    }
    if(typeof area.nS==='number'&&area.nS!==area.sale.length)throw new Error('Incomplete sale snapshot');
    if(typeof area.nJ==='number'&&area.nJ!==area.jeonse.length)throw new Error('Incomplete jeonse snapshot');
    if(typeof area.nW==='number'&&area.nW!==area.wolse.length)throw new Error('Incomplete wolse snapshot');
  }
  return item;
}
function rcSourceLabel(s){
  return '자료 생성 '+new Date(s.generated_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})+' (한국시간) · '+rcPeriodLabel(s)+' · 국토부 신고자료';
}
function rcRenderRecent(){
  const target=document.querySelector('#rc-recent-records');if(!target||!APT)return;
  const area=APT.areas.find(x=>x.m2===band)||APT.areas[0],c=coreData(area),period=rcPeriodLabel(S);
  const rows=[...c.sale].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const tableRows=rows.length?rows.map(r=>'<tr><td>'+rcEscape(r.date)+'</td><td>'+rcEscape(r.fl==null?'-':r.fl)+'</td><td>'+rcEscape(eok(r.amt))+'</td></tr>').join(''):'<tr><td colspan="3">최근 6개월 매매 신고가 없습니다.</td></tr>';
  target.innerHTML='<table class="trend"><caption>전용 '+rcEscape(area.m2)+'㎡ · '+rcEscape(period)+' · 매매 최신 '+rows.length+'건</caption><thead><tr><th scope="col">계약일</th><th scope="col">층</th><th scope="col">매매금액</th></tr></thead><tbody>'+tableRows+'</tbody></table><p class="note">'+rcEscape(rcSourceLabel(S))+'. 위 카드의 표본 수는 이 분석기간 안의 신고 건수입니다. 도구의 면적 구간을 사용하며 정확한 전용면적은 원본에서 확인하세요. 최근 신고·정정·해제는 이후 반영될 수 있습니다.</p>';
}
function rcAssign(s,d){
  const target=rcValidate(s,d);S=s;D=d;SM=target;APT=D[SM.id];
  if(!APT.areas.some(a=>a.m2===band))band=APT.areas[0].m2;
  document.querySelector('#rawLink').href='../../tools/apartment/?id='+encodeURIComponent(SM.id);
}
function rcStartAnalysis(){
  rcInstallExactPeriodCoreData();
  let hasSnapshot=false;
  try{
    const node=document.getElementById('rc-analysis-snapshot');
    if(node){const snapshot=JSON.parse(node.textContent);rcAssign(snapshot.summary,snapshot.detail);hasSnapshot=true;render();document.querySelector('#updated').textContent=rcSourceLabel(S)}
  }catch(_){/* Keep the server-rendered HTML when an embedded fallback is incomplete. */}
  const get=async url=>{const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error('Data unavailable');return response.json()};
  Promise.all([get(SUM),get(DET)]).then(([s,d])=>{
    rcValidate(s,d);
    if(hasSnapshot&&Date.parse(s.generated_at)<Date.parse(S.generated_at))return;
    const previous={s:typeof S==='undefined'?null:S,d:typeof D==='undefined'?null:D,sm:typeof SM==='undefined'?null:SM,apt:typeof APT==='undefined'?null:APT,band,tab,html:document.querySelector('#app').innerHTML,recent:document.querySelector('#rc-recent-records')?.innerHTML};
    try{rcAssign(s,d);render();document.querySelector('#updated').textContent=rcSourceLabel(S);hasSnapshot=true}
    catch(error){S=previous.s;D=previous.d;SM=previous.sm;APT=previous.apt;band=previous.band;tab=previous.tab;document.querySelector('#app').innerHTML=previous.html;if(document.querySelector('#rc-recent-records'))document.querySelector('#rc-recent-records').innerHTML=previous.recent||'';throw error}
  }).catch(()=>{
    // Never replace the last valid analysis with an error-only screen.
    const updated=document.querySelector('#updated');
    if(hasSnapshot)updated.textContent=rcSourceLabel(S)+' · 새 자료 연결 지연, 기존 자료 표시';
    else if(!document.querySelector('#app').dataset.prerendered)updated.textContent='데이터 연결 확인 필요';
  });
}
