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

  window.miniMap = function miniMapKakao(lat, lng, nm) {
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
  };

  loadKakao().catch(() => {});
})();