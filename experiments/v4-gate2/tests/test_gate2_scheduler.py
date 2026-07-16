import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "models"))

from gate2_scheduler import run_schedule_a, run_schedule_b  # noqa: E402


class Gate2SchedulerTests(unittest.TestCase):
    def test_schedule_a_guarded_commit_rejects_without_mutation(self):
        result = run_schedule_a("RECHECK_AND_REJECT")
        self.assertTrue(result["rejected"])
        self.assertFalse(result["invariant_violated"])
        self.assertEqual(result["before"], result["after"])
        self.assertEqual(result["after"]["derived_active_attempt_id"], 2)

    def test_schedule_a_old_snapshot_commit_exposes_violation(self):
        result = run_schedule_a("COMMIT_OLD_SNAPSHOT")
        self.assertFalse(result["rejected"])
        self.assertTrue(result["invariant_violated"])
        self.assertNotEqual(result["before"], result["after"])
        self.assertEqual(result["after"]["current_value"], 11)

    def test_schedule_b_guarded_commit_preserves_successful_successor(self):
        result = run_schedule_b("RECHECK_AND_REJECT")
        self.assertTrue(result["rejected"])
        self.assertFalse(result["invariant_violated"])
        self.assertEqual(result["before"], result["after"])
        self.assertEqual(result["after"]["current_value"], 22)
        self.assertEqual(result["after"]["execution_count"], 1)

    def test_schedule_b_old_snapshot_commit_overwrites_successor_and_violates(self):
        result = run_schedule_b("COMMIT_OLD_SNAPSHOT")
        self.assertTrue(result["invariant_violated"])
        self.assertEqual(result["before"]["current_value"], 22)
        self.assertEqual(result["after"]["current_value"], 11)
        self.assertEqual(result["after"]["execution_count"], 2)

    def test_scheduler_is_explicitly_harness_only(self):
        source = (ROOT / "models" / "gate2_scheduler.py").read_text(encoding="utf-8")
        self.assertIn("Harness-only", source)
        self.assertIn("never evidence of Bradbury behavior", source)


if __name__ == "__main__":
    unittest.main()
