(() => {
  'use strict';

  const KAKAO_JS_KEY = '222563608848ddea15db9b5ddf83e859';
  const DATA_URL = 'https://arttoy61-png.github.io/rent-check/auction_data.json';
  const state = { location: null, data: null, kakaoReady: null };

  const $ = (s, p = document) => p.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const n = v => {
    const x = Number(String(v ?? '').replace(/,/g, ''));
    return Number.isFinite(x) ? x : 0;
  };
  const median = arr => {
    const s = [...arr].filter(Number.isFinite).sort((a,b)=>a-b);
    if (!s.length) return null;
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
  };
  const fmtMan = v => {
    const x = Math.round(n(v));
    if (x >= 10000) {
      const e = x / 10000;
      return `${e.toFixed(e >= 10 ? 1 : 2).replace(/\.?0+$/, '')}억`;
    }
    return `${x.toLocaleString('ko-KR')}만원`;
  };
  const fmtDate = r => {
    const ym = String(r.ym || '');
    const d = String(r.d || '').padStart(2, '0');
    return ym.length === 6 ? `${ym.slice(0,4)}.${ym.slice(4,6)}.${d}` : '';
  };
  const ymToIndex = ym => {
    const s = String(ym || '');
    if (!/^\d{6}$/.test(s)) return -1;
    return Number(s.slice(0,4)) * 12 + Number(s.slice(4,6));
  };
  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  const typeValue = () => $('#segType button.active')?.dataset.value || '';
  const dealKind = () => $('#segDealKind button.active')?.dataset.value || '월세';
  const typeCode = value => ({'빌라':'v','아파트':'a','오피스텔':'o'}[value] || '');
  const typeLabel = code => ({v:'빌라',a:'아파트',o:'오피스텔'}[code] || '주택');
  const conversionRate = () => {
    const text = $('#rateText')?.textContent || '';
    const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m => Number(m[1])).filter(x => x > 0 && x < 30);
    return matches.length ? matches[matches.length - 1] : 4.5;
  };

  function loadKakao() {
    if (window.kakao?.maps?.services) return Promise.resolve(window.kakao);
    if (state.kakaoReady) return state.kakaoReady;
    state.kakaoReady = new Promise((resolve, reject) => {
      const done = () => {
        if (!window.kakao?.maps) return reject(new Error('카카오맵 SDK를 불러오지 못했습니다.'));
        window.kakao.maps.load(() => resolve(window.kakao));
      };
      let script = document.querySelector('script[data-rentcheck-kakao]');
      if (script) {
        script.addEventListener('load', done, {once:true});
        script.addEventListener('error', () => reject(new Error('카카오맵 연결 실패')), {once:true});
        if (window.kakao?.maps) done();
        return;
      }
      script = document.createElement('script');
      script.dataset.rentcheckKakao = '1';
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JS_KEY)}&libraries=services&autoload=false`;
      script.onload = done;
      script.onerror = () => reject(new Error('카카오맵 연결 실패'));
      document.head.appendChild(script);
    });
    return state.kakaoReady;
  }

  async function loadData() {
    if (state.data) return state.data;
    const r = await fetch(`${DATA_URL}?v=${Date.now()}`, {cache:'no-cache'});
    if (!r.ok) throw new Error(`실거래 데이터 연결 실패 (${r.status})`);
    const data = await r.json();
    if (!data || !data.geo || (!Array.isArray(data.jeonse) && !Array.isArray(data.wolse))) {
      throw new Error('주변 실거래 데이터 형식이 올바르지 않습니다.');
    }
    state.data = data;
    return data;
  }

  function makeJibunKey(result) {
    const a = result?.address;
    if (!a) return '';
    const dong = a.region_3depth_name || '';
    const main = a.main_address_no || '';
    const sub = a.sub_address_no && a.sub_address_no !== '0' ? `-${a.sub_address_no}` : '';
    return dong && main ? `${dong} ${main}${sub}` : '';
  }

  async function geocodeAddress(raw) {
    const query = String(raw || '').trim();
    if (!query) throw new Error('주소를 입력해 주세요.');
    const kakao = await loadKakao();
    const geocoder = new kakao.maps.services.Geocoder();

    const addressResult = await new Promise(resolve => {
      geocoder.addressSearch(query, (result, status) => resolve({result, status}));
    });

    let item = addressResult.status === kakao.maps.services.Status.OK ? addressResult.result?.[0] : null;
    if (!item) {
      const places = new kakao.maps.services.Places();
      const keywordResult = await new Promise(resolve => {
        places.keywordSearch(query, (result, status) => resolve({result, status}));
      });
      if (keywordResult.status === kakao.maps.services.Status.OK && keywordResult.result?.[0]) {
        const p = keywordResult.result[0];
        item = {
          x: p.x, y: p.y,
          address_name: p.road_address_name || p.address_name || query,
          road_address: p.road_address_name ? {address_name:p.road_address_name} : null,
          address: p.address_name ? {address_name:p.address_name} : null,
        };
      }
    }
    if (!item) throw new Error('주소를 찾지 못했습니다. 도로명 또는 지번 주소로 다시 입력해 주세요.');

    const addressName = item.road_address?.address_name || item.address?.address_name || item.address_name || query;
    if (!/강서구/.test(addressName)) throw new Error('현재는 서울 강서구 주소만 비교할 수 있습니다.');

    return {
      lat: Number(item.y),
      lng: Number(item.x),
      address: addressName,
      jibunKey: makeJibunKey(item),
    };
  }

  function setAddressStatus(message, ok = false) {
    const el = $('#nearbyAddressStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `nearby-address-status${ok ? ' ok' : ''}`;
  }

  async function searchAddress() {
    const input = $('#nearbyAddress');
    const btn = $('#nearbyAddressBtn');
    if (!input) return false;
    try {
      if (btn) { btn.disabled = true; btn.textContent = '찾는 중…'; }
      setAddressStatus('카카오에서 주소를 확인하고 있습니다.');
      const loc = await geocodeAddress(input.value);
      state.location = loc;
      input.value = loc.address;
      setAddressStatus(`확인됨 · ${loc.address}`, true);
      try { window.gtag?.('event', 'address_search', {tool:'rent-check'}); } catch (_) {}
      return true;
    } catch (e) {
      state.location = null;
      setAddressStatus(e.message || '주소 확인에 실패했습니다.');
      return false;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '주소 찾기'; }
    }
  }

  function coordsFor(data, r) {
    if (!r?.j || !r?.u) return null;
    const xy = data.geo[`${r.u} ${r.j}`];
    if (!Array.isArray(xy) || xy.length !== 2) return null;
    return {lat:Number(xy[0]), lng:Number(xy[1])};
  }

  function getComparableRows(data) {
    const area = n($('#area')?.value);
    const selectedType = typeCode(typeValue());
    const kind = dealKind();
    if (!area) throw new Error('전용면적을 입력해 주세요.');

    const source = kind === '전세' ? (data.jeonse || []) : (data.wolse || []);
    const latestIndex = ymToIndex(data.updated);
    const areaTol = Math.max(8, area * 0.20);

    const enrich = months => source
      .filter(r => !selectedType || r.t === selectedType)
      .filter(r => Math.abs(n(r.a) - area) <= areaTol)
      .filter(r => {
        const idx = ymToIndex(r.ym);
        return latestIndex < 0 || idx < 0 || idx >= latestIndex - months + 1;
      })
      .map(r => {
        const xy = coordsFor(data, r);
        if (!xy) return null;
        const distance = haversine(state.location.lat, state.location.lng, xy.lat, xy.lng);
        if (distance > 500) return null;
        return {
          ...r, ...xy, distance,
          areaDiff: Math.abs(n(r.a) - area),
          same: Boolean(state.location.jibunKey && `${r.u} ${r.j}` === state.location.jibunKey),
        };
      })
      .filter(Boolean);

    let rows = enrich(12);
    let period = 12;
    if (rows.length < 3) {
      rows = enrich(24);
      period = 24;
    }
    rows.sort((a,b) =>
      Number(b.same) - Number(a.same) ||
      a.distance - b.distance ||
      a.areaDiff - b.areaDiff ||
      String(b.ym + String(b.d).padStart(2,'0')).localeCompare(String(a.ym + String(a.d).padStart(2,'0')))
    );
    return {rows: rows.slice(0, 5), total: rows.length, period};
  }

  function verdict(rows, kind) {
    if (rows.length < 3) {
      return {
        cls:'nodata',
        title:'비교 표본이 적습니다',
        sub:`주변 500m 안에서 조건이 비슷한 ${kind} 실거래가 ${rows.length}건입니다. 아래 거래를 참고용으로 확인하세요.`,
      };
    }
    if (kind === '전세') {
      const user = n($('#deposit')?.value);
      const med = median(rows.map(r => n(r.p)));
      const diff = user - med;
      const threshold = Math.max(500, med * 0.05);
      if (Math.abs(diff) <= threshold) return {cls:'good', title:'주변과 비슷한 편입니다', sub:`비슷한 주변 전세 중위는 ${fmtMan(med)}입니다.`};
      if (diff > 0) return {cls:'warn', title:`주변보다 약 ${fmtMan(Math.abs(diff))} 높은 편입니다`, sub:`비슷한 주변 전세 중위 ${fmtMan(med)}와 비교한 결과입니다.`};
      return {cls:'cheap', title:`주변보다 약 ${fmtMan(Math.abs(diff))} 낮은 편입니다`, sub:`비슷한 주변 전세 중위 ${fmtMan(med)}와 비교한 결과입니다.`};
    }

    const userDep = n($('#deposit')?.value);
    const userRent = n($('#rent')?.value);
    const rate = conversionRate();
    const normalized = rows.map(r => n(r.m) + (n(r.dp) - userDep) * rate / 1200);
    const med = median(normalized);
    const diff = userRent - med;
    const threshold = Math.max(3, med * 0.05);
    if (Math.abs(diff) <= threshold) return {cls:'good', title:'주변과 비슷한 편입니다', sub:`보증금 차이를 ${rate.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')}% 기준으로 환산한 주변 월세 중위는 약 ${Math.round(med)}만원입니다.`};
    if (diff > 0) return {cls:'warn', title:`주변보다 월 약 ${Math.round(Math.abs(diff))}만원 높은 편입니다`, sub:`보증금 차이를 같은 기준으로 환산해 비교했습니다.`};
    return {cls:'cheap', title:`주변보다 월 약 ${Math.round(Math.abs(diff))}만원 낮은 편입니다`, sub:`보증금 차이를 같은 기준으로 환산해 비교했습니다.`};
  }

  function rowPrice(r, kind) {
    return kind === '전세' ? fmtMan(r.p) : `${fmtMan(r.dp)} / 월 ${Math.round(n(r.m)).toLocaleString()}만원`;
  }

  function renderMap(rows) {
    const target = $('#nearbyMap');
    if (!target || !window.kakao?.maps || !state.location) return;
    target.innerHTML = '';
    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(state.location.lat, state.location.lng);
    const map = new kakao.maps.Map(target, {center, level:4});
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(center);

    const targetMarker = new kakao.maps.Marker({position:center, map});
    const targetInfo = new kakao.maps.InfoWindow({content:'<div style="padding:5px 8px;font-size:12px;font-weight:700">입력 주소</div>'});
    targetInfo.open(map, targetMarker);

    rows.forEach((r, i) => {
      const pos = new kakao.maps.LatLng(r.lat, r.lng);
      bounds.extend(pos);
      const marker = new kakao.maps.Marker({position:pos, map});
      const content = `<div style="padding:5px 8px;font-size:12px;white-space:nowrap">${i+1}. ${esc(r.b || typeLabel(r.t))} · ${Math.round(r.distance)}m</div>`;
      const info = new kakao.maps.InfoWindow({content});
      kakao.maps.event.addListener(marker, 'click', () => info.open(map, marker));
    });
    if (rows.length) map.setBounds(bounds, 40, 40, 40, 40);
  }

  function ensureResultShell() {
    let box = $('#nearbyResult');
    if (box) return box;
    box = document.createElement('section');
    box.id = 'nearbyResult';
    box.className = 'nearby-result';
    const old = $('#result');
    if (old?.parentNode) old.parentNode.insertBefore(box, old);
    else $('.container')?.appendChild(box);
    return box;
  }

  function renderResult(rowsInfo) {
    const kind = dealKind();
    const {rows, total, period} = rowsInfo;
    const box = ensureResultShell();
    const v = verdict(rows, kind);
    const typeText = typeValue() || '전체 주택유형';
    const body = rows.length ? rows.map((r,i) => `
      <tr>
        <td><b>${i+1}</b></td>
        <td>${Math.round(r.distance)}m${r.same ? '<br><small>같은 지번</small>' : ''}</td>
        <td>${esc(typeLabel(r.t))}<br><small>${esc(r.b || r.u)}</small></td>
        <td>${n(r.a).toFixed(1).replace(/\.0$/,'')}㎡</td>
        <td>${esc(rowPrice(r, kind))}<br><small>${esc(fmtDate(r))}</small></td>
      </tr>`).join('') : '<tr><td colspan="5">조건에 맞는 주변 실거래를 찾지 못했습니다.</td></tr>';

    box.innerHTML = `
      <div class="verdict ${esc(v.cls)}">
        <div class="title">${esc(v.title)}</div>
        <div class="sub">${esc(v.sub)}</div>
      </div>
      <div class="card nearby-card">
        <h2>입력 주소 주변 실거래</h2>
        <div class="nearby-summary"><b>${esc(state.location.address)}</b><br>반경 500m · ${esc(typeText)} · 비슷한 면적 · 최근 ${period}개월</div>
        <div id="nearbyMap" class="nearby-map" aria-label="주소 주변 실거래 지도"></div>
        <div class="nearby-table-wrap">
          <table class="nearby-table">
            <thead><tr><th>#</th><th>거리</th><th>유형</th><th>면적</th><th>${kind === '전세' ? '보증금' : '보증금 / 월세'}</th></tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        <p class="nearby-note">500m 안에서 조건이 비슷한 거래 ${total}건 중 최대 5건을 보여줍니다. 주소는 카카오 위치검색에만 사용하며 Rent Check에 저장하지 않습니다.</p>
      </div>`;
    box.style.display = 'block';
    const old = $('#result');
    if (old) old.style.display = 'none';
    renderMap(rows);
    box.scrollIntoView({behavior:'smooth', block:'start'});
  }

  async function runNearby() {
    if (!state.location) throw new Error('주소 찾기를 먼저 해주세요.');
    const data = await loadData();
    const info = getComparableRows(data);
    renderResult(info);
    try { window.gtag?.('event', 'nearby_compare', {tool:'rent-check', deal_kind:dealKind(), matches:info.total}); } catch (_) {}
  }

  function injectStyle() {
    if ($('#nearbyRentStyle')) return;
    const style = document.createElement('style');
    style.id = 'nearbyRentStyle';
    style.textContent = `
      .nearby-address-block{margin-bottom:16px;padding:14px;border:1.5px solid var(--blue);border-radius:12px;background:var(--blue-50)}
      .nearby-address-block label{display:block;font-size:13px;font-weight:700;color:var(--navy);margin-bottom:7px}
      .nearby-address-row{display:flex;gap:8px}
      .nearby-address-row input{flex:1;min-width:0;padding:12px 13px;border:1.5px solid var(--border);border-radius:10px;font-size:15px;background:#fff}
      .nearby-address-row button{flex:0 0 auto;border:0;border-radius:10px;padding:0 14px;background:var(--blue);color:#fff;font-weight:700;cursor:pointer}
      .nearby-address-row button:disabled{opacity:.65}
      .nearby-address-status{font-size:11px;color:var(--gray-lite);margin-top:7px;line-height:1.5}
      .nearby-address-status.ok{color:var(--green);font-weight:700}
      .nearby-result{display:none}
      .nearby-card{overflow:hidden}
      .nearby-summary{font-size:12px;line-height:1.7;color:var(--gray-lite);margin:-4px 0 10px}
      .nearby-summary b{color:var(--navy)}
      .nearby-map{height:240px;border:1px solid var(--border);border-radius:10px;margin:8px 0 12px;background:#eef1f5}
      .nearby-table-wrap{overflow-x:auto}
      .nearby-table{width:100%;border-collapse:collapse;font-size:12px;min-width:560px}
      .nearby-table th{padding:9px 6px;background:var(--navy);color:#fff;text-align:center;white-space:nowrap}
      .nearby-table td{padding:9px 6px;border-bottom:1px solid var(--border);text-align:center;vertical-align:middle}
      .nearby-table small{font-size:10px;color:var(--gray-lite)}
      .nearby-note{font-size:11px;color:var(--gray-lite);line-height:1.65;margin-top:10px}
      @media(max-width:520px){.nearby-address-row{display:grid;grid-template-columns:1fr auto}.nearby-address-row button{min-width:86px}.nearby-map{height:220px}}
    `;
    document.head.appendChild(style);
  }

  function injectAddress() {
    const card = $('.input-card');
    if (!card || $('#nearbyAddress')) return;
    const firstField = card.querySelector('.field');
    const block = document.createElement('div');
    block.className = 'nearby-address-block';
    block.innerHTML = `
      <label for="nearbyAddress">계약할 집 주소</label>
      <div class="nearby-address-row">
        <input id="nearbyAddress" type="text" placeholder="도로명 또는 지번 주소" autocomplete="street-address">
        <button id="nearbyAddressBtn" type="button">주소 찾기</button>
      </div>
      <div id="nearbyAddressStatus" class="nearby-address-status">주소를 넣으면 주변 500m의 비슷한 실거래만 비교합니다.</div>`;
    card.insertBefore(block, firstField || card.firstChild);

    $('#nearbyAddressBtn')?.addEventListener('click', searchAddress);
    $('#nearbyAddress')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchAddress();
      }
    });
    $('#nearbyAddress')?.addEventListener('input', () => {
      state.location = null;
      setAddressStatus('주소를 수정했습니다. 주소 찾기를 다시 눌러주세요.');
    });
  }

  function bindCheck() {
    const btn = $('#checkBtn');
    if (!btn || btn.dataset.nearbyBound) return;
    btn.dataset.nearbyBound = '1';

    btn.addEventListener('click', async e => {
      const input = $('#nearbyAddress');
      if (!input?.value.trim()) return;
      if (state.location) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const ok = await searchAddress();
      if (ok) btn.click();
    }, true);

    btn.addEventListener('click', () => {
      if (!state.location) return;
      setTimeout(() => runNearby().catch(err => {
        const box = ensureResultShell();
        box.style.display = 'block';
        box.innerHTML = `<div class="card"><h2>주소 주변 실거래</h2><div class="no-data">${esc(err.message || '주변 실거래를 불러오지 못했습니다.')}</div></div>`;
      }), 80);
    });
  }

  function init() {
    document.title = '내 월세·전세 적정 확인 | Rent Check';
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = '서울 강서구 주소 주변 실거래로 내 월세·전세 계약 조건이 적정한지 비교합니다.';
    injectStyle();
    injectAddress();
    bindCheck();
    loadKakao().catch(() => setAddressStatus('카카오맵 연결을 확인하고 있습니다.'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();