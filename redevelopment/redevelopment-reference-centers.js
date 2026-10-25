/* HOME-only reference positions. Never mutates engine feeds, boundary centers or geometry. */
(()=>{'use strict';
const BOUNDARY='verified_official_boundary_centroid',PLAN='official_plan_reference_centroid',ADDRESS='official_project_address_saved_reference',REPRESENTATIVE='official_representative_address_saved_coordinate',OVERVIEW='official_overview_address_saved_coordinate',AREA='official_area_reference_point';
// Exact reviewed records only. SHA-256 is over stable JSON, including identity and source evidence.
const approvedDigests=Object.freeze({
  "cleanup-samikpark": "9bed30c8bc8f89bbbbe9804fdb3502fd6e86c8c23f5a298884e136860e24c745",
  "cleanup-yuwon2": "b27d3c1cbf4d35d23eccffa9d8482c763dc1019bb643ccdf0f9cadc642d17649",
  "cleanup-geoyeo21": "71ab75b081c0459b6292518d12c9d42482c6219d263d577d757d5fe5b901cfda",
  "cleanup-sg1apt": "887935f31a847e0bd35b8fec9cd968f4eb4ec65347b4578fc22f88c468e54e99",
  "cleanup-DrWK0XGO": "783b930973d21b89a266ced311485074b9df766d6179e6dbb08055b788707ef8",
  "cleanup-gG49z9y6": "b261f03af1ac0094276eb41fb9e3a0deaa25e9e0603935f73371b9763ce2b865",
  "cleanup-gaepo6_7": "2f8301689d0e7b54d148f02e8ed5f99a73c3448dc937be0c0695c3e886d3bbba",
  "cleanup-apgujeong5": "c0fcc93fc4d29ef4a4bcd4343e51360d187be0429cbf2db13cc4fc507c98c39f",
  "cleanup-samikgreen2": "c8e563195c1e14bec2e3968c5e1150f611eb1e47d502a1ac696cf0a0ee53555d",
  "cleanup-goduknine": "3c3323dde533660f5c42cd50ee6cbf543a9f5a0ef491793d5aa2bbcac2d3d5f4",
  "cleanup-gangdong2": "a9cf7ee85491fad3d2b89861691cc61ce6d194c8f56ea6a1b3ae56c505e80ca6",
  "cleanup-j8x94HV2": "e1af0e87502f622e5c0dd7c485f53e3769a8bc109fe28068f2a073dfc3d70f1f",
  "cleanup-Y2lf3ybg": "465197565c15118f8b494b047755837bae62f6c479ee22685533d4989ea3dd14",
  "cleanup-banghwadonghanmi": "b5fef2a0666cf0bd3b4662dc4b1e00c58b47756c0226859fe942278b463f3759",
  "cleanup-seoulvilla": "68afd327b20d971d7192f42afc2cab3136f8feafcc967aade369cb8de445f6b0",
  "cleanup-yc2761": "55bf310177f12d04657b462ca9014c0f7c3229b7af1113308fc5c4b0b24b1602",
  "cleanup-hwagok2-4": "16e4d66aeccf5158db1d539ed4f9ff453adeae4e54701706afe8a52b2be9a435",
  "cleanup-boseongyeonrib": "33eae5249bca70afc9f5573cd43de04093b32c85b30acbedfe277696aad064cb",
  "cleanup-hwagok_a1": "aa8b6cef99981fee409646b326085a095ff5e254e32b6b52c7cdfe5ff8e5bd61",
  "cleanup-XQq5uTwf": "9832fd83338e503da641bb94d3784a46112325fd4ea5cdca6b703ec39fd3814b",
  "cleanup-biwonhyundai": "90d3b00ce943f17cb0288b82712a205cfee96d80f65d9bb38ccdb3e70d578d15",
  "cleanup-kukdong-reborn": "75f50046f31a02001f9b6afc1f1baa30b7eef3dabdb0048beee21cf22c08bdfa",
  "cleanup-sgboramapt": "a0713737e8813faf0604b69eb41d7ddaff3f3184ecd88b5ce1fb173b6aaf9f82",
  "cleanup-sanggye6apt": "e26ee7d8cb680e1fce520005fa94fad1fa63711e749ae090ebed64eced516543",
  "cleanup-mms0612": "497ff4b1e0790b515232acf607935de14a1e7ff0de48c4dc0c85856d58592051",
  "cleanup-jggreen": "3dd1aedd800d9a9c4ed5a364ba7f25c445a01cdc5daf2393a99a2e3171e2af7a",
  "cleanup-hgjangmi": "e3a84a0b2578c5aeb9afc6bec7c787afa00f03c74d84b5ef6f6398e94f9d43aa",
  "cleanup-Changdong18": "d95dad5d4510752899809be3e46c3f8d5becebaa1a6332d19f6751d6daa6c4ee",
  "cleanup-sanga1apt": "d425325ab033de1ee90524c02c55255d66d5f0c07b8c37a748155b3f3077888d",
  "cleanup-changdong04": "0953a1dbee49583f0eac88d0e17563b9f407cb98b1fd92a07f19ed1fc12d9ea8",
  "cleanup-musoemak": "15c4662f2467327873d9a3135b4f7b190d3cbe61bf43f09b29340a9d9446142e",
  "cleanup-sinbanpo15": "248eb29a29717049c7a858f69c959caa1eeb304dce402f4ca90f6ad2fd307fff",
  "cleanup-sinbanpo2": "e57c27f43149e8f7b852f480e11d890bea6d99018208b52ed20acf0ed947a44e",
  "cleanup-grss1rm": "95c12aac3da8bb8e1f313219b0064f66fb4b4a89a58744960fa97af8c7dfc3bc",
  "cleanup-siyoung-apt": "6951127885c6f987121320bc18471a3e266942f9f1a45c19739d008162bae64f",
  "cleanup-OlympicFamilyTown": "673548e2e8354263b4a019b7ed8d9e57c78c614f0b6a0ec41a7094ae107948c4",
  "cleanup-olympicapt": "583b9f0e3d6be0507d79cbe2001c08c225739f2ae4acee1aa330ea363e9b198a",
  "cleanup-jmapt1": "41f5949c17e7894471ba29a5384ea5df336de60773d08d058bd57d7240ac24e7",
  "cleanup-jamsil5apt": "c44d99f5bde90725e2639943bf8cd0f5f2101b188025663bee762e19a6298033",
  "cleanup-mokdong1": "7d82150aef6995d3b33b5a45a8d9ec9d3ea73768f3a10e3e776bcd6830abc6f4",
  "cleanup-mokdong2": "3a913b1ab7bce1791b6b0b621ed14a665afc8b191273018162ac1b0aa9bc2e89",
  "cleanup-mokdong3": "82cb6dc8a99502037504eaf4d8ddeaa0ab2851ac36e0cba64b1f644304e67230",
  "cleanup-mokdong4": "0759d62da607cb36dc47d9e4f0f3d14ee837b06f4d3d6e368b59bd22242995db",
  "cleanup-mokdong5": "a72beeb567385ae881d91af6ab01c18139ad3e4a956e06f9089040d4c496edc6",
  "cleanup-mokdong7": "887b5ce0c9efeefd895005bb3bff71b47a8527e2f844974c3aad1e9c8b925874",
  "cleanup-siyoungapt": "ac423e724b2d84aa12c7763252b74bb408f7b20df64da492cf6e76e6f2059de5",
  "cleanup-mokdong10": "d63fb46150a177e59a133a5d730ef6422d9b6f6582178a07b21547352ffdb090",
  "cleanup-mokdong9": "bd792c850d2eef8740a459ae043f680414b69d7e80176ac19f728ef064b3f537",
  "cleanup-mokdong8": "26920781e2ad3bc59a74dc2dbe7d13626794b1090235e9381482640b6b6899fc",
  "cleanup-mokdong11": "1bef80d368ece32eb82125976f5b74a855d000dd3562b5dbd10a54e253f4e0f0",
  "cleanup-mokdong12": "ec16533e67bbb48e3aa745ec87fb7b79d73151b5e753b1cf82efa2453c17ec91",
  "cleanup-mokdong14": "810bbd697c1c8c884cf33dc6219153953bfbe6eb2ef3ddf89112991cbb49e894",
  "cleanup-Rd564j6j": "b80cd45a5f33b50e081b77b2afdee38ca4d2c57b5c82d1a3d1edc973fd78e3d4",
  "cleanup-sindonga85": "ad9f9ba5ff8041ed47ef94ecf8d5dc9b7fbd45e2348dc74f025f0c5f79979ebb",
  "cleanup-gangchon1001": "f9bfa9e0114e63ba13de0a08c3a7db1a43f6d56e42b0d9988119e6fab00725e8",
  "cleanup-BulgwangMiseong": "841073a7aaab562262713fb5005ae946296f0e63930c6f9b925339b5400a82ff",
  "cleanup-namtaremodel": "f77c90da1b1c821399fca45dcad7b118c47d0fd2f919a7c9ef5ff108508e0315",
  "moa-urban-8786": "954a1264e5093c22fe0881b26c047a7b80074e1728ff4a7447bd1de40b4ae7ef",
  "moa-urban-8785": "dbba83715c4f1472d30b5904c8a5398f013306d6bdb21a88cef4330f1b05de24",
  "moa-urban-8789": "36c0105f5096bb32a2ca83b2bdbfcef7d43cf3de381539784b44da42445f7e76",
  "moa-urban-8790": "733122d37aa0fafd4891f55a493733b5ab656a5656c5f5b412576f64ab233d59",
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
const isReference=p=>[PLAN,ADDRESS,REPRESENTATIVE,OVERVIEW,AREA].includes(p?.basis);
const validLegacy=c=>c?.verified===true&&c.basis===BOUNDARY&&official(c.source)&&valid(c.point);
function validRecord(r){
 if(!r||typeof r.project_id!=='string'||![PLAN,ADDRESS,REPRESENTATIVE,OVERVIEW,AREA].includes(r.basis)||!valid(r.point)||r.geometry_verified!==false||r.coordinate_verified!==false||r.verified!==false||!official(r.source)||!official(r.identity?.catalog_source)||r.identity.project_id!==r.project_id||!/^\d{4}-\d\d-\d\dT/.test(r.reviewed_at||''))return false;
 if([OVERVIEW,AREA].includes(r.basis)){
  const e=r.source_evidence;if(!/^[a-f0-9]{64}$/.test(r.catalog_sha256||'')||!e||!official(e.overview_source)||!/^[a-f0-9]{64}$/.test(e.main_sha256||'')||!/^[a-f0-9]{64}$/.test(e.overview_sha256||'')||e.observed_cafe_id!==new URL(e.overview_source).searchParams.get('cafeId')||!Number.isFinite(Date.parse(e.source_checked_at))||typeof r.limitation!=='string'||!r.limitation)return false;
  if(r.basis===OVERVIEW){const cp=r.coordinate_provenance;return r.source===e.overview_source&&r.raw_label==='정비구역 위치'&&typeof r.raw_value==='string'&&r.catalog_address_differs===true&&r.official_address!==r.identity.catalog_address&&typeof r.address_discrepancy==='string'&&!!r.address_discrepancy&&r.confidence==='explicit_overview_site_address_exact_saved_match'&&cp&&same(cp.point,r.point)&&cp.address===r.official_address&&cp.basis==='exact_district_legal_dong_lot_address_match'&&cp.source==='https://developers.kakao.com/docs/latest/ko/local/dev-guide#address-coord'&&Number.isFinite(Date.parse(cp.checked_at))&&/^[a-f0-9]{64}$/.test(cp.source_map_sha256||'');}
  const u=new URL(r.source);return u.hostname==='urban.seoul.go.kr'&&u.pathname==='/view/map/mapPopup.html'&&u.searchParams.get('recordCode')===r.source_record_code&&typeof r.source_area_name==='string'&&!!r.source_area_name&&/^[a-f0-9]{64}$/.test(r.source_snapshot_sha256||'')&&Number.isFinite(Date.parse(r.coordinate_checked_at))&&r.point_inside_saved_source===true&&r.point_method==='area_weighted_centroid_of_largest_ring_local_equirectangular'&&r.confidence==='official_map_code_and_named_area_address_match';
 }
 if(r.basis===REPRESENTATIVE){const cp=r.coordinate_provenance;return r.official_address===r.identity.catalog_address&&r.confidence==='exact_district_legal_dong_lot_match'&&/^[a-f0-9]{64}$/.test(r.catalog_sha256||'')&&cp&&same(cp.point,r.point)&&typeof cp.address==='string'&&((cp.basis==='exact_district_legal_dong_lot_address_match'&&cp.source==='https://developers.kakao.com/docs/latest/ko/local/dev-guide#address-coord'&&Number.isFinite(Date.parse(cp.checked_at))&&/^[a-f0-9]{64}$/.test(cp.source_map_sha256||''))||(cp.basis==='approved_saved_address_cache'&&r.identity.district==='강서구'&&cp.checked_at===null&&cp.cache_recorded_at==='2026-10-19T16:27:01Z'&&cp.cache_sha256==='f5bb8f5bc70441383640deac57c635cc3e5a3195bab50fdac6f9c0da35d1a0a1'));}
 if(r.basis===ADDRESS)return r.raw_label==='정비구역 위치'&&typeof r.official_address==='string'&&!!r.official_address&&r.official_address===r.identity.catalog_address&&r.coordinate_provenance?.basis==='approved_saved_address_cache'&&r.coordinate_provenance.coordinate_checked_at===null&&r.coordinate_provenance.cache_recorded_at==='2026-10-19T16:27:01Z'&&r.coordinate_provenance.source==='기존 강서 주소 대조 좌표 캐시 (원좌표 확인일 미보존)'&&typeof r.coordinate_provenance.exact_cache_key==='string'&&/^[a-f0-9]{64}$/.test(r.coordinate_provenance.sha256||'')&&/^[a-f0-9]{64}$/.test(r.identity.overview_sha256||'')&&r.identity.cafe_id===new URL(r.source).searchParams.get('cafeId');
 return typeof r.plan_id==='string'&&!!r.plan_id&&typeof r.record_code==='string'&&!!r.record_code&&r.source.includes('/'+r.plan_id+'/')&&r.notice_date==='2023-11-02'&&r.notice_number==='서울특별시고시 제2023-478호'&&Number.isFinite(r.published_gis_area_m2)&&Number.isFinite(r.gazette_project_area_m2)&&typeof r.limitation==='string'&&!!r.limitation;
}
async function setReferences(data){
 references=new Map();if(data?.version!==1||data.scope!=='home-reference-only'||!Array.isArray(data.records)||!globalThis.crypto?.subtle)return 0;
 const counts=new Map();for(const r of data.records)if(r?.project_id)counts.set(r.project_id,(counts.get(r.project_id)||0)+1);
 for(const input of data.records){try{const r=JSON.parse(JSON.stringify(input));if(counts.get(r.project_id)!==1||!validRecord(r)||!own(approvedDigests,r.project_id))continue;const bytes=new TextEncoder().encode(stable(r)),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');if(digest!==approvedDigests[r.project_id])continue;references.set(r.project_id,r);}catch{}}
 return references.size;
}
async function ensureLoaded(read,signal){if(!loadPromise)loadPromise=(async()=>{let timer;try{const data=await Promise.race([Promise.resolve().then(()=>read('data/redevelopment-reference-centers.json?v=20261025-samikpark-pilot1',signal)),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('reference timeout')),5000);})]);return await setReferences(data);}catch(e){references=new Map();loadPromise=null;if(e?.name==='AbortError')throw e;return 0;}finally{clearTimeout(timer);}})();return loadPromise;}
function reference(p){const r=references.get(id(p)),c=p?.registry||p;if(!r||c.id!==r.project_id||c.source!==r.identity.catalog_source||c.district!==r.identity.district||c.address!==r.identity.catalog_address||c.title!==r.identity.catalog_title)return null;return JSON.parse(JSON.stringify(r));}
function mapPoint(p,points,manifest){
 const key=id(p),has=own(points?.points,key)||own(points?.points,p?.id),pt=own(points?.points,key)?points.points[key]:points?.points?.[p?.id],meta=manifest?.[key];
 // A malformed/conflicting legacy entry must not be replaced by a reference record.
 if(has||(meta?.verified===true&&!(meta.boundary_only===true&&['cleanup-hwagok_a1','cleanup-moa2-1','cleanup-deungchondong649','cleanup-siyoungapt','cleanup-yc2761','cleanup-DrWK0XGO','cleanup-sanga1apt','cleanup-mokdong12','cleanup-sinbanpo2','cleanup-gaepo6_7','cleanup-dongsunggaro','cleanup-kukdong-reborn','cleanup-jamsil5apt','moa-urban-8785','moa-urban-8789','moa-urban-8790'].includes(key)&&official(meta.source)))){if(!valid(pt)||meta?.verified!==true||!official(meta.source))return null;return{lat:pt[0],lng:pt[1],basis:BOUNDARY,source:meta.source,geometry_verified:true};}
 const r=reference(p);return r?{lat:r.point[0],lng:r.point[1],basis:r.basis,source:r.source,geometry_verified:false,coordinate_verified:false,project_id:r.project_id}:null;
}
function resolveCenter(p,saved,extra){
 // Presence, not truthiness: a corrupt saved entry cannot silently fall through.
 if(saved!==undefined||extra!==undefined){if(saved!==undefined&&!validLegacy(saved)||extra!==undefined&&!validLegacy(extra))return null;if(saved!==undefined&&extra!==undefined&&(!same(saved.point,extra.point)||saved.basis!==extra.basis||saved.source!==extra.source))return null;return saved!==undefined?saved:extra;}
 return reference(p);
}
function label(point){if(point?.basis===AREA)return '공식 구역자료 참고 위치 · 법정 경계 아님';if(point?.basis===OVERVIEW)return '공식 사업개요 주소 참고 위치 · 법정 경계 아님';if(point?.basis===REPRESENTATIVE)return '공식 대표주소 참고 위치 · 법정 경계 아님';return point?.basis===BOUNDARY?'공식 경계 중심점':point?.basis===PLAN?'공식계획도 참고 위치 · 법정 경계 미검증':point?.basis===ADDRESS?'공식 구역주소 저장 참고 위치 · 법정 경계 미검증':'지도 위치 미확인';}
function badge(point){return point?.basis===BOUNDARY?'공식경계':isReference(point)?'참고위치':'현장';}
function distanceNote(center){if(center?.basis===AREA)return '공식 구역자료에서 산출한 내부 참고점과 거래 주소좌표 사이의 직선거리입니다. 특정 필지의 정확한 위치나 법정 사업경계가 아닙니다.';if(center?.basis===OVERVIEW)return '공식 사업개요에 명시된 주소의 저장좌표에서 거래 주소좌표까지의 직선거리입니다. 등록 목록 주소와의 차이는 미해결이며 지번 변경이나 법정 경계를 확정하지 않습니다.';if(center?.basis===REPRESENTATIVE)return '공식 대표주소에 연결된 저장 좌표에서 거래 주소 좌표까지의 직선거리입니다. 법정 경계나 구역 내부 거래를 뜻하지 않습니다.';return center?.basis===BOUNDARY?'사업의 공식 경계 표시 중심점에서 거래 주소 좌표까지의 직선거리입니다.':center?.basis===PLAN?'공식계획도의 참고 위치에서 거래 주소 좌표까지의 직선거리입니다. 법정 사업구역 경계는 검증하지 않았습니다.':center?.basis===ADDRESS?'공식 정비구역 주소에 연결한 기존 저장 참고 위치에서 거래 주소 좌표까지의 직선거리입니다. 원좌표 조회일은 미보존이며 새 좌표 검증이나 법정 경계 검증이 아닙니다.':'거리 기준 위치를 확인할 수 없습니다.';}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function evidenceHTML(p){const r=reference(p);if(!r||!isReference(p?.map_point)||r.basis!==p.map_point.basis||!same(r.point,[p.map_point.lat,p.map_point.lng]))return '';if([OVERVIEW,AREA].includes(r.basis))return `<details class="location-evidence reference-evidence"><summary>참고 위치 출처·한계</summary><p>${esc(label(r))}</p><p>${esc(r.basis===AREA?r.source_area_name:r.raw_value)}</p><p>${esc(r.address_discrepancy||'')}</p><p>${esc(r.limitation)}</p><p><a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer" data-preserve>${r.basis===AREA?'공식 구역자료':'공식 사업개요'} ↗</a></p><p>저장 좌표·구역자료 확인: ${esc(r.coordinate_checked_at||r.coordinate_provenance?.checked_at||'원조회일 미보존')} · 근거 대조: ${esc(r.reviewed_at.slice(0,10))}</p><p>참고점 주변 거리이며 법정 경계·구역 내부 거래·입주권 거래가 아닙니다.</p></details>`;if(r.basis===REPRESENTATIVE)return `<details class="location-evidence reference-evidence"><summary>대표 위치 출처·한계</summary><p>${esc(r.official_address)}</p><p>${esc(r.limitation)}</p><p><a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer" data-preserve>공식 대표주소 근거 ↗</a></p><p>기존 좌표 확인: ${esc(r.coordinate_provenance.checked_at||'원조회일 미보존 · 캐시 보존일 2026-10-19')} · 근거 대조: ${esc(r.reviewed_at.slice(0,10))}</p></details>`;const a=(u,t)=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" data-preserve>${esc(t)} ↗</a>`;return `<details class="location-evidence reference-evidence"><summary>참고 위치 출처·한계</summary><p>${esc(label(r))}</p><p>${esc(r.basis===ADDRESS?'공식 정비구역 위치: '+r.raw_value:r.notice_number+' · '+r.notice_date)}</p>${a(r.source,r.basis===ADDRESS?'공식 정비사업개요':'공식 고시·계획도')}<p>${esc(r.basis===ADDRESS?'정확히 일치하는 구역주소의 기존 저장좌표를 연결했습니다. 원좌표 조회일 미보존 · 캐시 보존일 2026-10-19. 신규 지오코딩·좌표 검증이 아닙니다.':r.limitation)}</p><p>근거 검토일 ${esc(r.reviewed_at.slice(0,10))} · 검토일은 좌표 조회일이나 사업 변경일이 아닙니다. 핀과 거리만 참고하며 사업구역·필지 포함 여부를 판단하지 않습니다.</p></details>`;}
window.RentRedevelopmentCenters={BOUNDARY,PLAN,ADDRESS,REPRESENTATIVE,OVERVIEW,AREA,valid,isReference,validLegacy,setReferences,ensureLoaded,reference,mapPoint,resolveCenter,label,badge,distanceNote,evidenceHTML};
})();

