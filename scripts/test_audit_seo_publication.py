import unittest
from unittest.mock import patch
from audit_seo_publication import Page, check_article, source_links, audit, source_review_exception, ROOT

class PublicationChecks(unittest.TestCase):
    url = 'https://rent-check.kr/blog/example/'

    def valid(self, source='https://www.law.go.kr/법령/주택임대차보호법'):
        return Page(f'''<html><head><title>실제 질문에 답하는 가이드</title>
        <meta name="description" content="날짜와 원문을 확인합니다.">
        <link rel="canonical" href="{self.url}"></head><body>
        <h1>계약 날짜를 어떻게 비교하나요?</h1><a href="/blog/">가이드 목록</a>
        <a href="{source}">법령 원문</a></body></html>''')

    def test_complete_article_passes_without_arbitrary_length_limits(self):
        result = check_article(self.valid(), self.url, {self.url}, True)
        self.assertEqual(result['errors'], [])
        self.assertTrue(result['source_links'])

    def test_new_article_missing_source_blocks(self):
        p = self.valid(); p.links = ['/blog/']
        self.assertIn('source_link_needs_manual_review', check_article(p, self.url, {self.url}, True)['errors'])

    def test_old_article_missing_recognized_source_warns_without_rewrite(self):
        p = self.valid(); p.links = ['/blog/']
        result = check_article(p, self.url, {self.url}, False)
        self.assertEqual(result['errors'], [])
        self.assertIn('source_link_needs_manual_review', result['warnings'])

    def test_missing_metadata_and_sitemap_are_detected(self):
        p = Page('<html><body><p>본문만 있습니다.</p></body></html>')
        errors = check_article(p, self.url, set(), True)['errors']
        for expected in ['missing_title', 'missing_description', 'missing_initial_h1',
                         'missing_or_conflicting_self_canonical', 'indexable_article_missing_from_sitemap',
                         'missing_internal_link']:
            self.assertIn(expected, errors)

    def test_canonical_conflict_and_spoofed_source_are_detected(self):
        p = self.valid('https://law.go.kr.evil.test/'); p.canonicals.append(self.url + '?duplicate=1')
        self.assertFalse(source_links(p))
        self.assertIn('missing_or_conflicting_self_canonical', check_article(p, self.url, {self.url}, True)['errors'])

    def test_malformed_structured_data_is_detected(self):
        self.assertEqual(Page('<script type="application/ld+json">{bad}</script>').schemas, [{'_invalid_json': True}])

    def test_actual_repository_has_54_articles_and_no_blocking_defects(self):
        result = audit()
        self.assertEqual(result['articles_checked'], 54)
        self.assertEqual(result['errors'], [])

    def test_publication_gate_rejects_a_list_or_noindexed_article(self):
        result = audit('blog/all/index.html')
        self.assertIn('publication_gate_requires_a_blog_article', [x['issue'] for x in result['errors']])
        p = self.valid(); p.robots = 'noindex,follow'
        with patch('audit_seo_publication.Page', return_value=p):
            blocked = audit('blog/landlord-loan-after-move-in-priority/index.html')
        self.assertIn('publication_article_marked_noindex', [x['issue'] for x in blocked['errors']])

    def test_reviewed_arithmetic_exemption_requires_the_exact_reviewed_html(self):
        relative = 'blog/apartment-84sqm-pyeong/index.html'
        source = (ROOT / relative).read_text(encoding='utf-8')
        reason = source_review_exception(relative, source)
        self.assertTrue(reason)
        self.assertIsNone(source_review_exception(relative, source + '<!-- content changed -->'))
        self.assertIsNone(source_review_exception('blog/unreviewed/index.html', source))
        url = 'https://rent-check.kr/blog/apartment-84sqm-pyeong/'
        self.assertEqual(check_article(Page(source), url, {url}, True, reason)['errors'], [])

if __name__ == '__main__': unittest.main()
