(()=>{
  function markExternalPublishing(){
    const section=document.getElementById('article-library');
    if(section){
      const kicker=section.querySelector('.section-head .kicker');
      const heading=section.querySelector('.section-head h2');
      const desc=section.querySelector('.section-head p:not(.kicker)');
      if(kicker)kicker.textContent='네이버 블로그';
      if(heading)heading.textContent='네이버 발행 글';
      if(desc)desc.textContent='Rent Check가 네이버 블로그에 발행한 글을 주제별로 모았습니다. 홈페이지 자체 분석은 위 ‘Rent Check 자체 분석’에서 확인하세요.';
    }
    const published=document.getElementById('publishedCount');
    const label=published?.closest('div')?.querySelector('span');
    if(label)label.textContent='네이버 발행 글';
  }

  function ensureVisitorStyles(){
    if(document.getElementById('rcVisitorCounterStyle'))return;
    const style=document.createElement('style');
    style.id='rcVisitorCounterStyle';
    style.textContent=`
      .stats.rc-home-stats{grid-template-columns:repeat(5,1fr)}
      .stats.rc-home-stats .rc-visitor-stat{background:#fffaf0}
      .stats.rc-home-stats .rc-visitor-stat strong{color:#0d1f3c}
      @media(max-width:768px){
        .stats.rc-home-stats{grid-template-columns:repeat(2,1fr)}
        .stats.rc-home-stats>div{border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
        .stats.rc-home-stats>div:nth-child(2n){border-right:0}
        .stats.rc-home-stats .rc-visitor-stat{grid-column:1/-1;border-right:0;border-bottom:0;display:flex;align-items:center;justify-content:space-between;gap:14px}
        .stats.rc-home-stats .rc-visitor-stat strong{margin-top:0}
      }
    `;
    document.head.appendChild(style);
  }

  function getKstDateKey(){
    try{
      const parts=new Intl.DateTimeFormat('en-US',{
        timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'
      }).formatToParts(new Date());
      const values={};
      for(const part of parts)values[part.type]=part.value;
      return `${values.year}-${values.month}-${values.day}`;
    }catch(_){
      const now=new Date(Date.now()+9*60*60*1000);
      return now.toISOString().slice(0,10);
    }
  }

  async function applyVisitorCounter(){
    const stats=document.querySelector('section.stats');
    if(!stats)return;

    ensureVisitorStyles();
    stats.classList.add('rc-home-stats');

    let visitor=stats.querySelector('.rc-visitor-stat');
    if(!visitor){
      visitor=document.createElement('div');
      visitor.className='rc-visitor-stat';
      visitor.innerHTML='<span>오늘 방문</span><strong id="todayVisitorCount">—</strong>';
      visitor.title='Rent Check 홈 방문 기준';
      stats.appendChild(visitor);
    }

    const output=visitor.querySelector('#todayVisitorCount');
    if(!output||output.dataset.loaded==='1')return;

    const day=getKstDateKey();
    const storageKey=`rc-home-visit-${day}`;
    let alreadyCounted=false;
    try{alreadyCounted=localStorage.getItem(storageKey)==='1';}catch(_){/* localStorage may be blocked. */}

    const endpoint=`https://counterapi.com/api/rent-check.kr/home-visitor/${encodeURIComponent(day)}`;
    const params=new URLSearchParams({unique:'true'});
    if(alreadyCounted)params.set('readOnly','true');

    try{
      const res=await fetch(`${endpoint}?${params.toString()}`,{cache:'no-store',mode:'cors'});
      if(!res.ok)throw new Error(`counter ${res.status}`);
      const data=await res.json();
      const value=Number(data&&data.value);
      if(!Number.isFinite(value))throw new Error('invalid counter response');
      output.textContent=`${value.toLocaleString('ko-KR')}명`;
      output.dataset.loaded='1';
      if(!alreadyCounted){
        try{localStorage.setItem(storageKey,'1');}catch(_){/* Keep the counter usable without storage. */}
      }
    }catch(_){
      output.textContent='—';
    }
  }

  async function applyStats(){
    markExternalPublishing();
    applyVisitorCounter();
    try{
      const res=await fetch('./data/site_stats.json?v=20260913-1',{cache:'no-store'});
      if(!res.ok)return;
      const stats=await res.json();
      const published=document.getElementById('publishedCount');
      const tool=document.getElementById('availableToolCount');
      if(published&&Number.isFinite(Number(stats.published_posts)))published.textContent=String(stats.published_posts);
      if(tool&&Number.isFinite(Number(stats.available_tools)))tool.textContent=String(stats.available_tools);
    }catch(_){/* Keep the page usable even if summary stats fail to load. */}
  }

  applyStats();
  setTimeout(applyStats,400);
  setTimeout(applyStats,1400);
  setTimeout(applyStats,3000);
})();
