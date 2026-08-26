(() => {
  const heroCopy={
    'redevelopment':{title:'재개발 자금 30초 계산기',desc:'소유주는 분담금, 매수자는 총투입금을 계산합니다.'},
    'youth-score':{title:'청년주택 점수 계산기',desc:'LH·SH 매입임대·청년안심주택 순위와 가점을 확인합니다.'},
    'rent-check':{title:'내 월세·전세, 적정한가요?',desc:'주소 주변 실거래로 내 계약 조건을 비교합니다.'},
    'apartment':{title:'강서구 아파트 실거래',desc:'동과 단지를 골라 매매·전세·월세 실거래를 확인합니다.'},
    'jeonse-ratio':{title:'전세가율 계산기',desc:'매매가에서 전세보증금이 차지하는 비율을 확인합니다.'},
    'tenant-message':{title:'전월세 문자 만들기',desc:'세입자·집주인 입장에서 상황별 문자를 만들어 바로 복사합니다.'},
    'rent-vs-monthly':{title:'전세 vs 월세 비교',desc:'두 계약의 월 부담을 같은 기준으로 비교합니다.'},
    'rent-conversion':{title:'전월세 전환 계산기',desc:'보증금을 바꿀 때 월세가 얼마나 달라지는지 계산합니다.'},
    'rent-yield':{title:'임대 수익률 계산기',desc:'매매가·보증금·월세·대출 조건으로 실투자금과 세전 현금수익률을 계산합니다.'},
    'brokerage-fee':{title:'중개보수 계산기',desc:'매매·전세·월세의 최대 중개보수를 계산합니다.'}
  };
  const join=(root,path)=>`${root}${path||''}`;

  function ensureGA(){
    if(typeof window.gtag==='function')return;
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){window.dataLayer.push(arguments)};
    window.gtag('js',new Date());
    window.gtag('config','G-MPRR3J99YQ');
    if(!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')){
      const s=document.createElement('script');
      s.async=true;
      s.src='https://www.googletagmanager.com/gtag/js?id=G-MPRR3J99YQ';
      document.head.appendChild(s);
    }
  }

  function brandText(value){
    return String(value||'').replace(/렌트체크\s*강서/gi,'Rent Check').replace(/Rent Check\s*강서/gi,'Rent Check');
  }

  function normalizeBrand(){
    document.title=brandText(document.title);
    document.querySelectorAll('meta[property="og:title"]').forEach(meta=>{meta.content=brandText(meta.content)});
    document.querySelectorAll('.brandbar').forEach(el=>{el.style.display='none'});
  }

  function ensureHeroRuntimeLock(){
    if(document.getElementById('v2-hero-runtime-lock'))return;
    const style=document.createElement('style');
    style.id='v2-hero-runtime-lock';
    style.textContent='html body.v2-tool-page .v2-normalized-hero>h1::after,html body.v2-tool-page .v2-normalized-hero>.v2-hero-description::after{content:none!important;display:none!important}html body.v2-tool-page .v2-normalized-hero>h1{font-size:28px!important;line-height:1.35!important;color:#fff!important;margin:0!important}html body.v2-tool-page .v2-normalized-hero>.v2-hero-description{display:block!important;font-size:14px!important;line-height:1.7!important;color:#d6dde6!important;margin:8px 0 0!important}@media(max-width:560px){html body.v2-tool-page .v2-normalized-hero>h1{font-size:23px!important}html body.v2-tool-page .v2-normalized-hero>.v2-hero-description{font-size:13px!important;line-height:1.65!important}}';
    document.head.appendChild(style);
  }

  function normalizeHero(body,activeTool){
    const copy=heroCopy[activeTool];
    if(!copy)return;
    const hero=body.querySelector('main .hero,main .chero,main .hd,.wrap>.hd,.wrap>header,.container>header');
    if(!hero)return;
    hero.classList.add('v2-normalized-hero');
    const brand=document.createElement('div');
    brand.className='v2-hero-brand';
    brand.textContent='Rent Check';
    const title=document.createElement('h1');
    title.textContent=copy.title;
    const desc=document.createElement('p');
    desc.className='v2-hero-description';
    desc.textContent=copy.desc;
    hero.replaceChildren(brand,title,desc);
    ensureHeroRuntimeLock();
  }

  function addDisclaimer(body,activeTool){
    if(['calculator-notice','tenant-message'].includes(activeTool)||document.querySelector('.v2-tool-disclaimer'))return;
    const main=body.querySelector('main,.wrap,.container');
    if(!main)return;
    const notice=document.createElement('p');
    notice.className='v2-tool-disclaimer';
    notice.textContent='계산 결과는 참고용입니다. 실제 적용 전 공식 기준을 확인하세요.';
    main.appendChild(notice);
  }

  function addResultNext(body,root){
    const results=[...body.querySelectorAll('.result,#result')];
    results.forEach(result=>{
      if(result.nextElementSibling?.classList?.contains('v2-result-next'))return;
      const row=document.createElement('nav');
      row.className='v2-result-next';
      row.setAttribute('aria-label','계산 후 이동');
      row.innerHTML=`<a href="${root}">홈으로</a><span>·</span><a href="${root}#calculators">다른 계산기</a>`;
      result.insertAdjacentElement('afterend',row);
      const sync=()=>{
        const cs=getComputedStyle(result);
        const visible=cs.display!=='none'&&cs.visibility!=='hidden'&&(result.classList.contains('show')||result.offsetHeight>0);
        row.classList.toggle('is-visible',visible);
      };
      new MutationObserver(sync).observe(result,{attributes:true,attributeFilter:['class','style']});
      sync();
    });
  }

  function addNumericClearButtons(body){
    if(!document.getElementById('v2-input-clear-style')){
      const style=document.createElement('style');
      style.id='v2-input-clear-style';
      style.textContent='.v2-clear-host{position:relative!important}.v2-input-clear{position:absolute;z-index:5;top:50%;right:10px;transform:translateY(-50%);width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#edf1f5;color:#52606e;font-family:inherit;font-size:20px;font-weight:500;line-height:1;display:none;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent}.v2-input-clear.is-visible{display:flex}.v2-input-clear:active{background:#dfe5ec}.v2-clear-host>input[data-v2-clear-ready="1"]{padding-right:48px!important}.v2-clear-host.v2-clear-has-unit>.v2-input-clear{right:58px}.v2-clear-host.v2-clear-has-unit>input[data-v2-clear-ready="1"]{padding-right:94px!important}';
      document.head.appendChild(style);
    }
    const selector='input[inputmode="numeric"],input[inputmode="decimal"],input[type="number"]';
    const enhance=input=>{
      if(!(input instanceof HTMLInputElement)||input.dataset.v2ClearReady==='1'||input.type==='range'||input.disabled||input.readOnly)return;
      const parent=input.parentElement;
      if(!parent)return;
      input.dataset.v2ClearReady='1';
      parent.classList.add('v2-clear-host');
      const hasUnit=[...parent.children].some(el=>el!==input&&el.tagName!=='BUTTON'&&(el.classList.contains('unit')||el.tagName==='SPAN')&&getComputedStyle(el).position==='absolute');
      if(hasUnit)parent.classList.add('v2-clear-has-unit');
      const button=document.createElement('button');
      button.type='button';
      button.className='v2-input-clear';
      button.setAttribute('aria-label','입력값 지우기');
      button.title='입력값 지우기';
      button.textContent='×';
      parent.appendChild(button);
      const sync=()=>button.classList.toggle('is-visible',String(input.value||'').trim()!=='');
      button.addEventListener('click',()=>{
        input.value='';
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.dispatchEvent(new Event('change',{bubbles:true}));
        try{input.focus({preventScroll:true})}catch(_){input.focus()}
        sync();
      });
      input.addEventListener('input',sync);
      input.addEventListener('change',sync);
      sync();
    };
    body.querySelectorAll(selector).forEach(enhance);
    const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
      if(!(node instanceof Element))return;
      if(node.matches(selector))enhance(node);
      node.querySelectorAll?.(selector).forEach(enhance);
    })));
    observer.observe(body,{childList:true,subtree:true});
  }

  function fixAnalysisLinks(){
    document.querySelectorAll('a[href$="#article-library"]').forEach(a=>{
      if((a.textContent||'').includes('분석 글'))a.setAttribute('href','https://rent-check.kr/#article-library');
    });
  }

  function initializeToolShell(){
    const body=document.body;
    if(!body)return;
    const root=body.dataset.v2Root||'../../';
    const activeTool=body.dataset.toolId||'';
    ensureGA();
    normalizeBrand();
    normalizeHero(body,activeTool);
    fixAnalysisLinks();
    addNumericClearButtons(body);

    if(!document.querySelector('.v2-toolbar')){
      const toolbar=document.createElement('header');
      toolbar.className='v2-toolbar';
      toolbar.innerHTML=`<div class="v2-toolbar__inner"><a class="v2-toolbar__home" href="${root}" aria-label="Rent Check 홈"><span class="v2-toolbar__mark" aria-hidden="true"><svg viewBox="0 0 28 28"><path d="M4 13 14 5l10 8v10H4z"></path><path d="m10 16 3 3 6-7"></path></svg></span><strong>Rent Check</strong></a><a class="v2-toolbar__tools" href="${root}#calculators">다른 도구 보기 <span aria-hidden="true">→</span></a></div>`;
      body.insertAdjacentElement('afterbegin',toolbar);
    }

    addDisclaimer(body,activeTool);
    addResultNext(body,root);

    if(!document.querySelector('.v2-tool-footer')){
      const footer=document.createElement('footer');
      footer.className='v2-tool-footer';
      footer.innerHTML=`<div class="v2-tool-footer__inner"><nav class="v2-tool-footer__simple" aria-label="사이트 안내"><a href="${join(root,'about/')}">소개</a><span>|</span><a href="${join(root,'privacy.html')}">개인정보처리방침</a><span>|</span><a href="${join(root,'contact/')}">문의</a><span>|</span><a href="${join(root,'sponsor/')}">광고/제휴</a></nav><p class="v2-tool-footer__copy">Copyright © 2026 Rent Check</p></div>`;
      body.insertAdjacentElement('beforeend',footer);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeToolShell,{once:true});
  else initializeToolShell();
})();
