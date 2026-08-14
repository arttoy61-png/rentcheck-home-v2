// Loads the shared incremental post feed used by both Rent Check home sites.
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
