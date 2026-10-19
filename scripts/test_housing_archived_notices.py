import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from datetime import date

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location('housing_generator', ROOT / 'scripts/generate-public-housing-pages.py')
g = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(g)

SAMPLE = '''<section class="housing-hero"><p class="kicker">SH · 접수 중</p><p class="lead">현재 신청 일정이 진행 중입니다. 오늘 신청하세요.</p></section><div class="card"><span>신청 마감</span><strong>2026년 9월 30일</strong></div><section><h2>지금 할 일</h2><ol><li>오늘 신청</li></ol></section><p>Rent Check 공고 안내 · 공고 ID SH:seq:1.</p>'''

class ArchivedNoticeTests(unittest.TestCase):
    def test_rank_result_followup_does_not_reenter_recruitment_feed(self):
        self.assertFalse(g.is_recruitment({'id':'SH:seq:311200', 'agency':'SH', 'title':'2026년 재개발임대 모집공고 1순위 청약접수 결과 및 2순위 청약접수 안내'}))
        self.assertTrue(g.is_recruitment({'id':'SH:seq:999001', 'agency':'SH', 'title':'2026년 재개발임대주택 입주자 모집공고'}))

    def test_ended_notice_preserves_historical_dates_and_is_idempotent(self):
        result = g.archive_inactive_notice_html(SAMPLE, today=date(2026,10,20))
        self.assertIn('접수 마감 · 보관 공고', result)
        self.assertIn('2026년 9월 30일', result)
        self.assertNotIn('오늘 신청', result)
        self.assertEqual(result, g.archive_inactive_notice_html(result, today=date(2026,10,20)))

    def test_future_or_unknown_removed_notice_does_not_invent_closed_status(self):
        result = g.archive_inactive_notice_html(SAMPLE.replace('2026년 9월 30일','2026년 11월 30일'), today=date(2026,10,20))
        self.assertIn('보관 공고 · 현재 모집 여부 확인', result)
        self.assertNotIn('접수 마감 · 보관 공고', result)

    def test_active_route_and_non_generated_article_remain_unchanged(self):
        self.assertEqual(g.archive_inactive_notice_html(SAMPLE.replace('Rent Check 공고 안내 · 공고 ID ', '별도 글 ')), SAMPLE.replace('Rent Check 공고 안내 · 공고 ID ', '별도 글 '))
        old = Path.cwd()
        with tempfile.TemporaryDirectory() as tmp:
            try:
                os.chdir(tmp)
                page = Path('public-housing/notices/sh-1/index.html')
                page.parent.mkdir(parents=True)
                page.write_text(SAMPLE)
                g.refresh_inactive_notice_pages({'/public-housing/notices/sh-1/'})
                self.assertEqual(page.read_text(), SAMPLE)
                g.refresh_inactive_notice_pages(set())
                self.assertNotIn('오늘 신청', page.read_text())
            finally:
                os.chdir(old)

if __name__ == '__main__':
    unittest.main()
