import importlib.util
import json
import unittest
from datetime import datetime
from pathlib import Path
from sh_application_contract import normalize_sh, sh_state, sh_rows, is_sh
spec = importlib.util.spec_from_file_location('generator', Path(__file__).with_name('generate-public-housing-pages.py'))
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)

class SocoContractTests(unittest.TestCase):
    def setUp(self):
        self.item = dict(id='SOCOS:boardId:6718', title='[민간임대] 효창공원앞역 모집공고', published_at='2026-11-03', agency_group='SEOUL', schedule_type='windows', schedule_source='official_detail_html', application_windows=[dict(label='청약신청',start='2026-11-12',end='2026-11-16',start_at='2026-11-12T00:00:00+09:00',end_at='2026-11-16T00:00:00+09:00',precision='minute',conditional=False,restricted=False)])
    def test_all_six_official_notices(self):
        items=json.loads(Path(__file__).with_name('fixtures').joinpath('soco-november-2026.json').read_text())['items']
        first, _=g.dedupe_recruitments(items+items)
        self.assertEqual(len(first),6)
        for item in first:
            item=normalize_sh(item)
            self.assertEqual(item['schedule_type'],'windows')
            self.assertTrue(g.is_recruitment(item))
            self.assertTrue(g.direct_official_url(item))
            page=g.render_page(item,g.natural_route(item))
            self.assertIn('공식 모집공고 원문',page)
            self.assertIn('한국시간',page)
            self.assertIn(item['url'].replace('&','&amp;'),page)
    def test_precise_boundaries_and_idempotence(self):
        self.assertFalse(is_sh(self.item))
        x=normalize_sh(self.item)
        self.assertEqual(normalize_sh(x),x)
        for at, expected in [('2026-11-11T23:59:59+09:00','접수 예정'),('2026-11-12T00:00:00+09:00','접수 중'),('2026-11-15T23:59:59+09:00','접수 중'),('2026-11-16T00:00:00+09:00','접수 마감')]:
            self.assertEqual(sh_state(x,now=datetime.fromisoformat(at)),expected)
        self.assertIn('11/16 00:00',sh_rows(x)[0][1])
    def test_dedupe_stable_id_not_title(self):
        other={**self.item,'id':'SOCOS:boardId:6719'}
        self.assertEqual(len(g.dedupe_recruitments([self.item, self.item, other])[0]),2)
    def test_result_and_unverified_dates_excluded(self):
        self.assertFalse(g.is_recruitment({**self.item,'notice_kind':'result'}))
        self.assertEqual(normalize_sh({**self.item,'schedule_source':'source_list'})['schedule_type'],'unknown')

if __name__=='__main__':unittest.main()
