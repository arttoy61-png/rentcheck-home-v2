(()=>{
  const grid=document.querySelector('.guide-grid');
  if(!grid)return;

  const parser=new DOMParser();

  function normalizePath(href){
    try{
      const url=new URL(href,location.origin);
      return url.origin===location.origin?url.pathname:'';
    }catch(_){return''}
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

  async function sitemapEntries(){
    const indexDoc=parser.parseFromString(await fetchText('/sitemap.xml'),'application/xml');
    if(indexDoc.querySelector('parsererror'))throw new Error('sitemap index parse error');
    const childPaths=[...indexDoc.getElementsByTagName('loc')]
      .filter(node=>node.parentElement?.localName==='sitemap')
      .map(node=>normalizePath(node.textContent.trim()))
      .filter(Boolean);
    const children=await Promise.all(childPaths.map(async path=>{
      try{return parser.parseFromString(await fetchText(path),'application/xml')}catch(_){return null}
    }));
    const byPath=new Map();
    children.filter(Boolean).forEach(doc=>{
      [...doc.getElementsByTagName('url')].forEach(urlNode=>{
        const parts=[...urlNode.children];
        const path=normalizePath(parts.find(node=>node.localName==='loc')?.textContent?.trim()||'');
        const lastmod=(parts.find(node=>node.localName==='lastmod')?.textContent||'').trim().slice(0,10);
        if(!/^\/blog\/[^/]+\/$/.test(path)||path==='/blog/all/')return;
        const previous=byPath.get(path);
        if(!previous||lastmod>previous.lastmod)byPath.set(path,{path,lastmod});
      });
    });
    return[...byPath.values()].sort((a,b)=>b.lastmod.localeCompare(a.lastmod));
  }

  async function loadGuide(entry){
    const doc=new DOMParser().parseFromString(await fetchText(entry.path),'text/html');
    const schema=findArticleSchema(doc);
    const published=String(schema.datePublished||'').slice(0,10);
    const modified=String(schema.dateModified||entry.lastmod||'').slice(0,10);
    const date=entry.lastmod||modified||published;
    const eyebrow=(doc.querySelector('.eyebrow')?.textContent||'부동산 가이드').trim();
    const category=eyebrow.split(/\s+·\s+/)[0].trim();
    const title=(doc.querySelector('h1')?.textContent||schema.headline||doc.title.replace(/\s*\|\s*Rent Check.*$/,'')).trim();
    const summary=(doc.querySelector('meta[name="description"]')?.content||doc.querySelector('.lead')?.textContent||'').replace(/\s+/g,' ').trim();
    if(!title)return null;
    return{path:entry.path,title,summary,category,date,updated:Boolean(published&&date&&date>published)};
  }

  function render(guides){
    if(!guides.length)return;
    grid.replaceChildren();
    guides.slice(0,8).forEach(guide=>{
      const link=document.createElement('a');
      link.className='guide-card';
      link.href=guide.path;
      const small=document.createElement('small');
      small.textContent=`${guide.updated?'보강':'새 글'} · ${guide.category||'부동산 가이드'}`;
      const title=document.createElement('h2');
      title.textContent=guide.title;
      const summary=document.createElement('p');
      summary.textContent=guide.summary||'질문에 필요한 확인 순서와 판단 기준을 정리했습니다.';
      const go=document.createElement('span');
      go.className='go';
      go.textContent=`${guide.date||'최근 게시'} · 글 보기 →`;
      link.append(small,title,summary,go);
      grid.append(link);
    });
  }

  (async()=>{
    try{
      const entries=await sitemapEntries();
      const settled=await Promise.allSettled(entries.slice(0,14).map(loadGuide));
      const guides=settled.filter(result=>result.status==='fulfilled'&&result.value).map(result=>result.value).slice(0,8);
      render(guides);
    }catch(_){/* keep the prerendered latest-published list */}
  })();
})();
