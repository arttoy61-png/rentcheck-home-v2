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
      const count=document.querySelector('#publishedCount');
      if(count)count.textContent=String(publishedPosts().length);
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
    {icon:'글',title:'분석글 찾기',desc:'실거래 · 청년주택 · 재개발 분석',href:'#article-library'},
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

// Curated home analysis cards
(()=>{
  const homeInsights=[
    {
      category:'시세·실거래',
      title:'강서구 8월 실거래 월결산｜동마다 많이 거래되는 면적이 달랐습니다',
      date:'2026-09-01',
      url:'/analysis/gangseo-august-2026/',
      image:'https://images.pexels.com/photos/14452238/pexels-photo-14452238.jpeg?auto=compress&cs=tinysrgb&w=900&h=560&fit=crop',
      alt:'서울 아파트 단지 항공 전경'
    },
    {
      category:'시세·실거래',
      title:'우장산힐스테이트 실거래 분석',
      date:'2026-08-29',
      url:'/analysis/ujangsan-hillstate/',
      image:'https://images.pexels.com/photos/37323647/pexels-photo-37323647.jpeg?auto=compress&cs=tinysrgb&w=900&h=560&fit=crop',
      alt:'서울 고층 주거 건물 전경'
    },
    {
      category:'시세·실거래',
      title:'서울 아파트 거래가 많은 구와 비싼 구는 같은 곳일까?｜25개 구 실거래 비교',
      date:'2026-08-25',
      url:'/analysis/seoul-apartment-volume-price/',
      image:'https://images.pexels.com/photos/27976252/pexels-photo-27976252.jpeg?auto=compress&cs=tinysrgb&w=900&h=560&fit=crop',
      alt:'서울 한강과 아파트 주거타워 전경'
    },
    {
      category:'청년·공공주택',
      title:'청년 보편형 전세임대, 누가 신청할 수 있나요?',
      date:'2026-08-23',
      url:'/analysis/youth-universal-jeonse/',
      image:'https://images.pexels.com/photos/7578989/pexels-photo-7578989.jpeg?auto=compress&cs=tinysrgb&w=900&h=560&fit=crop',
      alt:'주택 계약 서류를 확인하는 청년'
    }
  ];
  const style=document.createElement('style');
  style.id='curatedInsightStyle';
  style.textContent=`#insightTrack{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:14px!important;overflow:visible!important;scroll-snap-type:none!important}#insightTrack .insight{display:flex!important;flex-direction:column;min-width:0!important;width:auto!important;height:100%;text-decoration:none;color:inherit;overflow:hidden}#insightTrack .insight-art{width:100%;aspect-ratio:16/10;height:auto!important;overflow:hidden;background:#eef1f5}#insightTrack .insight-art img{display:block;width:100%;height:100%;object-fit:cover}#insightTrack .insight-body{display:flex;flex:1;flex-direction:column;min-width:0}#insightTrack .insight-body h3{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;min-height:3em}#insightTrack .insight-meta{margin-top:auto}#insightTrack .insight-go{color:#1565c0;font-weight:800;white-space:nowrap}@media(max-width:900px){#insightTrack{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:520px){#insightTrack{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}#insightTrack .insight-art{aspect-ratio:4/3}#insightTrack .insight-body{padding:11px 10px!important}#insightTrack .insight-category{font-size:10px!important}#insightTrack .insight-body h3{font-size:14px!important;line-height:1.42!important;min-height:2.84em;margin:6px 0 10px!important}#insightTrack .insight-meta{font-size:10px!important;gap:5px!important;align-items:flex-start!important;flex-direction:column!important}#insightTrack .insight-go{font-size:10px!important}}`;
  document.head.appendChild(style);
  function renderCuratedInsights(){
    const track=document.querySelector('#insightTrack');if(!track)return;
    const heading=document.querySelector('#insights .section-head h2');
    const desc=document.querySelector('#insights .section-head p:not(.kicker)');
    if(heading)heading.textContent='Rent Check 자체 분석';
    if(desc)desc.textContent='검색 이슈는 질문만 가져오고, 공식자료와 Rent Check 자체 데이터로 다시 답합니다.';
    track.replaceChildren(...homeInsights.map(item=>{
      const card=document.createElement('a');card.className='insight insight-home';card.href=item.url;
      const visual=document.createElement('div');visual.className='insight-art';
      const img=document.createElement('img');img.src=item.image;img.alt=item.alt;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';visual.append(img);
      const body=document.createElement('div');body.className='insight-body';
      const cat=document.createElement('span');cat.className='insight-category';cat.textContent=item.category;
      const title=document.createElement('h3');title.textContent=item.title;
      const meta=document.createElement('div');meta.className='insight-meta';
      const date=document.createElement('span');date.textContent=item.date;
      const go=document.createElement('span');go.className='insight-go';go.textContent='글 보기 →';
      meta.append(date,go);body.append(cat,title,meta);card.append(visual,body);return card;
    }));
  }
  renderInsights=renderCuratedInsights;
  renderCuratedInsights();
})();