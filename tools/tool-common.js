(() => {
  const toolLinks = [
    { id: 'redevelopment', label: '재개발', path: 'calc/' },
    { id: 'youth-score', label: '청년주택', path: 'tools/youth-score/' },
    { id: 'rent-check', label: '월세·전세', path: 'tools/rent-check/' },
    { id: 'apartment', label: '아파트 시세', path: 'tools/apartment/' }
  ];

  function join(root, path) {
    if (!path) return root;
    if (path.startsWith('#')) return `${root}${path}`;
    return `${root}${path}`;
  }

  function renderLink(item, root, activeTool) {
    const isCurrent = item.id === activeTool;
    const current = isCurrent ? ' aria-current="page"' : '';
    return `<a href="${join(root, item.path)}"${current}>${item.label}</a>`;
  }

  function renderFooterLink(item, root, activeTool) {
    const isCurrent = item.id === activeTool;
    const current = isCurrent ? ' aria-current="page"' : '';
    return `<a href="${join(root, item.path)}"${current}>${item.label}<span aria-hidden="true">→</span></a>`;
  }

  function initializeToolShell() {
    const body = document.body;
    if (!body) return;

    const root = body.dataset.v2Root || '../../';
    const activeTool = body.dataset.toolId || '';

    if (!document.querySelector('.v2-toolbar')) {
      const toolbar = document.createElement('div');
      toolbar.className = 'v2-toolbar';
      toolbar.setAttribute('role', 'banner');
      toolbar.innerHTML = `
        <div class="v2-toolbar__inner">
          <a class="v2-toolbar__home" href="${root}" aria-label="Rent Check 홈으로">
            <span class="v2-toolbar__back" aria-hidden="true">←</span>
            <strong>Rent Check</strong>
            <span class="v2-toolbar__home-label">홈으로</span>
          </a>
          <nav class="v2-toolbar__nav" aria-label="도구 바로가기">
            ${toolLinks.map((item) => renderLink(item, root, activeTool)).join('')}
          </nav>
          <button class="v2-toolbar__menu" type="button" aria-label="도구 바로가기 열기" aria-expanded="false">
            <span>도구 바로가기</span><b aria-hidden="true">⌄</b>
          </button>
        </div>
        <nav class="v2-toolbar__mobile" aria-label="모바일 도구 바로가기">
          ${toolLinks.map((item) => renderLink(item, root, activeTool)).join('')}
        </nav>`;

      body.insertAdjacentElement('afterbegin', toolbar);

      const menu = toolbar.querySelector('.v2-toolbar__menu');
      const mobile = toolbar.querySelector('.v2-toolbar__mobile');
      menu.addEventListener('click', () => {
        const open = mobile.classList.toggle('is-open');
        menu.setAttribute('aria-expanded', String(open));
        menu.setAttribute('aria-label', open ? '도구 바로가기 닫기' : '도구 바로가기 열기');
      });
      mobile.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
        mobile.classList.remove('is-open');
        menu.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-label', '도구 바로가기 열기');
      }));
    }

    if (!document.querySelector('.v2-tool-footer')) {
      const footer = document.createElement('footer');
      footer.className = 'v2-tool-footer';
      footer.innerHTML = `
        <div class="v2-tool-footer__inner">
          <div class="v2-tool-footer__brand-block">
            <a class="v2-tool-footer__brand" href="${root}" aria-label="Rent Check 홈">
              <span class="v2-tool-footer__mark" aria-hidden="true">
                <svg viewBox="0 0 28 28"><path d="M4 13 14 5l10 8v10H4z"></path><path d="m10 16 3 3 6-7"></path></svg>
              </span>
              <strong>Rent Check</strong>
            </a>
            <p>부동산 계산과 실거래 해석</p>
          </div>
          <nav class="v2-tool-footer__links" aria-label="공통 하단 바로가기">
            <a class="v2-tool-footer__home" href="${root}">홈으로 <span aria-hidden="true">→</span></a>
            ${toolLinks.map((item) => renderFooterLink(item, root, activeTool)).join('')}
          </nav>
        </div>`;
      body.insertAdjacentElement('beforeend', footer);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeToolShell, { once: true });
  } else {
    initializeToolShell();
  }
})();
