const CONFIG = { auctionUrl: '#', youthUrl: '#' };

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const themeToggle = $('#themeToggle');
const menuToggle = $('#menuToggle');
const mobileNav = $('#mobileNav');
const toast = $('#toast');

function setTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('dark', dark);
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.setAttribute('aria-label', dark ? '라이트 모드 켜기' : '다크 모드 켜기');
  localStorage.setItem('rentcheck-theme', theme);
}

setTheme(localStorage.getItem('rentcheck-theme') || 'light');
themeToggle.addEventListener('click', () => setTheme(document.body.classList.contains('dark') ? 'light' : 'dark'));

menuToggle.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  menuToggle.classList.toggle('open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
});

$$('#mobileNav a').forEach(link => link.addEventListener('click', () => {
  mobileNav.classList.remove('open');
  menuToggle.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

$$('.footer-group h2 button').forEach(button => button.addEventListener('click', () => {
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  button.closest('.footer-group').classList.toggle('open', !expanded);
}));

const analysisToggle = $('.analysis-detail-toggle');
analysisToggle.addEventListener('click', () => {
  const expanded = analysisToggle.getAttribute('aria-expanded') === 'true';
  analysisToggle.setAttribute('aria-expanded', String(!expanded));
  $('#analysisDetail').classList.toggle('mobile-open', !expanded);
});

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

$('#searchForm').addEventListener('submit', event => {
  event.preventDefault();
  const query = $('#searchInput').value.trim();
  showToast(query ? `“${query}” 검색 결과를 준비하고 있습니다.` : '검색어를 입력해 주세요.');
});

$$('[data-query]').forEach(chip => chip.addEventListener('click', () => {
  $('#searchInput').value = chip.dataset.query;
  $('#searchInput').focus();
}));

$$('.action-card').forEach(card => card.addEventListener('click', event => {
  event.preventDefault();
  showToast(`${$('h3', card).textContent} 서비스가 곧 연결됩니다.`);
}));

$$('[data-tool]').forEach(card => card.addEventListener('click', event => {
  event.preventDefault();
  const url = CONFIG[`${card.dataset.tool}Url`];
  if (url && url !== '#') {
    window.location.href = url;
    return;
  }
  showToast('기존 계산기 주소를 app.js에 연결하면 바로 열립니다.');
}));

const calculatorModal = $('#calculatorModal');
let calculatorModalTrigger;

function closeCalculatorModal() {
  calculatorModal.classList.remove('open');
  calculatorModal.setAttribute('aria-hidden', 'true');
  calculatorModalTrigger?.focus();
}

$$('[data-coming]').forEach(card => card.addEventListener('click', () => {
  calculatorModalTrigger = card;
  $('#calculatorModalTitle').textContent = `${card.dataset.coming}는 준비 중입니다.`;
  calculatorModal.classList.add('open');
  calculatorModal.setAttribute('aria-hidden', 'false');
  $('.calculator-modal-confirm', calculatorModal).focus();
}));

$$('[data-calculator-close]').forEach(control => control.addEventListener('click', closeCalculatorModal));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && calculatorModal.classList.contains('open')) closeCalculatorModal();
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach(element => observer.observe(element));
} else {
  $$('.reveal').forEach(element => element.classList.add('visible'));
}
