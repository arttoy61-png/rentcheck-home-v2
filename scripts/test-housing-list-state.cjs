const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const window={};
vm.runInNewContext(fs.readFileSync('data/housing-list-state.js','utf8'),{window,Intl,Date});
const api=window.RentCheckHousingList;
assert.equal(api.today(new Date('2026-10-01T14:59:59Z')),'2026-10-01');
assert.equal(api.today(new Date('2026-10-01T15:00:00Z')),'2026-10-02');
const items=[
  {application_start:'2026-10-01',deadline:'2026-10-02'},
  {application_start:'2026-10-03',deadline:'2026-10-05'},
  {deadline:'2026-09-30'},
  {open_state:'접수중'},
  {application_start:'2026-10-04',deadline:'2026-10-02'},
  {application_start:'2026-02-30',deadline:'2026-10-02'},
];
assert.deepEqual(items.map(i=>api.state(i,'2026-10-02')),['open','upcoming','closed','unknown','unknown','unknown']);
assert.equal(api.counts([]).active,0);
assert.equal(api.counts(Array(80).fill(items[0]),'2026-10-02').open,80);
assert.equal(api.counts(items,'2026-10-02').active,2);
assert.equal(api.state(items[0],'2026-10-03'),'closed');
console.log('Housing state fixtures passed: KST boundary, open/upcoming/closed/unknown, invalid/missing dates, empty and large lists.');
