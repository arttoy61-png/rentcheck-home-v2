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
})();
