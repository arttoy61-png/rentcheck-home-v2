/* Connect using the site's configured Kakao browser key. */
(() => {
  'use strict';
  const button = document.querySelector('#connectKakao');
  const status = document.querySelector('#kakaoConnectionStatus');
  const map = document.querySelector('#kakaoMap');
  const baseMap = document.querySelector('#map');
  const canvas = document.querySelector('.mapcanvas');
  let latest = null;
  let ready = false;
  let busy = false;
  let started = false;

  function sync(options) {
    latest = options;
    if (!ready) return;
    map.hidden = false;
    baseMap.style.visibility = 'hidden';
    canvas.classList.add('kakao-connected');
    if (!started) {
      started = window.RentKakaoMap.start({
        container: '#kakaoMap',
        statusSelector: '#kakaoMapStatus',
        onPick: (id, open, kind) => latest?.onPick(id, open, kind),
        onMove: (camera, tab) => {
          if (latest?.tab === tab) latest.onMove?.(camera);
        }
      });
      if (!started) throw Error('map unavailable');
    }
    window.RentKakaoMap.update(options);
  }

  function connect() {
    if (ready || busy) return;
    const config = window.RENTCHECK_MAP_CONFIG || {};
    const key = String(config.kakaoJavaScriptKey || '').trim();
    if (config.autoConnect === false || !/^[a-f0-9]{32}$/i.test(key)) return;
    busy = true;
    button.hidden = true;
    status.textContent = '카카오 지도를 불러오고 있습니다.';
    const script = document.createElement('script');
    let pending = true;
    const timer = setTimeout(fail, 20000);

    function finish() {
      pending = false;
      clearTimeout(timer);
      script.remove();
      busy = false;
    }

    function fail() {
      if (!pending) return;
      finish();
      ready = false;
      map.hidden = true;
      baseMap.style.visibility = '';
      canvas.classList.remove('kakao-connected');
      status.textContent = '카카오 지도에 연결할 수 없어 기본 지도를 표시합니다. 현장 검색과 상세 보기는 그대로 이용할 수 있습니다.';
      button.hidden = false;
    }

    script.onerror = fail;
    script.onload = () => {
      if (!pending) return;
      try {
        window.kakao.maps.load(() => {
          if (!pending) return;
          try {
            ready = true;
            if (latest) sync(latest);
            window.RentKakaoMap.resize();
            finish();
            status.textContent = '카카오 지도를 사용하고 있습니다.';
            const badge = document.querySelector('.private');
            if (badge) badge.textContent = '재개발 지도 · 카카오 연결';
          } catch {
            fail();
          }
        });
      } catch {
        fail();
      }
    };
    script.async = true;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + encodeURIComponent(key) + '&autoload=false&libraries=services';
    document.head.append(script);
  }

  button.addEventListener('click', connect);
  window.RentKakaoSession = {sync, connect, isActive: () => ready, activeTab: () => window.RentKakaoMap.activeTab?.()};
})();
