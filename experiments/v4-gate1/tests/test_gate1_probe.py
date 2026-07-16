import ast
import copy
import hashlib
import json
import unittest
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "contracts" / "truth_market_v4_gate1_probe.py"
EVIDENCE_PATH = ROOT / "fixtures" / "gate1-evidence.json"


@dataclass
class ProbeModel:
    request_count: int = 0

    def __post_init__(self):
        self.requests = {}

    def request_probe(self, payload, caller="requester", now="2026-07-16T00:00:00Z"):
        encoded = payload.encode("utf-8")
        if not encoded or len(encoded) > 64:
            raise AssertionError("invalid payload")
        request_id = self.request_count + 1
        self.requests[request_id] = {
            "request_id": str(request_id),
            "payload": payload,
            "requester": caller,
            "requested_at": now,
            "status": "REQUESTED",
            "result": "",
            "executor": "",
            "completed_at": "",
        }
        self.request_count = request_id
        return request_id

    def execute_probe(self, request_id, caller="executor", now="2026-07-16T00:01:00Z", classify=None):
        before = copy.deepcopy((self.request_count, self.requests))
        try:
            if request_id <= 0 or request_id not in self.requests:
                raise AssertionError("request not found")
            record = self.requests[request_id]
            if record["status"] != "REQUESTED":
                raise AssertionError("request is not executable")
            result = (classify or (lambda value: "MATCH" if value == "gate-one-alpha" else "OTHER"))(record["payload"])
            if result not in {"MATCH", "OTHER"}:
                raise AssertionError("invalid result")
            record.update(status="COMPLETED", result=result, executor=caller, completed_at=now)
            return result
        except Exception:
            self.request_count, self.requests = copy.deepcopy(before)
            raise


class Gate1ModelTests(unittest.TestCase):
    def test_request_is_one_based_and_observable_before_execution(self):
        model = ProbeModel()
        request_id = model.request_probe("gate-one-alpha")
        self.assertEqual(request_id, 1)
        self.assertEqual(model.request_count, 1)
        self.assertEqual(
            model.requests[1],
            {
                "request_id": "1",
                "payload": "gate-one-alpha",
                "requester": "requester",
                "requested_at": "2026-07-16T00:00:00Z",
                "status": "REQUESTED",
                "result": "",
                "executor": "",
                "completed_at": "",
            },
        )

    def test_exact_payload_is_immutable_across_execution(self):
        model = ProbeModel()
        model.request_probe("  gate-one-alpha  ")
        model.execute_probe(1)
        self.assertEqual(model.requests[1]["payload"], "  gate-one-alpha  ")
        self.assertEqual(model.requests[1]["result"], "OTHER")

    def test_different_executor_is_allowed_and_recorded(self):
        model = ProbeModel()
        model.request_probe("gate-one-alpha", caller="alice")
        model.execute_probe(1, caller="bob")
        self.assertEqual(model.requests[1]["requester"], "alice")
        self.assertEqual(model.requests[1]["executor"], "bob")
        self.assertEqual(model.requests[1]["status"], "COMPLETED")

    def test_duplicate_successful_execution_is_rejected_without_mutation(self):
        model = ProbeModel()
        model.request_probe("gate-one-alpha")
        model.execute_probe(1)
        completed = copy.deepcopy(model.requests[1])
        with self.assertRaises(AssertionError):
            model.execute_probe(1, caller="third-party")
        self.assertEqual(model.requests[1], completed)

    def test_zero_and_nonexistent_requests_reject_without_mutation(self):
        model = ProbeModel()
        model.request_probe("gate-one-alpha")
        before = copy.deepcopy((model.request_count, model.requests))
        for request_id in (0, 2, 999999):
            with self.assertRaises(AssertionError):
                model.execute_probe(request_id)
            self.assertEqual((model.request_count, model.requests), before)

    def test_execution_failure_rolls_back_to_requested(self):
        model = ProbeModel()
        model.request_probe("gate-one-alpha")
        with self.assertRaises(RuntimeError):
            model.execute_probe(1, classify=lambda _payload: (_ for _ in ()).throw(RuntimeError("AI failed")))
        self.assertEqual(model.requests[1]["status"], "REQUESTED")
        self.assertEqual(model.requests[1]["result"], "")
        self.assertEqual(model.requests[1]["executor"], "")

    def test_rejected_request_consumes_no_id(self):
        model = ProbeModel()
        for payload in ("", "x" * 65):
            with self.assertRaises(AssertionError):
                model.request_probe(payload)
        self.assertEqual(model.request_count, 0)
        self.assertEqual(model.request_probe("gate-one-alpha"), 1)


class Gate1SourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = CONTRACT_PATH.read_text(encoding="utf-8")
        cls.tree = ast.parse(cls.source)
        cls.contract_class = next(
            node for node in cls.tree.body if isinstance(node, ast.ClassDef)
        )
        cls.methods = {
            node.name: node for node in cls.contract_class.body if isinstance(node, ast.FunctionDef)
        }

    def method_source(self, name):
        return ast.get_source_segment(self.source, self.methods[name])

    def test_distinct_experimental_contract_name_and_minimal_public_surface(self):
        self.assertEqual(self.contract_class.name, "TruthMarketV4Gate1Probe")
        public_methods = {
            name for name, node in self.methods.items()
            if any(isinstance(decorator, ast.Attribute) and decorator.attr in {"write", "view"} for decorator in node.decorator_list)
        }
        self.assertEqual(public_methods, {"request_probe", "execute_probe", "get_probe", "get_request_count"})

    def test_request_has_no_ai_or_nondeterministic_call(self):
        request_source = self.method_source("request_probe")
        self.assertNotIn("exec_prompt", request_source)
        self.assertNotIn("prompt_non_comparative", request_source)
        self.assertNotIn("gl.nondet", request_source)

    def test_execute_loads_stored_payload_and_invokes_ai(self):
        execute_source = self.method_source("execute_probe")
        self.assertIn("record = self._load_request(request_id)", execute_source)
        self.assertIn('stored_payload = str(record["payload"])', execute_source)
        self.assertIn("gl.nondet.exec_prompt", execute_source)
        self.assertNotIn("payload:", execute_source.split("def execute_probe", 1)[1].split(")", 1)[0])

    def test_contract_contains_no_market_or_economic_operations(self):
        forbidden = {
            "create_market", "stake", "challenge_resolution", "retry_resolution",
            "finalize_market", "claim_winnings", "claim_refund", "settlement", "leaderboard",
        }
        self.assertTrue(forbidden.isdisjoint(self.methods))

    def test_deployment_metadata_has_required_genvm_boundary(self):
        lines = self.source.splitlines()
        self.assertEqual(lines[0], "# v0.3.0")
        self.assertTrue(lines[1].startswith('# { "Depends": "py-genlayer:'))
        self.assertEqual(lines[2], "")

    def test_fixture_example_is_valid_json(self):
        fixture = json.loads((ROOT / "fixtures" / "gate1-evidence.example.json").read_text())
        self.assertEqual(fixture["verdict"], "GATE 1 INCONCLUSIVE")
        self.assertEqual(fixture["network"]["chainId"], 4221)

    def test_live_evidence_is_public_and_bound_to_source(self):
        fixture = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
        source_hash = hashlib.sha256(self.source.encode("utf-8")).hexdigest()
        self.assertEqual(fixture["verdict"], "GATE 1 PASSED")
        self.assertEqual(fixture["sourceCodeSha256"], source_hash)
        self.assertEqual(fixture["deployedCodeSha256"], source_hash)
        self.assertNotEqual(fixture["requester"].lower(), fixture["executor"].lower())

        forbidden_keys = {"privatekey", "private_key", "password", "token", "secret"}

        def visit(value):
            if isinstance(value, dict):
                for key, child in value.items():
                    self.assertNotIn(key.lower(), forbidden_keys)
                    visit(child)
            elif isinstance(value, list):
                for child in value:
                    visit(child)

        visit(fixture)


if __name__ == "__main__":
    unittest.main()
