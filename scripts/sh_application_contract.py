"""SH-only application boundary. Posting/title dates are never application dates."""
from __future__ import annotations
import re
from datetime import date, datetime
from zoneinfo import ZoneInfo
from urllib.parse import urlsplit, parse_qs

TRUSTED = {'verified_official_pdf', 'official_detail_html', 'verified_regression', 'verified_application_windows'}
GUARDED = {'SH:seq:310673', 'SH:seq:310041'}


def is_sh(item):
    if re.match(r'^(?:SH:|SHYOUTH:)', str(item.get('id') or ''), re.I) or any(str(item.get(k) or '').upper() == 'SH' for k in ('agency_group', 'agency')):
        return True
    try:
        url = urlsplit(str(item.get('official_url') or item.get('url') or ''))
        return url.scheme == 'https' and url.hostname in {'www.i-sh.co.kr', 'i-sh.co.kr'}
    except ValueError:
        return False


def guarded_notice(item):
    if item.get('id') in GUARDED or re.search(r'신정도시마을.*잔여세대|2026년.*재개발임대주택.*일반모집', str(item.get('title') or '')):
        return True
    try:
        url = urlsplit(str(item.get('official_url') or item.get('url') or ''))
        return url.scheme == 'https' and url.hostname in {'www.i-sh.co.kr', 'i-sh.co.kr'} and 'SH:seq:' + parse_qs(url.query).get('seq', [''])[0] in GUARDED
    except ValueError:
        return False


def valid_day(value):
    if not isinstance(value, str) or not re.fullmatch(r'20\d{2}-\d{2}-\d{2}', value):
        return ''
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError:
        return ''


def valid_window(w):
    if not (isinstance(w, dict) and valid_day(w.get('start')) and valid_day(w.get('end')) and w['start'] <= w['end'] and isinstance(w.get('conditional'), bool) and isinstance(w.get('restricted'), bool)):
        return False
    if w.get('precision') == 'minute':
        try:
            if not all(re.fullmatch(r'20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})', str(w.get(k) or '')) for k in ('start_at', 'end_at')):
                return False
            start, end = (datetime.fromisoformat(w[k].replace('Z', '+00:00')).astimezone(ZoneInfo('Asia/Seoul')) for k in ('start_at', 'end_at'))
            return start < end and start.date().isoformat() == w['start'] and end.date().isoformat() == w['end']
        except (ValueError, KeyError, TypeError):
            return False
    return not w.get('start_at') and not w.get('end_at')


def window_period(w):
    short = lambda s: f'{int(s[5:7])}/{int(s[8:10])}'
    if w.get('precision') == 'minute':
        def stamp(v):
            d = datetime.fromisoformat(v.replace('Z', '+00:00')).astimezone(ZoneInfo('Asia/Seoul'))
            return f'{d.month}/{d.day} {d:%H:%M}'
        return f'{stamp(w["start_at"])}~{stamp(w["end_at"])} (한국시간)' + (' · 매일 ' + str(w['daily_hours']) if w.get('daily_hours') else '')
    return short(w['start']) + ('' if w['start'] == w['end'] else '~' + short(w['end'])) + ' · 시간 미확인' + (' · 마감일까지 도착 기준' if w.get('end_rule') == 'received_by' else '')


def non_recruitment(item):
    return item.get('notice_kind') in {'result', 'move_in'} or item.get('schedule_type') == 'not_applicable' or bool(re.search(r'결과', str(item.get('event') or ''))) or bool(re.search(r'발표|당첨|선정결과|서류심사\s*대상자|입주안내문|재계약\s*안내|최종\s*청약접수\s*결과', str(item.get('title') or '')))


def withheld(item, kind='unknown'):
    return {**item, 'application_start': '', 'deadline': '', 'application_windows': [], 'schedule_type': kind,
            'open_state': '해당 없음' if kind == 'not_applicable' else '일정 확인',
            'status_text': '신규 접수 대상 아님' if kind == 'not_applicable' else '일정 확인 중'}


def evidenced_deadline_at(item):
    """Read one complete official application range; never invent a start hour.

    Full matching is intentional: extra windows, conditions, and unrelated
    dates need scoped review rather than a scalar deadline.
    """
    evidence = item.get('schedule_evidence') or {}
    if not isinstance(evidence, dict) or item.get('schedule_source') != 'official_detail_html' or evidence.get('kind') != 'official_notice_body':
        return ''
    if evidence.get('url') != (item.get('official_url') or item.get('url')):
        return ''
    try:
        url = urlsplit(evidence.get('url') or '')
        if url.scheme != 'https' or url.hostname not in {'www.i-sh.co.kr', 'i-sh.co.kr'}:
            return ''
    except ValueError:
        return ''
    day = r'(20\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\s*\.?\s*(?:\([월화수목금토일]\))?\s*'
    match = re.fullmatch(r'\s*(?:접수|신청)기간\s*[:：]\s*' + day + r'[~～∼]\s*' + day + r'(\d{1,2})(?::([0-5]\d)|시(?:\s*([0-5]?\d)분)?)\s*까지\s*\.?\s*', str(evidence.get('excerpt') or ''))
    if not match:
        return ''
    try:
        y, m, d, ey, em, ed, hour, minute, korean_minute = match.groups()
        start = date(int(y), int(m), int(d)).isoformat()
        end = date(int(ey), int(em), int(ed)).isoformat()
        if start != item.get('application_start') or end != item.get('deadline'):
            return ''
        return datetime(int(ey), int(em), int(ed), int(hour), int(minute or korean_minute or 0), tzinfo=ZoneInfo('Asia/Seoul')).isoformat()
    except (ValueError, TypeError):
        return ''


def deadline_clock(item):
    value = item.get('deadline_at')
    return datetime.fromisoformat(value).astimezone(ZoneInfo('Asia/Seoul')).strftime('%H:%M') if value else ''


def normalize_sh(item):
    if not is_sh(item):
        return item
    item = dict(item)
    item.pop('deadline_at', None)
    if non_recruitment(item):
        return withheld(item, 'not_applicable')
    kind = item.get('schedule_type') or ''
    if item.get('schedule_source') not in TRUSTED or kind in {'unknown', 'not_applicable'}:
        return withheld(item)
    if kind == 'rolling':
        return {**withheld(item, 'rolling'), 'open_state': '상시모집', 'status_text': '상시모집 · 모집 여부 확인'}
    windows = item.get('application_windows')
    if isinstance(windows, list) and windows:
        if not all(valid_window(w) for w in windows):
            return withheld(item)
        return {**item, 'application_start': '', 'deadline': '', 'application_windows': [dict(w) for w in windows], 'schedule_type': 'windows', 'open_state': '대상별 일정 확인', 'status_text': '대상별 일정 확인'}
    if guarded_notice(item) or kind in {'windows', 'ranked', 'conditional', 'multiple', 'multi_window'}:
        return withheld(item)
    start, end = valid_day(item.get('application_start')), valid_day(item.get('deadline'))
    if not start or not end or start > end:
        return withheld(item)
    result = {**item, 'application_start': start, 'deadline': end, 'application_windows': [], 'schedule_type': 'single'}
    deadline_at = evidenced_deadline_at(result)
    if deadline_at:
        result.update(deadline_at=deadline_at, deadline_precision='minute')
    elif result.get('deadline_precision') == 'minute':
        result['deadline_precision'] = 'date'
    return result


def sh_state(item, day=None, now=None):
    x = normalize_sh(item)
    now = now or datetime.now(ZoneInfo('Asia/Seoul'))
    current_day = now.astimezone(ZoneInfo('Asia/Seoul')).date().isoformat()
    day = day or current_day
    def ended(w):
        if day == current_day and w.get('precision') == 'minute':
            return now >= datetime.fromisoformat(w['end_at'].replace('Z', '+00:00'))
        return w['end'] < day
    kind = x.get('schedule_type')
    if kind == 'rolling':
        return '상시모집 · 모집 여부 확인'
    if kind == 'not_applicable':
        return '신규 접수 대상 아님'
    if kind == 'unknown':
        return '일정 확인 중'
    windows = x.get('application_windows') or []
    if windows:
        if all(ended(w) for w in windows):
            return '확인된 일정 종료'
        if any(w['conditional'] and w['start'] <= day <= w['end'] and not ended(w) for w in windows):
            return '조건부 일정 · 시행 여부 확인'
        return '대상별 접수일정 확인'
    if day == current_day and x.get('deadline_at') and now >= datetime.fromisoformat(x['deadline_at']):
        return '접수 마감'
    if x['deadline'] < day:
        return '접수 마감'
    if x['application_start'] > day:
        return '접수 예정'
    if x.get('deadline_at') and x['application_start'] == day:
        return '접수기간 · 시작시각 확인'
    if x.get('deadline_precision') == 'date':
        return '오늘 접수마감일 · 시간 확인' if x['deadline'] == day else '접수기간 · 시간 확인'
    return '접수 중'


def sh_rows(item):
    x = normalize_sh(item)
    kind = x.get('schedule_type')
    short = lambda s: f'{int(s[5:7])}/{int(s[8:10])}' if valid_day(s) else '확인 중'
    if kind == 'rolling':
        return [('신청', '상시모집 · 정해진 최종 마감일 없음 · 현재 모집 여부 확인')]
    if kind == 'not_applicable':
        return [('신청', '신규 신청일정 없음')]
    if kind == 'unknown':
        return [('신청', '일정 확인 중')]
    windows = x.get('application_windows') or []
    if windows:
        return [(str(w.get('label') or '접수'), window_period(w) + (' · 조건부: ' + str(w.get('condition') or '시행 여부 확인') if w['conditional'] else '') + (' · 대상 제한' if w['restricted'] else '')) for w in windows]
    return [('신청', short(x['application_start']) + ('' if x['application_start'] == x['deadline'] else '~' + short(x['deadline'])) + (' · ' + deadline_clock(x) + ' 마감 (한국시간) · 시작시각 미확인' if x.get('deadline_at') else ' · 마감시간 미확인' if x.get('deadline_precision') == 'date' else ''))]
