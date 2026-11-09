import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('publisher_markup', Path(__file__).with_name('ensure-publisher-markup.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class PublisherTests(unittest.TestCase):
    def test_idempotent_loader_and_author(self):
        original = '<html><head><title>A</title></head><body><main><h1>A</h1><p>Body</p></main></body></html>'
        output = m.update(original, True)
        self.assertEqual(m.update(output, True), output)
        page = m.Page(output)
        self.assertEqual(len(page.ads), 1)
        self.assertTrue(page.ads[0][1])
        self.assertEqual(output.count('<!-- rc-author-profile -->'), 1)
        self.assertIn('<h1>A</h1><p>Body</p>', output)
        self.assertIn('href="/about/" rel="author"', output)

    def test_noindex_and_redirect_classification(self):
        self.assertTrue(m.Page('<meta name="robots" content="noindex,follow">').noindex)
        self.assertTrue(m.Page('<meta http-equiv="refresh" content="0;url=/">').redirect)
        self.assertFalse(m.Page('<p>noindex is only a word</p>').noindex)

    def test_refuse_wrong_or_duplicate_publisher(self):
        with self.assertRaises(AssertionError):
            m.update('<head>' + m.TAG + m.TAG + '</head>')
        with self.assertRaises(AssertionError):
            m.update('<head>' + m.TAG.replace(m.CLIENT, 'ca-pub-1') + '</head>')

    def test_preserve_analytics(self):
        original = '<head><script src="https://example.org/analytics.js"></script></head><body></body>'
        self.assertIn('src="https://example.org/analytics.js"', m.update(original))


if __name__ == '__main__':
    unittest.main()
