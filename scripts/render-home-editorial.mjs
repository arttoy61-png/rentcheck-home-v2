/** Visible static columns from existing originals. Called by render-core-content.mjs only.
 * Disable data/home-editorial-config.json.enabled and rerun the existing renderer to restore.
 * No article source writes, user-agent branches, client-side content or new publishing path.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin='https://rent-check.kr';
const start='<!-- rc-static:home-editorial -->', end='<!-- /rc-static:home-editorial -->';
const styleStart='<!-- rc-static:home-editorial-style -->', styleEnd='<!-- /rc-static:home-editorial-style -->';
const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function removeBlock(html,a,b){const i=html.indexOf(a);if(i<0)return html;const j=html.indexOf(b,i);assert(j>i,'Incomplete editorial marker');return html.slice(0,i)+html.slice(j+b.length);}
export function restoreHomeEditorial(html){return removeBlock(removeBlock(html,start,end),styleStart,styleEnd);}
export function articleBody(source,url,prefix){
 const main=source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);assert(main,'Missing article main: '+url);
 let body=main[1].replace(/<!-- rc-author-profile -->[\s\S]*?<!-- \/rc-author-profile -->/g,'');
 assert(!/<(?:script|style|iframe|form)\b|\son\w+\s*=|javascript:/i.test(body),'Unexpected active article content: '+url);
 const title=body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];assert(title,'Missing article title');
 const ids=new Set([...body.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 body=body.replace(/(<\/?h)([1-5])(\b)/g,(_,a,n,b)=>a+(Number(n)+1)+b);
 body=body.replace(/\bid="([^"]+)"/g,(_,id)=>`id="${prefix}-${id}"`);
 body=body.replace(/\b(aria-labelledby|aria-describedby|headers|for)="([^"]+)"/g,(_,attr,value)=>`${attr}="${value.split(/\s+/).map(id=>ids.has(id)?prefix+'-'+id:id).join(' ')}"`);
 body=body.replace(/\b(href|src)="([^"]+)"/g,(_,attr,value)=>{
  if(value.startsWith('#')&&ids.has(value.slice(1)))return `${attr}="#${prefix}-${value.slice(1)}"`;
  const target=new URL(value.replace(/&amp;/g,'&'),origin+url);
  return `${attr}="${esc(target.origin===origin?target.pathname+target.search+target.hash:target.href)}"`;
 });
 return {title,body};
}
export function applyHomeEditorial(html,config,read=p=>fs.readFileSync(p,'utf8')){
 html=restoreHomeEditorial(html);
 if(!config.enabled)return html;
 assert(config.articles.length===4,'Exactly four editorial columns required');
 assert(new Set(config.articles.map(a=>a.url)).size===4,'Duplicate editorial originals');
 const columns=config.articles.map((article,i)=>{
  assert(/^\/blog\/[a-z0-9-]+\/$/.test(article.url),'Invalid article path');
  const source=read(article.url.slice(1)+'index.html');
  assert(source.includes(`rel="canonical" href="${origin+article.url}"`),'Original canonical must stay intact');
  const id=`home-column-${i+1}`, {body}=articleBody(source,article.url,id);
  return `<article class="home-column" id="${id}" aria-label="${esc(article.label)}"><p class="home-column-origin">칼럼 ${i+1} · <a href="${article.url}">원문 본문 보기</a></p>${body}<footer class="home-column-author"><strong>작성·운영: Rent Check 강서</strong><p>운영자가 직접 데이터 확인, 계산도구 기준 관리, 자체 분석과 가이드 편집을 맡는 독립 운영 서비스입니다.</p><a href="/about/">작성자·운영자 소개와 자료 검토 기준 →</a></footer><p class="home-column-return"><a href="#home-editorial">칼럼 목록 ↑</a> · <a href="#calculators">계산 도구 바로가기 →</a></p></article>`;
 }).join('\n');
 const content=`<section class="home-editorial" id="home-editorial" aria-labelledby="home-editorial-title"><header class="home-editorial-intro"><p class="home-editorial-kicker">RENT CHECK · 직접 읽는 부동산</p><h2 id="home-editorial-title">숫자를 비교하고, 계약 전에 확인합니다</h2><p>실거래의 층수·거래유형 비교부터 관리처분계획과 재개발 분담금까지, Rent Check의 자체 칼럼 네 편을 본문으로 읽어보세요. 과거 자료와 계산용 가정은 각 글의 기준일·출처와 함께 확인하세요.</p><nav aria-label="칼럼과 계산 도구 바로가기"><a class="home-editorial-tools" href="#calculators">계산 도구 바로가기 →</a>${config.articles.map((a,i)=>`<a href="#home-column-${i+1}">${i+1}. ${esc(a.label)}</a>`).join('')}<a href="/blog/all/">전체 자체 글 보기 →</a></nav></header>${columns}</section>`;
 assert(html.includes('<main>')&&html.includes('</head>'),'Home anchors changed');
 return html.replace('<main>','<main>'+start+content+end).replace('</head>',styleStart+'<link rel="stylesheet" href="/assets/home/editorial-columns.css">'+styleEnd+'</head>');
}
export function renderHomeEditorial(){
 const html=fs.readFileSync('index.html','utf8');
 const updated=applyHomeEditorial(html,JSON.parse(fs.readFileSync('data/home-editorial-config.json','utf8')));
 if(updated!==html)fs.writeFileSync('index.html',updated);
}
