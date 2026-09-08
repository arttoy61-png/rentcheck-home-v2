/** Static-first core content. No dependencies, no API keys, no calculator formula changes.
 * Sources: existing curated cards/tool copy and a pinned public-repository snapshot.
 * Run from repository root. --content-only preserves the last analysis snapshot.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const put=(p,s)=>{if(read(p)!==s)fs.writeFileSync(p,s)};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=s=>JSON.stringify(s).replace(/</g,'\\u003c');
function capture(s,re,label){const m=s.match(re);assert(m,`Source shape changed: ${label}`);return m[1]}
function patch(s,old,value,label){if(s.includes(value))return s;assert(s.includes(old),`Missing migration anchor: ${label}`);return s.replace(old,value)}
function block(s,name,value,anchor){const start=`<!-- rc-static:${name} -->`,end=`<!-- /rc-static:${name} -->`;if(s.includes(start)){const a=s.indexOf(start),b=s.indexOf(end,a);assert(b>a);return s.slice(0,a)+start+value+end+s.slice(b+end.length)}assert(s.includes(anchor),`Missing HTML anchor: ${name}`);return s.replace(anchor,start+value+end+anchor)}
function replaceRoot(s,id,html){const re=new RegExp(`<div\\b[^>]*\\bid="${id}"[^>]*>`);const match=re.exec(s);assert(match,`Missing root ${id}`);let depth=1,end;const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=match.index+match[0].length;for(let m;(m=tags.exec(s));){depth+=m[0].startsWith('</')?-1:1;if(!depth){end=m.index;break}}assert(end!==undefined);const opening=match[0].replace(/\sdata-prerendered="[^"]*"/g,'').replace(/>$/,' data-prerendered="true">');return s.slice(0,match.index)+opening+html+s.slice(end)}
const outputs=new Map();
let loader=read('data/posts-loader.js'), app=read('app.js'), homeUI=read('data/home-analysis-ui.js');
const cards=vm.runInNewContext('('+capture(loader,/const homeInsights=([\s\S]*?);\s*const style=/,'curated cards')+')',Object.create(null),{timeout:1000});
assert(cards.length>0&&cards.every(c=>c.url.startsWith('/')));
const summaries={};
for(const c of cards){const article=read(c.url.slice(1)+'index.html');summaries[c.url]=capture(article,/<meta\s+name="description"\s+content="([^"]*)"/,'article description').replace(/&quot;/g,'"').replace(/&amp;/g,'&')}
const cardHTML=cards.map(c=>`<a class="insight insight-home" href="${esc(c.url)}"><div class="insight-art"><img src="${esc(c.image)}" alt="${esc(c.alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div><div class="insight-body"><span class="insight-category">${esc(c.category)}</span><h3>${esc(c.title)}</h3><p class="rc-insight-summary">${esc(summaries[c.url])}</p><div class="insight-meta"><span>${esc(c.date)}</span><span class="insight-go">글 보기 →</span></div></div></a>`).join('');
const feeds=['data/posts.json','data/posts_shared.json','data/posts_latest.json'];
const byURL=new Map();for(const p of feeds){if(!fs.existsSync(p))continue;const rows=JSON.parse(read(p));assert(Array.isArray(rows),p);for(const row of rows)if(row?.url)byURL.set(row.url,{...(byURL.get(row.url)||{}),...row})}
const posts=[...byURL.values()].filter(p=>p.status==='published'&&p.url);
assert(posts.length>0,'Do not replace a valid library with an empty one');
const cats=vm.runInNewContext(capture(app,/const articleCategories=(\[[^;]+\]);/,'article categories'));
const library=cats.map(cat=>{const rows=posts.filter(p=>p.category===cat&&![1,2,3].includes(p.featured_rank)).sort((a,b)=>String(b.published_at||'').localeCompare(String(a.published_at||'')));return `<section class="article-category"><div class="article-category-head"><div class="article-category-title"><h3>${esc(cat)}</h3><span class="article-count">${rows.length}편</span></div></div><div class="article-list">${rows.slice(0,3).map(p=>`<a class="article-row" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer"><span class="article-row-copy"><strong>${esc(p.title)}</strong><small>${esc(p.published_at)}</small></span><span class="article-row-arrow">→</span></a>`).join('')}</div><div class="article-actions"><a class="article-all" href="/analysis/">홈페이지 분석글 보기 →</a></div></section>`}).join('');
let home=read('index.html');
const homeDesc='국토교통부 실거래와 LH·SH 공식 공고를 그대로 나열하지 않고, 비교할 조건과 지금 할 일을 붙여 계산기·자체 분석·실전 가이드로 연결하는 Rent Check입니다.';
home=home.replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${homeDesc}">`);
home=home.replace(/<meta property="og:description" content="[^"]*">/,`<meta property="og:description" content="${homeDesc}">`);
home=home.replace(/<meta name="twitter:description" content="[^"]*">/,`<meta name="twitter:description" content="${homeDesc}">`);
home=home.replace(/"description": "대한민국 부동산 실거래 신고자료를 바탕으로 계산 도구와 분석을 제공하는 부동산 데이터 서비스입니다\."/,`"description": "국토교통부 실거래와 공식 공고를 비교·해석하고 계산 도구와 자체 분석을 제공하는 부동산 데이터 서비스입니다."`);
home=home.replace(/"description": "국토교통부 실거래 신고자료와 부동산 계산 도구를 연결하는 Rent Check입니다\."/,`"description": "국토교통부 실거래와 LH·SH 공식 공고를 비교·해석하고 계산 도구와 자체 분석으로 연결하는 Rent Check입니다."`);
home=home.replace(/<p class="hero-lead">[\s\S]*?<\/p>/,`<p class="hero-lead">실거래와 공식 공고를 그대로 옮기지 않고,<br>비교할 조건과 지금 할 일을 붙여 분석·계산으로 연결합니다.</p>`);
home=home.replace(/<div class="trust">[\s\S]*?<\/div>/,`<div class="trust"><span><i>✓</i> 국토부 신고자료 기반</span><span><i>✓</i> 공식 공고·직접 계산 연결</span></div>`);
home=home.replace('<p>계약부터 투자 판단까지, 필요한 계산을 한곳에서 확인하세요.</p>','<p>입력값을 계산하는 데서 끝내지 않고, 결과가 뜻하는 범위와 확인할 항목을 함께 안내합니다.</p>');
home=home.replace('<p>실거래와 제도를 읽는 판단 기준을 정리합니다.</p>','<p>공개자료를 다시 비교해, 무엇을 확인했고 어디까지 해석할 수 있는지 함께 적습니다.</p>');
home=home.replace('<h2>분석 글 모음</h2>','<h2>발행 글 찾아보기</h2>');
home=home.replace('<p>주제별 최신 글을 바로 찾고, 더 필요한 글은 펼쳐서 확인하세요.</p>','<p>홈 자체 분석과 네이버 발행 글을 주제별로 찾습니다. 자체 분석은 위에서 먼저 확인할 수 있습니다.</p>');
home=home.replace('국토부 실거래 데이터와 실전형 해석을 연결하는<br>부동산 계산·분석 서비스입니다.','국토부 실거래와 공식 공고를 직접 비교하고,<br>계산·분석·실전 가이드로 판단 순서를 보여줍니다.');
// Replace the approved oversized introduction, rather than hiding it or adding another section.
home=home.replace(/<!-- rc-static:value-proof -->[\s\S]*?<!-- \/rc-static:value-proof -->/g,'');
const guideStripHTML='<aside class="container rc-guide-strip" id="rc-featured-guide" aria-label="추천 실전 가이드"><a class="rc-guide-link" href="/blog/public-housing-application-documents/"><span class="rc-guide-label">추천 가이드</span><span class="rc-guide-title">SH 신청 후 서류, 언제 내나요?</span><span class="rc-guide-arrow" aria-hidden="true">→</span></a></aside>';
const guideStripCSS='.rc-guide-strip{margin-top:24px}.rc-guide-link{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;min-height:56px;padding:12px 18px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--navy);text-decoration:none}.rc-guide-label{font-size:13px;font-weight:700;line-height:1.5;color:var(--blue);white-space:nowrap}.rc-guide-title{min-width:0;margin:0;font-size:15px;font-weight:700;line-height:1.5;word-break:keep-all;overflow-wrap:anywhere}.rc-guide-arrow{font-size:18px;line-height:1;color:var(--blue)}.rc-guide-link:hover{border-color:var(--blue)}.rc-guide-link:focus-visible{outline:3px solid var(--blue);outline-offset:3px}.rc-guide-strip+.calculators{padding-top:40px}@media(max-width:768px){.rc-guide-strip{margin-top:16px}.rc-guide-link{gap:10px;padding:12px 14px}.rc-guide-label{font-size:12px}.rc-guide-title{font-size:14px;line-height:1.5}.rc-guide-strip+.calculators{padding-top:28px}}';
home=block(home,'guide-strip',guideStripHTML,'<section class="section calculators"');
home=replaceRoot(home,'insightTrack',cardHTML);home=replaceRoot(home,'articleLibrary',library);
const curatedCSS=capture(loader,/style\.textContent=`(#insightTrack[\s\S]*?)`;/,'curated CSS');
home=block(home,'home-style',`<style>${curatedCSS}.rc-insight-summary{font-size:13px;line-height:1.65;color:#596273;margin:0 0 12px}.article-actions a.article-all{text-decoration:none;display:inline-flex;align-items:center;min-height:40px}${guideStripCSS}</style>`,'</head>');
home=home.replace('<h2>최신 부동산 인사이트</h2>','<h2>Rent Check 자체 분석</h2>');
assert(home.includes(guideStripHTML)&&!home.includes('id="rentcheck-value"')&&!home.includes('rc-value-card'),'Compact guide migration failed');
assert(!home.includes('전국에서 쓰는 계산 도구'),'Unsupported trust claim still present');
// Existing runtime renderers enhance the same roots. Never clear valid static cards on a failed fetch.
app=patch(app,"track=$('#insightTrack');track.replaceChildren();","track=$('#insightTrack');if(track?.dataset.prerendered==='true')return;track.replaceChildren();",'legacy insights');
app=patch(app,'root.replaceChildren();const all=publishedPosts();',"const all=publishedPosts();if(!all.length&&root.dataset.prerendered==='true')return;root.replaceChildren();",'library fallback');
loader=patch(loader,"const track=document.querySelector('#insightTrack');if(!track)return;","const track=document.querySelector('#insightTrack');if(!track)return;if(track.dataset.prerendered==='true'&&track.querySelector('.insight-home'))return;",'curated hydration');
homeUI=patch(homeUI,"if(!homeTrack||homeTrack.querySelector('a[href=\"/blog/gangseo-home-price/\"]'))return;","if(!homeTrack||homeTrack.dataset.prerendered==='true'||homeTrack.querySelector('a[href=\"/blog/gangseo-home-price/\"]'))return;",'legacy feature replacement');
for(const name of ['app.js','data/posts-loader.js','data/home-analysis-ui.js'])home=home.replace(new RegExp(`src="${name.replaceAll('.','\\.')}(?:\\?[^\"]*)?"`),`src="${name}?v=static-first-20260908"`);
outputs.set('index.html',home);outputs.set('app.js',app);outputs.set('data/posts-loader.js',loader);outputs.set('data/home-analysis-ui.js',homeUI);
// Copy the existing guide verbatim into HTML. Its existing presence guard prevents duplication.
const common=read('tools/tool-common.js');
const guide=vm.runInNewContext('('+capture(common,/const contentGuide=([\s\S]*?);\s*const join=/,'tool copy')+')',Object.create(null),{timeout:1000})['jeonse-ratio'];
assert(guide&&guide.steps.length===3);
const guideCSS=capture(common,/style\.id='v2-content-guide-style';\s*style\.textContent='([^']*)';/,'guide CSS');
const guideHTML=`<section class="v2-content-guide" aria-labelledby="v2-content-guide-title"><p class="v2-content-guide__eyebrow">도구 사용 가이드</p><h2 id="v2-content-guide-title">${esc(guide.title)}</h2><p class="v2-content-guide__lead">${esc(guide.lead)}</p><ol>${guide.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="v2-content-guide__box v2-content-guide__example"><strong>예시</strong><br>${esc(guide.example)}</div><div class="v2-content-guide__box v2-content-guide__caution"><strong>주의할 점</strong><br>${esc(guide.caution)}</div><p class="v2-content-guide__source">${esc(guide.source)}</p><a class="v2-content-guide__link" href="../../${esc(guide.href)}">${esc(guide.link)} →</a></section>`;
let tool=read('tools/jeonse-ratio/index.html');tool=block(tool,'tool-guide',guideHTML,'</main>');tool=block(tool,'tool-style',`<style id="v2-content-guide-style">${guideCSS}</style>`,'</head>');outputs.set('tools/jeonse-ratio/index.html',tool);
if(!process.argv.includes('--content-only')){
 const sourceSHA=process.env.SOURCE_SHA;assert(/^[0-9a-f]{40}$/.test(sourceSHA||''),'A pinned public source SHA is required');
 const s=JSON.parse(read('.cache-home-stats/gangseo_apt_summary.json')),d=JSON.parse(read('.cache-home-stats/gangseo_apt_detail.json'));
 let html=read('analysis/ujangsan-hillstate/index.html');
 let core=capture(html,/<script>\s*(const TARGET='우장산힐스테이트';[\s\S]*?)<\/script>/,'analysis code');
 const oldTail=core.indexOf('Promise.all([fetch(SUM');
 if(oldTail>=0)core=core.slice(0,oldTail)+'rcStartAnalysis();\n';
 assert(core.includes('rcStartAnalysis();'));
 core=patch(core,"$('#app').innerHTML=html}","$('#app').innerHTML=html;rcRenderRecent()}",'recent rows');
 const runtime=read('scripts/analysis-snapshot-runtime.js');
 // Both pre-render and browser use the original analytical functions and formulas.
 const nodes={};const get=id=>nodes[id]??=( {innerHTML:'',textContent:'',className:'',href:'',dataset:{},setAttribute(){}} );
 const context=vm.createContext({document:{querySelector:get,getElementById:id=>get('#'+id)},console,JSON,Date,Math,Number,URLSearchParams,setTimeout,clearTimeout});
 vm.runInContext(runtime+'\n'+core.replace('rcStartAnalysis();',''),context,{timeout:2000});
 context.sourceS=s;context.sourceD=d;
 vm.runInContext('rcValidate(sourceS,sourceD);S=sourceS;D=sourceD;SM=S.complexes.find(x=>norm(x.nm)===norm(TARGET));APT=D[SM.id];band=APT.areas[0].m2;render();',context,{timeout:3000});
 // Keep only this complex and the actually selected nearby comparisons, six months of records.
 const payload=vm.runInContext(`(()=>{const ids=new Set([SM.id]);APT.areas.forEach(a=>nearbyFor(a).forEach(r=>ids.add(r.x.id)));const sd={};for(const id of ids){sd[id]={...D[id],areas:D[id].areas.map(a=>({...a,sale:rows6(a.sale,months6(S.meta.updated)),jeonse:rows6(a.jeonse,months6(S.meta.updated)),wolse:rows6(a.wolse,months6(S.meta.updated))}))}}return {summary:{meta:S.meta,generated_at:S.generated_at,complexes:S.complexes.filter(x=>ids.has(x.id))},detail:sd}})()`,context,{timeout:3000});
 payload.source_sha=sourceSHA;
 const view=nodes['#app'].innerHTML,recent=nodes['#rc-recent-records'].innerHTML;
 assert(view.includes('지금 핵심')&&recent.includes('<table'));
 html=html.replace(/<script>\s*const TARGET='우장산힐스테이트';[\s\S]*?<\/script>/,`<script>\n${core}</script>`);
 html=replaceRoot(html,'app',view).replace(/(<div\b[^>]*id="app"[^>]*)\sclass="loading"/, '$1 class=""');
 html=html.replace(/(<div\b[^>]*class=")loading("[^>]*id="app")/,'$1$2');
 html=html.replace(/(<div[^>]*id="updated"[^>]*>)[\s\S]*?(<\/div>)/,`$1${esc(vm.runInContext('rcSourceLabel(S)',context))}$2`);
 html=block(html,'recent-records',`<section id="rc-recent-records" class="panel" style="margin-top:12px">${recent}</section>`, '  <div class="links">');
 html=block(html,'snapshot',`<script type="application/json" id="rc-analysis-snapshot">${json(payload)}</script><script src="../../scripts/analysis-snapshot-runtime.js?v=20260908"></script>`,"<script>\nconst TARGET=");
 html=block(html,'snapshot-style','<style>#app[data-prerendered="true"]{text-align:initial;padding:0;color:var(--ink)}#rc-recent-records{overflow-x:auto}#rc-recent-records table{width:100%;font-size:12px}#rc-recent-records caption{text-align:left;margin:0 0 10px;font-weight:800;color:var(--navy)}#rc-recent-records .note{font-size:12px}</style>','</head>');
 outputs.set('analysis/ujangsan-hillstate/index.html',html);
 console.log(JSON.stringify({source_sha:sourceSHA,source_generated_at:s.generated_at,complexes_in_fallback:payload.summary.complexes.length,snapshot_bytes:Buffer.byteLength(json(payload)),analysis_initial_table:true}));
}
// No partial writes: calculate all target output strings before replacing files.
for(const [p,s] of outputs){assert(!s.includes('undefined</'),'Invalid generated HTML');put(p,s)}
console.log(`Static content ready: ${cards.length} owned-analysis cards, ${posts.length} published records, one calculator guide; ${outputs.size} scoped files checked.`);
