(()=>{
  const POST_ID='publishedCount';
  const TOOL_ID='availableToolCount';
  let stats=null;
  let applying=false;

  function apply(){
    if(!stats||applying)return;
    applying=true;
    const post=document.getElementById(POST_ID);
    const tool=document.getElementById(TOOL_ID);
    if(post&&Number.isFinite(Number(stats.published_posts)))post.textContent=String(stats.published_posts);
    if(tool&&Number.isFinite(Number(stats.available_tools)))tool.textContent=String(stats.available_tools);
    applying=false;
  }

  async function load(){
    try{
      const res=await fetch('./data/site_stats.json',{cache:'no-cache'});
      if(!res.ok)return;
      stats=await res.json();
      apply();
      const targets=[document.getElementById(POST_ID),document.getElementById(TOOL_ID)].filter(Boolean);
      const observer=new MutationObserver(()=>queueMicrotask(apply));
      targets.forEach(el=>observer.observe(el,{childList:true,characterData:true,subtree:true}));
      setTimeout(apply,250);
      setTimeout(apply,1000);
    }catch(_){/* Keep calculated fallback values if manual summary stats are unavailable. */}
  }

  load();
})();
