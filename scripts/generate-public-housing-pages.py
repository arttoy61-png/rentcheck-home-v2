from __future__ import annotations

import html
import json
import re
from datetime import date, datetime
from pathlib import Path

SOURCE = Path('.cache-home-stats/public_housing_notices.json')
OUT_ROOT = Path('public-housing/notices')
ROUTES_PATH = Path('public-housing/routes.json')
CURRENT_PATH = Path('public-housing/current.json')
OVERRIDES_PATH = Path('public-housing/editorial-overrides.json')
SUPPLEMENTS_PATH = Path('public-housing/source-supplements.json')
SITEMAP_PATH = Path('public-housing/sitemap.xml')
STYLE_VERSION = '20260913-3'

CURATED_ROUTES = {
    'SH:seq:309337': '/public-housing/sh-happy-housing-2026-2/',
    'SH:seq:309403': '/public-housing/sh-long-vacant-purchase-2026-2/',
    'SH:seq:309467': '/public-housing/sh-longterm-jeonse-51/',
    'SH:seq:310107': '/public-housing/sh-long-vacant-purchase-2026-2/',
}

OFFICIAL_FALLBACKS: dict[str, tuple[str, str]] = {
    'SHYOUTH:fa01df725a9d3ceaf32c': (
        'https://housing.seoul.go.kr/site/main/sh/publicSale/view?cp=1&seq=7&supplyType=publicSale',
        '서울주거포털 공고 상세 →',
    ),
    'SHYOUTH:807ba55b1308f4dedf26': (
        'https://housing.seoul.go.kr/site/main/sh/publicSale/view?cp=1&seq=6&splyCd=01&supplyType=publicSale',
        '서울주거포털 공고 상세 →',
    ),
    'SHYOUTH:a33e18d6d2d8ccdc889a': (
        'https://housing.seoul.go.kr/site/main/sh/publicLease/view?cp=1&seq=3&splyCd=22&supplyType=publicLease',
        '서울주거포털 공고 상세 →',
    ),
    'SHYOUTH:f55e60eb7f854e40f169': (
        'https://housing.seoul.go.kr/site/main/sh/publicLease/list?cp=1&supplyType=publicLease',
        '서울주거포털에서 공고 확인 →',
    ),
}

RESULT_MARKERS = re.compile(
    r'발표|최종\s*청약접수\s*결과|계약결과|당첨|선정결과|서류심사\s*대상자|재계약\s*안내|입주안내문',
    re.I,
)
RECRUIT_MARKERS = re.compile(
    r'모집공고|모집\s*공고|입주자\s*모집|예비입주자\s*모집|행복주택.*모집|매입임대.*모집|전세임대.*모집|임대주택.*모집',
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


def normalize_duplicate_title(value: object) -> str:
    title = clean_title(value)
    title = re.sub(r'^(?:\[정정공고\]|\[정정\]|\(정정\)|\(수정\))\s*', '', title, flags=re.I)
    title = re.sub(r'^매입(?=20\d{2}년)', '', title)
    return re.sub(r'\s+', '', title).lower()


def duplicate_key(item: dict) -> str:
    published = parse_date(item.get('published_at'))
    published_key = published.isoformat() if published else ''
    return f'{published_key}|{normalize_duplicate_title(item.get("title"))}'


def direct_official_url(item: dict) -> bool:
    url = str(item.get('official_url') or item.get('url') or '')
    return bool(
        re.match(r'^https://', url, re.I)
        and (
            ('i-sh.co.kr' in url and ('/view.do' in url or re.search(r'[?&]seq=\d+', url)))
            or ('apply.lh.or.kr' in url and 'selectWrtancInfo.do' in url)
            or ('housing.seoul.go.kr/site/main/board/notice/' in url)
        )
    )


def official_link(item: dict) -> tuple[str, str]:
    url = str(item.get('official_url') or item.get('url') or '')
    if direct_official_url(item):
        return url, '공식 모집공고 원문 →'
    fallback = OFFICIAL_FALLBACKS.get(str(item.get('id') or ''))
    if fallback:
        return fallback
    if url.startswith('http'):
        return url, '기관 공고목록에서 확인 →'
    return '', ''


def load_editorial_overrides() -> dict[str, dict]:
    if not OVERRIDES_PATH.exists():
        return {}
    data = json.loads(OVERRIDES_PATH.read_text(encoding='utf-8'))
    return data if isinstance(data, dict) else {}


def load_source_supplements() -> list[dict]:
    if not SUPPLEMENTS_PATH.exists():
        return []
    data = json.loads(SUPPLEMENTS_PATH.read_text(encoding='utf-8'))
    items = data.get('items', []) if isinstance(data, dict) else data
    return [item for item in items if isinstance(item, dict)] if isinstance(items, list) else []


def merge_source_items(source_items: list[dict], supplements: list[dict]) -> list[dict]:
    """Add missed notices and patch known-bad upstream fields with verified official values."""
    merged = [dict(item) for item in source_items]
    positions = {
        str(item.get('id') or ''): idx
        for idx, item in enumerate(merged)
        if str(item.get('id') or '')
    }
    for item in supplements:
        item_id = str(item.get('id') or '')
        patch = {key: value for key, value in item.items() if key != 'supplement_note'}
        if item_id and item_id in positions:
            merged[positions[item_id]].update(patch)
        else:
            merged.append(dict(patch))
            if item_id:
                positions[item_id] = len(merged) - 1
    return merged


def apply_editorial_override(item: dict, overrides: dict[str, dict]) -> dict:
    override = overrides.get(str(item.get('id') or ''))
    if not isinstance(override, dict):
        return item
    allowed = {
        'application_start', 'deadline', 'application_windows', 'schedule_note',
        'audiences', 'housing_types', 'editorial_notes', 'official_url', 'editorial_ready',
    }
    merged = dict(item)
    for key in allowed:
        if key in override:
            merged[key] = override[key]
    return merged


def prefer_item(current: dict, candidate: dict) -> dict:
    def score(item: dict) -> tuple[int, int, int, int, int]:
        item_id = str(item.get('id') or '')
        return (
            1 if item_id in CURATED_ROUTES else 0,
            1 if direct_official_url(item) else 0,
            1 if re.match(r'^SH:seq:', item_id, re.I) else 0,
            1 if parse_date(item.get('application_start')) else 0,
            1 if parse_date(item.get('deadline')) else 0,
        )

    return candidate if score(candidate) > score(current) else current


def dedupe_recruitments(items: list[dict]) -> tuple[list[dict], dict[str, list[str]]]:
    groups: dict[str, dict] = {}
    members: dict[str, list[str]] = {}
    order: list[str] = []

    for item in items:
        key = duplicate_key(item)
        item_id = str(item.get('id') or '')
        if key not in groups:
            groups[key] = item
            members[key] = [item_id] if item_id else []
            order.append(key)
            continue
        groups[key] = prefer_item(groups[key], item)
        if item_id and item_id not in members[key]:
            members[key].append(item_id)

    canonical_items = [groups[key] for key in order]
    alias_map = {
        str(groups[key].get('id') or ''): members[key]
        for key in order
        if str(groups[key].get('id') or '')
    }
    return canonical_items, alias_map


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


def natural_route(item: dict) -> str:
    return f'/public-housing/notices/{notice_slug(item)}/'


def canonical_route(item: dict, member_ids: list[str]) -> str:
    curated = {CURATED_ROUTES[item_id] for item_id in member_ids if item_id in CURATED_ROUTES}
    if len(curated) > 1:
        raise SystemExit(f'conflicting curated routes for duplicate notice: {member_ids}')
    if curated:
        return next(iter(curated))
    item_id = str(item.get('id') or '')
    if item_id in CURATED_ROUTES:
        return CURATED_ROUTES[item_id]
    return natural_route(item)


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


def indexable_auto_page(item: dict) -> bool:
    """Keep thin/expired auto summaries out of search until they are useful."""
    if item.get('editorial_ready') is True and direct_official_url(item):
        return True
    return bool(
        direct_official_url(item)
        and str(item.get('schedule_source') or '') == 'official_detail_html'
        and parse_date(item.get('application_start'))
        and parse_date(item.get('deadline'))
        and state(item) != '접수 마감'
    )


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
        return f'현재 신청 일정이 진행 중입니다. 확인된 접수기간은 {start}~{end}입니다. 오늘은 본인 대상·순위와 실제 접수방법을 공식 공고에서 마지막으로 맞춘 뒤 신청하세요.'
    if s == '접수 예정':
        return f'아직 접수 전입니다. 신청 시작일 {start} 전에 본인 대상·순위와 접수방법을 확인하고, 마감일 {end}까지 필요한 준비를 끝내세요.'
    if s == '접수 마감':
        return '신청기간은 끝났습니다. 이미 신청했다면 접수번호를 보관하고 서류심사 대상자·당첨자·예비입주자 등 다음 단계 공지를 확인하세요.'
    return '모집공고는 확인됐지만 신청 일정 일부가 공개 피드에서 확인되지 않았습니다. 공식 공고에서 접수일·접수방법·제출서류부터 확인하세요.'


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


def schedule_source_label(item: dict) -> str:
    return {
        'official_detail_html': '기관 공식 상세 공고에서 일정 확인',
        'verified_regression': '공식 공고와 기존 확인값을 대조해 일정 확인',
        'source_list': '기관 공고목록 기준으로 일정 확인',
    }.get(str(item.get('schedule_source') or ''), '기관 공개자료 기준으로 일정 확인')


def specific_notes(item: dict) -> list[str]:
    title = clean_title(item.get('title'))
    types = set(str(v) for v in item.get('housing_types') or [])
    notes: list[str] = []
    manual_notes = item.get('editorial_notes')
    if isinstance(manual_notes, list):
        notes.extend(str(note).strip() for note in manual_notes if str(note).strip())

    if re.search(r'정정', title):
        notes.append('정정 공고입니다. 최초 공고보다 정정된 공고의 일정·자격·첨부파일을 우선해서 확인하세요.')
    if re.search(r'예비입주자', title):
        notes.append('예비입주자 모집입니다. 선정돼도 즉시 입주가 확정되는 것은 아니므로 순번과 실제 공가 발생 여부를 후속 안내에서 확인해야 합니다.')
    if re.search(r'잔여세대', title):
        notes.append('잔여세대 모집입니다. 제목의 잔여세대와 실제 계약 가능한 주택·입주시점은 공고의 주택목록과 후속 절차를 함께 봐야 합니다.')
    if re.search(r'수요자맞춤형|특화형|운영기관|두레주택', title):
        notes.append('맞춤형·특화형 성격이 있는 공고는 일반 청약과 접수방법이나 추가 자격이 다를 수 있으므로 운영기관·제출방식 항목을 먼저 확인하세요.')
    if re.search(r'재개발임대', title):
        notes.append('재개발임대 일반모집 공고입니다. 일반모집의 공급대상·순위표를 기준으로 보고 다른 재개발 특별공급 기준을 그대로 적용하지 마세요.')

    if '행복주택' in types:
        notes.append('행복주택은 신청 계층에 따라 자격과 제출서류가 달라질 수 있으므로 본인이 신청할 계층을 먼저 정한 뒤 해당 표를 확인하세요.')
    elif '국민임대' in types:
        notes.append('국민임대는 공급 면적과 순위에 따라 확인할 조건이 달라질 수 있으므로 단지명뿐 아니라 신청 면적·순위까지 같이 확인하세요.')
    elif '장기전세' in types:
        notes.append('장기전세·미리내집은 같은 공고 안에서도 공급유형과 면적별 조건이 달라질 수 있으므로 신청 주택과 본인 순위를 함께 확인하세요.')
    elif '매입임대' in types:
        notes.append('매입임대는 주택별 위치·임대조건이 다를 수 있으므로 신청 전 공급주택 목록과 해당 주택의 조건을 같이 확인하세요.')
    elif '공공임대' in types:
        notes.append('공공임대 모집은 신규 입주와 예비입주자 모집을 구분해 보고, 실제 입주시점은 후속 안내를 확인하세요.')
    elif '영구임대' in types:
        notes.append('영구임대는 공급대상 구분이 중요한 공고이므로 본인에게 해당하는 자격 항목을 공식 자격표에서 먼저 확인하세요.')

    start = fmt_date(item.get('application_start'), short=True)
    end = fmt_date(item.get('deadline'), short=True)
    if start != '확인 중' or end != '확인 중':
        if start != '확인 중' and end != '확인 중':
            notes.append(f'현재 피드에서 확인된 신청기간은 {start}~{end}입니다. 접수시간과 순위별 날짜는 공식 원문에서 다시 확인하세요.')
        elif start != '확인 중':
            notes.append(f'현재 확인된 신청 시작일은 {start}입니다. 마감일은 공식 원문에서 다시 확인하세요.')
        else:
            notes.append(f'현재 확인된 신청 마감일은 {end}입니다. 시작일은 공식 원문에서 다시 확인하세요.')

    if len(notes) < 2:
        housing = tag_text(item.get('housing_types')) or '임대주택'
        notes.append(f'공개 피드상 공급유형은 {housing}입니다. 실제 공고의 공급구분과 다르면 공식 원문을 우선합니다.')
    return notes[:4]


def action_items(item: dict) -> list[str]:
    s = state(item)
    if s == '접수 마감':
        return [
            '<strong>접수 완료 화면·접수번호</strong>가 있다면 보관합니다.',
            '서류심사 대상자 발표나 추가서류 요청이 있는지 공식 후속 공지를 확인합니다.',
            '예비입주자 공고라면 순번과 실제 입주 안내를 최종 당첨과 구분해서 확인합니다.',
            '공고가 정정되거나 후속 일정이 바뀌면 최신 기관 공지를 기준으로 다시 확인합니다.',
        ]
    if s in {'접수 예정', '오늘 접수 시작', '오늘 접수일', '접수 중', '오늘 접수마감'}:
        return [
            '<strong>내 신청 날짜와 마감시간</strong>을 먼저 표시합니다.',
            '본인에게 해당하는 공급대상·순위·우선공급 여부를 공식 공고에서 찾습니다.',
            '인터넷·방문·우편 등 실제 접수방법과 필요한 준비물을 확인합니다.',
            '신청을 마치면 완료 화면과 접수번호를 저장하고 다음 발표일을 따로 기록합니다.',
        ]
    return [
        '공식 공고 원문에서 접수 시작일·마감일·시간을 먼저 확인합니다.',
        '본인에게 해당하는 공급대상·순위와 무주택·소득·자산 기준을 확인합니다.',
        '인터넷·방문·우편 등 접수방법과 서류 제출 시점을 구분합니다.',
        '일정이 확정되면 마감시간과 다음 발표일을 따로 기록합니다.',
    ]



# Existing editorial guides; schedules and public notice routes are unchanged.
EDITORIAL_GUIDES = {'LH:panId:2015122300020753': '/blog/gangseo-yeomchang-integrated-public-rental-2026/', 'LH:panId:2015122300020759': '/blog/lh-seoul-youth-purchase-rental-2026-3/', 'LH:panId:2015122300020750': '/blog/lh-seoul-newlywed-purchase-rental-1-2026-3/', 'LH:panId:2015122300020749': '/blog/lh-seoul-newlywed-purchase-rental-2-2026-3/'}

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
    source = str(item.get('source') or agency)
    indexable = indexable_auto_page(item)
    robots = 'index,follow' if indexable else 'noindex,follow'
    audience_line = (
        f'공개 피드에서는 <strong>{esc(audiences)}</strong> 대상으로 분류돼 있습니다. 최종 대상 구분은 공식 공고의 신청자격 표를 기준으로 확인하세요.'
        if audiences
        else '공개 피드만으로 신청대상을 한 가지로 단정하지 않습니다. 공식 공고의 공급대상·순위·우선공급 표에서 본인 조건을 직접 맞춰보세요.'
    )
    official_url, source_label = official_link(item)
    youth_link = '<a class="alt" href="/tools/youth-score/">청년임대 계산기</a>' if '청년' in audiences else ''
    guide_url = EDITORIAL_GUIDES.get(str(item.get('id') or ''), '')
    editorial_button = (
        f'<a class="alt" href="{esc(guide_url)}">이 공고의 신청 가이드 →</a>'
        if guide_url and Path(guide_url.lstrip('/') + 'index.html').is_file() else ''
    )
    canonical = f'https://rent-check.kr{route}'
    schema = ''
    if indexable:
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
        f'<a href="{esc(official_url)}" target="_blank" rel="noopener">{esc(source_label)}</a>'
        if official_url.startswith('http') else ''
    )
    notes_html = ''.join(f'<li>{esc(note)}</li>' for note in specific_notes(item))
    actions_html = ''.join(f'<li>{text}</li>' for text in action_items(item))
    checked = fmt_date(date.today().isoformat())

    return f'''<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#ffffff">
  <meta name="robots" content="{robots}">
  <title>{esc(title)} | Rent Check</title>
  <meta name="description" content="{esc(agency)} {esc(title)}의 공고일, 신청기간, 공급유형과 지금 확인할 순서를 Rent Check에서 정리합니다.">
  <link rel="canonical" href="{esc(canonical)}">
  <link rel="stylesheet" href="/public-housing/public-housing.css?v={STYLE_VERSION}">
  {schema}
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-MPRR3J99YQ"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','G-MPRR3J99YQ');</script>
  <meta property="og:site_name" content="Rent Check"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="신청기간과 공고별 확인 포인트를 먼저 보는 Rent Check 임대주택 안내"><meta property="og:url" content="{esc(canonical)}"><meta property="og:type" content="article"><meta property="og:image" content="https://rent-check.kr/assets/share/rent-check-og-v2.png?v=20260829-2">
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="신청기간·공급유형·공고별 확인 포인트를 정리합니다."><meta name="twitter:image" content="https://rent-check.kr/assets/share/rent-check-og-v2.png?v=20260829-2">
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
      <h2>이 공고에서 먼저 볼 것</h2>
      <ul>{notes_html}</ul>
    </section>
    <section class="section">
      <h2>신청 일정</h2>
      {schedule_table(item)}
      <p>공고일과 신청일은 같은 날이 아닐 수 있습니다. 순위별 접수일이 나뉜 공고는 <strong>본인 순위 날짜와 마감시간</strong>을 따로 확인하세요.</p>
    </section>
    <section class="section">
      <h2>누가 확인해야 하나요?</h2>
      <p>{audience_line}</p>
      <ul><li>공급유형: <span class="point">{esc(housing)}</span></li><li>지역: <span class="point">{esc(region)}</span></li><li>무주택·소득·자산·자동차 등 세부 기준은 공고별로 다르므로 공식 자격표를 최종 기준으로 봅니다.</li></ul>
    </section>
    <section class="section">
      <h2>지금 할 일</h2>
      <ol>{actions_html}</ol>
      <div class="cta"><strong>Rent Check는 일정과 확인 순서를 정리합니다.</strong> 최종 신청자격·공급주택·접수방법은 기관의 최신 공고와 정정 공지가 기준입니다.</div>
    </section>
    <section class="section">
      <h2>자료 확인 기준</h2>
      <p><strong>{esc(source)}</strong>에서 수집한 공고 정보를 바탕으로 정리했습니다. {esc(schedule_source_label(item))}했습니다.</p>
      <p>마지막 자동 확인일은 <strong>{esc(checked)}</strong>입니다. 신청 직전에는 공식 원문에서 접수시간, 제출서류 발급기준, 중복신청 제한, 공급주택 목록을 다시 확인하세요.</p>
      <div class="housing-links">{editorial_button}{official_button}<a class="alt" href="/blog/public-housing-application-documents/">신청 후 서류 순서</a>{youth_link}<a class="alt" href="/public-housing/">다른 LH·SH 공고</a></div>
      <p class="note">Rent Check 공고 안내 · 공고 ID {esc(item.get('id'))}. 공식 기관의 최신 공고와 후속 정정 공지가 최종 기준입니다.</p>
    </section>
  </article>
</main>
<script type="text/javascript" src="//wcs.pstatic.net/wcslog.js"></script><script type="text/javascript">if(!wcs_add)var wcs_add={{}};wcs_add["wa"]="1a98778bd0f06a0";if(window.wcs)wcs_do();</script>
</body>
</html>
'''


def render_redirect(route: str) -> str:
    canonical = f'https://rent-check.kr{route}'
    return f'''<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="{esc(canonical)}">
  <meta http-equiv="refresh" content="0;url={esc(route)}">
  <title>모집공고 안내 이동 | Rent Check</title>
  <script>location.replace({json.dumps(route, ensure_ascii=False)});</script>
</head>
<body><p><a href="{esc(route)}">같은 모집공고의 Rent Check 안내글로 이동 →</a></p></body>
</html>
'''


def manifest_item(item: dict, route: str) -> dict:
    result = dict(item)
    official_url, official_label = official_link(item)
    result['route'] = route
    result['official_url'] = official_url
    result['official_link_label'] = official_label
    result['indexable'] = route in CURATED_ROUTES.values() or indexable_auto_page(item)
    return result


def write_public_housing_sitemap(items: list[dict]) -> None:
    routes: dict[str, str] = {
        '/public-housing/': date.today().isoformat(),
        '/public-housing/sh-happy-housing-2026-2/': date.today().isoformat(),
        '/public-housing/sh-long-vacant-purchase-2026-2/': date.today().isoformat(),
        '/public-housing/sh-longterm-jeonse-51/': date.today().isoformat(),
    }
    for item in items:
        route = str(item.get('route') or '')
        if route and item.get('indexable'):
            published = parse_date(item.get('published_at'))
            routes[route] = (published or date.today()).isoformat()
    body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for route, lastmod in routes.items():
        body.append(f'  <url><loc>https://rent-check.kr{esc(route)}</loc><lastmod>{esc(lastmod)}</lastmod></url>')
    body.append('</urlset>')
    SITEMAP_PATH.write_text('\n'.join(body) + '\n', encoding='utf-8')


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f'missing source feed: {SOURCE}')
    data = json.loads(SOURCE.read_text(encoding='utf-8'))
    overrides = load_editorial_overrides()
    upstream_items = [item for item in data.get('items', []) if isinstance(item, dict)]
    combined_items = merge_source_items(upstream_items, load_source_supplements())
    source_items = [apply_editorial_override(item, overrides) for item in combined_items]
    raw_items = [item for item in source_items if is_recruitment(item)]
    items, alias_map = dedupe_recruitments(raw_items)
    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    routes = dict(CURATED_ROUTES)
    generated = 0
    redirects = 0
    duplicate_groups = []
    manifest: list[dict] = []

    for item in items:
        canonical_id = str(item.get('id') or '')
        member_ids = alias_map.get(canonical_id, [canonical_id])
        route = canonical_route(item, member_ids)
        for item_id in member_ids:
            routes[item_id] = route

        if len(member_ids) > 1:
            duplicate_groups.append({'canonical_id': canonical_id, 'ids': member_ids, 'route': route})

        manifest.append(manifest_item(item, route))

        if route not in CURATED_ROUTES.values():
            folder = OUT_ROOT / notice_slug(item)
            folder.mkdir(parents=True, exist_ok=True)
            (folder / 'index.html').write_text(render_page(item, route), encoding='utf-8')
            generated += 1

        for alias_id in member_ids:
            if alias_id == canonical_id or alias_id in CURATED_ROUTES:
                continue
            alias_item = {'id': alias_id}
            alias_route = natural_route(alias_item)
            if alias_route == route:
                continue
            alias_folder = OUT_ROOT / notice_slug(alias_item)
            alias_folder.mkdir(parents=True, exist_ok=True)
            (alias_folder / 'index.html').write_text(render_redirect(route), encoding='utf-8')
            redirects += 1

    manifest.sort(
        key=lambda item: (
            parse_date(item.get('published_at')) or date.min,
            clean_title(item.get('title')),
        ),
        reverse=True,
    )

    payload = {
        'generated_at': datetime.now().astimezone().isoformat(timespec='seconds'),
        'source_generated_at': data.get('generated_at', ''),
        'source_recruitment_count': len(raw_items),
        'recruitment_count': len(items),
        'duplicate_count': len(raw_items) - len(items),
        'generated_count': generated,
        'redirect_count': redirects,
        'duplicate_groups': duplicate_groups,
        'routes': routes,
    }
    ROUTES_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    CURRENT_PATH.write_text(
        json.dumps(
            {
                'generated_at': payload['generated_at'],
                'source_generated_at': data.get('generated_at', ''),
                'recruitment_count': len(manifest),
                'items': manifest,
            },
            ensure_ascii=False,
            indent=2,
        ) + '\n',
        encoding='utf-8',
    )
    write_public_housing_sitemap(manifest)
    print(
        'public housing recruitment pages: '
        f'{len(items)} unique notices from {len(raw_items)} source items, '
        f'{generated} generated, {redirects} duplicate redirects, '
        f'{sum(1 for item in manifest if item.get("indexable"))} indexable canonical routes'
    )


if __name__ == '__main__':
    main()
