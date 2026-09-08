/* Preserve the last validated analysis when the network is unavailable.
 * Original coreData/median/panel/setBand/setTab functions remain the source of calculations.
 */
function rcEscape(value){return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function rcValidate(s,d){
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
  }
  return item;
}
function rcSourceLabel(s){
  return '자료 생성 '+new Date(s.generated_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})+' (한국시간) · 국토부 신고자료';
}
function rcRenderRecent(){
  const target=document.querySelector('#rc-recent-records');if(!target||!APT)return;
  const area=APT.areas.find(x=>x.m2===band)||APT.areas[0],c=coreData(area);
  const rows=[...c.sale].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const tableRows=rows.length?rows.map(r=>'<tr><td>'+rcEscape(r.date)+'</td><td>'+rcEscape(r.fl==null?'-':r.fl)+'</td><td>'+rcEscape(eok(r.amt))+'</td></tr>').join(''):'<tr><td colspan="3">최근 6개월 매매 신고가 없습니다.</td></tr>';
  target.innerHTML='<table class="trend"><caption>전용 '+rcEscape(area.m2)+'㎡ 구간 · 최근 6개월 매매 중 최신 '+rows.length+'건</caption><thead><tr><th scope="col">계약일</th><th scope="col">층</th><th scope="col">매매금액</th></tr></thead><tbody>'+tableRows+'</tbody></table><p class="note">'+rcEscape(rcSourceLabel(S))+'. 도구의 면적 구간을 사용하며 정확한 전용면적은 원본에서 확인하세요. 최근 신고·정정·해제는 이후 반영될 수 있습니다.</p>';
}
function rcAssign(s,d){
  const target=rcValidate(s,d);S=s;D=d;SM=target;APT=D[SM.id];
  if(!APT.areas.some(a=>a.m2===band))band=APT.areas[0].m2;
  document.querySelector('#rawLink').href='../../tools/apartment/?id='+encodeURIComponent(SM.id);
}
function rcStartAnalysis(){
  let hasSnapshot=false;
  try{
    const node=document.getElementById('rc-analysis-snapshot');
    if(node){const snapshot=JSON.parse(node.textContent);rcAssign(snapshot.summary,snapshot.detail);hasSnapshot=true;render();document.querySelector('#updated').textContent=rcSourceLabel(S)}
  }catch(_){/* Keep the server-rendered HTML even if the embedded payload cannot hydrate. */}
  const get=async url=>{const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error('Data unavailable');return response.json()};
  Promise.all([get(SUM),get(DET)]).then(([s,d])=>{
    rcValidate(s,d);
    if(hasSnapshot&&Date.parse(s.generated_at)<=Date.parse(S.generated_at))return;
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
