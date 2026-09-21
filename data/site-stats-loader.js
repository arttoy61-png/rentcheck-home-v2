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

  async function applyStats(){
    markExternalPublishing();
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
