const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const sandbox={window:{},Intl,Date,Set,Object,String,Array,URL,console};vm.runInNewContext(fs.readFileSync(path.join(root,'data/housing-list-state.js'),'utf8'),sandbox);const api=sandbox.window.RentCheckHousingList;
const plain=x=>JSON.parse(JSON.stringify(x));
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/sh-application-cases.json'),'utf8'));
const {single,rolling,unknown,result,windowed,gaps}=fixtures;
let tests=0;function test(name,fn){fn();tests++;console.log('PASS',name)}
test('deadline-only evidence preserves unpublished start time and closes exactly',()=>{
 const raw=fixtures.deadline_only,x=api.normalize(raw);
 assert.equal(x.deadline_at,'2026-10-22T15:00:00+09:00');assert.equal(x.deadline_precision,'minute');assert(!('start_at' in x));assert.equal(x.application_windows.length,0);
 assert.equal(api.displayLabel(x,'2026-10-08',new Date('2026-10-08T00:00:00+09:00')),'접수기간 · 시작시각 확인');
 assert.match(api.scheduleText(x),/15:00 마감 \(한국시간\) · 시작시각 미확인/);
 for(const [clock,expected] of [['14:59:59','open'],['15:00:00','closed'],['15:00:01','closed']])assert.equal(api.state(x,'2026-10-22',new Date('2026-10-22T'+clock+'+09:00')),expected);
 assert.equal(api.state(x,'2026-10-21',new Date('2026-10-22T16:00:00+09:00')),'open');
});
test('deadline parsing is bounded to matching official single-period evidence',()=>{
 const raw=fixtures.deadline_only;
 for(const clock of ['15시','15:30','15시 30분']){const x=plain(raw);x.schedule_evidence.excerpt=x.schedule_evidence.excerpt.replace('15시',clock);assert.equal(api.normalize(x).deadline_at.slice(11,16),clock==='15시'?'15:00':'15:30')}
 for(const excerpt of [
 '접수기간 : 2026.10.08.(목) ~2026.10.22.(목)',
 '접수기간 : 2026.10.08.(목) ~2026.10.22.(목) 24시까지',
 '접수기간 : 2026.10.08.(목) ~2026.10.22.(목) 15시60분까지',
 '접수기간 : 2026.10.08.(목) ~2026.10.23.(금) 15시까지',
 '접수기간 : 2026.10.08.(목) ~2026.10.22.(목) 15시까지 / 2차 2026.10.23~2026.10.24',
 '공고일 : 2026.10.08.(목) ~2026.10.22.(목) 15시까지']){const x=plain(raw);x.schedule_evidence.excerpt=excerpt;assert(!api.normalize(x).deadline_at,excerpt)}
 for(const change of [{schedule_source:'source_list'},{schedule_type:'unknown'},{schedule_type:'multiple'},{application_windows:windowed.application_windows},{url:'https://www.i-sh.co.kr/different-notice'}])assert(!api.normalize({...raw,...change}).deadline_at);
 const x=api.normalize({...raw,deadline_at:'2026-10-22T23:59:00+09:00',schedule_evidence:{}});assert(!x.deadline_at);assert.equal(x.deadline_precision,'date');
});
test('single verified PDF dates and evidence survive',()=>{const x=api.normalize(single);assert.equal(x.deadline,'2026-10-03');assert.deepEqual(plain(x.schedule_evidence),single.schedule_evidence);assert.match(api.scheduleText(x),/10\/2~10\/3/);assert.match(api.scheduleText(x),/마감시간 미확인/)});
test('rolling clears stale scalar and windows',()=>{const x=api.normalize(rolling);assert.equal(x.application_start,'');assert.equal(x.deadline,'');assert.equal(api.state(x,'2026-10-03'),'rolling');assert(api.matches(x,'active','2026-10-03'));assert.equal(api.counts([x],'2026-10-03').open,0);assert.match(api.displayLabel(x),/상시모집/);assert(!api.scheduleText(x).includes('11/2'));assert.match(api.scheduleText(x),/조기 마감/);assert.equal(api.deadlineDays(x).length,0)});
test('unknown never recovers old closed status or dates',()=>{const x=api.normalize(unknown);assert.equal(x.open_state,'일정 확인');assert.equal(api.state(x,'2026-10-03'),'unknown');assert.equal(x.application_windows.length,0);assert.equal(api.deadlineDays(x).length,0)});
test('results and move-in are not recruits even with recruitment title',()=>{for(const kind of ['result','move_in']){const x={...single,notice_kind:kind};assert(!api.recruitment(x));assert.equal(api.normalize(x).deadline,'');assert.equal(api.normalize(x).schedule_type,'not_applicable')}});
test('legacy source-list dates fail closed',()=>{const x=api.normalize({...single,schedule_type:undefined,schedule_source:'source_list'});assert.equal(x.deadline,'');assert.equal(api.state(x),'unknown')});
test('known collapsed ranges are guarded without windows',()=>{for(const id of ['SH:seq:310673','SH:seq:310041'])assert.equal(api.normalize({...single,id,schedule_type:undefined,schedule_source:'official_detail_html'}).deadline,'')});
test('windowed periods never retain spanning scalar range',()=>{const x=api.normalize(windowed);assert.equal(x.application_start,'');assert.equal(x.deadline,'');assert.equal(api.state(x,'2026-10-03'),'scoped');assert.equal(api.activeOn(x,'2026-10-03'),false);assert.equal(api.activeOn(x,'2026-10-06'),true);assert.equal(api.activeOn(x,'2026-10-08'),false);assert.equal(api.state(x,'2026-10-08'),'unknown');assert.match(api.displayLabel(x,'2026-10-08'),/시행 여부/)});
test('gaps and conditional-only remainder never claim open',()=>{assert.equal(api.state(gaps,'2026-10-03'),'unknown');for(const d of ['2026-10-03','2026-10-07','2026-10-08'])assert(!api.activeOn(gaps,d));assert(!api.deadlineDays(gaps).includes('2026-10-08'))});
test('all known windows ended is closed',()=>assert.equal(api.state(gaps,'2026-10-09'),'closed'));
test('bad date or missing scope flags quarantines',()=>{for(const ws of [[{start:'2026-10-02',end:'2026-10-03'}],[{start:'2026-02-30',end:'2026-10-03',conditional:false,restricted:false}]])assert.equal(api.normalize({...windowed,application_windows:ws}).schedule_type,'unknown')});
test('LH semantics are unchanged',()=>{const lh={...unknown,id:'LH:panId:123',agency:'LH'};assert.equal(api.normalize(lh),lh);assert.equal(api.state({...lh,application_start:'2026-10-01',deadline:'2026-10-02'},'2026-10-03'),'closed')});
test('KST date boundary does not depend on host timezone',()=>{assert.equal(api.today(new Date('2026-10-02T14:59:59Z')),'2026-10-02');assert.equal(api.today(new Date('2026-10-02T15:00:00Z')),'2026-10-03')});
test('known clock times are shown in KST and contradictory timestamps withheld',()=>{const w={...windowed.application_windows[0],precision:'minute',start_at:'2026-10-06T10:00:00+09:00',end_at:'2026-10-07T17:00:00+09:00'},x={...windowed,application_windows:[w]};assert.match(api.scheduleText(x),/10\/6 10:00~10\/7 17:00 \(한국시간\)/);assert.equal(api.normalize({...x,application_windows:[{...w,start_at:'2026-10-05T10:00:00+09:00'}]}).schedule_type,'unknown')});
test('restricted and conditional schedules never become ordinary open count',()=>{const x={...windowed,application_windows:windowed.application_windows.map(w=>({...w,restricted:true}))};assert.equal(api.state(x,'2026-10-06'),'scoped');assert(api.matches(x,'active','2026-10-06'));assert.equal(api.counts([x],'2026-10-06').open,0);assert(!api.activeOn(x,'2026-10-06'))});
test('SH aliases, agency and official hostname cannot bypass quarantine',()=>{for(const x of [{...unknown,id:'SHYOUTH:alias'},{...unknown,id:'other',agency:'SH'},{...unknown,id:'other',agency:'',url:'https://www.i-sh.co.kr/main/view.do'}]){assert(api.isSH(x));assert.equal(api.normalize(x).deadline,'')}assert(!api.isSH({id:'LH:123',agency:'LH',url:'https://www.i-sh.co.kr.evil.example/view'}))});
test('legacy alias of known multi-window notice cannot retain envelope',()=>{const x={...single,id:'SHYOUTH:alias',title:'신정도시마을 잔여세대 입주자 모집',schedule_type:undefined,schedule_source:'official_detail_html',url:'https://www.i-sh.co.kr/main/view.do?seq=310673'};assert.equal(api.normalize(x).schedule_type,'unknown');assert.equal(api.normalize(x).deadline,'')});
test('minute windows close at exact KST endpoint on current day',()=>{const x={...windowed,application_windows:[{...windowed.application_windows[0],precision:'minute',start_at:'2026-10-06T10:00:00+09:00',end_at:'2026-10-07T17:00:00+09:00',restricted:true}]};assert.equal(api.state(x,'2026-10-07',new Date('2026-10-07T16:59:59+09:00')),'scoped');assert.equal(api.state(x,'2026-10-07',new Date('2026-10-07T17:00:00+09:00')),'closed')});
test('normalization is idempotent',()=>{for(const item of Object.values(fixtures))assert.deepEqual(plain(api.normalize(api.normalize(item))),plain(api.normalize(item)))});
function baseContext(){return {window:{RentCheckHousingList:api},document:{readyState:'loading',addEventListener(){},querySelector(){return null},dispatchEvent(){}},setTimeout(){},Intl,Date,Set,Map,URLSearchParams,location:{search:'',pathname:'/'},CustomEvent:function(){},localStorage:{getItem(){return null},setItem(){}},console}}
let popup=fs.readFileSync(path.join(root,'data/public-housing-popup.js'),'utf8');popup=popup.replace('  if(document.readyState',`  window.__test={collectionStatus,loadFeed,isApplicationOpenOn,isDeadlineOn,selectedDateLabel,metaText,nearestDeadline,setFeed:x=>{feed=x},setDate:x=>{activeDate=x}};\n  if(document.readyState`);
const ctx=baseContext();ctx.fetch=async()=>{throw Error('test fetch not set')};vm.runInNewContext(popup,ctx);const p=ctx.window.__test;
test('popup deadline label and metadata agree on explicit endpoint',()=>{p.setDate('2026-10-22');assert.equal(p.selectedDateLabel(fixtures.deadline_only),'접수마감일 · 15:00 (한국시간)');assert.match(p.metaText(fixtures.deadline_only),/15:00/)});
test('next deadline excludes the evidenced endpoint once it closes',()=>{p.setFeed({items:[fixtures.deadline_only]});assert.equal(p.nearestDeadline(new Date('2026-10-22T14:59:59+09:00')).item.id,fixtures.deadline_only.id);assert.equal(p.nearestDeadline(new Date('2026-10-22T15:00:00+09:00')),null);assert.equal(p.nearestDeadline(new Date('2026-10-22T15:00:01+09:00')),null);p.setFeed(null)});
test('popup calendar scoped across gaps and conditional dates',()=>{assert(!p.isApplicationOpenOn(gaps,'2026-10-04'));assert(!p.isDeadlineOn(gaps,'2026-10-08'));assert(p.isApplicationOpenOn(single,'2026-10-03'));p.setDate('2026-10-03');assert.equal(p.selectedDateLabel(single),'접수마감일 · 시간 확인');assert.match(p.metaText(rolling),/상시모집/)});
let index=fs.readFileSync(path.join(root,'public-housing/index.html'),'utf8').replace(/\r\n/g,'\n').split('<script>\n(()=>{')[1].split('</script>')[0];index='(()=>{'+index.slice(0,index.indexOf('  if(requestedId)'))+'window.__test={loadItems,scheduleText,status};})();';const ix=baseContext();ix.fetch=async()=>({ok:true,json:async()=>({items:[]})});vm.runInNewContext(index,ix);
let alert=fs.readFileSync(path.join(root,'data/new-housing-alert.js'),'utf8').replace(/\r\n/g,'\n').split('\n})();')[0]+'\nwindow.__test={applicationText,isRecruitmentNotice};})();';const al=baseContext();vm.runInNewContext(alert,al);
test('index and alert agree on rolling and precise dates',()=>{assert.equal(ix.window.__test.scheduleText(rolling),api.scheduleText(rolling));assert.equal(al.window.__test.applicationText(single),api.scheduleText(single));assert(!al.window.__test.isRecruitmentNotice(result))});
const displayFixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/housing-display-regressions.json'),'utf8'));
const direct=displayFixture.items.find(x=>x.id==='SH:seq:310653'),alias=displayFixture.items.find(x=>x.id.startsWith('SHYOUTH:'));
test('strong SH alias identity preserves preferred detail and known publication date in both orders',()=>{
 for(const items of [[direct,alias],[alias,direct]]){const before=plain(items),result=api.dedupeShAliases(items);assert.equal(result.length,1);assert.deepEqual(plain(result[0]),{...direct,published_at:alias.published_at});assert.deepEqual(items,before);assert.deepEqual(plain(api.dedupeShAliases(result)),plain(result))}
});
test('SH alias guard preserves different date, schedule, type, correction and ambiguous sequence IDs',()=>{
 for(const change of [{published_at:'2026-09-29'},{application_start:'2026-10-14'},{deadline:'2026-10-16'},{schedule_type:'rolling'},{title:alias.title.replace('Ⅱ','Ⅰ')},{title:'[정정공고]'+alias.title}])assert.equal(api.dedupeShAliases([direct,{...alias,...change}]).length,2);
 const other={...direct,id:'SH:seq:999999',url:direct.url.replace('310653','999999'),official_url:direct.official_url.replace('310653','999999')};assert.equal(api.dedupeShAliases([direct,other,alias]).length,3);
 const lh={...alias,id:'LH:panId:123',agency:'LH',agency_group:'LH'};assert.equal(api.dedupeShAliases([lh,direct]).length,2);
});
test('nested source status distinguishes partial HTML recovery from complete failure',()=>{
 const text=p.collectionStatus(displayFixture.source_status);assert.match(text,/LH 부분수집/);assert.match(text,/API 403 오류/);assert.match(text,/공식 HTML 대체 수집 8건\(중복 정리 전\)/);assert.match(text,/이전 자료 유지 7건/);assert.match(text,/SH 수집 18건/);assert(!text.includes('미제공'));assert(!text.includes('실패'));
 assert.match(p.collectionStatus({LH:{count:0,errors:['HTTP 403']}}),/LH 수집 오류/);
 assert(!p.collectionStatus({LH:{count:0,errors:['HTTP 403']}}).includes('대체 수집'));
 assert.match(p.collectionStatus({LH:{count:0,errors:[]}}),/LH 수집 0건/);
 for(const value of [null,{},[],{TOTAL:{count:1}}])assert.equal(p.collectionStatus(value),'수집 상태 미제공');
});
(async()=>{
 for(const altered of [
  {...alias,title:'[정정공고]'+alias.title},
  {...alias,deadline:'2026-10-16'},
  {...direct,id:'SH:seq:999999',url:direct.url.replace('310653','999999'),official_url:direct.official_url.replace('310653','999999')}
 ]){
  const records=[direct,altered,alias],expected=altered.id.startsWith('SH:seq:')?3:2;
  // Use a distinct ID for a different corrected/scheduled announcement.
  if(altered.id===alias.id)altered.id+='-different';
  for(const fallback of [false,true]){
   const c=baseContext();c.fetch=async url=>({ok:!fallback||!url.startsWith('/public-housing/current'),status:503,json:async()=>({items:records})});vm.runInNewContext(popup,c);
   const i=baseContext();i.fetch=c.fetch;vm.runInNewContext(index,i);
   assert.equal((await c.window.__test.loadFeed()).items.length,expected);
   assert.equal((await i.window.__test.loadItems()).length,expected);
  }
 }
 test('primary and raw fallback preserve ambiguous, corrected and different-schedule SH announcements',()=>{});
 for(const fallback of [false,true]){
  const make=()=>{const c=baseContext();c.fetch=async url=>({ok:!fallback||!url.startsWith('/public-housing/current'),status:503,json:async()=>plain(displayFixture)});return c};
  const c=make();vm.runInNewContext(popup,c);const result=await c.window.__test.loadFeed();
  const i=make();vm.runInNewContext(index,i);const indexed=await i.window.__test.loadItems();
  test((fallback?'fallback':'primary')+' popup and index dedupe the same actual records without losing source status',()=>{assert.equal(result.items.length,2);assert.equal(indexed.length,2);assert.equal(result.items.find(x=>x.id===direct.id).published_at,alias.published_at);assert.equal(indexed.find(x=>x.id===direct.id).published_at,alias.published_at);assert.deepEqual(plain(result.source_status),displayFixture.source_status);assert.equal(result.items.find(x=>x.id==='SH:seq:311087').deadline_at,'2026-10-22T15:00:00+09:00')});
 }
 let requests=[];ctx.fetch=async url=>{requests.push(url);return {ok:true,json:async()=>({items:[single,rolling,unknown,result]})}};
 const feed=await p.loadFeed();test('popup primary normalizes and filters',()=>{assert.equal(feed.items.length,3);assert.equal(feed.items.find(x=>x.id===rolling.id).deadline,'');assert.equal(feed.items.find(x=>x.id===unknown.id).open_state,'일정 확인')});
 const fb=baseContext();fb.fetch=async url=>({ok:!url.startsWith('/public-housing/current'),status:500,json:async()=>({items:[single,rolling,result]})});vm.runInNewContext(popup,fb);const fallback=await fb.window.__test.loadFeed();test('raw popup fallback honors the same SH contract',()=>{assert.equal(fallback.items.length,2);assert.equal(fallback.items.find(x=>x.id===rolling.id).deadline,'')});
 const empty=await ix.window.__test.loadItems();test('primary empty index is authoritative, never stale fallback',()=>assert.equal(empty.length,0));
 console.log(`${tests} tests passed`);
})().catch(e=>{console.error(e);process.exitCode=1});
