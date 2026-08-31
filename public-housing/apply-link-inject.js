(()=>{
  const SH_APPLY='https://www.i-sh.co.kr/app/index.do';
  const LH_APPLY='https://apply.lh.or.kr/lhapply/apply/pcrt/pcrt01.do';
  const OPEN_STATES=['오늘 접수 시작','오늘 접수일','오늘 접수마감','접수 중','접수 예정','마감임박'];

  function addStyle(){
    if(document.querySelector('style[data-housing-apply-link]'))return;
    const style=document.createElement('style');
    style.dataset.housingApplyLink='1';
    style.textContent=`.housing-apply-wrap{margin:18px 0 4px}.housing-apply-link{display:flex;min-height:48px;align-items:center;justify-content:center;padding:0 16px;border-radius:10px;background:#1565c0;color:#fff!important;font-weight:800;text-decoration:none;box-shadow:0 4px 12px rgba(21,101,192,.18)}.housing-apply-link:hover{background:#0f55a8}.housing-apply-note{display:block;margin:0 0 8px;color:#6b7280;font-size:12px;line-height:1.5}`;
    document.head.appendChild(style);
  }

  function agency(){
    const kicker=document.querySelector('.housing-generic .kicker,.housing-hero .kicker')?.textContent||'';
    if(/\bLH\b/i.test(kicker))return'LH';
    if(/\bSH\b/i.test(kicker)||location.pathname.includes('/sh-'))return'SH';
    return'';
  }

  function isOpen(){
    if(location.pathname.includes('/sh-happy-housing-2026-2/')||location.pathname.includes('/sh-long-vacant-purchase-2026-2/'))return true;
    const state=document.querySelector('.housing-generic > p')?.textContent?.trim()||'';
    return OPEN_STATES.some(v=>state.includes(v));
  }

  function targetSection(){
    const sections=[...document.querySelectorAll('.housing-section,.section')];
    return sections.find(section=>/지금 확인할 것|지금 할 일|신청 전 체크/.test(section.querySelector('h2')?.textContent||''))||null;
  }

  function apply(){
    if(document.querySelector('.housing-apply-wrap'))return true;
    const ag=agency();
    if(!ag||!isOpen())return false;
    const section=targetSection();
    if(!section)return false;
    addStyle();
    const wrap=document.createElement('div');wrap.className='housing-apply-wrap';
    const note=document.createElement('small');note.className='housing-apply-note';note.textContent='공식 청약사이트에서는 공고를 다시 선택해야 합니다.';
    const link=document.createElement('a');link.className='housing-apply-link';link.target='_blank';link.rel='noopener';
    link.href=ag==='LH'?LH_APPLY:SH_APPLY;
    link.textContent=ag==='LH'?'LH 청약플러스 열기 →':'SH 청약시스템 열기 →';
    wrap.append(note,link);
    const list=section.querySelector('ul');
    if(list)list.insertAdjacentElement('afterend',wrap);else section.append(wrap);
    return true;
  }

  if(!apply()){
    const observer=new MutationObserver(()=>{if(apply())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),10000);
  }
})();
