import copy
import importlib.util
import json
from pathlib import Path
from datetime import datetime
import unittest
from sh_application_contract import normalize_sh, sh_state, sh_rows, non_recruitment, is_sh

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = json.loads((ROOT/'scripts/fixtures/sh-application-cases.json').read_text())
spec = importlib.util.spec_from_file_location('generator', ROOT/'scripts/generate-public-housing-pages.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class SHContractTests(unittest.TestCase):
    def test_verified_single(self):
        x = normalize_sh(FIXTURES['single'])
        self.assertEqual((x['application_start'],x['deadline']), ('2026-10-02','2026-10-03'))
        self.assertEqual(x['schedule_evidence'], FIXTURES['single']['schedule_evidence'])
        self.assertIn('마감시간 미확인', sh_rows(x)[0][1])
        self.assertEqual(sh_state(x,'2026-10-03'), '오늘 접수마감일 · 시간 확인')

    def test_rolling_scrubs_deadlines(self):
        x = normalize_sh(FIXTURES['rolling'])
        self.assertEqual((x['application_start'],x['deadline']), ('',''))
        self.assertIn('상시모집', sh_state(x))
        self.assertNotIn('11/2', str(sh_rows(x)))
        self.assertIn('정해진 최종 마감일 없음', str(sh_rows(x)))

    def test_unknown_scrubs_legacy_fields(self):
        x=normalize_sh(FIXTURES['unknown'])
        self.assertEqual(x['open_state'],'일정 확인')
        self.assertEqual(x['application_windows'],[])
        self.assertEqual(x['deadline'],'')
        self.assertEqual(sh_state(x),'일정 확인 중')

    def test_result_and_move_in(self):
        for kind in ('result','move_in'):
            x={**FIXTURES['single'],'notice_kind':kind}
            self.assertTrue(non_recruitment(x))
            self.assertFalse(generator.is_recruitment(x))
            self.assertEqual(normalize_sh(x)['deadline'],'')

    def test_source_list_guard(self):
        x={**FIXTURES['single'],'schedule_source':'source_list','schedule_type':''}
        self.assertEqual(normalize_sh(x)['schedule_type'],'unknown')

    def test_guarded_collapsed_ranges(self):
        for ident in ('SH:seq:310673','SH:seq:310041'):
            x={**FIXTURES['single'],'id':ident,'schedule_source':'official_detail_html','schedule_type':''}
            self.assertEqual(normalize_sh(x)['deadline'],'')

    def test_windows_clear_scalar_range(self):
        x=normalize_sh(FIXTURES['windowed'])
        self.assertEqual((x['application_start'],x['deadline']),('',''))
        self.assertEqual(len(x['application_windows']),3)
        self.assertIn('조건부',sh_state(x,'2026-10-08'))
        self.assertEqual(sh_state(x,'2026-10-09'),'확인된 일정 종료')

    def test_windows_invalid_flag_or_date(self):
        for windows in [[{'start':'2026-10-02','end':'2026-10-03'}],[{'start':'2026-02-30','end':'2026-10-03','conditional':False,'restricted':False}]]:
            self.assertEqual(normalize_sh({**FIXTURES['windowed'],'application_windows':windows})['schedule_type'],'unknown')

    def test_minute_window_times_and_mismatch(self):
        w = {**FIXTURES['windowed']['application_windows'][0], 'precision': 'minute', 'start_at': '2026-10-06T10:00:00+09:00', 'end_at': '2026-10-07T17:00:00+09:00'}
        item = {**FIXTURES['windowed'], 'application_windows': [w]}
        self.assertIn('10/6 10:00~10/7 17:00 (한국시간)', str(sh_rows(item)))
        w['start_at'] = '2026-10-05T10:00:00+09:00'
        self.assertEqual(normalize_sh(item)['schedule_type'], 'unknown')

    def test_normalization_idempotent_and_nonmutating(self):
        for original in FIXTURES.values():
            before=copy.deepcopy(original)
            first=normalize_sh(original)
            self.assertEqual(original,before)
            self.assertEqual(normalize_sh(first),first)

    def test_alias_and_official_hostname_guard(self):
        for patch in ({'id': 'SHYOUTH:alias'}, {'id': 'other', 'agency': 'SH'}, {'id': 'other', 'agency': '', 'url': 'https://www.i-sh.co.kr/main/view.do'}):
            item = {**FIXTURES['unknown'], **patch}
            self.assertTrue(is_sh(item))
            self.assertEqual(normalize_sh(item)['deadline'], '')
        self.assertFalse(is_sh({'id': 'LH:123', 'agency': 'LH', 'url': 'https://i-sh.co.kr.evil.example/'}))

    def test_legacy_alias_of_known_multi_window_is_guarded(self):
        x={**FIXTURES['single'], 'id': 'SHYOUTH:alias', 'schedule_type': '', 'schedule_source': 'official_detail_html', 'url': 'https://www.i-sh.co.kr/main/view.do?seq=310673'}
        self.assertEqual(normalize_sh(x)['deadline'], '')

    def test_minute_endpoint_closes(self):
        item = {**FIXTURES['windowed'], 'application_windows': [{**FIXTURES['windowed']['application_windows'][0], 'precision': 'minute', 'start_at': '2026-10-06T10:00:00+09:00', 'end_at': '2026-10-07T17:00:00+09:00', 'restricted': True}]}
        self.assertEqual(sh_state(item, now=datetime.fromisoformat('2026-10-07T17:00:00+09:00')), '확인된 일정 종료')

    def test_non_sh_unchanged(self):
        x={**FIXTURES['unknown'],'id':'LH:panId:123','agency':'LH'}
        self.assertIs(normalize_sh(x),x)

    def test_generator_manifest_preserves_provenance(self):
        x=generator.manifest_item(FIXTURES['rolling'],'/public-housing/notices/sh-311005/')
        self.assertEqual(x['deadline'],'')
        self.assertEqual(x['schedule_type'],'rolling')
        self.assertEqual(x['schedule_evidence'],FIXTURES['rolling']['schedule_evidence'])

    def test_generated_page_never_reintroduces_dates(self):
        for key in ('rolling','unknown','windowed','gaps'):
            item=FIXTURES[key]
            page=generator.render_page(item,'/public-housing/notices/test/')
            self.assertNotIn('2026년 11월 2일',page)
            self.assertNotIn('2/27',page)
            self.assertNotIn('10/2~10/8',page)
        self.assertIn('상시모집',generator.render_page(FIXTURES['rolling'],'/test/'))

    def test_generated_single_does_not_fabricate_time(self):
        page=generator.render_page(FIXTURES['single'],'/test/')
        self.assertIn('마감시간 미확인',page)
        self.assertNotIn('23:59',page)
        self.assertNotIn('17:00',page)


if __name__=='__main__':
    unittest.main()
