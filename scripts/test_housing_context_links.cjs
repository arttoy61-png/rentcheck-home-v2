// Read-only regression checks for notice entry context and Lab filters.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
// Fixed fixtures keep this regression independent of daily feed refreshes.
const current={items:[
 {id:'SH:seq:311754',agency:'SH',title:'유니버설하우징협동조합 입주자 모집공고',published_at:'2026-10-19',schedule_source:'unknown',schedule_type:'unknown',route:'/public-housing/notices/sh-311754/'},
 ...[1,2,3].map(n=>({id:`LH:upcoming${n}`,agency:'LH',title:`예정 모집공고 ${n}`,published_at:'2026-10-16',application_start:'2026-10-26',deadline:'2026-10-30',route:`/public-housing/notices/lh-upcoming${n}/`})),
 {id:'LH:open',agency:'LH',title:'현재 모집공고',published_at:'2026-10-10',application_start:'2026-10-08',deadline:'2026-10-22',route:'/public-housing/notices/lh-open/'},
 {id:'LH:closed',agency:'LH',title:'지난 모집공고',published_at:'2026-09-20',application_start:'2026-09-20',deadline:'2026-09-30',route:'/public-housing/notices/lh-closed/'}
]};
const routes={routes:Object.fromEntries(current.items.map(x=>[x.id,x.route]))};
const RealDate=Date;
class FixedDate extends RealDate{constructor(...args){super(...(args.length?args:['2026-10-19T17:54:00Z']));}static now(){return +new FixedDate();}}
function context(extra={}){const c={window:{},Date:FixedDate,Intl,URL,URLSearchParams,console,...extra};vm.createContext(c);vm.runInContext(read('data/housing-list-state.js'),c);return c;}
async function index(search){const box={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null},app={innerHTML:''};const c=context({location:{search},document:{querySelector:s=>s==='#app'?app:box},fetch:async url=>({ok:true,json:async()=>url.includes('routes.json')?routes:current})});const source=read('public-housing/index.html').match(/<script>\s*(\(\(\)=>\{[\s\S]*?\}\)\(\);)\s*<\/script>/)[1];vm.runInContext(source,c);await new Promise(resolve=>setImmediate(resolve));return box.innerHTML;}
(async()=>{
 const base=await index('');assert(base.includes('접수중·예정 4건'));assert(!base.includes('유니버설하우징협동조합'));
 const latest=await index('?status=all&published=2026-10-19');assert(latest.includes('유니버설하우징협동조합'));assert(latest.includes('전체 보관 공고 1건'));assert(latest.includes('모든 날짜의 공고 보기'));
 const invalid=await index('?status=__proto__');assert(invalid.includes('접수중·예정 4건'));
 assert(read('data/new-housing-alert.js').includes('?status=all&amp;published=${encodeURIComponent(pubDate)}'));
 const lab=read('lab/public-housing-fit-map/index.html');assert(lab.includes("const FEED='/public-housing/current.json'"));assert(!lab.includes('raw.githubusercontent.com'));
 const fixtures={generated_at:'2026-10-19T00:00:00Z',items:[
  {id:'LH:open',agency:'LH',title:'청년 매입임대 모집공고',application_start:'2026-10-19',deadline:'2026-10-22',open_state:'접수예정'},
  {id:'LH:closed',agency:'LH',title:'지난 매입임대 모집공고',application_start:'2026-09-20',deadline:'2026-09-30',open_state:'접수예정'},
  {id:'SH:seq:999',agency:'SH',title:'입주자 모집공고',schedule_type:'unknown',schedule_source:'unknown',open_state:'접수중'},
  {id:'SH:seq:998',agency:'SH',title:'제5차 예비 입주대상자 발표',notice_kind:'recruitment',open_state:'접수예정'},
  {id:'SH:seq:997',agency:'SH',title:'서류심사대상자 발표',notice_kind:'result',open_state:'신청대상아님'}
 ]};
 let state='active';const c=context({fetch:async()=>({ok:true,json:async()=>fixtures}),document:{querySelector:s=>s==='#state'?{value:state}:s==='#region'||s==='#type'?{value:'all'}:{textContent:''}}});
 vm.runInContext("const housing=window.RentCheckHousingList;const FEED='/public-housing/current.json';let notices=[];function render(){};function qualify(){return ['무주택']};function district(){return ''};function htype(){return ''};"+lab.split('\n').filter(x=>x.startsWith('function match(')||x.startsWith('async function load(')).join('\n'),c);
 await vm.runInContext('load()',c);assert.equal(vm.runInContext('notices.length',c),3);
 assert.equal(vm.runInContext('notices.filter(match).length',c),1);
 state='closed';assert.equal(vm.runInContext('notices.filter(match)[0].id',c),'LH:closed');
 state='unknown';assert.equal(vm.runInContext('notices.filter(match)[0].id',c),'SH:seq:999');
 state='all';assert.equal(vm.runInContext('notices.filter(match).length',c),3);
 const happy=read('public-housing/sh-happy-housing-2026-2/index.html');assert(!happy.includes('href="/tools/youth-score/"'));assert(!happy.includes('를 일정에 따로 적어둡니다.'));assert(happy.includes('후속 공지'));
 for(const id of ['sh-310629','sh-310300','shyouth-f55e60eb7f854e40f169','lh-2015122300020765']){const s=read(`public-housing/notices/${id}/index.html`);assert(s.includes('접수 마감 · 보관 공고'));assert(!s.includes('오늘은 본인 대상'));assert(!s.includes('아직 접수 전입니다.'));}
 console.log('PASS: alert destination/date filter, invalid filter, current default list, Lab normalization/result exclusion, happy-housing destination, four archived notices.');
})().catch(error=>{console.error(error);process.exitCode=1;});
