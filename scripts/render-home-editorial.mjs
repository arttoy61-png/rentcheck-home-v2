/** Static editorial cards from existing originals, called by render-core-content.mjs.
 * Disable data/home-editorial-config.json.enabled to restore the previous homepage.
 * Article sources are read for validation and never modified by this renderer.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin='https://rent-check.kr';
const start='<!-- rc-static:home-editorial -->', end='<!-- /rc-static:home-editorial -->';
const styleStart='<!-- rc-static:home-editorial-style -->', styleEnd='<!-- /rc-static:home-editorial-style -->';
const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function removeBlock(html,a,b){const i=html.indexOf(a);if(i<0)return html;const j=html.indexOf(b,i);assert(j>i,'Incomplete editorial marker');return html.slice(0,i)+html.slice(j+b.length);}
export function restoreHomeEditorial(html){return removeBlock(removeBlock(html,start,end),styleStart,styleEnd);}
export function applyHomeEditorial(html,config,read=p=>fs.readFileSync(p,'utf8')){
 html=restoreHomeEditorial(html);
 if(!config.enabled)return html;
 assert(config.articles.length===4,'Exactly four editorial cards required');
 assert(new Set(config.articles.map(a=>a.url)).size===4,'Duplicate editorial originals');
 const cards=config.articles.map((article,i)=>{
  assert(/^\/blog\/[a-z0-9-]+\/$/.test(article.url),'Invalid article path');
  const source=read(article.url.slice(1)+'index.html');
  assert(source.includes(`rel="canonical" href="${origin+article.url}"`),'Original canonical must stay intact');
  assert(/<main\b/.test(source)&&/<h1\b/.test(source),'Missing original article');
  for(const field of ['category','title','summary'])assert(typeof article[field]==='string'&&article[field].trim(),'Missing card '+field);
  return `<a class="home-editorial-card" id="home-column-${i+1}" href="${article.url}"><div><span class="home-editorial-category">${esc(article.category)}</span><h3>${esc(article.title)}</h3><p>${esc(article.summary)}</p></div><span class="home-editorial-read">전문 읽기 <b aria-hidden="true">→</b></span></a>`;
 }).join('\n');
 const content=`<section class="home-editorial" id="home-editorial" aria-labelledby="home-editorial-title"><header class="home-editorial-intro"><div><h2 id="home-editorial-title">💡 Rent Check 실무 분석 칼럼</h2><p>국토부 실거래와 정비사업 데이터로 검증한 핵심 가이드입니다.</p></div><a class="home-editorial-all" href="/blog/all/">칼럼 전체 보기 →</a></header><div class="home-editorial-grid">${cards}</div></section>`;
 assert(html.includes('<main>')&&html.includes('</head>'),'Home anchors changed');
 return html.replace('<main>','<main>'+start+content+end).replace('</head>',styleStart+'<link rel="stylesheet" href="/assets/home/editorial-columns.css?v=20261110-cards2">'+styleEnd+'</head>');
}
export function renderHomeEditorial(){
 const html=fs.readFileSync('index.html','utf8');
 const updated=applyHomeEditorial(html,JSON.parse(fs.readFileSync('data/home-editorial-config.json','utf8')));
 if(updated!==html)fs.writeFileSync('index.html',updated);
}
