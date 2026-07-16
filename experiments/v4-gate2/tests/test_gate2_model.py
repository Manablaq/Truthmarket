import copy
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "models"))

from gate2_model import (  # noqa: E402
    MIN_SAFE_INTEGER,
    MAX_SAFE_INTEGER,
    Attempt,
    Gate2Model,
    Gate2ModelError,
)


def changed_top_level(before, after):
    return {key for key in before if before[key] != after[key]}


class Gate2ModelTests(unittest.TestCase):
    def assert_rejects_unchanged(self, model, action, code=None):
        before = copy.deepcopy(model.get_state())
        with self.assertRaises(Gate2ModelError) as raised:
            action()
        if code is not None:
            self.assertEqual(raised.exception.code, code)
        self.assertEqual(model.get_state(), before)

    def make_successor(self):
        model = Gate2Model()
        first = model.request_probe(11)
        model.expire_probe(first)
        second = model.retry_probe(first, 22)
        return model, first, second

    def test_baseline_allocation_is_one_based_and_uniquely_active(self):
        model = Gate2Model()
        self.assertEqual(model.request_probe(11), 1)
        state = model.get_state()
        self.assertEqual(state["request_count"], 1)
        self.assertEqual(state["latest_request_id"], 1)
        self.assertEqual(state["derived_active_attempt_id"], 1)
        self.assertEqual(state["requests"][0]["predecessor_id"], None)

    def test_current_execution_uses_stored_candidate_and_exact_mutation_set(self):
        model = Gate2Model()
        model.request_probe(11)
        before = model.get_state()
        self.assertEqual(model.execute_probe(1, caller="different-executor"), "SUCCEEDED")
        after = model.get_state()
        self.assertEqual(
            changed_top_level(before, after),
            {"current_value", "derived_active_attempt_id", "execution_count", "requests"},
        )
        self.assertEqual(after["current_value"], 11)
        self.assertEqual(after["execution_count"], 1)
        self.assertEqual(after["requests"][0]["status"], "SUCCEEDED")

    def test_duplicate_execution_rejects_without_mutation(self):
        model = Gate2Model()
        model.request_probe(11)
        model.execute_probe(1)
        self.assert_rejects_unchanged(model, lambda: model.execute_probe(1), "ATTEMPT_NOT_REQUESTED")

    def test_expiry_and_retry_preserve_exact_ancestry(self):
        model = Gate2Model()
        first = model.request_probe(11)
        before_expiry = model.get_state()
        model.expire_probe(first)
        after_expiry = model.get_state()
        self.assertEqual(changed_top_level(before_expiry, after_expiry), {"derived_active_attempt_id", "requests"})
        before_retry = copy.deepcopy(after_expiry)
        second = model.retry_probe(first, 22)
        after_retry = model.get_state()
        self.assertEqual(
            changed_top_level(before_retry, after_retry),
            {"derived_active_attempt_id", "latest_request_id", "request_count", "requests"},
        )
        self.assertEqual((first, second), (1, 2))
        state = after_retry
        self.assertEqual(state["requests"][0]["status"], "EXPIRED")
        self.assertEqual(state["requests"][1]["status"], "REQUESTED")
        self.assertEqual(state["requests"][1]["predecessor_id"], 1)
        self.assertEqual(state["derived_active_attempt_id"], 2)

    def test_stale_predecessor_rejects_and_successor_still_succeeds(self):
        model, first, second = self.make_successor()
        self.assert_rejects_unchanged(model, lambda: model.execute_probe(first), "ATTEMPT_NOT_REQUESTED")
        model.execute_probe(second)
        self.assertEqual(model.current_value, 22)
        self.assertEqual(model.execution_count, 1)

    def test_stale_predecessor_cannot_overwrite_successful_successor(self):
        model, first, second = self.make_successor()
        model.execute_probe(second)
        successful = copy.deepcopy(model.get_state())
        self.assert_rejects_unchanged(model, lambda: model.execute_probe(first), "ATTEMPT_NOT_REQUESTED")
        self.assertEqual(model.get_state(), successful)
        self.assertEqual(model.get_attempt(first)["status"], "EXPIRED")
        self.assertEqual(model.get_attempt(second)["status"], "SUCCEEDED")
        self.assertEqual(model.derived_active_attempt_id, None)

    def test_three_attempt_ordering_only_allows_latest(self):
        model, first, second = self.make_successor()
        model.expire_probe(second)
        third = model.retry_probe(second, 33)
        self.assertEqual(third, 3)
        for stale in (second, first):
            self.assert_rejects_unchanged(model, lambda stale=stale: model.execute_probe(stale))
        model.execute_probe(third)
        self.assertEqual(model.current_value, 33)
        self.assertEqual(model.execution_count, 1)

    def test_cancelled_and_terminal_states_cannot_be_revived(self):
        for transition in ("cancel_probe", "terminalize_probe"):
            with self.subTest(transition=transition):
                model = Gate2Model()
                model.request_probe(11)
                before_transition = model.get_state()
                getattr(model, transition)()
                authoritative = copy.deepcopy(model.get_state())
                self.assertEqual(
                    changed_top_level(before_transition, authoritative),
                    {"derived_active_attempt_id", "lifecycle_status"},
                )
                self.assert_rejects_unchanged(model, lambda: model.execute_probe(1), "LIFECYCLE_NOT_ACTIVE")
                self.assertEqual(model.get_state(), authoritative)

    def test_zero_negative_and_unknown_ids_reject_unchanged(self):
        model = Gate2Model()
        model.request_probe(11)
        for attempt_id in (0, -1, 2, MAX_SAFE_INTEGER):
            with self.subTest(attempt_id=attempt_id):
                self.assert_rejects_unchanged(model, lambda attempt_id=attempt_id: model.execute_probe(attempt_id))

    def test_rejected_request_allocation_rolls_back(self):
        model = Gate2Model()
        self.assert_rejects_unchanged(model, lambda: model.request_probe(MAX_SAFE_INTEGER + 1), "VALUE_OUT_OF_RANGE")
        self.assertEqual(model.request_probe(11), 1)

    def test_competing_retry_cannot_create_two_successors(self):
        model = Gate2Model()
        first = model.request_probe(11)
        model.expire_probe(first)
        self.assertEqual(model.retry_probe(first, 22), 2)
        self.assert_rejects_unchanged(model, lambda: model.retry_probe(first, 33), "RETRY_REQUIRES_LATEST_PREDECESSOR")
        self.assertEqual(model.request_count, 2)
        self.assertEqual(model.derived_active_attempt_id, 2)

    def test_permissionless_executor_identity_is_not_stored(self):
        model = Gate2Model()
        model.request_probe(11)
        model.execute_probe(1, caller="not-the-requester")
        state_text = repr(model.get_state())
        self.assertNotIn("not-the-requester", state_text)
        self.assertNotIn("requester", state_text)

    def test_retry_rejects_wrong_predecessor_states_without_mutation(self):
        model = Gate2Model()
        model.request_probe(11)
        self.assert_rejects_unchanged(model, lambda: model.retry_probe(1, 22), "RETRY_REQUIRES_EXPIRED_PREDECESSOR")
        model.execute_probe(1)
        self.assert_rejects_unchanged(model, lambda: model.retry_probe(1, 22), "RETRY_REQUIRES_EXPIRED_PREDECESSOR")

    def test_candidate_safe_integer_boundaries_and_booleans(self):
        for value in (MIN_SAFE_INTEGER, MAX_SAFE_INTEGER):
            with self.subTest(value=value):
                model = Gate2Model()
                model.request_probe(value)
                model.execute_probe(1)
                self.assertEqual(model.current_value, value)

        for value in (MIN_SAFE_INTEGER - 1, MAX_SAFE_INTEGER + 1, True, False):
            with self.subTest(value=value):
                model = Gate2Model()
                self.assert_rejects_unchanged(model, lambda value=value: model.request_probe(value))

    def test_attempt_id_boundaries_and_booleans_reject(self):
        model = Gate2Model()
        model.request_probe(11)
        for attempt_id in (0, -1, MAX_SAFE_INTEGER + 1, True, False):
            with self.subTest(attempt_id=attempt_id):
                self.assert_rejects_unchanged(
                    model,
                    lambda attempt_id=attempt_id: model.execute_probe(attempt_id),
                )

    def test_request_count_overflow_and_boolean_counter_reject_atomically(self):
        for counter, code in ((MAX_SAFE_INTEGER, "REQUEST_COUNT_OVERFLOW"), (True, "REQUEST_COUNT_INVALID"), (False, "REQUEST_COUNT_INVALID")):
            with self.subTest(counter=counter):
                model = Gate2Model()
                model.request_count = counter
                self.assert_rejects_unchanged(model, lambda: model.request_probe(11), code)

    def test_execution_count_overflow_and_boolean_counter_reject_atomically(self):
        for counter, code in ((MAX_SAFE_INTEGER, "EXECUTION_COUNT_OVERFLOW"), (True, "EXECUTION_COUNT_INVALID"), (False, "EXECUTION_COUNT_INVALID")):
            with self.subTest(counter=counter):
                model = Gate2Model()
                model.request_probe(11)
                model.execution_count = counter
                self.assert_rejects_unchanged(model, lambda: model.execute_probe(1), code)
                self.assertEqual(model.get_attempt(1)["status"], "REQUESTED")
                self.assertEqual(model.current_value, 0)
                self.assertEqual(model.derived_active_attempt_id, 1)

    def test_retry_allocation_overflow_preserves_expired_predecessor(self):
        model = Gate2Model()
        model.request_count = MAX_SAFE_INTEGER
        model.latest_request_id = MAX_SAFE_INTEGER
        model.requests[MAX_SAFE_INTEGER] = Attempt(
            request_id=MAX_SAFE_INTEGER,
            status="EXPIRED",
            candidate_value=11,
            predecessor_id=None,
        )
        self.assert_rejects_unchanged(
            model,
            lambda: model.retry_probe(MAX_SAFE_INTEGER, 22),
            "REQUEST_COUNT_OVERFLOW",
        )
        self.assertEqual(model.get_attempt(MAX_SAFE_INTEGER)["status"], "EXPIRED")

    def test_boolean_predecessor_ids_reject_without_mutation(self):
        model = Gate2Model()
        first = model.request_probe(11)
        model.expire_probe(first)
        for predecessor in (True, False):
            with self.subTest(predecessor=predecessor):
                self.assert_rejects_unchanged(
                    model,
                    lambda predecessor=predecessor: model.retry_probe(predecessor, 22),
                    "VALUE_NOT_INTEGER",
                )


if __name__ == "__main__":
    unittest.main()
