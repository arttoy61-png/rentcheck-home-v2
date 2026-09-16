from __future__ import annotations

import re
from datetime import datetime, date
from pathlib import Path
from zoneinfo import ZoneInfo

ARTICLE = Path('public-housing/sh-longterm-jeonse-51/index.html')
TOOL = Path('tools/longterm-jeonse-51/index.html')


def messages(today: date) -> tuple[str, str]:
    if today <= date(2026, 9, 13):
        article = '<strong>1순위는 9월 14~15일 10:00~17:00 예정</strong>입니다. 2순위는 9월 16일, 3·4순위는 9월 17일 예정이며, 후순위는 선순위 신청 결과에 따라 접수하지 않을 수 있으니 해당일 오전 SH 공지를 다시 확인하세요.'
        tool = '<b>1순위 9월 14~15일 예정</b><br>1순위는 10:00~17:00, 2순위는 9/16, 3·4순위는 9/17 예정입니다. 후순위는 선순위 신청 결과에 따라 접수하지 않을 수 있으니 해당일 SH 공지를 다시 확인하세요.'
    elif today == date(2026, 9, 14):
        article = '<strong>오늘 9월 14일은 1순위 접수 첫날(10:00~17:00)</strong>입니다. 1순위는 9월 15일까지 예정이며, 2순위는 9월 16일, 3·4순위는 9월 17일 예정입니다. 후순위는 선순위 신청 결과에 따라 달라질 수 있으니 해당일 오전 SH 공지를 다시 확인하세요.'
        tool = '<b>9월 14일 오늘, 1순위 접수 첫날</b><br>1순위는 오늘부터 9/15까지 10:00~17:00 예정입니다. 2순위는 9/16, 3·4순위는 9/17 예정이며 후순위 접수 여부는 SH 공지를 다시 확인하세요.'
    elif today == date(2026, 9, 15):
        article = '<strong>오늘 9월 15일은 1순위 접수 마지막 날(10:00~17:00)</strong>입니다. 2순위는 9월 16일, 3·4순위는 9월 17일 예정입니다. 다만 후순위는 선순위 신청 결과에 따라 접수하지 않을 수 있으니 해당일 오전 SH 공지를 다시 확인하세요.'
        tool = '<b>9월 15일 오늘, 1순위 접수 마지막 날</b><br>1순위 접수는 오늘 10:00~17:00입니다. 2순위는 9/16, 3·4순위는 9/17 예정이며, 후순위는 선순위 신청 결과에 따라 접수하지 않을 수 있으니 해당일 SH 공지를 다시 확인하세요.'
    elif today == date(2026, 9, 16):
        article = '<strong>9월 16일은 2순위 예정일</strong>입니다. 실제 2순위 접수 진행 여부는 선순위 신청 결과에 따라 달라질 수 있으므로 SH 공지를 먼저 확인하세요. 3·4순위는 9월 17일 예정이며 역시 9월 17일 오전 공지 확인이 필요합니다.'
        tool = '<b>9월 16일, 2순위 예정일</b><br>실제 2순위 접수 진행 여부는 선순위 신청 결과에 따라 달라질 수 있으므로 SH 공지를 먼저 확인하세요. 3·4순위는 9/17 예정이며 당일 오전 공지 확인이 필요합니다.'
    elif today == date(2026, 9, 17):
        article = '<strong>9월 17일은 3·4순위 예정일</strong>입니다. 실제 후순위 접수 진행 여부는 앞선 순위 신청 결과에 따라 달라질 수 있으므로 SH 공지를 먼저 확인하세요. 서류심사 대상자 발표는 10월 14일 16시 이후 예정입니다.'
        tool = '<b>9월 17일, 3·4순위 예정일</b><br>실제 후순위 접수 진행 여부는 앞선 순위 신청 결과에 따라 달라질 수 있으므로 SH 공지를 먼저 확인하세요. 서류심사 대상자는 10/14 16시 이후 발표 예정입니다.'
    else:
        article = '<strong>순위별 신청 예정일(9월 14~17일)은 지났습니다.</strong> 신청자는 10월 14일 16시 이후 서류심사 대상자 발표를 확인하세요. 실제 후순위 접수 진행 여부와 이후 일정은 SH의 최신 공지를 기준으로 확인합니다.'
        tool = '<b>순위별 신청 예정일은 지났습니다</b><br>신청자는 10/14 16시 이후 서류심사 대상자 발표를 확인하세요. 실제 후순위 접수 진행 여부와 이후 일정은 SH의 최신 공지를 기준으로 확인합니다.'
    return article, tool


def update_article(message: str, today: date) -> None:
    text = ARTICLE.read_text(encoding='utf-8')
    text, n = re.subn(
        r'(<section class="housing-hero">.*?<p class="lead">).*?(</p></section>)',
        rf'\1{message}\2',
        text,
        count=1,
        flags=re.S,
    )
    if n != 1:
        raise SystemExit('SH51 article hero lead not found')
    text = re.sub(r'"dateModified":"\d{4}-\d{2}-\d{2}"', f'"dateModified":"{today.isoformat()}"', text, count=1)
    ARTICLE.write_text(text, encoding='utf-8')


def update_tool(message: str) -> None:
    text = TOOL.read_text(encoding='utf-8')
    text, n = re.subn(
        r'(<section class="v2-tool-hero">.*?</section>\s*)<div class="final-check">.*?</div>',
        rf'\1<div class="final-check">{message}</div>',
        text,
        count=1,
        flags=re.S,
    )
    if n != 1:
        raise SystemExit('SH51 tool status banner not found')
    TOOL.write_text(text, encoding='utf-8')


def main() -> None:
    today = datetime.now(ZoneInfo('Asia/Seoul')).date()
    article, tool = messages(today)
    update_article(article, today)
    update_tool(tool)
    print(f'SH51 time-sensitive status synced for KST {today.isoformat()}')


if __name__ == '__main__':
    main()
