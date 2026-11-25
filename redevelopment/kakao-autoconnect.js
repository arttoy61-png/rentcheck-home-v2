/* Start after the map's deferred scripts have initialized. */
(() => {
  const start = () => window.RentKakaoSession.connect();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once: true});
  } else {
    start();
  }
})();
