import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyHomeEditorial,restoreHomeEditorial} from './render-home-editorial.mjs';
const read=p=>fs.readFileSync(p,'utf8');
const config=JSON.parse(read('data/home-editorial-config.json'));
const home=read('index.html'), base=restoreHomeEditorial(home);
const enabled=applyHomeEditorial(base,{...config,enabled:true});
assert.equal(home,enabled,'Checked-in home matches the renderer');
assert.equal(enabled,applyHomeEditorial(enabled,{...config,enabled:true}),'Idempotent output');
assert.equal(base,applyHomeEditorial(enabled,{...config,enabled:false}),'Exact base layout restored');
assert.equal((enabled.match(/class="home-editorial-card"/g)||[]).length,4);
assert.equal((enabled.match(/class="home-editorial-read"/g)||[]).length,4);
assert(!enabled.includes('class="home-column"'),'No full article bodies on homepage');
// Hero first, quick tool chips next, then the insight cards, then the calculator grid.
const heroAt=enabled.indexOf('<section class="hero">');
const chipsAt=enabled.indexOf('<section class="container service-strip" id="services"');
const cardsAt=enabled.indexOf('id="home-column-1"');
const calcAt=enabled.indexOf('<section class="section calculators" id="calculators">');
assert(heroAt>=0&&chipsAt>heroAt,'Hero renders before the quick tool chips');
assert(cardsAt>chipsAt&&calcAt>cardsAt,'Editorial cards sit between the tool chips and the calculators');
assert.equal((enabled.match(/id="home-editorial"/g)||[]).length,1,'One editorial section only');
// One consolidated guide library holds the analysis cards, topic lists and latest posts.
const libraryAt=enabled.indexOf('id="insights"');
assert(libraryAt>calcAt,'Guide library follows the calculators');
assert(enabled.includes('📚 실전 가이드 라이브러리'),'Consolidated library heading present');
for(const marker of ['id="insightTrack"','id="articleLibrary"','id="latest-guides"','id="latestGuideGrid"']){
 assert.equal((enabled.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length,1,'Exactly one '+marker);
 assert(enabled.indexOf(marker)>libraryAt,'Inside the guide library: '+marker);
}
assert.equal((enabled.match(/class="rc-guide-strip"/g)||[]).length,2,'Two quick links inside the library');
assert(!enabled.includes('id="rc-latest-search-guide"'),'Duplicate newest-post strip removed');
assert(!enabled.includes('class="section insights"')&&!enabled.includes('class="section article-library"'),'Duplicate lower sections removed');
assert(enabled.includes('/assets/home/home-library.css'),'Library stylesheet linked');
const ids=[...enabled.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'No duplicate IDs');
for(const m of enabled.matchAll(/href="#([^"]+)"/g))assert(ids.includes(m[1]),'Missing anchor '+m[1]);
for(const id of ['calculators','calculatorGrid','services','insights','articleLibrary','searchInput','heroLive'])assert(ids.includes(id));
assert.equal((enabled.match(/<h1\b/g)||[]).length,1,'Original home H1 retained');
for(const article of config.articles){
 const source=read(article.url.slice(1)+'index.html');
 assert(source.includes(`rel="canonical" href="https://rent-check.kr${article.url}"`));
 assert(source.match(/<main\b[\s\S]*<\/main>/)[0].replace(/<[^>]*>/g,'').length>1300,'Full original retained');
 assert(enabled.includes(`href="${article.url}"`));
 for(const field of ['category','title','summary'])assert(enabled.includes(article[field]));
 const visible=source.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,'');
 assert(!/커밋|JSON|한 줄 답|먼저 답|지금 할 일|먼저 확인할 사실|기존 글 여러 편을 하나로/.test(visible),'Editorial scaffolding removed');
}
const escaped=applyHomeEditorial(base,{...config,articles:config.articles.map(a=>({...a,title:'<script>alert("x")</script>'}))});
assert(escaped.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'),'Card copy escaped');
assert.throws(()=>applyHomeEditorial(base,{...config,articles:config.articles.map(a=>({...a,url:'/blog/...'}))}));
assert.throws(()=>applyHomeEditorial(base,{...config,articles:[config.articles[0],config.articles[0],...config.articles.slice(2)]}));
console.log('PASS: four static cards, originals preserved, source links, unique IDs, retained tools, reversible layout, idempotence and escaped copy.');
