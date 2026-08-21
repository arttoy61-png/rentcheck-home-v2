(() => {
  'use strict';
  const KAKAO_JS_KEY = '222563608848ddea15db9b5ddf83e859';
  let ready = null;

  function loadKakao() {
    if (window.kakao?.maps) return Promise.resolve(window.kakao);
    if (ready) return ready;
    ready = new Promise((resolve, reject) => {
      const finish = () => {
        if (!window.kakao?.maps) return reject(new Error('Kakao Maps SDK unavailable'));
        window.kakao.maps.load(() => resolve(window.kakao));
      };
      let s = document.querySelector('script[data-rentcheck-kakao]');
      if (s) {
        s.addEventListener('load', finish, {once:true});
        s.addEventListener('error', reject, {once:true});
        if (window.kakao?.maps) finish();
        return;
      }
      s = document.createElement('script');
      s.dataset.rentcheckKakao = '1';
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JS_KEY)}&autoload=false`;
      s.onload = finish;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return ready;
  }

  function miniMapKakao(lat, lng, nm) {
    const target = document.getElementById('map');
    if (!target) return;
    target.textContent = '카카오맵 불러오는 중…';
    target.style.display = 'flex';
    target.style.alignItems = 'center';
    target.style.justifyContent = 'center';
    target.style.fontSize = '12px';
    target.style.color = '#667085';

    loadKakao().then(kakao => {
      target.textContent = '';
      target.style.display = 'block';
      const pos = new kakao.maps.LatLng(Number(lat), Number(lng));
      const map = new kakao.maps.Map(target, {center: pos, level: 4});
      const marker = new kakao.maps.Marker({position: pos, map});
      const safe = String(nm || '아파트').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
      const info = new kakao.maps.InfoWindow({content:`<div style="padding:6px 9px;font-size:12px;font-weight:700;white-space:nowrap">${safe}</div>`});
      info.open(map, marker);
      kakao.maps.event.addListener(marker, 'click', () => info.open(map, marker));
    }).catch(() => {
      target.textContent = '지도를 불러오지 못했습니다.';
    });
  }

  function detailHref() {
    try {
      if (typeof state !== 'undefined' && state?.id) {
        return `../../analysis/apartment/?id=${encodeURIComponent(state.id)}`;
      }
    } catch (_) {}
    return null;
  }

  function updateDetailEntry() {
    const cta = document.querySelector('.cta');
    if (cta && cta.dataset.detailCopy !== '1') {
      cta.dataset.detailCopy = '1';
      cta.innerHTML = '<b>단지별 상세 거래</b><br>단지를 선택하면 최근 실거래뿐 아니라 가격 흐름·전세가율·주변 단지 비교까지 확인할 수 있습니다.';
    }

    const href = detailHref();
    const fixbar = document.getElementById('fixbar');
    if (fixbar) {
      const old = fixbar.querySelector('a.db');
      if (old && href) {
        if (old.getAttribute('href') !== href) old.href = href;
        if (old.textContent !== '이 단지 상세보기') old.textContent = '이 단지 상세보기';
        old.removeAttribute('target');
      }
    }

    const det = document.querySelector('.det');
    let link = document.querySelector('.detail-analysis-link');
    if (det && href) {
      if (!link) {
        link = document.createElement('a');
        link.className = 'detail-analysis-link';
        link.style.display = 'flex';
        link.style.alignItems = 'center';
        link.style.justifyContent = 'center';
        link.style.minHeight = '48px';
        link.style.marginTop = '9px';
        link.style.borderRadius = '12px';
        link.style.background = '#0d1f3c';
        link.style.color = '#f0c75e';
        link.style.fontSize = '14px';
        link.style.fontWeight = '900';
        link.style.textDecoration = 'none';
        link.textContent = '이 단지 상세보기 →';
        link.href = href;
        det.appendChild(link);
      } else if (link.getAttribute('href') !== href) {
        link.href = href;
      }
    } else if (link) {
      link.remove();
    }
  }

  window.__rentcheckKakaoMiniMap = miniMapKakao;
  window.miniMap = miniMapKakao;

  const observer = new MutationObserver(updateDetailEntry);
  observer.observe(document.body, {subtree:true, childList:true});
  updateDetailEntry();
  loadKakao().catch(() => {});
})();