const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const state = { tools: [], posts: [], results: [], selectedIndex: -1 };
const categoryLabels = {
  rent: '매매·전세', safety: '매매·전세', tax: '세금·비용', invest: '투자 분석',
  youth: '청년 지원', redev: '재개발'
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function isAvailable(tool) {
  return tool?.status === 'available' && typeof tool.url === 'string' && tool.url.trim();
}

function statusLabel(tool) {
  if (tool?.status === 'in-development') return '개발 중';
  if (tool?.status === 'preparing') return '준비 중';
  return isAvailable(tool) ? '이용 가능' : '현재 이용할 수 없음';
}

function resolveToolLinks() {
  $$('[data-tool-link]').forEach(link => {
    const tool = state.tools.find(item => item.id === link.dataset.toolLink);
    if (isAvailable(tool)) {
      link.href = tool.url;
      link.removeAttribute('aria-disabled');
      link.removeAttribute('tabindex');
    } else {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('tabindex', '-1');
      if (link.classList.contains('market-tool-link')) link.textContent = '현재 이용할 수 없음';
    }
  });
}

function renderCalculators(tools = state.tools) {
  const grid = $('#calculatorGrid');
  grid.replaceChildren();
  if (!tools.length) {
    grid.append(element('p', 'data-unavailable', '도구 정보를 불러올 수 없습니다.'));
    return;
  }
  tools.forEach(tool => {
    const card = element(isAvailable(tool) ? 'a' : 'article', 'calculator-card');
    if (isAvailable(tool)) card.href = tool.url;
    else card.setAttribute('aria-disabled', 'true');
    card.append(element('span', 'calculator-icon', tool.icon || '·'));
    card.append(element('h3', '', tool.title || '이름 없는 도구'));
    card.append(element('p', '', tool.description || '설명이 없습니다.'));
    const status = isAvailable(tool) ? (tool.badge || statusLabel(tool)) : statusLabel(tool);
    card.append(element('span', `status${isAvailable(tool) ? ' available' : ''}`, status));
    grid.append(card);
  });
}

function renderServices() {
  const strip = $('#services');
  const services = [
    { title: '계산기 모음', detail: '부동산 계산 도구', icon: '⌁', url: '#calculators' },
    { title: '실거래 조회', detail: '최근 거래 흐름', icon: '⌂', toolId: 'apt-widget' },
    { title: '청년 지원 도구', detail: '청년주택 점수 확인', icon: '✓', toolId: 'youth-score' },
    { title: '재개발 분석', detail: '분담금과 사업성', icon: '▥', toolId: 'redevelopment' }
  ];
  strip.replaceChildren(...services.map(service => {
    const tool = service.toolId && state.tools.find(item => item.id === service.toolId);
    const url = service.url || (isAvailable(tool) ? tool.url : '');
    const item = element(url ? 'a' : 'div', 'service-item');
    if (url) item.href = url;
    else item.setAttribute('aria-disabled', 'true');
    item.append(element('span', 'service-icon', service.icon));
    const copy = element('span');
    copy.append(element('strong', '', service.title), element('small', '', url ? service.detail : '현재 이용할 수 없음'));
    item.append(copy);
    return item;
  }));
}

function renderInsights() {
  const track = $('#insightTrack');
  const featured = state.posts
    .filter(post => [1, 2, 3].includes(post?.featured_rank))
    .sort((a, b) => a.featured_rank - b.featured_rank);
  track.replaceChildren();
  if (!featured.length) {
    track.append(element('p', 'data-unavailable', '분석 글을 불러올 수 없습니다.'));
    return;
  }
  featured.forEach((post, index) => {
    const article = element('article', 'insight');
    const art = element('div', `insight-art art-${['one', 'two', 'three'][index]}`);
    art.append(element('span', '', post.category || '분석 글'));
    const body = element('div', 'insight-body');
    body.append(element('span', '', post.category || '분석 글'));
    body.append(element('h3', '', post.title || '제목 없는 글'));
    body.append(element('p', '', post.published_at || ''));
    if (typeof post.url === 'string' && post.url.trim()) {
      const link = element('a', 'insight-link', '분석 글 보기');
      link.href = post.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      body.append(link);
    }
    article.append(art, body);
    track.append(article);
  });
}

function normalized(value) { return String(value || '').trim().toLocaleLowerCase('ko-KR'); }

function searchData(query) {
  const needle = normalized(query);
  if (!needle) return [];
  const tools = state.tools.filter(tool => [tool.title, tool.description, tool.category].some(value => normalized(value).includes(needle)))
    .map(tool => ({ type: 'tool', title: tool.title, meta: tool.description, icon: tool.icon, valid: Boolean(isAvailable(tool)), url: tool.url, status: statusLabel(tool) }));
  const posts = state.posts.filter(post => [post.title, post.category].some(value => normalized(value).includes(needle)))
    .map(post => ({ type: 'post', title: post.title, meta: [post.category, post.published_at].filter(Boolean).join(' · '), valid: post.status === 'published' && Boolean(post.url), url: post.url }));
  return [...tools, ...posts].slice(0, 6);
}

function closeSearch() {
  $('#searchResults').hidden = true;
  $('#searchInput').setAttribute('aria-expanded', 'false');
  $('#searchInput').removeAttribute('aria-activedescendant');
  state.selectedIndex = -1;
}

function renderSearch() {
  const dropdown = $('#searchResults');
  const query = $('#searchInput').value.trim();
  if (!query) {
    state.results = [];
    dropdown.replaceChildren();
    closeSearch();
    return;
  }
  state.results = searchData(query);
  state.selectedIndex = -1;
  dropdown.replaceChildren();
  if (!state.results.length) dropdown.append(element('p', 'search-empty', '검색 결과가 없습니다.'));
  state.results.forEach((result, index) => {
    const item = element(result.valid ? 'a' : 'div', `search-result${result.valid ? '' : ' unavailable'}`);
    item.id = `search-result-${index}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'false');
    item.dataset.index = String(index);
    if (result.valid) {
      item.href = result.url;
      if (result.type === 'post') { item.target = '_blank'; item.rel = 'noopener noreferrer'; }
    } else item.setAttribute('aria-disabled', 'true');
    item.append(element('span', 'search-result-icon', result.type === 'tool' ? (result.icon || '·') : '▤'));
    const copy = element('span', 'search-result-copy');
    copy.append(element('strong', '', result.title || '제목 없음'), element('small', '', result.meta || ''));
    item.append(copy, element('span', 'search-result-type', result.type === 'tool' ? (result.valid ? '도구' : result.status) : '분석 글'));
    dropdown.append(item);
  });
  const all = element('a', 'search-all', '계산기 모음 보기');
  all.href = '#calculators';
  all.addEventListener('click', closeSearch);
  dropdown.append(all);
  dropdown.hidden = false;
  $('#searchInput').setAttribute('aria-expanded', 'true');
}

function moveSelection(direction) {
  if (!state.results.length) return;
  state.selectedIndex = (state.selectedIndex + direction + state.results.length) % state.results.length;
  $$('.search-result').forEach((item, index) => {
    const selected = index === state.selectedIndex;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-selected', String(selected));
    if (selected) item.scrollIntoView({ block: 'nearest' });
  });
  $('#searchInput').setAttribute('aria-activedescendant', `search-result-${state.selectedIndex}`);
}

async function loadData() {
  const load = async path => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Expected an array');
    return data;
  };
  const [toolsResult, postsResult] = await Promise.allSettled([load('./data/tools.json'), load('./data/posts.json')]);
  if (toolsResult.status === 'fulfilled') state.tools = toolsResult.value;
  if (postsResult.status === 'fulfilled') state.posts = postsResult.value;
  renderCalculators();
  renderServices();
  renderInsights();
  resolveToolLinks();
  $('#availableToolCount').textContent = String(state.tools.filter(isAvailable).length);
  $('#publishedCount').textContent = String(state.posts.filter(post => post?.status === 'published').length);
}

const menuToggle = $('#menuToggle');
const mobileNav = $('#mobileNav');
menuToggle.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
$$('#mobileNav a').forEach(link => link.addEventListener('click', () => { mobileNav.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); }));
$$('[data-to-top]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); history.replaceState(null, '', '#top'); window.scrollTo({ top: 0, behavior: 'smooth' }); }));

const searchInput = $('#searchInput');
searchInput.addEventListener('input', renderSearch);
searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) renderSearch(); });
searchInput.addEventListener('keydown', event => {
  if (event.key === 'Escape') { closeSearch(); return; }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); moveSelection(event.key === 'ArrowDown' ? 1 : -1); }
  if (event.key === 'Enter' && state.selectedIndex >= 0) {
    event.preventDefault();
    const selected = state.results[state.selectedIndex];
    if (selected?.valid) selected.type === 'post' ? window.open(selected.url, '_blank', 'noopener,noreferrer') : location.assign(selected.url);
  }
});
$('#searchForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!searchInput.value.trim()) {
    closeSearch();
    return;
  }
  renderSearch();
});
document.addEventListener('click', event => { if (!event.target.closest('.search-wrap')) closeSearch(); });

$$('.tabs button').forEach(button => button.addEventListener('click', () => {
  $$('.tabs button').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  const label = button.textContent.trim();
  renderCalculators(label === '전체' ? state.tools : state.tools.filter(tool => categoryLabels[tool.category] === label));
}));
$$('[data-auction-link]').forEach(link => link.addEventListener('click', () => {
  const investmentTab = $$('.tabs button').find(button => button.textContent.trim() === '투자 분석');
  investmentTab?.click();
}));
$$('.footer-group > button').forEach(button => button.addEventListener('click', () => { const open = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!open)); button.parentElement.classList.toggle('open', !open); }));

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('load', () => { if (!location.hash || location.hash === '#top') window.scrollTo(0, 0); });
loadData();
