(()=>{
  async function applyStats(){
    try{
      const res=await fetch('./data/site_stats.json?v=20260820-1',{cache:'no-store'});
      if(!res.ok)return;
      const stats=await res.json();
      const post=document.getElementById('publishedCount');
      const tool=document.getElementById('availableToolCount');
      if(post&&Number.isFinite(Number(stats.published_posts)))post.textContent=String(stats.published_posts);
      if(tool&&Number.isFinite(Number(stats.available_tools)))tool.textContent=String(stats.available_tools);
    }catch(_){/* Keep the page usable even if summary stats fail to load. */}
  }

  applyStats();
  setTimeout(applyStats,1200);
})();
