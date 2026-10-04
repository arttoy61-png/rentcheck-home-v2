(()=>{
  function markOwnedPublishing(){
    const section=document.getElementById('article-library');
    if(section){
      const kicker=section.querySelector('.section-head .kicker');
      const heading=section.querySelector('.section-head h2');
      const desc=section.querySelector('.section-head p:not(.kicker)');
      if(kicker)kicker.textContent='자체글';
      if(heading)heading.textContent='자체 분석·가이드';
      if(desc)desc.textContent='Rent Check가 직접 작성한 분석과 실전 가이드를 주제별로 모았습니다.';
    }
    const published=document.getElementById('publishedCount');
    const label=published?.closest('div')?.querySelector('span');
    if(label)label.textContent='자체 분석·가이드';
  }

  async function applyStats(){
    markOwnedPublishing();
    try{
      const res=await fetch('./data/site_stats.json?v=20260913-1',{cache:'no-store'});
      if(!res.ok)return;
      const stats=await res.json();
      const tool=document.getElementById('availableToolCount');
      const count=document.getElementById('publishedCount');
      if(count&&Number.isInteger(stats.home_articles))count.textContent=String(stats.home_articles);
      if(tool&&Number.isFinite(Number(stats.available_tools)))tool.textContent=String(stats.available_tools);
    }catch(_){/* Keep the page usable even if summary stats fail to load. */}
  }

  applyStats();
  setTimeout(applyStats,400);
  setTimeout(applyStats,1400);
  setTimeout(applyStats,3000);
})();
