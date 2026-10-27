"""Render local HTML with local-only network routing and synthetic metadata."""
import json,threading,unittest
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

HOME=Path(__file__).resolve().parents[1]
ROOT=HOME/'test-artifacts'/'freshness'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

class HomeDisplay(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(HOME)))
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.url=f'http://127.0.0.1:{cls.server.server_port}/'
        cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(headless=True)
    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.p.stop();cls.server.shutdown()
    def render(self,collection=None,viewport=None):
        page=self.browser.new_page(viewport=viewport or {'width':1280,'height':900})
        self.addCleanup(page.close)
        payload=json.loads((HOME/'data/home_stats.json').read_text(encoding='utf-8'))
        payload['generated_at']='2099-01-01T00:00:00+00:00'
        if collection is not None: payload['collection']=collection
        page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(self.url) else route.abort())
        page.route('**/data/home_stats.json',lambda route:route.fulfill(json=payload))
        page.goto(self.url,wait_until='networkidle');page.wait_for_function("document.querySelector('#dealTicker .deal-ticker-list') !== null")
        close=page.locator('.rc-new-alert__close')
        if close.is_visible(): close.click()
        self.assertTrue(page.locator('#heroStale').is_visible())
        return page
    def test_missing_metadata_visible_despite_new_generation(self):
        page=self.render();self.assertEqual(page.locator('#heroStale').inner_text(),'수집 성공 시각 미확인')
        (ROOT/'evidence').mkdir(parents=True,exist_ok=True);page.screenshot(path=str(ROOT/'evidence/home-unknown-desktop.png'))
    def test_failed_display(self):
        page=self.render({'status':'failed','last_success_at':'2026-10-26T00:00:00Z'})
        self.assertIn('최근 수집 실패',page.locator('#heroStale').inner_text())
    def test_partial_display_mobile(self):
        page=self.render({'status':'partial'}, {'width':390,'height':844})
        self.assertIn('일부 수집만 성공',page.locator('#heroStale').inner_text())
        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),390)
        (ROOT/'evidence').mkdir(parents=True,exist_ok=True);page.screenshot(path=str(ROOT/'evidence/home-partial-mobile.png'))
    def test_success_displays_collection_not_generation(self):
        page=self.render({'status':'success','last_success_at':'2026-10-27T06:00:00Z'})
        text=page.locator('#heroStale').inner_text();self.assertIn('2026-10-27',text);self.assertNotIn('2099',text)
        self.assertIn('최근 계약일',page.locator('#heroLive').inner_text())

if __name__=='__main__':unittest.main()
