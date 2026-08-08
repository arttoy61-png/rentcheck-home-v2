(() => {
  const toolLinks = [
    { id: 'home', label: '홈', path: '' },
    { id: 'tools', label: '계산 도구', path: '#calculators' },
    { id: 'apartment', label: '실거래', path: 'tools/apartment/' },
    { id: 'youth-score', label: '청년주택', path: 'tools/youth-score/' },
    { id: 'redevelopment', label: '재개발', path: 'calc/' },
    { id: 'guide', label: '가이드', path: '#insights' }
  ];

  function join(root, path) {
    if (!path) return root;
    if (path.startsWith('#')) return `${root}${path}`;
    return `${root}${path}`;
  }

  function renderLink(item, root, activeTool) {
    const isCurrent = item.id === activeTool || (item.id === 'apartment' && activeTool === 'rent-check');
    const current = isCurrent ? ' aria-current="page"' : '';
    return `<a href="${join(root, item.path)}"${current}>${item.label}</a>`;
  }

  function initializeToolHeader() {
    const body = document.body;
    if (!body || document.querySelector('.v2-toolbar')) return;

    const root = body.dataset.v2Root || '../../';
    const activeTool = body.dataset.toolId || '';
    const toolbar = document.createElement('div');
    toolbar.className = 'v2-toolbar';
    toolbar.setAttribute('role', 'banner');
    toolbar.innerHTML = `
      <div class="v2-toolbar__inner">
        <a class="v2-toolbar__brand" href="${root}" aria-label="Rent Check 홈">
          <span class="v2-toolbar__mark" aria-hidden="true">
            <svg viewBox="0 0 28 28"><path d="M4 13 14 5l10 8v10H4z"></path><path d="m10 16 3 3 6-7"></path></svg>
          </span>
          <strong>Rent Check</strong>
        </a>
        <nav class="v2-toolbar__nav" aria-label="주요 메뉴">
          ${toolLinks.map((item) => renderLink(item, root, activeTool)).join('')}
        </nav>
        <a class="v2-toolbar__cta" href="${join(root, '#calculators')}">다른 도구 보기 <span aria-hidden="true">→</span></a>
        <button class="v2-toolbar__menu" type="button" aria-label="메뉴 열기" aria-expanded="false">
          <i></i><i></i><i></i>
        </button>
      </div>
      <nav class="v2-toolbar__mobile" aria-label="모바일 메뉴">
        ${toolLinks.map((item) => renderLink(item, root, activeTool)).join('')}
      </nav>`;

    body.insertAdjacentElement('afterbegin', toolbar);

    const menu = toolbar.querySelector('.v2-toolbar__menu');
    const mobile = toolbar.querySelector('.v2-toolbar__mobile');
    menu.addEventListener('click', () => {
      const open = mobile.classList.toggle('is-open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });
    mobile.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      mobile.classList.remove('is-open');
      menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-label', '메뉴 열기');
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeToolHeader, { once: true });
  } else {
    initializeToolHeader();
  }
})();
