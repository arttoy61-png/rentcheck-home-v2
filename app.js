const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const calculators = [
  ['전세가율 계산기', '매매가 대비 전세가율과 위험 수준을 확인합니다.', '준비 중', '％'],
  ['경매 계산기', '낙찰가와 취득비용, 예상 수익률을 계산합니다.', '연결 예정', '⚖'],
  ['취득세 계산기', '주택 취득 시 발생하는 세금과 비용을 정리합니다.', '준비 중', '₩'],
  ['실투자금 계산기', '취득비용과 대출을 반영한 실제 투자금을 계산합니다.', '준비 중', '↗'],
  ['재개발 분담금 계산기', '권리가액과 조합원 분양가로 예상 분담금을 확인합니다.', '준비 중', '▥'],
  ['월세·전세 환산기', '월세를 전세로, 전세를 월세로 바꿔 비교합니다.', '준비 중', '⇄'],
  ['중개보수 계산기', '거래 금액에 따른 중개보수 범위를 확인합니다.', '준비 중', '⌂'],
  ['청년주택 점수 계산기', '청년주택 신청 전 예상 점수를 확인합니다.', '연결 예정', '✓']
];

$('#calculatorGrid').innerHTML = calculators.map(([title, description, status, icon]) => `<button class="calculator-card" type="button" data-placeholder><span class="calculator-icon">${icon}</span><h3>${title}</h3><p>${description}</p><span class="status">${status}</span></button>`).join('');

let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}


const menuToggle = $('#menuToggle');
const mobileNav = $('#mobileNav');
menuToggle.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
$$('#mobileNav a').forEach(link => link.addEventListener('click', () => { mobileNav.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); }));

$$('[data-to-top]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); history.replaceState(null, '', '#top'); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
$('#searchForm').addEventListener('submit', event => { event.preventDefault(); const query = $('#searchInput').value.trim(); showToast(query ? `“${query}” 검색 기능은 준비 중입니다.` : '검색어를 입력해 주세요.'); });
$$('[data-placeholder]').forEach(button => button.addEventListener('click', () => showToast('이 기능은 현재 준비 중입니다.')));
$$('.tabs button').forEach(button => button.addEventListener('click', () => { $$('.tabs button').forEach(item => item.classList.remove('active')); button.classList.add('active'); }));
$$('.footer-group > button').forEach(button => button.addEventListener('click', () => { const open = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!open)); button.parentElement.classList.toggle('open', !open); }));

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('load', () => { if (!location.hash || location.hash === '#top') window.scrollTo(0, 0); });
