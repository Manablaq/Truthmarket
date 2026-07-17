"""Local execution tests for the nonproduction Gate 2 Stage A probe."""

from __future__ import annotations

import copy
import dataclasses
import importlib.util
import json
import sys
import types
import unittest
from pathlib import Path


TESTS_DIR = Path(__file__).resolve().parent
GATE2_DIR = TESTS_DIR.parent
PROBE_PATH = GATE2_DIR / "contracts" / "truth_market_v4_gate2_probe.py"
MODEL_PATH = GATE2_DIR / "models" / "gate2_model.py"


def load_model_module():
    spec = importlib.util.spec_from_file_location("gate2_authoritative_model", MODEL_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class _PublicDecorators:
    @staticmethod
    def write(method):
        method.__gate2_public_kind__ = "write"
        return method

    @staticmethod
    def view(method):
        method.__gate2_public_kind__ = "view"
        return method


class _NondeterministicStub:
    def __init__(self):
        self.prompts = []
        self.callback = None

    def reset(self):
        self.prompts.clear()
        self.callback = None

    def exec_prompt(self, prompt):
        self.prompts.append(prompt)
        if self.callback is not None:
            return self.callback(prompt)
        return "READY"


class _EquivalenceStub:
    @staticmethod
    def prompt_non_comparative(call, **_kwargs):
        return call()


class _TreeMap(dict):
    pass


def load_probe_module():
    fake_genlayer = types.ModuleType("genlayer")
    fake_genlayer.TreeMap = _TreeMap
    fake_genlayer.u64 = int
    fake_genlayer.i64 = int
    fake_genlayer.gl = types.SimpleNamespace(
        Contract=object,
        public=_PublicDecorators(),
        nondet=_NondeterministicStub(),
        eq_principle=_EquivalenceStub(),
    )
    fake_genlayer.__all__ = ["TreeMap", "u64", "i64", "gl"]
    sys.modules["genlayer"] = fake_genlayer

    module_name = "gate2_stage_a_probe_under_test"
    module = types.ModuleType(module_name)
    module.__file__ = str(PROBE_PATH)
    sys.modules[module_name] = module
    exec(compile(PROBE_PATH.read_bytes(), str(PROBE_PATH), "exec"), module.__dict__)
    return module


MODEL = load_model_module()
PROBE = load_probe_module()


def new_probe():
    probe = PROBE.TruthMarketV4Gate2Probe.__new__(
        PROBE.TruthMarketV4Gate2Probe
    )
    probe.requests = _TreeMap()
    probe.__init__()
    return probe


def probe_state(probe):
    return dataclasses.asdict(probe.get_state())


def comparable_probe_state(probe):
    state = probe_state(probe)
    state["requests"] = state.pop("attempts")
    return state


class Gate2ProbeTests(unittest.TestCase):
    maxDiff = None

    def setUp(self):
        PROBE.gl.nondet.reset()

    def assert_rejected_without_mutation(self, probe, operation, *args):
        before = copy.deepcopy(probe_state(probe))
        before_storage = copy.deepcopy(dict(probe.requests))
        with self.assertRaises(AssertionError):
            operation(*args)
        self.assertEqual(probe_state(probe), before)
        self.assertEqual(dict(probe.requests), before_storage)

    def assert_parity(self, probe, model):
        self.assertEqual(comparable_probe_state(probe), model.get_state())

    def test_s01_initial_state_and_first_request_match_model(self):
        probe = new_probe()
        model = MODEL.Gate2Model()
        self.assert_parity(probe, model)
        self.assertEqual(probe.request_probe(41), model.request_probe(41))
        self.assert_parity(probe, model)

    def test_initial_storage_sentinel_is_encapsulated_by_public_state(self):
        probe = new_probe()
        self.assertEqual(probe.latest_request_id, PROBE.NO_ATTEMPT_ID)
        state = probe.get_state()
        self.assertIsNone(state.latest_request_id)
        self.assertIsNone(state.derived_active_attempt_id)
        self.assertEqual(state.attempts, [])

    def test_valid_and_inactive_public_id_views_never_expose_sentinel(self):
        probe = new_probe()
        first = probe.request_probe(0)
        active_state = probe.get_state()
        self.assertEqual(first, 1)
        self.assertEqual(active_state.latest_request_id, 1)
        self.assertEqual(active_state.derived_active_attempt_id, 1)
        self.assertEqual(active_state.attempts[0].request_id, 1)
        self.assertIsNone(active_state.attempts[0].predecessor_id)
        self.assertEqual(probe.get_attempt(1).request_id, 1)
        self.assertIsNone(probe.get_attempt(1).predecessor_id)

        probe.expire_probe(first)
        inactive_state = probe.get_state()
        self.assertEqual(inactive_state.latest_request_id, 1)
        self.assertIsNone(inactive_state.derived_active_attempt_id)

        second = probe.retry_probe(first, 2)
        probe.cancel_probe()
        cancelled_state = probe.get_state()
        self.assertEqual(second, 2)
        self.assertEqual(cancelled_state.latest_request_id, 2)
        self.assertIsNone(cancelled_state.derived_active_attempt_id)
        self.assertEqual(probe.get_attempt(second).predecessor_id, 1)

    def test_zero_attempt_id_rejection_preserves_sentinel_and_first_allocation(self):
        probe = new_probe()
        self.assert_rejected_without_mutation(probe, probe.get_attempt, 0)
        self.assert_rejected_without_mutation(probe, probe.execute_probe, 0)
        self.assertEqual(probe.latest_request_id, PROBE.NO_ATTEMPT_ID)
        self.assertIsNone(probe.get_state().latest_request_id)
        self.assertEqual(probe.request_probe(7), 1)
        self.assertEqual(probe.latest_request_id, 1)

    def test_s02_current_execution_uses_stored_candidate(self):
        probe = new_probe()
        attempt_id = probe.request_probe(-71)
        before = copy.deepcopy(vars(probe))
        self.assertEqual(probe.execute_probe(attempt_id), PROBE.STATUS_SUCCEEDED)
        after = copy.deepcopy(vars(probe))
        self.assertEqual(
            {key for key in before if before[key] != after[key]},
            {"requests", "current_value", "execution_count"},
        )
        before_attempt = json.loads(before["requests"]["1"])
        after_attempt = json.loads(after["requests"]["1"])
        self.assertEqual(
            {key for key in before_attempt if before_attempt[key] != after_attempt[key]},
            {"status"},
        )
        state = probe_state(probe)
        self.assertEqual(state["current_value"], -71)
        self.assertEqual(state["execution_count"], 1)
        self.assertEqual(state["attempts"][0]["status"], PROBE.STATUS_SUCCEEDED)
        self.assertEqual(len(PROBE.gl.nondet.prompts), 1)
        self.assertIn("candidate integer -71.", PROBE.gl.nondet.prompts[0])

    def test_s03_duplicate_execution_is_atomic(self):
        probe = new_probe()
        attempt_id = probe.request_probe(5)
        probe.execute_probe(attempt_id)
        self.assert_rejected_without_mutation(probe, probe.execute_probe, attempt_id)

    def test_s04_expiration_matches_model(self):
        probe = new_probe()
        model = MODEL.Gate2Model()
        attempt_id = probe.request_probe(10)
        model.request_probe(10)
        self.assertEqual(probe.expire_probe(attempt_id), model.expire_probe(attempt_id))
        self.assert_parity(probe, model)

    def test_s05_retry_retains_exact_ancestry(self):
        probe = new_probe()
        first = probe.request_probe(10)
        probe.expire_probe(first)
        second = probe.retry_probe(first, 20)
        self.assertEqual(second, 2)
        self.assertEqual(dataclasses.asdict(probe.get_attempt(second)), {
            "request_id": 2,
            "status": PROBE.STATUS_REQUESTED,
            "candidate_value": 20,
            "predecessor_id": 1,
        })

    def test_s06_stale_predecessor_after_successor_creation_is_atomic(self):
        probe = new_probe()
        first = probe.request_probe(10)
        probe.expire_probe(first)
        probe.retry_probe(first, 20)
        self.assert_rejected_without_mutation(probe, probe.execute_probe, first)

    def test_s07_successor_remains_executable_after_stale_calls(self):
        probe = new_probe()
        first = probe.request_probe(10)
        probe.expire_probe(first)
        second = probe.retry_probe(first, 20)
        self.assert_rejected_without_mutation(probe, probe.execute_probe, first)
        self.assertEqual(probe.execute_probe(second), PROBE.STATUS_SUCCEEDED)
        self.assertEqual(probe.current_value, 20)

    def test_s08_successful_successor_cannot_be_overwritten(self):
        probe = new_probe()
        first = probe.request_probe(10)
        probe.expire_probe(first)
        second = probe.retry_probe(first, 20)
        probe.execute_probe(second)
        successful_state = copy.deepcopy(probe_state(probe))
        self.assert_rejected_without_mutation(probe, probe.execute_probe, first)
        self.assertEqual(probe_state(probe), successful_state)
        self.assertEqual(probe.get_attempt(first).status, PROBE.STATUS_EXPIRED)
        self.assertEqual(probe.get_attempt(second).status, PROBE.STATUS_SUCCEEDED)

    def test_s09_three_attempt_ordering_is_bounded_and_exact(self):
        probe = new_probe()
        first = probe.request_probe(1)
        probe.expire_probe(first)
        second = probe.retry_probe(first, 2)
        probe.expire_probe(second)
        third = probe.retry_probe(second, 3)
        self.assertEqual([item.request_id for item in probe.get_state().attempts], [1, 2, 3])
        self.assertEqual(probe.get_attempt(third).predecessor_id, second)
        self.assert_rejected_without_mutation(probe, probe.execute_probe, first)
        self.assert_rejected_without_mutation(probe, probe.execute_probe, second)
        self.assertEqual(probe.execute_probe(third), PROBE.STATUS_SUCCEEDED)
        state = probe_state(probe)
        self.assertEqual(
            [attempt["status"] for attempt in state["attempts"]],
            [PROBE.STATUS_EXPIRED, PROBE.STATUS_EXPIRED, PROBE.STATUS_SUCCEEDED],
        )
        self.assertEqual(state["current_value"], 3)
        self.assertEqual(state["execution_count"], 1)
        self.assertEqual(state["latest_request_id"], third)
        self.assertIsNone(state["derived_active_attempt_id"])

    def test_probe_history_cap_rejects_fourth_allocation_without_mutation(self):
        probe = new_probe()
        first = probe.request_probe(1)
        probe.expire_probe(first)
        second = probe.retry_probe(first, 2)
        probe.expire_probe(second)
        third = probe.retry_probe(second, 3)
        probe.expire_probe(third)
        self.assert_rejected_without_mutation(probe, probe.retry_probe, third, 4)

    def test_s10_cancelled_state_has_precedence(self):
        probe = new_probe()
        attempt_id = probe.request_probe(8)
        self.assertEqual(probe.cancel_probe(), PROBE.LIFECYCLE_CANCELLED)
        self.assertIsNone(probe.get_state().derived_active_attempt_id)
        self.assert_rejected_without_mutation(probe, probe.execute_probe, attempt_id)
        self.assert_rejected_without_mutation(probe, probe.cancel_probe)

    def test_s11_terminal_state_has_precedence(self):
        probe = new_probe()
        attempt_id = probe.request_probe(8)
        self.assertEqual(probe.terminalize_probe(), PROBE.LIFECYCLE_TERMINAL)
        self.assertIsNone(probe.get_state().derived_active_attempt_id)
        self.assert_rejected_without_mutation(probe, probe.execute_probe, attempt_id)
        self.assert_rejected_without_mutation(probe, probe.terminalize_probe)

    def test_s12_s13_s14_invalid_and_unknown_ids_are_atomic(self):
        probe = new_probe()
        probe.request_probe(8)
        for invalid_id in (
            0,
            -1,
            PROBE.MAX_SAFE_INTEGER,
            PROBE.MAX_SAFE_INTEGER + 1,
            True,
            False,
            2,
        ):
            with self.subTest(invalid_id=invalid_id):
                self.assert_rejected_without_mutation(
                    probe, probe.get_attempt, invalid_id
                )
                self.assert_rejected_without_mutation(
                    probe, probe.execute_probe, invalid_id
                )

    def test_s15_failed_allocation_never_consumes_an_id(self):
        probe = new_probe()
        self.assert_rejected_without_mutation(
            probe, probe.request_probe, PROBE.MAX_SAFE_INTEGER + 1
        )
        self.assertEqual(probe.request_count, 0)
        self.assertEqual(probe.latest_request_id, PROBE.NO_ATTEMPT_ID)
        self.assertIsNone(probe.get_state().latest_request_id)
        self.assertEqual(probe.request_probe(11), 1)
        self.assertEqual(probe.request_count, 1)
        self.assertEqual(probe.latest_request_id, 1)

    def test_s16_competing_retry_cannot_create_two_successors(self):
        probe = new_probe()
        first = probe.request_probe(1)
        probe.expire_probe(first)
        probe.retry_probe(first, 2)
        self.assert_rejected_without_mutation(probe, probe.retry_probe, first, 3)
        self.assertEqual(probe.request_count, 2)

    def test_s17_local_permissionless_surface_stores_no_caller_identity(self):
        """This checks local ABI/state shape, not multiple live identities."""

        probe = new_probe()
        attempt_id = probe.request_probe(99)
        self.assertEqual(probe.execute_probe(attempt_id), PROBE.STATUS_SUCCEEDED)
        self.assertFalse(any("caller" in key.lower() for key in vars(probe)))

    def test_candidate_safe_integer_boundaries_and_booleans(self):
        for value in (PROBE.MIN_SAFE_INTEGER, PROBE.MAX_SAFE_INTEGER):
            with self.subTest(value=value):
                probe = new_probe()
                probe.request_probe(value)
                probe.execute_probe(1)
                self.assertEqual(probe.current_value, value)
        for value in (
            PROBE.MIN_SAFE_INTEGER - 1,
            PROBE.MAX_SAFE_INTEGER + 1,
            True,
            False,
            1.5,
        ):
            with self.subTest(value=value):
                probe = new_probe()
                self.assert_rejected_without_mutation(probe, probe.request_probe, value)

    def test_execution_count_overflow_rejects_atomically(self):
        """Use test-only internal state to reach the otherwise unreachable cap."""

        probe = new_probe()
        attempt_id = probe.request_probe(7)
        probe.execution_count = PROBE.MAX_SAFE_INTEGER
        self.assert_rejected_without_mutation(probe, probe.execute_probe, attempt_id)

    def test_request_count_overflow_rejects_before_storage_mutation(self):
        """Use test-only internal state to exercise safe-integer overflow."""

        probe = new_probe()
        probe.request_count = PROBE.MAX_SAFE_INTEGER
        before = copy.deepcopy(vars(probe))
        with self.assertRaises(AssertionError):
            probe.request_probe(7)
        self.assertEqual(vars(probe), before)

    def test_post_intelligent_guard_rejects_invalidation_and_preserves_successor(self):
        probe = new_probe()
        old_attempt_id = probe.request_probe(101)
        successor_state = None

        def invalidate_during_intelligence(prompt):
            nonlocal successor_state
            self.assertIn("candidate integer 101.", prompt)
            probe.expire_probe(old_attempt_id)
            successor_id = probe.retry_probe(old_attempt_id, 202)
            self.assertEqual(successor_id, 2)
            successor_state = copy.deepcopy(probe_state(probe))
            return "READY"

        PROBE.gl.nondet.callback = invalidate_during_intelligence
        with self.assertRaisesRegex(AssertionError, "ATTEMPT_NOT_REQUESTED"):
            probe.execute_probe(old_attempt_id)

        self.assertIsNotNone(successor_state)
        self.assertEqual(probe_state(probe), successor_state)
        self.assertEqual(dict(probe.requests), {
            "1": json.dumps(
                {
                    "request_id": 1,
                    "status": PROBE.STATUS_EXPIRED,
                    "candidate_value": 101,
                    "predecessor_id": None,
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            "2": json.dumps(
                {
                    "request_id": 2,
                    "status": PROBE.STATUS_REQUESTED,
                    "candidate_value": 202,
                    "predecessor_id": 1,
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
        })
        self.assertEqual(probe.current_value, 0)
        self.assertEqual(probe.execution_count, 0)
        self.assertEqual(probe.get_state().derived_active_attempt_id, 2)

    def test_each_public_rejection_family_is_atomic_and_allocates_nothing(self):
        duplicate_request = new_probe()
        duplicate_request.request_probe(1)
        self.assert_rejected_without_mutation(
            duplicate_request, duplicate_request.request_probe, 2
        )

        duplicate_expiry = new_probe()
        duplicate_expiry.request_probe(1)
        duplicate_expiry.expire_probe(1)
        self.assert_rejected_without_mutation(
            duplicate_expiry, duplicate_expiry.expire_probe, 1
        )

        premature_retry = new_probe()
        premature_retry.request_probe(1)
        self.assert_rejected_without_mutation(
            premature_retry, premature_retry.retry_probe, 1, 2
        )

        cancelled = new_probe()
        cancelled.request_probe(1)
        cancelled.cancel_probe()
        self.assert_rejected_without_mutation(
            cancelled, cancelled.terminalize_probe
        )

        terminal = new_probe()
        terminal.request_probe(1)
        terminal.terminalize_probe()
        self.assert_rejected_without_mutation(terminal, terminal.cancel_probe)

    def test_probe_and_model_match_for_complete_three_attempt_flow(self):
        probe = new_probe()
        model = MODEL.Gate2Model()
        for candidate in (11, 22, 33):
            if model.request_count == 0:
                self.assertEqual(probe.request_probe(candidate), model.request_probe(candidate))
            else:
                predecessor = model.latest_request_id
                self.assertEqual(
                    probe.retry_probe(predecessor, candidate),
                    model.retry_probe(predecessor, candidate),
                )
            self.assert_parity(probe, model)
            if candidate != 33:
                latest = model.latest_request_id
                self.assertEqual(probe.expire_probe(latest), model.expire_probe(latest))
                self.assert_parity(probe, model)
        latest = model.latest_request_id
        self.assertEqual(probe.execute_probe(latest), model.execute_probe(latest))
        self.assert_parity(probe, model)

    def test_storage_records_are_detached_from_returned_views(self):
        probe = new_probe()
        probe.request_probe(4)
        view = probe.get_state()
        view.attempts[0].status = "CORRUPTED"
        self.assertEqual(probe.get_attempt(1).status, PROBE.STATUS_REQUESTED)
        stored = json.loads(probe.requests["1"])
        self.assertEqual(stored["status"], PROBE.STATUS_REQUESTED)


if __name__ == "__main__":
    unittest.main()
