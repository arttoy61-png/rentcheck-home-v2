// Shared post feed
(async()=>{
  try{
    const responses=await Promise.all([
      fetch('./data/posts_shared.json',{cache:'no-cache'}),
      fetch('./data/posts_latest.json',{cache:'no-cache'})
    ]);
    const feeds=[];
    for(const response of responses){
      if(response.ok){
        const rows=await response.json();
        if(Array.isArray(rows))feeds.push(...rows);
      }
    }
    if(feeds.length){
      for(let i=0;i<100&&state.posts.length===0;i++)await new Promise(resolve=>setTimeout(resolve,50));
      const byUrl=new Map(state.posts.map(post=>[post.url,post]));
      feeds.forEach(post=>{if(post?.url)byUrl.set(post.url,{...(byUrl.get(post.url)||{}),...post})});
      state.posts=[...byUrl.values()];
      renderInsights();
      renderArticleLibrary();
      // Naver feeds remain available to search; HOME counts owned articles.
    }
  }catch(_){/* keep legacy archive */}
})();

// Blank-search shortcuts
(()=>{
  const input=document.querySelector('#searchInput');
  const form=document.querySelector('#searchForm');
  const panel=document.querySelector('#searchResults');
  if(!input||!form||!panel)return;
  const shortcuts=[
    {icon:'계',title:'계산기 찾기',desc:'전세가율 · 중개보수 · 재개발 등',href:'#calculators'},
    {icon:'글',title:'최신 글 보기',desc:'임대차 · 공공주택 · 재개발 최신 글',href:'#latest-guides'},
    {icon:'실',title:'아파트 실거래 찾기',desc:'동 · 단지 · 평형으로 조회',href:'tools/apartment/'}
  ];
  const hidePanel=()=>{panel.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant')};
  const showShortcuts=()=>{
    if(input.value.trim()||state.categoryMode)return;
    state.results=[];state.selectedIndex=-1;panel.replaceChildren();
    const head=document.createElement('div');head.className='search-quick-head';head.textContent='무엇을 찾으세요?';
    const list=document.createElement('div');list.className='search-quick-list';
    shortcuts.forEach(item=>{
      const link=document.createElement('a');link.className='search-quick-item';link.href=item.href;link.setAttribute('role','option');link.setAttribute('aria-selected','false');
      const icon=document.createElement('span');icon.className='search-quick-icon';icon.textContent=item.icon;
      const copy=document.createElement('span');copy.className='search-quick-copy';
      const title=document.createElement('strong');title.textContent=item.title;
      const desc=document.createElement('small');desc.textContent=item.desc;copy.append(title,desc);
      const arrow=document.createElement('span');arrow.className='search-quick-arrow';arrow.textContent='→';
      link.append(icon,copy,arrow);link.addEventListener('click',hidePanel);list.append(link);
    });
    panel.append(head,list);panel.hidden=false;input.setAttribute('aria-expanded','true');
  };
  input.addEventListener('focus',showShortcuts);
  input.addEventListener('input',()=>{if(!input.value.trim())showShortcuts()});
  form.addEventListener('submit',event=>{if(!input.value.trim()){event.preventDefault();showShortcuts()}});
})();

// Latest HOME guides: published and substantively updated pages, sorted by sitemap lastmod.
(async()=>{
  const insights=document.querySelector('#insights');
  if(!insights)return;

  document.querySelectorAll('.desktop-nav a[href="/blog/"],.mobile-nav a[href="/blog/"]').forEach(link=>{link.textContent='최신 글'});
  document.querySelectorAll('.final-cta a[href="/blog/"]').forEach(link=>{link.textContent='최신 글'});
  const searchInput=document.querySelector('#searchInput');
  const searchLabel=document.querySelector('label[for="searchInput"]');
  if(searchInput)searchInput.placeholder='계산기·부동산 글 검색';
  if(searchLabel)searchLabel.textContent='계산기·부동산 글 검색';

  // Layout for this list lives in /assets/home/home-library.css so it renders before JS runs.

  // The consolidated homepage guide library renders these rows in place; never add a second list.
  const section=document.querySelector('#latest-guides');
  const grid=document.querySelector('#latestGuideGrid');
  if(!section||!grid)return;
  document.querySelector('#rc-latest-search-guide')?.remove();
  const xmlParser=new DOMParser();

  function categoryInfo(label=''){
    if(/재개발|재건축|모아/.test(label))return{key:'redevelopment',href:'/blog/all/?category=redevelopment'};
    if(/공공|청년|LH|SH/.test(label))return{key:'public',href:'/blog/all/?category=public'};
    if(/실거래|시세/.test(label))return{key:'deal',href:'/blog/all/?category=deal'};
    if(/계약|대출/.test(label))return{key:'contract',href:'/blog/all/?category=contract'};
    return{key:'rent',href:'/blog/all/?category=rent'};
  }

  function normalizePath(href,base=location.origin){
    try{
      const url=new URL(href,base);
      return url.origin===location.origin?url.pathname:'';
    }catch(_){return''}
  }

  function renderGuides(guides){
    grid.replaceChildren();
    guides.slice(0,8).forEach(guide=>{
      const article=document.createElement('article');
      article.className='latest-guide-card';
      const tags=document.createElement('div');
      tags.className='latest-guide-tags';

      const status=document.createElement('span');
      status.className=`latest-guide-status ${guide.updated?'is-updated':'is-new'}`;
      status.textContent=guide.updated?'보강':'새 글';

      const category=document.createElement('a');
      category.className='latest-guide-category';
      category.href=categoryInfo(guide.category).href;
      category.textContent=guide.category||'부동산 가이드';

      const main=document.createElement('a');
      main.className='latest-guide-main';
      main.href=guide.path;
      const title=document.createElement('h3');
      title.textContent=guide.title;
      const summary=document.createElement('p');
      summary.textContent=guide.summary||'질문에 필요한 확인 순서와 판단 기준을 정리했습니다.';
      const meta=document.createElement('div');
      meta.className='latest-guide-meta';
      const time=document.createElement('time');
      if(guide.date)time.dateTime=guide.date;
      time.textContent=guide.date||'최근 게시';
      const go=document.createElement('span');
      go.className='latest-guide-go';
      go.textContent='글 보기 →';
      meta.append(time,go);
      main.append(title,summary,meta);
      tags.append(status,category);
      article.append(tags,main);
      grid.append(article);
    });
    if(!grid.children.length){
      const fallback=document.createElement('a');
      fallback.className='latest-guide-fallback';
      fallback.href='/blog/';
      fallback.textContent='최근 부동산 글 8편 보기 →';
      grid.append(fallback);
    }
  }

  async function fetchText(path){
    const response=await fetch(path,{cache:'no-cache'});
    if(!response.ok)throw new Error(`${path}: ${response.status}`);
    return response.text();
  }

  function findArticleSchema(doc){
    const stack=[];
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(script=>{
      try{stack.push(JSON.parse(script.textContent||'{}'));}catch(_){}
    });
    while(stack.length){
      const value=stack.shift();
      if(Array.isArray(value)){stack.push(...value);continue}
      if(!value||typeof value!=='object')continue;
      const type=value['@type'];
      if(type==='Article'||type==='BlogPosting'||(Array.isArray(type)&&type.some(item=>item==='Article'||item==='BlogPosting')))return value;
      if(Array.isArray(value['@graph']))stack.push(...value['@graph']);
    }
    return{};
  }

  async function guidesFromBlogIndex(){
    const html=await fetchText('/blog/');
    const doc=new DOMParser().parseFromString(html,'text/html');
    return [...doc.querySelectorAll('.guide-grid .guide-card')].slice(0,8).map(card=>{
      const category=(card.querySelector('small')?.textContent||'부동산 가이드').split(/\s+·\s+/)[0].trim();
      return{
        path:normalizePath(card.getAttribute('href'),new URL('/blog/',location.origin)),
        title:(card.querySelector('h2')?.textContent||'제목 없는 글').trim(),
        summary:(card.querySelector('p')?.textContent||'').trim(),
        category,
        date:'',
        updated:false
      };
    }).filter(item=>/^\/blog\/[^/]+\/$/.test(item.path)&&item.path!=='/blog/all/');
  }

  async function sitemapEntries(){
    const indexText=await fetchText('/sitemap.xml');
    const indexDoc=xmlParser.parseFromString(indexText,'application/xml');
    if(indexDoc.querySelector('parsererror'))throw new Error('sitemap index parse error');
    const childUrls=[...indexDoc.getElementsByTagName('loc')]
      .filter(node=>node.parentElement?.localName==='sitemap')
      .map(node=>normalizePath(node.textContent.trim()))
      .filter(Boolean);
    const children=await Promise.all(childUrls.map(async path=>{
      try{return xmlParser.parseFromString(await fetchText(path),'application/xml')}catch(_){return null}
    }));
    const byPath=new Map();
    children.filter(Boolean).forEach(doc=>{
      [...doc.getElementsByTagName('url')].forEach(urlNode=>{
        const parts=[...urlNode.children];
        const loc=parts.find(node=>node.localName==='loc')?.textContent?.trim()||'';
        const lastmod=(parts.find(node=>node.localName==='lastmod')?.textContent||'').trim().slice(0,10);
        const path=normalizePath(loc);
        if(!/^\/blog\/[^/]+\/$/.test(path)||path==='/blog/all/')return;
        const previous=byPath.get(path);
        if(!previous||lastmod>previous.lastmod)byPath.set(path,{path,lastmod});
      });
    });
    return[...byPath.values()].sort((a,b)=>b.lastmod.localeCompare(a.lastmod));
  }

  async function loadGuide(entry){
    const html=await fetchText(entry.path);
    const doc=new DOMParser().parseFromString(html,'text/html');
    const schema=findArticleSchema(doc);
    const published=String(schema.datePublished||'').slice(0,10);
    const modified=String(schema.dateModified||entry.lastmod||'').slice(0,10);
    const displayDate=entry.lastmod||modified||published;
    const eyebrow=(doc.querySelector('.eyebrow')?.textContent||'부동산 가이드').trim();
    const category=eyebrow.split(/\s+·\s+/)[0].trim();
    const title=(doc.querySelector('h1')?.textContent||schema.headline||doc.title.replace(/\s*\|\s*Rent Check.*$/,'')).trim();
    const summary=(doc.querySelector('meta[name="description"]')?.content||doc.querySelector('.lead')?.textContent||'').replace(/\s+/g,' ').trim();
    if(!title)return null;
    return{
      path:entry.path,
      title,
      summary,
      category,
      date:displayDate,
      updated:Boolean(published&&displayDate&&displayDate>published)
    };
  }

  try{
    const quick=await guidesFromBlogIndex();
    renderGuides(quick);
  }catch(_){
    renderGuides([]);
  }

  try{
    const entries=await sitemapEntries();
    const settled=await Promise.allSettled(entries.slice(0,14).map(loadGuide));
    const guides=settled.filter(result=>result.status==='fulfilled'&&result.value).map(result=>result.value).slice(0,8);
    if(guides.length)renderGuides(guides);
  }catch(_){/* keep the /blog/ fallback */}
})();

// Curated home analysis cards
(()=>{
  const style=document.createElement('style');
  style.id='curatedInsightStyle';
  style.textContent=`#insightTrack{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;overflow:visible!important;scroll-snap-type:none!important}#insightTrack .insight{display:flex!important;flex-direction:row!important;align-items:flex-start;gap:11px;min-width:0!important;width:auto!important;height:100%;padding:12px;border:1px solid #e1e7ee;border-radius:12px;background:#fff;text-decoration:none;color:inherit;transition:border-color .2s ease,box-shadow .2s ease}#insightTrack .insight:hover{border-color:#b9c6d6;box-shadow:0 10px 24px rgba(13,31,60,.07)}#insightTrack .insight-art{flex:none;width:64px;height:64px;border-radius:9px;overflow:hidden;background:#eef1f5}#insightTrack .insight-art img{display:block;width:100%;height:100%;object-fit:cover}#insightTrack .insight-body{display:flex;flex:1;flex-direction:column;min-width:0;padding:0}#insightTrack .insight-category{font-size:10px;font-weight:800;color:#1565c0}#insightTrack .insight-body h3{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin:3px 0 0;font-size:13px;line-height:1.45;min-height:0;letter-spacing:-.02em}#insightTrack .rc-insight-summary{display:none}#insightTrack .insight-meta{margin-top:auto;padding-top:6px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;color:#8a929e}#insightTrack .insight-go{color:#1565c0;font-weight:800;white-space:nowrap;font-size:10px}@media(max-width:1100px){#insightTrack{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:560px){#insightTrack{grid-template-columns:minmax(0,1fr)!important;gap:8px!important}#insightTrack .insight{padding:11px}#insightTrack .insight-art{width:52px;height:52px}}`;
  document.head.appendChild(style);
  function renderCuratedInsights(){window.RentCheckHomeContent?.renderInsights();}
  renderInsights=renderCuratedInsights;
  renderCuratedInsights();
})();
