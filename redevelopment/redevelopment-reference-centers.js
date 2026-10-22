/* HOME-only reference positions. Never mutates engine feeds, boundary centers or geometry. */
(()=>{'use strict';
const BOUNDARY='verified_official_boundary_centroid',PLAN='official_plan_reference_centroid',ADDRESS='official_project_address_saved_reference';
// Exact reviewed records only. SHA-256 is over stable JSON, including identity and source evidence.
const approvedDigests=Object.freeze({
  "cleanup-moa1-1": "366ccd0b1f1658cf9c6d4188effdde2df9ad947ba322777560b41ba60f491a80",
  "cleanup-moa1-3": "5c6aab1c4bc4b109ea65c0e99c3903d879e45ba6637048bd4f91ac50d2a73579",
  "cleanup-moa2-1": "17bb5cb2702d361ce839c5c6a585f6b780939d0a383f6bb37d57d54aac001afd",
  "cleanup-deungchondong649": "39c1f29658a851ced2713b9ce5c9bfe2b28c947a0cd769e53c3e37597478d72e",
  "cleanup-dongsunggaro": "47915b06de1a35ed4a1f15aae90e5b5f455d8eda3407f9b803b0532fc2480600",
  "cleanup-shinan": "eca8947deab9f9d0f3c61956430035475ebd6dcd7350be45cb0163423f67f339",
  "cleanup-magoksinan": "aeaa81b8d6f93b9790db39a5ca7744578c8b78a141fe0181dc6f4f4c6c04058b",
  "cleanup-seoul-villa": "c1a3cdc858b78a243ef5c4feecd1bf61a67ef596004bd59cba9a9bd5eec9dd7a",
  "cleanup-bangwha2": "f755a661254f23a631b8924df361d7743e10fb2b10cc611fae88adc2b76d1359",
  "cleanup-yangjibilla": "f877d055b3381f9bdfd142c595dcbc1fa847b658e1eea4689b982c0526c5136c",
  "cleanup-yeomchangmuhak": "1dee8d6af9a98ec076a25074e5a343c878e35fda5d88c787e3fc7226566d547b",
  "cleanup-Deungchon": "bff21ed0730dad46bca19e2beb0bf1891d8e2f1a019ba32d31c497b102994493",
  "cleanup-daegeun01": "71424cbc76feac66ca096918a5c178c0ca38aa1429730d2d34b145ff84c2a006",
  "cleanup-Hwagok1": "5250e9784e32a8ae44a3ab3d3c3f2f68596bc780cfcb7d79c1655ac99c5ae9aa",
  "cleanup-hwagok6dong": "14149ac1ff10a834efafc9003578f8bec7ca85a8420431ff4f4c29fd6c859d5c"
});
let references=new Map(),loadPromise=null;
const own=(o,k)=>!!o&&Object.hasOwn(o,k);
const id=p=>p?.registry?.id||p?.id;
const valid=p=>Array.isArray(p)&&p.length===2&&p.every(v=>typeof v==='number'&&Number.isFinite(v))&&p[0]>=37.4&&p[0]<=37.75&&p[1]>=126.7&&p[1]<=127.25;
const official=s=>typeof s==='string'&&/^https:\/\/(urban\.seoul\.go\.kr|cleanup\.seoul\.go\.kr)\//.test(s);
const same=(a,b)=>valid(a)&&valid(b)&&a[0]===b[0]&&a[1]===b[1];
const stable=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(stable).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}';
const isReference=p=>[PLAN,ADDRESS].includes(p?.basis);
const validLegacy=c=>c?.verified===true&&c.basis===BOUNDARY&&official(c.source)&&valid(c.point);
function validRecord(r){
 if(!r||typeof r.project_id!=='string'||![PLAN,ADDRESS].includes(r.basis)||!valid(r.point)||r.geometry_verified!==false||r.coordinate_verified!==false||r.verified!==false||!official(r.source)||!official(r.identity?.catalog_source)||r.identity.project_id!==r.project_id||!/^\d{4}-\d\d-\d\dT/.test(r.reviewed_at||''))return false;
 if(r.basis===ADDRESS)return r.raw_label==='정비구역 위치'&&typeof r.official_address==='string'&&!!r.official_address&&r.official_address===r.identity.catalog_address&&r.coordinate_provenance?.basis==='approved_saved_address_cache'&&r.coordinate_provenance.coordinate_checked_at===null&&r.coordinate_provenance.cache_recorded_at==='2026-10-19T16:27:01Z'&&r.coordinate_provenance.source==='기존 강서 주소 대조 좌표 캐시 (원좌표 확인일 미보존)'&&typeof r.coordinate_provenance.exact_cache_key==='string'&&/^[a-f0-9]{64}$/.test(r.coordinate_provenance.sha256||'')&&/^[a-f0-9]{64}$/.test(r.identity.overview_sha256||'')&&r.identity.cafe_id===new URL(r.source).searchParams.get('cafeId');
 return typeof r.plan_id==='string'&&!!r.plan_id&&typeof r.record_code==='string'&&!!r.record_code&&r.source.includes('/'+r.plan_id+'/')&&r.notice_date==='2023-11-02'&&r.notice_number==='서울특별시고시 제2023-478호'&&Number.isFinite(r.published_gis_area_m2)&&Number.isFinite(r.gazette_project_area_m2)&&typeof r.limitation==='string'&&!!r.limitation;
}
async function setReferences(data){
 references=new Map();if(data?.version!==1||data.scope!=='home-reference-only'||!Array.isArray(data.records)||!globalThis.crypto?.subtle)return 0;
 const counts=new Map();for(const r of data.records)if(r?.project_id)counts.set(r.project_id,(counts.get(r.project_id)||0)+1);
 for(const input of data.records){try{const r=JSON.parse(JSON.stringify(input));if(counts.get(r.project_id)!==1||!validRecord(r)||!own(approvedDigests,r.project_id))continue;const bytes=new TextEncoder().encode(stable(r)),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');if(digest!==approvedDigests[r.project_id])continue;references.set(r.project_id,r);}catch{}}
 return references.size;
}
async function ensureLoaded(read,signal){if(!loadPromise)loadPromise=(async()=>{let timer;try{const data=await Promise.race([read('data/redevelopment-reference-centers.json',signal),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('reference timeout')),5000);})]);return await setReferences(data);}catch(e){references=new Map();if(e?.name==='AbortError'){loadPromise=null;throw e;}return 0;}finally{clearTimeout(timer);}})();return loadPromise;}
function reference(p){const r=references.get(id(p)),c=p?.registry||p;if(!r||c.id!==r.project_id||c.source!==r.identity.catalog_source||c.district!==r.identity.district||c.address!==r.identity.catalog_address||c.title!==r.identity.catalog_title)return null;return JSON.parse(JSON.stringify(r));}
function mapPoint(p,points,manifest){
 const key=id(p),has=own(points?.points,key)||own(points?.points,p?.id),pt=own(points?.points,key)?points.points[key]:points?.points?.[p?.id],meta=manifest?.[key];
 // A malformed/conflicting legacy entry must not be replaced by a reference record.
 if(has||meta?.verified===true){if(!valid(pt)||meta?.verified!==true||!official(meta.source))return null;return{lat:pt[0],lng:pt[1],basis:BOUNDARY,source:meta.source,geometry_verified:true};}
 const r=reference(p);return r?{lat:r.point[0],lng:r.point[1],basis:r.basis,source:r.source,geometry_verified:false,coordinate_verified:false,project_id:r.project_id}:null;
}
function resolveCenter(p,saved,extra){
 // Presence, not truthiness: a corrupt saved entry cannot silently fall through.
 if(saved!==undefined||extra!==undefined){if(saved!==undefined&&!validLegacy(saved)||extra!==undefined&&!validLegacy(extra))return null;if(saved!==undefined&&extra!==undefined&&(!same(saved.point,extra.point)||saved.basis!==extra.basis||saved.source!==extra.source))return null;return saved!==undefined?saved:extra;}
 return reference(p);
}
function label(point){return point?.basis===BOUNDARY?'공식 경계 중심점':point?.basis===PLAN?'공식계획도 참고 위치 · 법정 경계 미검증':point?.basis===ADDRESS?'공식 구역주소 저장 참고 위치 · 법정 경계 미검증':'지도 위치 미확인';}
function badge(point){return point?.basis===BOUNDARY?'공식경계':isReference(point)?'참고위치':'현장';}
function distanceNote(center){return center?.basis===BOUNDARY?'사업의 공식 경계 표시 중심점에서 거래 주소 좌표까지의 직선거리입니다.':center?.basis===PLAN?'공식계획도의 참고 위치에서 거래 주소 좌표까지의 직선거리입니다. 법정 사업구역 경계는 검증하지 않았습니다.':center?.basis===ADDRESS?'공식 정비구역 주소에 연결한 기존 저장 참고 위치에서 거래 주소 좌표까지의 직선거리입니다. 원좌표 조회일은 미보존이며 새 좌표 검증이나 법정 경계 검증이 아닙니다.':'거리 기준 위치를 확인할 수 없습니다.';}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function evidenceHTML(p){const r=reference(p);if(!r||!isReference(p?.map_point)||r.basis!==p.map_point.basis||!same(r.point,[p.map_point.lat,p.map_point.lng]))return '';const a=(u,t)=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" data-preserve>${esc(t)} ↗</a>`;return `<details class="location-evidence reference-evidence"><summary>참고 위치 출처·한계</summary><p>${esc(label(r))}</p><p>${esc(r.basis===ADDRESS?'공식 정비구역 위치: '+r.raw_value:r.notice_number+' · '+r.notice_date)}</p>${a(r.source,r.basis===ADDRESS?'공식 정비사업개요':'공식 고시·계획도')}<p>${esc(r.basis===ADDRESS?'정확히 일치하는 구역주소의 기존 저장좌표를 연결했습니다. 원좌표 조회일 미보존 · 캐시 보존일 2026-10-19. 신규 지오코딩·좌표 검증이 아닙니다.':r.limitation)}</p><p>근거 검토일 ${esc(r.reviewed_at.slice(0,10))} · 검토일은 좌표 조회일이나 사업 변경일이 아닙니다. 핀과 거리만 참고하며 사업구역·필지 포함 여부를 판단하지 않습니다.</p></details>`;}
window.RentRedevelopmentCenters={BOUNDARY,PLAN,ADDRESS,valid,isReference,validLegacy,setReferences,ensureLoaded,reference,mapPoint,resolveCenter,label,badge,distanceNote,evidenceHTML};
})();
