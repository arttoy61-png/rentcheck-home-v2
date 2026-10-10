import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
FIXTURE = json.loads((ROOT / 'scripts/fixtures/housing-display-regressions.json').read_text())
SPEC = importlib.util.spec_from_file_location('housing_generator', ROOT / 'scripts/generate-public-housing-pages.py')
g = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(g)
DIRECT = next(x for x in FIXTURE['items'] if x['id'] == 'SH:seq:310653')
ALIAS = next(x for x in FIXTURE['items'] if x['id'].startswith('SHYOUTH:'))


class HousingDisplayTests(unittest.TestCase):
    def test_sh_alias_both_orders_preserve_identity_date_and_inputs(self):
        for items in [[DIRECT, ALIAS], [ALIAS, DIRECT]]:
            before = copy.deepcopy(items)
            unique, aliases = g.dedupe_recruitments(items)
            self.assertEqual(len(unique), 1)
            self.assertEqual(unique[0], {**DIRECT, 'published_at': ALIAS['published_at']})
            self.assertEqual(set(aliases[DIRECT['id']]), {DIRECT['id'], ALIAS['id']})
            self.assertEqual(g.canonical_route(unique[0], aliases[DIRECT['id']]), DIRECT['route'])
            self.assertEqual(items, before)
            self.assertEqual(g.dedupe_recruitments(unique)[0], unique)

    def test_different_date_schedule_type_or_title_cannot_be_cross_channel_alias(self):
        for change in [
            {'published_at': '2026-09-29'}, {'application_start': '2026-10-14'},
            {'deadline': '2026-10-16'}, {'schedule_type': 'rolling'},
            {'title': ALIAS['title'].replace('Ⅱ', 'Ⅰ')},
            {'title': '[정정공고]' + ALIAS['title']},
        ]:
            self.assertEqual(len(g.dedupe_recruitments([DIRECT, {**ALIAS, **change}])[0]), 2, change)

    def test_ambiguous_direct_sequence_ids_are_not_collapsed(self):
        other = {**DIRECT, 'id': 'SH:seq:999999', 'url': DIRECT['url'].replace('310653', '999999'),
                 'official_url': DIRECT['official_url'].replace('310653', '999999')}
        self.assertEqual(len(g.dedupe_recruitments([DIRECT, other, ALIAS])[0]), 3)

    def test_generator_refresh_preserves_status_urls_and_deadline(self):
        untouched = {'id': 'LH:panId:sentinel', 'agency': 'LH', 'title': '별도 임대주택 입주자 모집공고',
                     'url': 'https://apply.lh.or.kr/sentinel', 'published_at': '2026-09-25',
                     'application_start': '2026-10-01', 'deadline': '2026-10-31', 'custom': {'keep': True}}
        raw = {**copy.deepcopy(FIXTURE), 'generated_at': '2026-10-09T19:34:02'}
        raw['items'].append(untouched)
        previous = Path.cwd()
        with tempfile.TemporaryDirectory() as tmp:
            try:
                os.chdir(tmp)
                Path('.cache-home-stats').mkdir()
                Path('public-housing').mkdir()
                Path('public-housing/notice-tools.json').write_text('{}')
                g.SOURCE.write_text(json.dumps(raw))
                g.main()
                output = json.loads(g.CURRENT_PATH.read_text())
                routes = json.loads(g.ROUTES_PATH.read_text())
                self.assertEqual(output['source_status'], raw['source_status'])
                self.assertEqual(output['source_generated_at'], raw['generated_at'])
                self.assertEqual(output['recruitment_count'], 3)
                deadline = next(x for x in output['items'] if x['id'] == 'SH:seq:311087')
                self.assertEqual(deadline['deadline_at'], '2026-10-22T15:00:00+09:00')
                self.assertEqual(deadline['deadline_precision'], 'minute')
                self.assertEqual(deadline['schedule_evidence'], FIXTURE['items'][0]['schedule_evidence'])
                self.assertEqual(routes['routes'][ALIAS['id']], DIRECT['route'])
                self.assertIn(DIRECT['route'], Path('public-housing/notices/shyouth-23a63706ef0b942659cb/index.html').read_text())
                sh_html = Path('public-housing/notices/sh-311087/index.html').read_text()
                self.assertIn('15:00 (한국시간)', sh_html)
                self.assertNotIn('마감시간 미확인', sh_html)
                saved = next(x for x in output['items'] if x['id'] == untouched['id'])
                for key, value in untouched.items():
                    self.assertEqual(saved[key], value)
                g.main()
                repeated = json.loads(g.CURRENT_PATH.read_text())
                self.assertEqual(repeated['items'], output['items'])
            finally:
                os.chdir(previous)


if __name__ == '__main__':
    unittest.main()
