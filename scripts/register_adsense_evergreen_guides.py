#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "blog" / "index.html"
SITEMAP = ROOT / "sitemap.xml"
MARKER = 'data-evergreen-batch="2026-08-28-b"'

cards = '''<div data-evergreen-batch="2026-08-28-b" style="display:contents">
<a class="guide-card" href="jeonse-renewal-increase-limit/"><small>전세·갱신</small><h2>전세 갱신할 때 보증금은 얼마나 올릴 수 있나요?</h2><p>5% 증액 상한과 1년 제한, 갱신청구권 사용 여부를 실제 확인 순서로 정리했습니다.</p><span class="go">가이드 보기 →</span></a>
<a class="guide-card" href="early-move-deposit-return/"><small>전세·보증금</small><h2>전세 만기 전에 이사하면 보증금은 언제 받을 수 있나요?</h2><p>중도해지 합의, 묵시적 갱신, 임차권등기명령까지 이사 전에 확인할 순서를 설명합니다.</p><span class="go">가이드 보기 →</span></a>
<a class="guide-card" href="contract-deposit-cancellation/"><small>계약·계약금</small><h2>계약금 보냈는데 집주인이 계약 취소하면 어떻게 되나요?</h2><p>배액상환, 가계약금, 이행 착수와 특약을 어떻게 구분해 봐야 하는지 정리했습니다.</p><span class="go">가이드 보기 →</span></a>
<a class="guide-card" href="move-in-report-fixed-date/"><small>전세·보증금 보호</small><h2>전입신고와 확정일자, 둘 다 왜 필요한가요?</h2><p>대항력과 우선변제권의 역할을 나눠 보고 잔금일부터 챙길 순서를 설명합니다.</p><span class="go">가이드 보기 →</span></a>
<a class="guide-card" href="landlord-change-lease/"><small>전세·월세·소유자 변경</small><h2>계약 중 집주인이 바뀌면 계약서 다시 써야 하나요?</h2><p>기존 계약 승계, 새 소유자 확인, 보증금 반환과 월세 계좌 변경 시 주의사항을 정리했습니다.</p><span class="go">가이드 보기 →</span></a>
</div>'''

index = INDEX.read_text(encoding="utf-8")
if MARKER not in index:
    needle = '<div class="guide-grid">'
    if needle not in index:
        raise SystemExit("guide-grid marker not found")
    index = index.replace(needle, needle + "\n" + cards, 1)
    INDEX.write_text(index, encoding="utf-8")
    print("UPDATED blog/index.html")
else:
    print("SKIP blog/index.html")

urls = [
    "jeonse-renewal-increase-limit",
    "early-move-deposit-return",
    "contract-deposit-cancellation",
    "move-in-report-fixed-date",
    "landlord-change-lease",
]
sitemap = SITEMAP.read_text(encoding="utf-8")
block = "".join(
    f'  <url><loc>https://rent-check.kr/blog/{slug}/</loc><lastmod>2026-08-28</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n'
    for slug in urls
)
if "https://rent-check.kr/blog/jeonse-renewal-increase-limit/" not in sitemap:
    needle = '  <url><loc>https://rent-check.kr/calc/'
    if needle not in sitemap:
        raise SystemExit("calc sitemap marker not found")
    sitemap = sitemap.replace(needle, block + "\n" + needle, 1)
    SITEMAP.write_text(sitemap, encoding="utf-8")
    print("UPDATED sitemap.xml")
else:
    print("SKIP sitemap.xml")
