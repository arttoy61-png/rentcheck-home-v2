(()=>{
  const KEY='rentcheck:home-scroll-v1';
  const section=document.querySelector('#insights .container');
  const track=document.querySelector('#insightTrack');
  if(section&&track&&!document.querySelector('.insight-all-wrap')){
    const style=document.createElement('style');
    style.textContent=`
      .insight-all-wrap{margin-top:18px;display:flex;justify-content:flex-end}
      .insight-all-link{display:inline-flex;min-height:44px;align-items:center;gap:8px;padding:10px 15px;border:1px solid #c9d1dc;border-radius:9px;background:#fff;color:#0d1f3c;font-size:13px;font-weight:800;text-decoration:none}
      .insight-all-link:hover{border-color:#0d1f3c;background:#f7f8fa}
      @media(max-width:520px){.insight-all-wrap{margin-top:14px}.insight-all-link{width:100%;justify-content:center;font-size:13px}}
    `;
    document.head.appendChild(style);
    const wrap=document.createElement('div');
    wrap.className='insight-all-wrap';
    const link=document.createElement('a');
    link.className='insight-all-link';
    link.href='/analysis/';
    link.textContent='홈페이지 분석글 전체보기 →';
    wrap.append(link);
    track.insertAdjacentElement('afterend',wrap);
  }

  function featureGangseoPriceGuide(){
    const homeTrack=document.querySelector('#insightTrack');
    if(!homeTrack||homeTrack.querySelector('a[href="/blog/gangseo-home-price/"]'))return;
    const cards=[...homeTrack.querySelectorAll('.insight')];
    if(!cards.length)return;
    const card=document.createElement('a');
    card.className='insight insight-home';
    card.href='/blog/gangseo-home-price/';
    const visual=document.createElement('div');
    visual.className='insight-art';
    const img=document.createElement('img');
    img.src='/assets/share/rent-check-og.png';
    img.alt='Rent Check 강서구 집값 가이드';
    img.loading='lazy';
    img.decoding='async';
    visual.append(img);
    const body=document.createElement('div');
    body.className='insight-body';
    const cat=document.createElement('span');
    cat.className='insight-category';
    cat.textContent='시세·실거래·가이드';
    const title=document.createElement('h3');
    title.textContent='강서구 집값 얼마예요?｜아파트·빌라·오피스텔 시세 한 번에 보기';
    const meta=document.createElement('div');
    meta.className='insight-meta';
    const date=document.createElement('span');
    date.textContent='2026-08-27';
    const go=document.createElement('span');
    go.className='insight-go';
    go.textContent='글 보기 →';
    meta.append(date,go);
    body.append(cat,title,meta);
    card.append(visual,body);
    cards[cards.length-1].replaceWith(card);
    const heading=document.querySelector('#insights .section-head h2');
    if(heading)heading.textContent='Rent Check 자체 글';
  }

  featureGangseoPriceGuide();

  function saveHomePosition(){
    try{sessionStorage.setItem(KEY,JSON.stringify({y:Math.max(0,window.scrollY||0),time:Date.now()}));}catch(_){/* ignore */}
  }

  document.addEventListener('click',event=>{
    const link=event.target.closest('#insights a');
    if(!link)return;
    if(link.target==='_blank')return;
    saveHomePosition();
  },true);

  window.addEventListener('pageshow',event=>{
    let isBackForward=Boolean(event.persisted);
    try{
      const nav=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];
      if(nav?.type==='back_forward')isBackForward=true;
    }catch(_){/* ignore */}
    if(!isBackForward)return;
    let saved;
    try{saved=JSON.parse(sessionStorage.getItem(KEY)||'null');}catch(_){saved=null;}
    if(!saved||!Number.isFinite(saved.y)||Date.now()-Number(saved.time||0)>60*60*1000)return;
    const restore=()=>window.scrollTo(0,saved.y);
    requestAnimationFrame(()=>{
      restore();
      setTimeout(restore,80);
      setTimeout(restore,320);
    });
  });

  if(!document.querySelector('link[data-public-housing-popup]')){
    const popupStyle=document.createElement('link');
    popupStyle.rel='stylesheet';
    popupStyle.href='/data/public-housing-popup.css?v=20260828-2';
    popupStyle.dataset.publicHousingPopup='1';
    document.head.appendChild(popupStyle);
  }
  if(!document.querySelector('script[data-public-housing-popup]')){
    const popupScript=document.createElement('script');
    popupScript.src='/data/public-housing-popup.js?v=20260828-2';
    popupScript.defer=true;
    popupScript.dataset.publicHousingPopup='1';
    document.body.appendChild(popupScript);
  }
})();
