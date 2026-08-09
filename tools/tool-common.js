(() => {
  const primaryLinks = [
    { id: 'redevelopment', label: '재개발', footerLabel: '재개발 계산기', path: 'calc/' },
    { id: 'youth-score', label: '청년주택', footerLabel: '청년주택 점수', path: 'tools/youth-score/' },
    { id: 'rent-check', label: '월세·전세', footerLabel: '월세·전세 확인', path: 'tools/rent-check/' },
    { id: 'apartment', label: '아파트 시세', footerLabel: '아파트 시세', path: 'tools/apartment/' },
    { id: 'jeonse-ratio', label: '전세가율', footerLabel: '전세가율 계산기', path: 'tools/jeonse-ratio/' },
    { id: 'brokerage-fee', label: '중개보수', footerLabel: '중개보수 계산기', path: 'tools/brokerage-fee/' }
  ];
  const extraLinks = [
    { id: 'acquisition-tax', label: '취득세', footerLabel: '취득세 계산기', path: 'tools/acquisition-tax/' },
    { id: 'registration-cost', label: '등기비용', footerLabel: '등기비용 계산기', path: 'tools/registration-cost/' },
    { id: 'rent-vs-monthly', label: '전세 vs 월세', footerLabel: '전세 vs 월세 비교', path: 'tools/rent-vs-monthly/' },
    { id: 'rent-conversion', label: '전월세 전환', footerLabel: '전월세 전환 계산기', path: 'tools/rent-conversion/' }
  ];
  const toolLinks = [...primaryLinks, ...extraLinks];

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
    return `<a href="${join(root, item.path)}"${current}>${item.footerLabel}<span aria-hidden="true">→</span></a>`;
  }

  function addDisclaimer(body, activeTool) {
    if (activeTool === 'calculator-notice' || document.querySelector('.v2-tool-disclaimer')) return;
    const main = body.querySelector('main');
    if (!main) return;

    if (!document.getElementById('v2-tool-disclaimer-style')) {
      const style = document.createElement('style');
      style.id = 'v2-tool-disclaimer-style';
      style.textContent = `
        .v2-tool-disclaimer {
          margin: 12px 0 0;
          color: #7a859a;
          font-size: 11px;
          line-height: 1.6;
        }
        @media (max-width: 560px) {
          .v2-tool-disclaimer { font-size: 10px; }
        }`;
      document.head.appendChild(style);
    }

    const notice = document.createElement('p');
    notice.className = 'v2-tool-disclaimer';
    notice.textContent = '계산 결과는 참고용입니다. 실제 적용 전 공식 기준을 확인하세요.';

    const result = main.querySelector('.result');
    if (result) result.insertAdjacentElement('afterend', notice);
    else main.appendChild(notice);
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
            ${primaryLinks.map((item) => renderLink(item, root, activeTool)).join('')}
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

    addDisclaimer(body, activeTool);

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
            <a class="v2-tool-footer__notice" href="${join(root, 'tools/calculator-notice/')}"${activeTool === 'calculator-notice' ? ' aria-current="page"' : ''}>계산기 이용안내 <span aria-hidden="true">→</span></a>
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
