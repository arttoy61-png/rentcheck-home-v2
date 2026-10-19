import copy, json, tempfile, unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta
from hashlib import sha256
from import_isolated_feed import *
NOW=datetime(2026,10,17,tzinfo=timezone.utc)
SERVICES=['아파트_매매','아파트_전월세','연립다세대_매매','연립다세대_전월세','오피스텔_매매','오피스텔_전월세']
def fixture():
    districts=dict(DISTRICTS)
    counts={s:{} for s in SERVICES};counts[SERVICES[0]]={'raw':1,'eligible':1,'coordinate_linked':1}
    dc={d:{s:{} for s in SERVICES} for d in districts};dc['11110']=copy.deepcopy(counts)
    row=dict(id='one',complex_id='11110-one',lawd_cd='11110',gu_name='종로구',name='fixture',type=SERVICES[0],date='2026-10-16',address='서울특별시 종로구 테스트동 1',lat=37.5,lng=127.,coordinate_source='https://fixture.test',coordinate_checked_at=NOW.isoformat(),coordinate_basis='exact',area_m2=20.,floor=2.,deal_amount=123.,deposit=None,monthly_rent=None)
    meta=dict(collection_complete=True,complete_districts=25,successful_partitions=450,expected_partitions=450,source_checked_at=NOW.isoformat(),coordinate_linked_rows=1,coordinate_addresses=1,eligible_rows=1,raw_rows=1,excluded_cancelled=0,coordinate_unlinked_rows=0,coordinate_coverage_complete=True,period=['2026-08-01','2026-10-17'],raw_source='https://rt.molit.go.kr/')
    return dict(version=2,meta=meta,districts=districts,services=SERVICES,counts=counts,district_counts=dc,projects={'fixture':{'verified':True,'source':'https://urban.seoul.go.kr/fixture','basis':'verified_official_boundary_centroid','point':[37.5,127.]}},rows=[row])
class ImportTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.data=fixture();atomic(self.root/NAMES[0],self.data);self.old=(self.root/NAMES[0]).read_bytes()
    def tearDown(self):self.tmp.cleanup()
    def fetcher(self,data=None,status=None,corrupt=False):
        data=data or self.data;status=status or {'state':'ready','last_good_source_at':data['meta']['source_checked_at']};files={NAMES[0]:json.dumps(data).encode(),NAMES[1]:json.dumps(status).encode()};manifest={'version':1,'approval_epoch':EPOCH,'files':{n:sha256(b).hexdigest() for n,b in files.items()}}
        def get(url,limit):
            if '/git/ref/' in url:return json.dumps({'object':{'sha':'a'*40}}).encode()
            self.assertIn('/'+'a'*40+'/feed/',url)
            if url.endswith('manifest.json'):return json.dumps(manifest).encode()
            if corrupt:return b'{}'
            return files[url.rsplit('/',1)[1]]
        return get
    def preserved(self,fetcher,now=NOW):
        r=run(self.root,fetcher,now);self.assertEqual(r['state'],'failed');self.assertEqual((self.root/NAMES[0]).read_bytes(),self.old);return r
    def test_success_pinned_commit(self):self.assertEqual(run(self.root,self.fetcher(),NOW)['source_feed_commit'],'a'*40)
    def test_digest_failure_preserves(self):self.assertEqual(self.preserved(self.fetcher(corrupt=True))['reason'],'feed_digest_mismatch')
    def test_failed_source_preserves(self):self.assertEqual(self.preserved(self.fetcher(status={'state':'failed'}))['reason'],'upstream_failed_keep_last_good')
    def test_stale_preserves(self):self.assertEqual(self.preserved(self.fetcher(),NOW+timedelta(days=3))['reason'],'stale_source')
    def test_future_preserves(self):
        data=copy.deepcopy(self.data);data['meta']['source_checked_at']=(NOW+timedelta(days=1)).isoformat();self.assertEqual(self.preserved(self.fetcher(data))['reason'],'future_source')
    def test_rollback_preserves(self):
        data=copy.deepcopy(self.data);data['meta']['source_checked_at']=(NOW-timedelta(hours=1)).isoformat();self.assertEqual(self.preserved(self.fetcher(data))['reason'],'source_rollback')
    def test_449_partitions_rejected(self):
        data=copy.deepcopy(self.data);data['meta']['successful_partitions']=449;self.assertEqual(self.preserved(self.fetcher(data))['reason'],'incomplete_source')
    def test_nonfinite_coordinate_rejected(self):
        data=copy.deepcopy(self.data);data['rows'][0]['lat']=float('nan');self.assertEqual(self.preserved(self.fetcher(data))['reason'],'invalid_numeric')
    def test_raw_fields_rejected(self):
        data=copy.deepcopy(self.data);data['raw_items']=[];self.assertEqual(self.preserved(self.fetcher(data))['reason'],'unexpected_map_shape')
    def test_row_extra_field_rejected(self):
        data=copy.deepcopy(self.data);data['rows'][0]['raw_record']={};self.assertEqual(self.preserved(self.fetcher(data))['reason'],'unexpected_row_field')
    def test_district_aggregate_rejected(self):
        data=copy.deepcopy(self.data);data['district_counts']['11110'][SERVICES[0]]['raw']=2;self.assertEqual(self.preserved(self.fetcher(data))['reason'],'district_count_mismatch')
    def test_wrong_gu_name_rejected(self):
        data=copy.deepcopy(self.data);data['rows'][0]['gu_name']='강남구'
        self.assertEqual(self.preserved(self.fetcher(data))['reason'],'row_district_name_mismatch')
    def test_wrong_district_row_distribution_rejected(self):
        data=copy.deepcopy(self.data);r=data['rows'][0];r.update(lawd_cd='11140',gu_name='중구',complex_id='11140-one',address='서울특별시 중구 테스트동 1')
        self.assertEqual(self.preserved(self.fetcher(data))['reason'],'actual_row_count_mismatch')
    def test_wrong_property_type_distribution_rejected(self):
        data=copy.deepcopy(self.data);data['rows'][0]['type']='오피스텔_매매'
        self.assertEqual(self.preserved(self.fetcher(data))['reason'],'actual_row_count_mismatch')
    def test_duplicate_ids_rejected_even_with_reconciled_counts(self):
        data=copy.deepcopy(self.data);data['rows'].append(copy.deepcopy(data['rows'][0]))
        for k in ['coordinate_linked_rows','eligible_rows','raw_rows']:data['meta'][k]=2
        for k in ['raw','eligible','coordinate_linked']:
            data['counts'][SERVICES[0]][k]=2;data['district_counts']['11110'][SERVICES[0]][k]=2
        self.assertEqual(self.preserved(self.fetcher(data))['reason'],'duplicate_or_invalid_row_id')
    def test_unverified_project_rejected(self):
        data=copy.deepcopy(self.data);data['projects']['fixture']['verified']=False
        self.assertEqual(self.preserved(self.fetcher(data))['reason'],'invalid_project_evidence')
    def test_unproven_project_source_rejected(self):
        data=copy.deepcopy(self.data);data['projects']['fixture']['source']=''
        self.assertEqual(self.preserved(self.fetcher(data))['reason'],'invalid_project_evidence')
    def test_project_coordinates_rejected(self):
        for point in [[0,0],[float('nan'),127.],[37.5,float('inf')],[True,127.],[37.5]]:
            with self.subTest(point=point):
                data=copy.deepcopy(self.data);data['projects']['fixture']['point']=point
                self.assertEqual(self.preserved(self.fetcher(data))['reason'],'invalid_project_coordinate')
    def test_duplicate_content_with_distinct_source_ids_is_preserved(self):
        data=copy.deepcopy(self.data);data['rows'].append({**data['rows'][0],'id':'two'})
        for k in ['coordinate_linked_rows','eligible_rows','raw_rows']:data['meta'][k]=2
        for k in ['raw','eligible','coordinate_linked']:
            data['counts'][SERVICES[0]][k]=2;data['district_counts']['11110'][SERVICES[0]][k]=2
        self.assertEqual(run(self.root,self.fetcher(data),NOW)['state'],'ready')
    def test_map_write_failure_is_not_ready(self):
        from unittest.mock import patch
        import import_isolated_feed as mod
        original=mod.atomic
        def fail_map(path,obj):
            if Path(path).name==NAMES[0]:raise OSError('fixture write failure')
            return original(path,obj)
        with patch.object(mod,'atomic',side_effect=fail_map):
            self.assertEqual(self.preserved(self.fetcher())['reason'],'OSError')
    def test_missing_feed_preserves(self):
        def fail(*a):raise FeedError('public_map_feed_unavailable')
        self.assertEqual(self.preserved(fail)['reason'],'public_map_feed_unavailable')
if __name__=='__main__':unittest.main()
