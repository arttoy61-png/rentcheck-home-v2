(()=>{
  const KEY='rentcheck:home-scroll-v1';

  const footer=document.querySelector('body > footer');
  if(footer){
    const footerStyle=document.createElement('style');
    footerStyle.textContent=`
      .rc-simple-footer{padding:28px 0 32px!important;border-top:1px solid #d7dce3!important;background:#fff!important;color:#667085!important}
      .rc-simple-footer .rc-footer-inner{width:calc(100% - 48px);max-width:1280px;margin:0 auto;text-align:center}
      .rc-simple-footer .rc-footer-links{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:7px 10px;margin-bottom:10px;font-size:12px}
      .rc-simple-footer .rc-footer-links a{color:#485466!important;text-decoration:none!important}
      .rc-simple-footer .rc-footer-links a:hover{color:#0d1f3c!important;text-decoration:underline!important;text-underline-offset:3px}
      .rc-simple-footer .rc-footer-copy{margin:0!important;color:#667085!important;font-size:12px!important}
      @media(max-width:520px){.rc-simple-footer{padding:23px 0 27px!important}.rc-simple-footer .rc-footer-inner{width:calc(100% - 28px)}.rc-simple-footer .rc-footer-links{font-size:11.5px}}
    `;
    document.head.appendChild(footerStyle);
    footer.className='rc-simple-footer';
    footer.innerHTML=`<div class="rc-footer-inner"><nav class="rc-footer-links" aria-label="사이트 안내"><a href="/about/">소개</a><span>|</span><a href="/privacy.html">개인정보처리방침</a><span>|</span><a href="/contact/">문의</a><span>|</span><a href="/sponsor/">광고/제휴</a></nav><p class="rc-footer-copy">Copyright © 2026 Rent Check</p></div>`;
  }

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
