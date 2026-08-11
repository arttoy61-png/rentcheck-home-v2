// Loads small incremental post files after the legacy archive.
// Also refreshes the homepage apartment ticker directly from the live Rent Check dataset.
(async()=>{
  try{
    const response=await fetch('./data/posts_recent.json',{cache:'no-cache'});
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
  }catch(_){/* Keep the legacy archive working if the incremental file is unavailable. */}

  try{
    const liveResponse=await fetch('https://arttoy61-png.github.io/rent-check/gangseo_apt_summary.json',{cache:'no-cache'});
    if(!liveResponse.ok)throw new Error(`HTTP ${liveResponse.status}`);
    const live=await liveResponse.json();
    const complexes=Array.isArray(live?.complexes)?live.complexes:[];
    if(!complexes.length)return;

    // The displayed 기준일 follows the newest actual contract date in the live dataset,
    // not today's calendar date and not a manually edited home_stats.json value.
    const dates=[];
    complexes.forEach(item=>{
      if(item?.rc?.d)dates.push(String(item.rc.d));
      if(item?.last?.date)dates.push(String(item.last.date));
    });
    const latestDate=dates.sort().at(-1)||'';

    // Homepage ticker = three most recent apartment sale contracts from the same live source.
    const deals=complexes
      .filter(item=>item?.last?.date&&Number.isFinite(Number(item?.last?.amt)))
      .sort((a,b)=>String(b.last.date).localeCompare(String(a.last.date))||Number(b.last.amt)-Number(a.last.amt))
      .slice(0,3)
      .map(item=>({
        dong:item.dong,
        name:item.nm,
        area_m2:item.m2,
        amount_eok:Number(item.last.amt),
        date:item.last.date,
        complex_id:item.id
      }));

    if(deals.length)renderDealTicker({recent_deals:deals});
    if(latestDate){
      const liveEl=document.querySelector('#heroLive');
      if(liveEl){
        liveEl.textContent=`국토부 신고자료 ${formatStatDate(latestDate)} 기준 · 매일 갱신`;
        liveEl.hidden=false;
      }
    }

    const staleEl=document.querySelector('#heroStale');
    if(staleEl&&latestDate){
      const parsed=new Date(`${latestDate.replace(/\./g,'-')}T23:59:59+09:00`);
      const age=Date.now()-parsed.getTime();
      staleEl.hidden=!(Number.isFinite(age)&&age>72*60*60*1000);
    }
  }catch(_){/* app.js home_stats.json remains the fallback if the live dataset cannot be reached. */}
})();
