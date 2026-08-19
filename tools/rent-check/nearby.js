(() => {
  'use strict';

  const KAKAO_JS_KEY = '222563608848ddea15db9b5ddf83e859';
  const DATA_URL = 'https://arttoy61-png.github.io/rent-check/auction_data.json';
  const state = {location:null, data:null, kakaoReady:null, mapController:null};
  const $ = (s,p=document) => p.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num = v => { const x=Number(String(v ?? '').replace(/,/g,'')); return Number.isFinite(x)?x:0; };
  const typeCode = v => ({'빌라':'v','아파트':'a','오피스텔':'o'}[v] || '');
  const typeLabel = v => ({v:'빌라',a:'아파트',o:'오피스텔'}[v] || '주택');
  const dealKind = () => $('#segDealKind button.active')?.dataset.value || '월세';
  const selectedType = () => typeCode($('#segType button.active')?.dataset.value || '');

  const median = values => {
    const s=[...values].filter(Number.isFinite).sort((a,b)=>a-b);
    if(!s.length) return null;
    const i=Math.floor(s.length/2);
    return s.length%2?s[i]:(s[i-1]+s[i])/2;
  };
  const fmtMoney = v => {
    const x=Math.round(num(v));
    if(x>=10000){const e=x/10000;return `${e.toFixed(e>=10?1:2).replace(/\.?0+$/,'')}억`;}
    return `${x.toLocaleString('ko-KR')}만원`;
  };
  const fmtDate = r => {
    const ym=String(r.ym||''), d=String(r.d||'').padStart(2,'0');
    return /^\d{6}$/.test(ym)?`${ym.slice(0,4)}.${ym.slice(4,6)}.${d}`:'';
  };
  const monthIndex = ym => /^\d{6}$/.test(String(ym||'')) ? Number(String(ym).slice(0,4))*12+Number(String(ym).slice(4,6)) : -1;
  const haversine = (lat1,lng1,lat2,lng2) => {
    const R=6371000, rad=x=>x*Math.PI/180;
    const a=Math.sin(rad(lat2-lat1)/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(rad(lng2-lng1)/2)**2;
    return 2*R*Math.asin(Math.sqrt(a));
  };
  const conversionRate = () => {
    const text=$('#rateText')?.textContent||'';
    const hit=[...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m=>Number(m[1])).filter(v=>v>0&&v<30);
    return hit.length?hit[hit.length-1]:4.5;
  };

  function loadKakao(){
    if(window.kakao?.maps?.services) return Promise.resolve(window.kakao);
    if(state.kakaoReady) return state.kakaoReady;
    state.kakaoReady=new Promise((resolve,reject)=>{
      const finish=()=>{
        if(!window.kakao?.maps) return reject(new Error('카카오맵 SDK를 불러오지 못했습니다.'));
        window.kakao.maps.load(()=>resolve(window.kakao));
      };
      let s=document.querySelector('script[data-rentcheck-kakao]');
      if(s){
        if(window.kakao?.maps) return finish();
        s.addEventListener('load',finish,{once:true});
        s.addEventListener('error',()=>reject(new Error('카카오맵 연결 실패')),{once:true});
        return;
      }
      s=document.createElement('script');
      s.dataset.rentcheckKakao='1';
      s.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JS_KEY)}&libraries=services&autoload=false`;
      s.onload=finish;
      s.onerror=()=>reject(new Error('카카오맵 연결 실패'));
      document.head.appendChild(s);
    });
    return state.kakaoReady;
  }

  async function loadData(){
    if(state.data) return state.data;
    const r=await fetch(`${DATA_URL}?v=${Date.now()}`,{cache:'no-cache'});
    if(!r.ok) throw new Error(`실거래 데이터 연결 실패 (${r.status})`);
    const d=await r.json();
    if(!d || !d.geo || !Array.isArray(d.jeonse) || !Array.isArray(d.wolse)) throw new Error('주변 실거래 데이터를 확인할 수 없습니다.');
    state.data=d;
    return d;
  }

  function jibunKey(item){
    const a=item?.address;
    if(!a) return '';
    const dong=a.region_3depth_name||'', main=a.main_address_no||'', sub=a.sub_address_no&&a.sub_address_no!=='0'?`-${a.sub_address_no}`:'';
    return dong&&main?`${dong} ${main}${sub}`:'';
  }

  async function geocodeAddress(raw){
    const query=String(raw||'').trim();
    if(!query) throw new Error('계약할 집 주소를 입력해 주세요.');
    const kakao=await loadKakao();
    const geocoder=new kakao.maps.services.Geocoder();
    const a=await new Promise(resolve=>geocoder.addressSearch(query,(result,status)=>resolve({result,status})));
    let item=a.status===kakao.maps.services.Status.OK?a.result?.[0]:null;

    if(!item){
      const places=new kakao.maps.services.Places();
      const k=await new Promise(resolve=>places.keywordSearch(query,(result,status)=>resolve({result,status})));
      if(k.status===kakao.maps.services.Status.OK&&k.result?.[0]){
        const p=k.result[0];
        item={x:p.x,y:p.y,address_name:p.road_address_name||p.address_name||query,road_address:p.road_address_name?{address_name:p.road_address_name}:null,address:p.address_name?{address_name:p.address_name}:null};
      }
    }
    if(!item) throw new Error('주소를 찾지 못했습니다. 도로명 또는 지번 주소로 다시 입력해 주세요.');
    const name=item.road_address?.address_name||item.address?.address_name||item.address_name||query;
    if(!/강서구/.test(name)) throw new Error('현재는 서울 강서구 주소만 비교할 수 있습니다.');
    return {lat:Number(item.y),lng:Number(item.x),address:name,jibunKey:jibunKey(item)};
  }

  function status(message,ok=false){
    const el=$('#nearbyAddressStatus');
    if(!el) return;
    el.textContent=message;
    el.className=`nearby-address-status${ok?' ok':''}`;
  }

  async function searchAddress(){
    const input=$('#nearbyAddress'), btn=$('#nearbyAddressBtn');
    try{
      if(btn){btn.disabled=true;btn.textContent='찾는 중…';}
      status('카카오에서 주소를 확인하고 있습니다.');
      const loc=await geocodeAddress(input?.value);
      state.location=loc;
      if(input) input.value=loc.address;
      status(`확인됨 · ${loc.address}`,true);
      try{window.gtag?.('event','address_search',{tool:'rent-check'});}catch(_){ }
      return true;
    }catch(e){
      state.location=null;
      status(e.message||'주소 확인에 실패했습니다.');
      return false;
    }finally{
      if(btn){btn.disabled=false;btn.textContent='주소 찾기';}
    }
  }

  function coords(data,r){
    if(!r?.u||!r?.j) return null;
    const xy=data.geo[`${r.u} ${r.j}`];
    return Array.isArray(xy)&&xy.length===2?{lat:Number(xy[0]),lng:Number(xy[1])}:null;
  }

  function inferType(source){
    const chosen=selectedType();
    if(chosen) return {code:chosen,label:typeLabel(chosen),inferred:false};
    if(!state.location?.jibunKey) return {code:'',label:'전체 주택유형',inferred:false};
    const count={};
    source.forEach(r=>{
      if(r.u&&r.j&&`${r.u} ${r.j}`===state.location.jibunKey&&r.t) count[r.t]=(count[r.t]||0)+1;
    });
    const code=Object.keys(count).sort((a,b)=>count[b]-count[a])[0]||'';
    return code?{code,label:`${typeLabel(code)} · 주소 기준 자동`,inferred:true}:{code:'',label:'전체 주택유형',inferred:false};
  }

  function comparable(data){
    const area=num($('#area')?.value), kind=dealKind();
    if(area<=0) throw new Error('전용면적을 입력해 주세요.');
    if(num($('#deposit')?.value)<0) throw new Error('보증금을 확인해 주세요.');
    if(kind==='월세'&&num($('#rent')?.value)<0) throw new Error('월세를 확인해 주세요.');

    const source=kind==='전세'?data.jeonse:data.wolse;
    const inferred=inferType(source);
    const maxMonth=monthIndex(data.updated), tol=Math.max(8,area*.20);

    const collect=months=>source.filter(r=>!inferred.code||r.t===inferred.code)
      .filter(r=>Math.abs(num(r.a)-area)<=tol)
      .filter(r=>{const m=monthIndex(r.ym);return maxMonth<0||m<0||m>=maxMonth-months+1;})
      .map(r=>{
        const xy=coords(data,r);if(!xy)return null;
        const distance=haversine(state.location.lat,state.location.lng,xy.lat,xy.lng);
        if(distance>500)return null;
        return {...r,...xy,distance,areaDiff:Math.abs(num(r.a)-area),same:Boolean(state.location.jibunKey&&`${r.u} ${r.j}`===state.location.jibunKey)};
      }).filter(Boolean);

    let rows=collect(12), period=12;
    if(rows.length<3){rows=collect(24);period=24;}
    rows.sort((a,b)=>Number(b.same)-Number(a.same)||a.distance-b.distance||a.areaDiff-b.areaDiff||String(b.ym+String(b.d).padStart(2,'0')).localeCompare(String(a.ym+String(a.d).padStart(2,'0'))));
    return {rows:rows.slice(0,5),total:rows.length,period,typeInfo:inferred};
  }

  function verdict(rows,kind){
    if(rows.length<3) return {cls:'nodata',title:'비교 표본이 적습니다',sub:`주변 500m 안에서 조건이 비슷한 ${kind} 실거래가 ${rows.length}건입니다.`};
    if(kind==='전세'){
      const user=num($('#deposit')?.value), med=median(rows.map(r=>num(r.p))), diff=user-med, threshold=Math.max(500,med*.05);
      if(Math.abs(diff)<=threshold)return{cls:'good',title:'주변과 비슷한 편입니다',sub:`비슷한 주변 전세 중위는 ${fmtMoney(med)}입니다.`};
      if(diff>0)return{cls:'warn',title:`주변보다 약 ${fmtMoney(Math.abs(diff))} 높은 편입니다`,sub:`비슷한 주변 전세 중위 ${fmtMoney(med)}와 비교했습니다.`};
      return{cls:'cheap',title:`주변보다 약 ${fmtMoney(Math.abs(diff))} 낮은 편입니다`,sub:`비슷한 주변 전세 중위 ${fmtMoney(med)}와 비교했습니다.`};
    }
    const userDep=num($('#deposit')?.value),userRent=num($('#rent')?.value),rate=conversionRate();
    const values=rows.map(r=>num(r.m)+(num(r.dp)-userDep)*rate/1200),med=median(values),diff=userRent-med,threshold=Math.max(3,med*.05);
    if(Math.abs(diff)<=threshold)return{cls:'good',title:'주변과 비슷한 편입니다',sub:`보증금 차이를 환산한 주변 월세 중위는 약 ${Math.round(med)}만원입니다.`};
    if(diff>0)return{cls:'warn',title:`주변보다 월 약 ${Math.round(Math.abs(diff))}만원 높은 편입니다`,sub:'보증금 차이를 같은 기준으로 환산해 비교했습니다.'};
    return{cls:'cheap',title:`주변보다 월 약 ${Math.round(Math.abs(diff))}만원 낮은 편입니다`,sub:'보증금 차이를 같은 기준으로 환산해 비교했습니다.'};
  }

  function price(r,kind){return kind==='전세'?fmtMoney(r.p):`${fmtMoney(r.dp)} / 월 ${Math.round(num(r.m)).toLocaleString()}만원`;}
  function priceHtml(r,kind){
    if(kind==='전세') return `<b>${esc(fmtMoney(r.p))}</b>`;
    return `<b>${esc(fmtMoney(r.dp))}</b><span>월 ${Math.round(num(r.m)).toLocaleString()}만원</span>`;
  }

  function drawMap(rows){
    const target=$('#nearbyMap');
    if(!target||!window.kakao?.maps||!state.location)return;
    const kakao=window.kakao,center=new kakao.maps.LatLng(state.location.lat,state.location.lng),map=new kakao.maps.Map(target,{center,level:4}),bounds=new kakao.maps.LatLngBounds();
    bounds.extend(center);
    let activeIndex=null,activePopup=null;
    const pins=[];
    const rowEls=()=>[...document.querySelectorAll('#nearbyResult tbody tr[data-nearby-index]')];
    const clearRows=()=>rowEls().forEach(el=>el.classList.remove('is-active'));
    const closePopup=()=>{if(activePopup){activePopup.setMap(null);activePopup=null;}activeIndex=null;clearRows();};
    const popupAt=(pos,text,index)=>{
      if(activePopup)activePopup.setMap(null);
      const el=document.createElement('div');el.className='nearby-map-popup';
      const label=document.createElement('span');label.textContent=text;el.appendChild(label);
      const close=document.createElement('button');close.type='button';close.className='nearby-map-popup-close';close.setAttribute('aria-label','닫기');close.textContent='×';
      close.addEventListener('click',e=>{e.stopPropagation();closePopup();});el.appendChild(close);
      activePopup=new kakao.maps.CustomOverlay({position:pos,content:el,yAnchor:1.65,zIndex:12,map});
      activeIndex=index;clearRows();if(index>=0)rowEls()[index]?.classList.add('is-active');
    };
    const makePin=(pos,label,cls,index,text)=>{
      const btn=document.createElement('button');btn.type='button';btn.className=`nearby-map-pin ${cls}`;btn.textContent=label;btn.setAttribute('aria-label',text);
      new kakao.maps.CustomOverlay({position:pos,content:btn,yAnchor:1.1,zIndex:5,map});
      btn.addEventListener('click',e=>{e.stopPropagation();if(activeIndex===index){closePopup();return;}popupAt(pos,text,index);});
      pins.push({pos,index,text});
    };
    makePin(center,'⌂','home',-1,'입력 주소');
    rows.forEach((r,i)=>{const pos=new kakao.maps.LatLng(r.lat,r.lng);bounds.extend(pos);makePin(pos,String(i+1),'deal',i,`${r.b||typeLabel(r.t)} · ${Math.round(r.distance)}m`);});
    if(rows.length)map.setBounds(bounds,38,38,38,38);
    kakao.maps.event.addListener(map,'click',closePopup);
    state.mapController={close:closePopup,select(index){const pin=pins.find(x=>x.index===index);if(!pin)return;map.panTo(pin.pos);if(activeIndex===index){closePopup();return;}popupAt(pin.pos,pin.text,index);}};
  }

  function resultBox(){
    let box=$('#nearbyResult');if(box)return box;
    box=document.createElement('section');box.id='nearbyResult';box.className='nearby-result';
    const old=$('#result');old?.parentNode?.insertBefore(box,old);return box;
  }

  function render(info){
    const kind=dealKind(),v=verdict(info.rows,kind),box=resultBox();
    const rows=info.rows.length?info.rows.map((r,i)=>`<tr data-nearby-index="${i}"><td class="nearby-place"><b>${esc(r.b||r.u)}</b><small>${esc(typeLabel(r.t))} · ${esc(fmtDate(r))}</small></td><td class="nearby-distance">${Math.round(r.distance)}m${r.same?'<small>같은 지번</small>':''}</td><td class="nearby-area">${num(r.a).toFixed(1).replace(/\.0$/,'')}㎡</td><td class="nearby-price">${priceHtml(r,kind)}</td></tr>`).join(''):'<tr><td colspan="4">조건에 맞는 주변 실거래를 찾지 못했습니다.</td></tr>';
    box.innerHTML=`<div class="verdict ${esc(v.cls)}"><div class="title">${esc(v.title)}</div><div class="sub">${esc(v.sub)}</div></div><div class="card nearby-card"><h2>입력 주소 주변 실거래</h2><div class="nearby-summary"><b>${esc(state.location.address)}</b><br>반경 500m · ${esc(info.typeInfo.label)} · 비슷한 면적 · 최근 ${info.period}개월</div><div id="nearbyMap" class="nearby-map" aria-label="주소 주변 실거래 지도"></div><div class="nearby-table-wrap"><table class="nearby-table"><thead><tr><th>현장명</th><th>거리</th><th>면적</th><th>금액</th></tr></thead><tbody>${rows}</tbody></table></div><p class="nearby-note">500m 안에서 조건이 비슷한 거래 ${info.total}건 중 최대 5건을 보여줍니다. 입력 주소는 카카오 위치검색에만 사용하며 Rent Check에 저장하지 않습니다.</p></div>`;
    box.style.display='block';
    document.body.classList.add('nearby-mode');
    drawMap(info.rows);
    box.querySelectorAll('tbody tr[data-nearby-index]').forEach(tr=>tr.addEventListener('click',()=>state.mapController?.select(Number(tr.dataset.nearbyIndex))));
    box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function runNearby(){
    if(!state.location)throw new Error('주소를 먼저 확인해 주세요.');
    const data=await loadData(),info=comparable(data);render(info);
    try{window.gtag?.('event','nearby_compare',{tool:'rent-check',deal_kind:dealKind(),matches:info.total});}catch(_){ }
  }

  function showError(message){
    const box=resultBox();
    box.style.display='block';
    box.innerHTML=`<div class="card"><h2>주소 주변 실거래</h2><div class="no-data">${esc(message)}</div></div>`;
    box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function injectStyle(){
    const style=document.createElement('style');style.id='nearbyRentStyle';style.textContent=`
      .apt-shortcut-card{display:none!important}
      .nearby-address-block{margin-bottom:16px;padding:14px;border:1.5px solid var(--blue);border-radius:12px;background:var(--blue-50)}
      .nearby-address-block label{display:block;font-size:13px;font-weight:700;color:var(--navy);margin-bottom:7px}.nearby-address-row{display:flex;gap:8px}.nearby-address-row input{flex:1;min-width:0;padding:12px 13px;border:1.5px solid var(--border);border-radius:10px;font-size:15px;background:#fff}.nearby-address-row button{flex:0 0 auto;border:0;border-radius:10px;padding:0 14px;background:var(--blue);color:#fff;font-weight:700;cursor:pointer}.nearby-address-row button:disabled{opacity:.65}.nearby-address-status{font-size:11px;color:var(--gray-lite);margin-top:7px;line-height:1.5}.nearby-address-status.ok{color:var(--green);font-weight:700}.nearby-result{display:none}body.nearby-mode #result{display:none!important}.nearby-card{overflow:hidden}.nearby-summary{font-size:12px;line-height:1.7;color:var(--gray-lite);margin:-4px 0 10px}.nearby-summary b{color:var(--navy)}.nearby-map{height:240px;border:1px solid var(--border);border-radius:10px;margin:8px 0 12px;background:#eef1f5}.nearby-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}.nearby-table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed;min-width:0}.nearby-table th{padding:9px 4px;background:var(--navy);color:#fff;text-align:center;white-space:nowrap}.nearby-table td{padding:9px 4px;border-bottom:1px solid var(--border);text-align:center;vertical-align:middle}.nearby-table th:nth-child(1),.nearby-table td:nth-child(1){width:42%;text-align:left;padding-left:8px}.nearby-table th:nth-child(2),.nearby-table td:nth-child(2){width:13%}.nearby-table th:nth-child(3),.nearby-table td:nth-child(3){width:17%}.nearby-table th:nth-child(4),.nearby-table td:nth-child(4){width:28%}.nearby-table small{font-size:10px;color:var(--gray-lite);line-height:1.35}.nearby-place b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--navy)}.nearby-distance,.nearby-area{white-space:nowrap}.nearby-price{font-size:12px;line-height:1.4;word-break:keep-all}.nearby-price b{font-weight:800;color:var(--navy)}.nearby-note{font-size:11px;color:var(--gray-lite);line-height:1.65;margin-top:10px}@media(max-width:520px){.nearby-address-row{display:grid;grid-template-columns:1fr auto}.nearby-address-row button{min-width:86px}.nearby-map{height:220px}.nearby-table{font-size:11px}.nearby-table th{padding:8px 2px}.nearby-table td{padding:8px 2px}.nearby-table th:nth-child(1),.nearby-table td:nth-child(1){width:43%;padding-left:6px}.nearby-table th:nth-child(2),.nearby-table td:nth-child(2){width:13%}.nearby-table th:nth-child(3),.nearby-table td:nth-child(3){width:17%}.nearby-table th:nth-child(4),.nearby-table td:nth-child(4){width:27%}.nearby-price{font-size:11px}}
      .nearby-map-pin{width:28px;height:28px;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 7px rgba(15,39,75,.28);display:flex;align-items:center;justify-content:center;padding:0;font-size:12px;font-weight:900;line-height:1;cursor:pointer}
      .nearby-map-pin.deal{background:#2f80ed;color:#fff}.nearby-map-pin.home{background:#d9aa2f;color:#0f274b;font-size:17px}
      .nearby-map-popup{display:flex;align-items:center;gap:8px;max-width:210px;padding:8px 9px 8px 11px;border:1px solid #cfd7e3;border-radius:9px;background:#fff;box-shadow:0 3px 12px rgba(15,39,75,.2);font-size:12px;font-weight:800;color:var(--navy);white-space:nowrap}
      .nearby-map-popup span{overflow:hidden;text-overflow:ellipsis}.nearby-map-popup-close{flex:0 0 24px;width:24px;height:24px;border:0;border-radius:50%;background:#eef2f7;color:#475569;font-size:18px;line-height:22px;padding:0;cursor:pointer}
      .nearby-table tbody tr[data-nearby-index]{cursor:pointer;transition:background .15s ease}.nearby-table tbody tr[data-nearby-index].is-active{background:#f3f7ff}
      .nearby-place b{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;white-space:normal;line-height:1.3;margin-bottom:4px}.nearby-place small,.nearby-distance small{display:block}
      .nearby-price b,.nearby-price span{display:block;white-space:nowrap}.nearby-price span{margin-top:2px;font-weight:800;color:var(--navy)}
      @media(max-width:520px){.nearby-map{height:200px}.nearby-table-wrap{overflow-x:hidden}.nearby-table th{padding:7px 2px}.nearby-table td{padding:7px 2px}.nearby-table th:nth-child(1),.nearby-table td:nth-child(1){width:37%;padding-left:6px}.nearby-table th:nth-child(2),.nearby-table td:nth-child(2){width:11%}.nearby-table th:nth-child(3),.nearby-table td:nth-child(3){width:14%}.nearby-table th:nth-child(4),.nearby-table td:nth-child(4){width:38%}.nearby-place small,.nearby-table small{font-size:9.5px}.nearby-distance,.nearby-area{font-size:10.5px}.nearby-price{font-size:11px;line-height:1.25}.nearby-map-popup{max-width:180px;font-size:11px}}
    `;document.head.appendChild(style);
  }

  function prepareForm(){
    const card=$('.input-card');if(!card)return;
    const building=$('#buildingSearch')?.closest('.field');if(building)building.style.display='none';
    const h2=card.querySelector('h2');if(h2)h2.textContent='계약 정보 입력';
    const first=card.querySelector('.field'),block=document.createElement('div');
    block.className='nearby-address-block';block.innerHTML=`<label for="nearbyAddress">계약할 집 주소</label><div class="nearby-address-row"><input id="nearbyAddress" type="text" placeholder="도로명 또는 지번 주소" autocomplete="street-address"><button id="nearbyAddressBtn" type="button">주소 찾기</button></div><div id="nearbyAddressStatus" class="nearby-address-status">주소를 넣으면 주변 500m의 비슷한 실거래만 비교합니다.</div>`;
    card.insertBefore(block,first||card.firstChild);
    const check=$('#checkBtn');if(check)check.textContent='주소 주변 시세 확인하기';

    $('#nearbyAddressBtn')?.addEventListener('click',searchAddress);
    $('#nearbyAddress')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchAddress();}});
    $('#nearbyAddress')?.addEventListener('input',()=>{state.location=null;state.mapController=null;document.body.classList.remove('nearby-mode');const b=$('#nearbyResult');if(b)b.style.display='none';status('주소를 수정했습니다. 주소 찾기를 다시 눌러주세요.');});
  }

  function bindCheck(){
    const btn=$('#checkBtn');if(!btn)return;
    btn.addEventListener('click',async e=>{
      e.preventDefault();e.stopImmediatePropagation();
      try{
        if(!$('#nearbyAddress')?.value.trim()){status('계약할 집 주소를 먼저 입력해 주세요.');$('#nearbyAddress')?.focus();return;}
        if(!state.location){const ok=await searchAddress();if(!ok)return;}
        btn.disabled=true;btn.textContent='주변 실거래 찾는 중…';
        await runNearby();
      }catch(err){showError(err.message||'주변 실거래를 불러오지 못했습니다.');}
      finally{btn.disabled=false;btn.textContent='주소 주변 시세 확인하기';}
    },true);
  }

  function init(){
    document.title='내 월세·전세 적정 확인 | Rent Check';
    const desc=document.querySelector('meta[name="description"]');if(desc)desc.content='서울 강서구 주소 주변 실거래로 내 월세·전세 계약 조건이 적정한지 비교합니다.';
    injectStyle();prepareForm();bindCheck();loadKakao().catch(()=>status('카카오맵 연결을 확인하고 있습니다.'));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
