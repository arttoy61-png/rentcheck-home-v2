import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyHomeEditorial,restoreHomeEditorial} from './render-home-editorial.mjs';
const read=p=>fs.readFileSync(p,'utf8');
const config=JSON.parse(read('data/home-editorial-config.json'));
const home=read('index.html'), base=restoreHomeEditorial(home);
const enabled=applyHomeEditorial(base,{...config,enabled:true});
assert.equal(home,enabled,'Checked-in home matches the renderer');
assert.equal(enabled,applyHomeEditorial(enabled,config),'Idempotent output');
assert.equal((enabled.match(/class="feature-story"/g)||[]).length,1);
assert.equal((enabled.match(/class="topic-main"/g)||[]).length,3);
assert.equal((enabled.match(/class="guide-list"/g)||[]).length,1);
assert(enabled.includes('<h1>자주 찾는 부동산 서비스</h1>'));
assert(enabled.includes('<h2 id="catalog-title">전체 서비스</h2>'));
for(const id of ['calculators','calculatorGrid','services','searchInput','heroLive'])assert(enabled.includes('id="'+id+'"'));
for(const article of config.articles){
 const source=read(article.url.slice(1)+'index.html');
 assert(source.includes(`rel="canonical" href="https://rent-check.kr${article.url}"`));
 assert(source.match(/<main\b[\s\S]*<\/main>/)[0].replace(/<[^>]*>/g,'').length>1300,'Full original retained');
 const visible=source.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,'');
 assert(!/커밋|JSON|한 줄 답|먼저 답|지금 할 일|먼저 확인할 사실|기존 글 여러 편을 하나로/.test(visible),'Editorial scaffolding removed');
}
const escaped=applyHomeEditorial(base,{...config,articles:[{...config.articles[0],homeTitle:'<script>alert("x")</script>'}]});
assert(escaped.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
assert.throws(()=>applyHomeEditorial(base,{...config,articles:[{...config.articles[0],url:'/blog/...'}]}));
console.log('PASS: featured article, primary services, guide links, static headings, idempotence and safe copy.');
