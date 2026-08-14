// Loads the shared incremental post feed used by both Rent Check home sites.
// Also refreshes the homepage apartment ticker directly from the live Rent Check dataset.
(async()=>{
  try{
    const response=await fetch('./data/posts_shared.json',{cache:'no-cache'});
    if(response.ok){
      const recent=await response.json();
      if(Array.isArray(recent)&&recent.length){
        for(let i=0;i<100&&state.posts.length===0;i++)await new Promise(resolve=>setTimeout(resolve,50));
        const byUrl=new Map(state.posts.map(post=>[post.url,post]));
        recent.forEach(post=>{if(post?.url)byUrl.set(post.url,{...(byUrl.get(post.url)||{}),...post})});
        state.posts=[...byUrl.values()];
        renderInsights();
        renderArticleLibrary();
        const count=document.querySelector('#publishedCount');
        if(count)count.textContent=String(publishedPosts().length);
      }
    }
  }catch(_){/* Keep the legacy archive working if the shared feed is unavailable. */}

  try{
    const liveResponse=await fetch('https://arttoy61-png.github.io/rent-check/gangseo_apt_summary.json',{cache:'no-cache'});
    if(!liveResponse.ok)throw new Error(`HTTP ${liveResponse.status}`);
    const live=await liveResponse.json();
    const complexes=Array.isArray(live?.complexes)?live.complexes:[];
    if(!complexes.length)return;

    const dates=[];
    complexes.forEach(item=>{
      if(item?.rc?.d)dates.push(String(item.rc.d));
      if(item?.last?.date)dates.push(String(item.last.date));
    });
    const latestDate=dates.sort().at(-1)||'';

    const deals=complexes
      .filter(item=>item?.last?.date&&Number.isFinite(Number(item?.last?.amt)))
      .sort((a,b)=>String(b.last.date).localeCompare(String(a.last.date))||Number(b.last.amt)-Number(a.last.amt))
      .slice(0,3)
      .map(item=>({
        dong:item.dong,
        name:item.nm,
        area_m2:item.m2,
        amount_eok:Number(item.last.amt),
        date:item.last.date,
        complex_id:item.id
      }));

    if(deals.length)renderDealTicker({recent_deals:deals});
    if(latestDate){
      const liveEl=document.querySelector('#heroLive');
      if(liveEl){
        liveEl.textContent=`국토부 신고자료 ${formatStatDate(latestDate)} 기준 · 매일 갱신`;
        liveEl.hidden=false;
      }
    }

    const staleEl=document.querySelector('#heroStale');
    if(staleEl&&latestDate){
      const parsed=new Date(`${latestDate.replace(/\./g,'-')}T23:59:59+09:00`);
      const age=Date.now()-parsed.getTime();
      staleEl.hidden=!(Number.isFinite(age)&&age>72*60*60*1000);
    }
  }catch(_){/* app.js home_stats.json remains the fallback if the live dataset cannot be reached. */}
})();

// Blank-search guide: show three useful destinations on focus/tap.
// Once the user types, app.js takes over and renders real search results.
(()=>{
  const input=document.querySelector('#searchInput');
  const form=document.querySelector('#searchForm');
  const panel=document.querySelector('#searchResults');
  if(!input||!form||!panel)return;

  const shortcuts=[
    {icon:'계',title:'계산기 찾기',desc:'전세가율 · 중개보수 · 재개발 등',href:'#calculators'},
    {icon:'글',title:'분석글 찾기',desc:'실거래 · 청년주택 · 재개발 분석',href:'#article-library'},
    {icon:'실',title:'아파트 실거래 찾기',desc:'동 · 단지 · 평형으로 조회',href:'tools/apartment/'}
  ];

  const hidePanel=()=>{
    panel.hidden=true;
    input.setAttribute('aria-expanded','false');
    input.removeAttribute('aria-activedescendant');
  };

  const showShortcuts=()=>{
    if(input.value.trim()||state.categoryMode)return;
    state.results=[];
    state.selectedIndex=-1;
    panel.replaceChildren();

    const head=document.createElement('div');
    head.className='search-quick-head';
    head.textContent='무엇을 찾으세요?';

    const list=document.createElement('div');
    list.className='search-quick-list';
    shortcuts.forEach(item=>{
      const link=document.createElement('a');
      link.className='search-quick-item';
      link.href=item.href;
      link.setAttribute('role','option');
      link.setAttribute('aria-selected','false');

      const icon=document.createElement('span');
      icon.className='search-quick-icon';
      icon.textContent=item.icon;

      const copy=document.createElement('span');
      copy.className='search-quick-copy';
      const title=document.createElement('strong');
      title.textContent=item.title;
      const desc=document.createElement('small');
      desc.textContent=item.desc;
      copy.append(title,desc);

      const arrow=document.createElement('span');
      arrow.className='search-quick-arrow';
      arrow.textContent='→';

      link.append(icon,copy,arrow);
      link.addEventListener('click',hidePanel);
      list.append(link);
    });

    panel.append(head,list);
    panel.hidden=false;
    input.setAttribute('aria-expanded','true');
  };

  input.addEventListener('focus',showShortcuts);
  input.addEventListener('input',()=>{if(!input.value.trim())showShortcuts()});
  form.addEventListener('submit',event=>{
    if(!input.value.trim()){
      event.preventDefault();
      showShortcuts();
    }
  });
})();
