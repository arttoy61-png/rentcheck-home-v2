import unittest
from wait_public_collection import ready

def run(**kw):
    return {"head_branch": "main", "created_at": "2026-09-08T20:15:00Z",
            "status": "completed", "conclusion": "success", **kw}

class Tests(unittest.TestCase):
    def test_completed_today(self):
        self.assertTrue(ready([run()], "2026-09-09"))
    def test_queued_and_running(self):
        for state in ["queued", "in_progress", "waiting"]:
            self.assertFalse(ready([run(status=state)], "2026-09-09"))
    def test_prior_day_does_not_look_fresh(self):
        self.assertFalse(ready([run()], "2026-09-10"))
    def test_failed_never_rebuilds(self):
        self.assertFalse(ready([run(conclusion="failure")], "2026-09-09"))
    def test_no_run_retains_home(self):
        self.assertFalse(ready([], "2026-09-09"))
    def test_unrelated_branch_does_not_block(self):
        self.assertTrue(ready([run(), run(head_branch="test", status="in_progress")], "2026-09-09"))
    def test_newer_failure_blocks_old_success(self):
        self.assertFalse(ready([run(), run(created_at="2026-09-08T22:15:00Z", conclusion="failure")], "2026-09-09"))
    def test_unchanged_contract_date_is_ok(self):
        self.assertTrue(ready([run(data_until="2026-09-04")], "2026-09-09"))

if __name__ == "__main__":
    unittest.main()
