(()=>{
  const FEED_URL='https://arttoy61-png.github.io/rent-check/public_housing_notices.json';
  const STORAGE_KEY='rentcheck:public-housing-feed-signature';
  let feed=null;
  let activeFilter='전체';
  let loadingPromise=null;

  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 20V8l6-4 6 4v12"/><path d="M9 11h6M9 15h6"/></svg>';

  function el(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }

  function signature(data){
    return (data?.items||[]).map(item=>`${item.id}:${item.content_signature||''}`).sort().join('|');
  }

  async function loadFeed(){
    if(feed)return feed;
    if(loadingPromise)return loadingPromise;
    loadingPromise=fetch(`${FEED_URL}?v=${Date.now()}`,{cache:'no-store'})
      .then(res=>{if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json();})
      .then(data=>{feed=data;updateBadge();return data;})
      .finally(()=>{loadingPromise=null;});
    return loadingPromise;
  }

  function updateBadge(){
    const badge=document.querySelector('#publicHousingNoticeBadge');
    const count=document.querySelector('#publicHousingNoticeCount');
    if(!badge||!feed)return;
    if(count)count.textContent=`${feed?.summary?.total||feed?.items?.length||0}건`;
    const current=signature(feed);
    let previous='';
    try{previous=localStorage.getItem(STORAGE_KEY)||'';}catch(_){/* ignore */}
    if(!previous){
      try{localStorage.setItem(STORAGE_KEY,current);}catch(_){/* ignore */}
      badge.hidden=true;
      return;
    }
    badge.hidden=previous===current;
  }

  function filteredItems(){
    const items=feed?.items||[];
    if(activeFilter==='전체')return items;
    if(activeFilter==='청년')return items.filter(item=>(item.audiences||[]).includes('청년'));
    if(activeFilter==='신혼·신생아')return items.filter(item=>(item.audiences||[]).some(v=>v==='신혼부부'||v==='신생아'));
    if(activeFilter==='임대주택')return items.filter(item=>(item.housing_types||[]).some(v=>v!=='주거비지원'));
    return items;
  }

  function metaText(item){
    const parts=[item.agency||item.agency_group,item.open_state];
    if(item.deadline)parts.push(`${item.deadline}까지`);
    return parts.filter(Boolean).join(' · ');
  }

  function renderList(){
    const list=document.querySelector('#publicHousingNoticeList');
    const total=document.querySelector('#publicHousingModalTotal');
    if(!list)return;
    list.replaceChildren();
    const items=filteredItems();
    if(total)total.textContent=`${items.length}건`;
    if(!items.length){
      list.append(el('p','notice-empty','해당 조건의 공고가 없습니다.'));
      return;
    }
    items.slice(0,20).forEach(item=>{
      const row=el('a','notice-row');
      row.href=item.url||'#';
      row.target='_blank';
      row.rel='noopener noreferrer';
      const top=el('div','notice-row-top');
      const meta=el('span','notice-meta',metaText(item));
      if(item.open_state==='접수중')meta.classList.add('open');
      top.append(meta);
      const title=el('strong','notice-title',String(item.title||'').replace(/^(lh|sh|공지|국민|수요)/i,''));
      const tags=el('div','notice-tags');
      [...(item.housing_types||[]),...(item.audiences||[])].slice(0,3).forEach(tag=>tags.append(el('span','',tag)));
      row.append(top,title,tags,el('span','notice-go','공식 공고 보기 →'));
      list.append(row);
    });
  }

  function ensureModal(){
    if(document.querySelector('#publicHousingModal'))return;
    const wrap=el('div','notice-modal');
    wrap.id='publicHousingModal';
    wrap.hidden=true;
    wrap.innerHTML=`<button class="notice-backdrop" type="button" aria-label="닫기"></button><section class="notice-sheet" role="dialog" aria-modal="true" aria-labelledby="publicHousingModalTitle"><header class="notice-sheet-head"><div><p>공공주거 공고 <span id="publicHousingModalTotal"></span></p><h2 id="publicHousingModalTitle">LH·SH·서울 공고</h2></div><button class="notice-close" type="button" aria-label="닫기">×</button></header><div class="notice-filter" role="tablist" aria-label="공고 필터"><button class="active" type="button" data-filter="전체">전체</button><button type="button" data-filter="청년">청년</button><button type="button" data-filter="신혼·신생아">신혼·신생아</button><button type="button" data-filter="임대주택">임대주택</button></div><div class="notice-list" id="publicHousingNoticeList"><p class="notice-empty">공고를 불러오는 중입니다.</p></div><footer>공식 기관 공고를 연결합니다. 자격과 일정은 반드시 원문에서 다시 확인하세요.</footer></section>`;
    document.body.append(wrap);
    wrap.querySelector('.notice-backdrop').addEventListener('click',closeModal);
    wrap.querySelector('.notice-close').addEventListener('click',closeModal);
    wrap.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
      activeFilter=button.dataset.filter;
      wrap.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===button));
      renderList();
    }));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!wrap.hidden)closeModal();});
  }

  async function openModal(){
    ensureModal();
    const modal=document.querySelector('#publicHousingModal');
    modal.hidden=false;
    document.body.classList.add('notice-modal-open');
    try{
      await loadFeed();
      renderList();
      try{localStorage.setItem(STORAGE_KEY,signature(feed));}catch(_){/* ignore */}
      const badge=document.querySelector('#publicHousingNoticeBadge');
      if(badge)badge.hidden=true;
    }catch(_){
      const list=document.querySelector('#publicHousingNoticeList');
      if(list)list.innerHTML='<p class="notice-empty">공고를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>';
    }
  }

  function closeModal(){
    const modal=document.querySelector('#publicHousingModal');
    if(modal)modal.hidden=true;
    document.body.classList.remove('notice-modal-open');
  }

  function buildServiceItem(){
    const button=el('button','service-item notice-service-item');
    button.type='button';
    button.id='publicHousingNoticeButton';
    button.style.setProperty('--tone','#1565c0');
    button.style.setProperty('--tint','#eef5fc');
    const iconWrap=el('span','service-icon');
    iconWrap.innerHTML=icon;
    const copy=el('span','service-copy');
    const title=el('strong','', '공공주거 공고');
    const sub=el('small','');
    sub.append(document.createTextNode('LH·SH 모집 확인 '),el('b','notice-count','—'));
    sub.querySelector('b').id='publicHousingNoticeCount';
    copy.append(title,sub);
    const arrow=el('span','service-arrow','→');
    const badge=el('span','notice-new','NEW');
    badge.id='publicHousingNoticeBadge';
    badge.hidden=true;
    button.append(iconWrap,copy,arrow,badge);
    button.addEventListener('click',openModal);
    return button;
  }

  function ensureServiceItem(){
    const services=document.querySelector('#services');
    if(!services)return false;
    services.classList.add('notice-ready');
    if(!services.querySelector('#publicHousingNoticeButton'))services.append(buildServiceItem());
    return true;
  }

  function watchServices(){
    const services=document.querySelector('#services');
    if(!services)return;
    ensureServiceItem();
    const observer=new MutationObserver(()=>{
      if(!services.querySelector('#publicHousingNoticeButton'))services.append(buildServiceItem());
    });
    observer.observe(services,{childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchServices,{once:true});
  else watchServices();
  setTimeout(()=>loadFeed().catch(()=>{}),500);
})();
