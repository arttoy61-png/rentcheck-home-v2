(()=>{
  async function applyStats(){
    try{
      const res=await fetch('./data/site_stats.json?v=20260824-1',{cache:'no-store'});
      if(!res.ok)return;
      const stats=await res.json();
      const published=document.getElementById('publishedCount');
      if(published&&Number.isFinite(Number(stats.published_posts)))published.textContent=String(stats.published_posts);
      const tool=document.getElementById('availableToolCount');
      if(tool&&Number.isFinite(Number(stats.available_tools)))tool.textContent=String(stats.available_tools);
    }catch(_){/* Keep the page usable even if summary stats fail to load. */}
  }

  applyStats();
  setTimeout(applyStats,1200);
})();
