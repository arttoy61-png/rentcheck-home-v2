import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyHomeEditorial,restoreHomeEditorial,articleBody} from './render-home-editorial.mjs';
const read=p=>fs.readFileSync(p,'utf8');
const config=JSON.parse(read('data/home-editorial-config.json'));
const home=read('index.html'), base=restoreHomeEditorial(home);
const enabled=applyHomeEditorial(base,{...config,enabled:true});
assert.equal(enabled,applyHomeEditorial(enabled,{...config,enabled:true}),'Idempotent output');
assert.equal(base,applyHomeEditorial(enabled,{...config,enabled:false}),'Exact old layout restored');
assert.equal((enabled.match(/class="home-column"/g)||[]).length,4);
assert.equal((enabled.match(/class="home-column-author"/g)||[]).length,4);
assert(enabled.indexOf('id="home-column-4"')<enabled.indexOf('<section class="hero">'));
const ids=[...enabled.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'No duplicate IDs');
for(const m of enabled.matchAll(/href="#([^"]+)"/g))assert(ids.includes(m[1]),'Missing anchor '+m[1]);
for(const id of ['calculators','calculatorGrid','services','insights','articleLibrary','searchInput','heroLive'])assert(ids.includes(id));
assert.equal((enabled.match(/<h1\b/g)||[]).length,1,'Original home H1 retained');
for(let i=0;i<config.articles.length;i++){
 const {url}=config.articles[i], source=read(url.slice(1)+'index.html');
 const {body}=articleBody(source,url,`home-column-${i+1}`);
 assert(enabled.includes(body),'Full normalized original body included');
 assert(body.replace(/<[^>]*>/g,'').length>1300,'Substantive body');
 for(const m of body.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const value=m[1];assert(/^(\/|#|https?:|mailto:|tel:)/.test(value),'Relative link left '+value);
  if(value.startsWith('/')&&!value.startsWith('//')){
   const path=new URL(value,'https://rent-check.kr').pathname;
   assert(fs.existsSync('.'+path+(path.endsWith('/')?'index.html':'')),'Broken local target '+path);
  }
 }
}
const fixture='<main><h1>Test</h1><h2 id="source">Source</h2><a href="#source">Citation</a><a href="../other/">Other</a><img src="image.png"><label for="field">Label</label><div id="field" aria-labelledby="source"></div></main>';
const normalized=articleBody(fixture,'/blog/example/','col').body;
assert(normalized.includes('href="#col-source"'));
assert(normalized.includes('id="col-source"'));
assert(normalized.includes('aria-labelledby="col-source"'));
assert(normalized.includes('for="col-field"'));
assert(normalized.includes('href="/blog/other/"'));
assert(normalized.includes('src="/blog/example/image.png"'));
assert.throws(()=>articleBody('<main><h1>Unsafe</h1><script>x()</script></main>','/blog/x/','col'));
console.log('PASS: four full columns, static visibility, original links, unique IDs, heading hierarchy, author footers, exact restoration, idempotence and relative-link fixtures.');
