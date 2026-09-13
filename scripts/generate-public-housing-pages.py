from __future__ import annotations

import html
import json
import re
from datetime import date, datetime
from pathlib import Path

SOURCE = Path('.cache-home-stats/public_housing_notices.json')
OUT_ROOT = Path('public-housing/notices')
ROUTES_PATH = Path('public-housing/routes.json')

CURATED_ROUTES = {
    'SH:seq:309337': '/public-housing/sh-happy-housing-2026-2/',
    'SH:seq:309403': '/public-housing/sh-long-vacant-purchase-2026-2/',
    'SH:seq:309467': '/public-housing/sh-longterm-jeonse-51/',
    'SH:seq:310107': '/public-housing/sh-long-vacant-purchase-2026-2/',
}

RESULT_MARKERS = re.compile(
    r'발표|최종\s*청약접수\s*결과|계약결과|당첨|선정결과|서류심사\s*대상자|재계약\s*안내|입주안내문',
    re.I,
)
RECRUIT_MARKERS = re.compile(
    r'모집공고|입주자\s*모집|예비입주자\s*모집|행복주택.*모집|매입임대.*모집|전세임대.*모집|임대주택.*모집',
    re.I,
)


def esc(value: object) -> str:
    return html.escape(str(value or ''), quote=True)


def parse_date(value: object) -> date | None:
    m = re.search(r'(20\d{2})[-./](\d{1,2})[-./](\d{1,2})', str(value or ''))
    if not m:
        return None
    try:
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return None


def fmt_date(value: object, *, short: bool = False) -> str:
    d = parse_date(value)
    if not d:
        return '확인 중'
    if short:
        return f'{d.month}/{d.day}'
    return f'{d.year}년 {d.month}월 {d.day}일'


def clean_title(value: object) -> str:
    return re.sub(r'\s+', ' ', str(value or '').replace('&nbsp;', ' ')).strip()


def is_recruitment(item: dict) -> bool:
    title = clean_title(item.get('title'))
    if not title or RESULT_MARKERS.search(title):
        return False
    return bool(RECRUIT_MARKERS.search(title))


def notice_slug(item: dict) -> str:
    raw = str(item.get('id') or '').strip().lower()
    patterns = (
        (r'^sh:seq:(\d+)$', 'sh-'),
        (r'^lh:panid:([a-z0-9_-]+)$', 'lh-'),
        (r'^shyouth:([a-z0-9_-]+)$', 'shyouth-'),
        (r'^seoul:([a-z0-9_-]+)$', 'seoul-'),
    )
    for pattern, prefix in patterns:
        m = re.match(pattern, raw)
        if m:
            return prefix + m.group(1)
    safe = re.sub(r'[^a-z0-9]+', '-', raw).strip('-')
    return safe or 'notice'


def route_for(item: dict) -> str:
    item_id = str(item.get('id') or '')
    if item_id in CURATED_ROUTES:
        return CURATED_ROUTES[item_id]
    return f'/public-housing/notices/{notice_slug(item)}/'


def direct_official_url(item: dict) -> bool:
    url = str(item.get('url') or '')
    return bool(
        re.match(r'^https://', url, re.I)
        and (
            ('i-sh.co.kr' in url and ('/view.do' in url or re.search(r'[?&]seq=\d+', url)))
            or ('apply.lh.or.kr' in url and 'selectWrtancInfo.do' in url)
            or ('housing.seoul.go.kr/site/main/board/notice/' in url)
        )
    )


def state(item: dict) -> str:
    today = date.today()
    start = parse_date(item.get('application_start'))
    end = parse_date(item.get('deadline'))
    if end and end < today:
        return '접수 마감'
    if start and start == today:
        if end and end == today:
            return '오늘 접수일'
        return '오늘 접수 시작'
    if start and start > today:
        return '접수 예정'
    if end and end == today:
        return '오늘 접수마감'
    if start and end and start < today < end:
        return '접수 중'
    if item.get('open_state') in {'접수중', '마감임박'}:
        return '접수 중'
    return '일정 확인 중'


def schedule_rows(item: dict) -> list[tuple[str, str]]:
    windows = item.get('application_windows')
    if isinstance(windows, list) and windows:
        rows = []
        for window in windows:
            if not isinstance(window, dict):
                continue
            start = fmt_date(window.get('start'), short=True)
            end = fmt_date(window.get('end') or window.get('start'), short=True)
            label = str(window.get('label') or '접수')
            rows.append((label, start if start == end else f'{start}~{end}'))
        if rows:
            return rows
    start = fmt_date(item.get('application_start'), short=True)
    end = fmt_date(item.get('deadline'), short=True)
    if start == '확인 중' and end == '확인 중':
        return [('신청', '일정 확인 중')]
    if start == '확인 중':
        return [('신청 마감', end)]
    if end == '확인 중':
        return [('신청 시작', start)]
    return [('신청', start if start == end else f'{start}~{end}')]


def lead_text(item: dict) -> str:
    s = state(item)
    start = fmt_date(item.get('application_start'), short=True)
    end = fmt_date(item.get('deadline'), short=True)
    if s in {'오늘 접수 시작', '오늘 접수일', '접수 중', '오늘 접수마감'}:
        return f'현재 신청 일정이 진행 중입니다. 오늘 할 일은 접수 가능 날짜와 본인 대상 여부를 공식 공고에서 다시 맞춘 뒤 신청 화면으로 이동하는 것입니다. 확인된 일정은 {start}~{end}입니다.'
    if s == '접수 예정':
        return f'아직 접수 전입니다. 지금은 신청 시작일 {start} 전에 대상·무주택·소득·자산과 필요한 서류를 먼저 확인하세요. 확인된 마감일은 {end}입니다.'
    if s == '접수 마감':
        return '현재 확인된 신청기간은 끝났습니다. 이미 신청했다면 서류심사 대상자 발표, 추가서류 요청, 예비입주자 순번 등 후속 일정을 기관 공지에서 확인하세요.'
    return '공고는 확인됐지만 신청 일정 일부가 아직 공개 피드에서 확인되지 않았습니다. 대상·자격을 단정하지 말고 공식 공고 원문에서 접수일과 제출서류를 먼저 확인하세요.'


def schedule_table(item: dict) -> str:
    rows = ''.join(
        f'<tr><th scope="row">{esc(label)}</th><td>{esc(period)}</td></tr>'
        for label, period in schedule_rows(item)
    )
    note = esc(item.get('schedule_note'))
    note_html = f'<p class="note">{note}</p>' if note else ''
    return (
        '<table style="width:100%;border-collapse:collapse">'
        '<thead><tr><th style="text-align:left;padding:9px;border-bottom:1px solid #dfe5ec">구분</th>'
        '<th style="text-align:left;padding:9px;border-bottom:1px solid #dfe5ec">확인된 일정</th></tr></thead>'
        f'<tbody>{rows}</tbody></table>{note_html}'
    )


def tag_text(values: object) -> str:
    if not isinstance(values, list):
        return ''
    return ' · '.join(str(v) for v in values if v)


def render_page(item: dict, route: str) -> str:
    title = clean_title(item.get('title'))
    agency = str(item.get('agency') or item.get('agency_group') or '임대주택')
    housing = tag_text(item.get('housing_types')) or '임대주택'
    audiences = tag_text(item.get('audiences'))
    region = str(item.get('region') or '서울')
    published = fmt_date(item.get('published_at'))
    start = fmt_date(item.get('application_start'))
    deadline = fmt_date(item.get('deadline'))
    status = state(item)
    official = str(item.get('url') or '')
    source = str(item.get('source') or agency)
    schedule_source = str(item.get('schedule_source') or '공개 공고목록')
    verified = direct_official_url(item) and (parse_date(item.get('application_start')) or parse_date(item.get('deadline')))
    robots = 'index,follow' if verified else 'noindex,follow'
    audience_line = (
        f'공개 피드에서는 <strong>{esc(audiences)}</strong> 대상으로 분류돼 있습니다. 최종 대상 구분은 공식 공고의 신청자격 표를 기준으로 확인하세요.'
        if audiences
        else '공개 피드만으로는 신청대상을 한 가지로 단정하지 않습니다. 공식 공고의 공급대상·순위·우선공급 구분을 본인 상황과 직접 대조하세요.'
    )
    source_label = '공식 원문 열기 →' if direct_official_url(item) else '기관 공고목록 열기 →'
    youth_link = '<a class="alt" href="/tools/youth-score/">청년임대 계산기</a>' if '청년' in audiences else ''
    canonical = f'https://rent-check.kr{route}'
    schema = ''
    if robots.startswith('index'):
        date_published = parse_date(item.get('published_at'))
        schema_obj = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            'headline': title,
            'mainEntityOfPage': canonical,
            'publisher': {'@type': 'Organization', '@id': 'https://rent-check.kr/#organization', 'name': 'Rent Check'},
        }
        if date_published:
            schema_obj['datePublished'] = date_published.isoformat()
        schema = f'<script type="application/ld+json">{json.dumps(schema_obj, ensure_ascii=False, separators=(",", ":"))}</script>'

    official_button = (
        f'<a href="{esc(official)}" target="_blank" rel="noopener">{source_label}</a>'
        if official.startswith('http') else ''
    )

    return f'''<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#ffffff">
  <meta name="robots" content="{robots}">
  <title>{esc(title)} | Rent Check</title>
  <meta name="description" content="{esc(agency)} {esc(title)}의 공고일, 신청기간, 대상 분류와 지금 확인할 일을 Rent Check에서 정리합니다.">
  <link rel="canonical" href="{esc(canonical)}">
  <link rel="stylesheet" href="/public-housing/public-housing.css?v=20260829-1">
  {schema}
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-MPRR3J99YQ"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','G-MPRR3J99YQ');</script>
  <meta property="og:site_name" content="Rent Check"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="신청기간부터 먼저 확인하는 Rent Check 임대주택 공고 안내"><meta property="og:url" content="{esc(canonical)}"><meta property="og:type" content="article"><meta property="og:image" content="https://rent-check.kr/assets/share/rent-check-og-v2.png?v=20260829-2">
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="신청기간·대상·확인 순서를 짧게 정리합니다."><meta name="twitter:image" content="https://rent-check.kr/assets/share/rent-check-og-v2.png?v=20260829-2">
</head>
<body>
<header class="site-head"><div class="site-head-inner"><a class="brand" href="/">Rent Check <b>강서</b></a><a class="home-link" href="/">홈으로</a></div></header>
<main class="housing-detail">
  <a class="housing-back" href="/public-housing/">← 임대주택 모집공고</a>
  <article>
    <section class="housing-hero">
      <p class="kicker">{esc(agency)} · {esc(status)}</p>
      <h1>{esc(title)}</h1>
      <p class="lead">{esc(lead_text(item))}</p>
    </section>
    <div class="grid">
      <div class="card"><span>공고일</span><strong>{esc(published)}</strong></div>
      <div class="card"><span>신청 시작</span><strong>{esc(start)}</strong></div>
      <div class="card"><span>신청 마감</span><strong>{esc(deadline)}</strong></div>
      <div class="card"><span>지역·유형</span><strong>{esc(region)} · {esc(housing)}</strong></div>
    </div>
    <section class="section">
      <h2>신청 일정부터 확인하세요</h2>
      {schedule_table(item)}
      <p>공고일과 신청일은 같은 날이 아닐 수 있습니다. 접수일이 여러 순위로 나뉜 공고는 <strong>본인 순위에 해당하는 날짜</strong>를 따로 확인해야 합니다.</p>
    </section>
    <section class="section">
      <h2>누가 먼저 확인해야 하나요?</h2>
      <p>{audience_line}</p>
      <ul><li>공급유형: <span class="point">{esc(housing)}</span></li><li>지역: <span class="point">{esc(region)}</span></li><li>무주택·소득·자산·자동차 기준은 공고별로 다를 수 있으므로 공식 자격표를 최종 기준으로 봅니다.</li></ul>
    </section>
    <section class="section">
      <h2>지금 할 일</h2>
      <ol><li><strong>내 신청 날짜</strong>를 먼저 표시합니다.</li><li>본인에게 해당하는 공급대상·순위·우선공급 여부를 공식 공고에서 찾습니다.</li><li>소득·자산·자동차·무주택 기준을 공고일 기준으로 다시 확인합니다.</li><li>신청 후 서류제출 방식이 별도라면 신청 완료와 서류제출을 같은 단계로 보지 않습니다.</li></ol>
      <div class="cta"><strong>날짜가 맞아도 자격이 자동으로 확정되는 것은 아닙니다.</strong> Rent Check는 일정과 확인 순서를 정리하고, 최종 자격은 기관 공고문을 기준으로 확인합니다.</div>
    </section>
    <section class="section">
      <h2>자료 확인 기준</h2>
      <p>이 페이지는 <strong>{esc(source)}</strong>에서 수집된 공고 정보를 바탕으로 만들었습니다. 일정 확인 방식은 <strong>{esc(schedule_source)}</strong>입니다. 공고가 정정되거나 접수일이 바뀌면 공개 피드와 이 안내도 다음 갱신 때 함께 바뀔 수 있습니다.</p>
      <p>신청 직전에는 기관 원문에서 접수시간, 제출서류 발급기준, 중복신청 제한, 공급주택 목록을 다시 확인하는 것이 안전합니다.</p>
      <div class="housing-links">{official_button}<a class="alt" href="/blog/public-housing-application-documents/">신청 후 서류 순서</a>{youth_link}<a class="alt" href="/public-housing/">다른 LH·SH 공고</a></div>
      <p class="note">Rent Check 공고 안내 · 공고 ID {esc(item.get('id'))}. 공식 기관의 최신 공고와 후속 정정 공지가 최종 기준입니다.</p>
    </section>
  </article>
</main>
<script type="text/javascript" src="//wcs.pstatic.net/wcslog.js"></script><script type="text/javascript">if(!wcs_add)var wcs_add={{}};wcs_add["wa"]="1a98778bd0f06a0";if(window.wcs)wcs_do();</script>
</body>
</html>
'''


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f'missing source feed: {SOURCE}')
    data = json.loads(SOURCE.read_text(encoding='utf-8'))
    items = [item for item in data.get('items', []) if isinstance(item, dict) and is_recruitment(item)]
    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    routes = dict(CURATED_ROUTES)
    generated = 0
    for item in items:
        item_id = str(item.get('id') or '')
        route = route_for(item)
        routes[item_id] = route
        if item_id in CURATED_ROUTES:
            continue
        folder = OUT_ROOT / notice_slug(item)
        folder.mkdir(parents=True, exist_ok=True)
        (folder / 'index.html').write_text(render_page(item, route), encoding='utf-8')
        generated += 1

    payload = {
        'generated_at': datetime.now().astimezone().isoformat(timespec='seconds'),
        'source_generated_at': data.get('generated_at', ''),
        'recruitment_count': len(items),
        'generated_count': generated,
        'routes': routes,
    }
    ROUTES_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'public housing recruitment pages: {len(items)} notices, {generated} generated, {len(items)-generated} curated')


if __name__ == '__main__':
    main()
