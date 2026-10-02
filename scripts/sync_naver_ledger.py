"""Synchronize a verified published ledger into the home feed, then render it.

Usage: python scripts/sync_naver_ledger.py --ledger ../engine/master/naver_published_ledger.csv
The ledger is private: obtain it from the authorized engine checkout, never from draft outputs.
Categories here are site topics, not claimed Naver source categories.
"""
import argparse
import csv
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEEDS = ('posts.json', 'posts_shared.json', 'posts_latest.json')

def post_id(url):
    match = re.fullmatch(r'https://blog\.naver\.com/spitoon61/(\d+)', url or '')
    if not match:
        raise ValueError(f'Noncanonical published URL: {url}')
    return match[1]

def topic(title):
    if re.search(r'매입임대|공공임대|재개발임대|청년주택|장기전세', title):
        return '청년·공공주택'
    if re.search(r'감정평가|정비사업|재개발|재건축', title):
        return '재개발·정비'
    if re.search(r'실거래|집값|아파트|평 .*억', title):
        return '시세·실거래'
    return '계약·가이드'

def synchronize(ledger):
    feeds = {name: json.loads((ROOT/'data'/name).read_text(encoding='utf-8')) for name in FEEDS}
    existing = {}
    for rows in feeds.values():
        for row in rows:
            if row.get('status') == 'published':
                existing[post_id(row['url'])] = row
    with ledger.open(encoding='utf-8-sig', newline='') as source:
        records = list(csv.DictReader(source))
    verified = {}
    for row in records:
        if row['상태'] != 'published':
            continue
        key = post_id(row['URL'])
        assert key == row['발행번호'], 'Ledger ID/URL mismatch'
        assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', row['발행일'])
        assert row['제목'].strip(), 'Empty published title'
        if key in verified:
            assert verified[key] == row, 'Conflicting duplicate ledger record'
        verified[key] = row
    assert verified, 'Refuse empty ledger'
    assert existing.keys() <= verified.keys(), 'Refuse a ledger missing existing published posts'
    additions = []
    for key, row in verified.items():
        if key in existing:
            assert existing[key]['published_at'] == row['발행일'], f'Date mismatch: {key}'
            # Legacy home editorial titles are preserved. This sync adds verified missing posts.
            continue
        additions.append(dict(id=f"{row['발행일']}-{key}", published_at=row['발행일'],
                              title=row['제목'], url=row['URL'], source='naver',
                              category=topic(row['제목']), tools=[], status='published'))
    latest = feeds['posts_latest.json'] + additions
    latest.sort(key=lambda row: row['published_at'], reverse=True)
    (ROOT/'data/posts_latest.json').write_text(json.dumps(latest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    subprocess.run(['node', 'scripts/render-core-content.mjs', '--posts-only'], cwd=ROOT, check=True)
    print(f'Synced {len(verified)} unique verified posts; added {len(additions)}; original feed metadata preserved')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ledger', required=True, type=Path)
    synchronize(parser.parse_args().ledger)
