// Loads small incremental post files after the legacy archive.
// New published posts can be maintained in posts_recent.json without rewriting posts.json.
(async()=>{
  try{
    const response=await fetch('./data/posts_recent.json',{cache:'no-cache'});
    if(!response.ok)return;
    const recent=await response.json();
    if(!Array.isArray(recent)||!recent.length)return;
    for(let i=0;i<100&&state.posts.length===0;i++)await new Promise(resolve=>setTimeout(resolve,50));
    const byUrl=new Map(state.posts.map(post=>[post.url,post]));
    recent.forEach(post=>{if(post?.url)byUrl.set(post.url,{...(byUrl.get(post.url)||{}),...post})});
    state.posts=[...byUrl.values()];
    renderInsights();
    renderArticleLibrary();
    const count=document.querySelector('#publishedCount');
    if(count)count.textContent=String(publishedPosts().length);
  }catch(_){/* Keep the legacy archive working if the incremental file is unavailable. */}
})();
