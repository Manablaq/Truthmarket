"""AST conformance tests for the frozen Gate 2 Stage A probe ABI."""

from __future__ import annotations

import ast
import unittest
from pathlib import Path


PROBE_PATH = (
    Path(__file__).resolve().parent.parent
    / "contracts"
    / "truth_market_v4_gate2_probe.py"
)
SOURCE = PROBE_PATH.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE, filename=str(PROBE_PATH))


def class_node(name):
    return next(
        node for node in TREE.body if isinstance(node, ast.ClassDef) and node.name == name
    )


def methods(node):
    return {
        item.name: item
        for item in node.body
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
    }


def annotation_text(annotation):
    return ast.unparse(annotation) if annotation is not None else None


def decorator_text(method):
    return {ast.unparse(item) for item in method.decorator_list}


def called_attributes(node):
    return {
        child.func.attr
        for child in ast.walk(node)
        if isinstance(child, ast.Call) and isinstance(child.func, ast.Attribute)
    }


def record_keys(node, record_name):
    keys = set()
    for child in ast.walk(node):
        if not isinstance(child, ast.Subscript):
            continue
        if not isinstance(child.value, ast.Name) or child.value.id != record_name:
            continue
        if isinstance(child.slice, ast.Constant) and isinstance(child.slice.value, str):
            keys.add(child.slice.value)
    return keys


def self_attributes(node):
    return {
        child.attr
        for child in ast.walk(node)
        if isinstance(child, ast.Attribute)
        and isinstance(child.value, ast.Name)
        and child.value.id == "self"
    }


class Gate2ProbeAbiTests(unittest.TestCase):
    def setUp(self):
        self.contract = class_node("TruthMarketV4Gate2Probe")
        self.contract_methods = methods(self.contract)

    def test_exact_dataclass_names_fields_order_and_annotations(self):
        expected = {
            "Gate2AttemptView": [
                ("request_id", "int"),
                ("status", "str"),
                ("candidate_value", "int"),
                ("predecessor_id", "Optional[int]"),
            ],
            "Gate2StateView": [
                ("request_count", "int"),
                ("latest_request_id", "Optional[int]"),
                ("lifecycle_status", "str"),
                ("current_value", "int"),
                ("execution_count", "int"),
                ("derived_active_attempt_id", "Optional[int]"),
                ("attempts", "list[Gate2AttemptView]"),
            ],
        }
        for name, fields in expected.items():
            with self.subTest(dataclass=name):
                node = class_node(name)
                self.assertIn("dataclass", {ast.unparse(item) for item in node.decorator_list})
                actual = [
                    (item.target.id, annotation_text(item.annotation))
                    for item in node.body
                    if isinstance(item, ast.AnnAssign)
                    and isinstance(item.target, ast.Name)
                ]
                self.assertEqual(actual, fields)

    def test_exact_public_surface_and_annotations(self):
        expected = {
            "request_probe": (["candidate_value"], ["int"], "int", "gl.public.write"),
            "expire_probe": (["attempt_id"], ["int"], "str", "gl.public.write"),
            "retry_probe": (
                ["predecessor_id", "candidate_value"],
                ["int", "int"],
                "int",
                "gl.public.write",
            ),
            "execute_probe": (["attempt_id"], ["int"], "str", "gl.public.write"),
            "cancel_probe": ([], [], "str", "gl.public.write"),
            "terminalize_probe": ([], [], "str", "gl.public.write"),
            "get_state": ([], [], "Gate2StateView", "gl.public.view"),
            "get_attempt": (
                ["attempt_id"],
                ["int"],
                "Gate2AttemptView",
                "gl.public.view",
            ),
        }
        actual_public = {
            name
            for name, method in self.contract_methods.items()
            if decorator_text(method) & {"gl.public.write", "gl.public.view"}
        }
        self.assertEqual(actual_public, set(expected))
        for name, (arg_names, arg_types, return_type, decorator) in expected.items():
            with self.subTest(method=name):
                method = self.contract_methods[name]
                public_args = method.args.args[1:]
                self.assertEqual([item.arg for item in public_args], arg_names)
                self.assertEqual(
                    [annotation_text(item.annotation) for item in public_args], arg_types
                )
                self.assertEqual(annotation_text(method.returns), return_type)
                self.assertEqual(decorator_text(method), {decorator})

    def test_explicit_constructor_is_present_and_initializes_only_probe_state(self):
        constructor = self.contract_methods["__init__"]
        assigned = {
            node.targets[0].attr
            for node in ast.walk(constructor)
            if isinstance(node, ast.Assign)
            and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Attribute)
            and isinstance(node.targets[0].value, ast.Name)
            and node.targets[0].value.id == "self"
        }
        self.assertEqual(
            assigned,
            {
                "request_count",
                "latest_request_id",
                "lifecycle_status",
                "current_value",
                "execution_count",
            },
        )
        latest_assignment = next(
            node
            for node in ast.walk(constructor)
            if isinstance(node, ast.Assign)
            and isinstance(node.targets[0], ast.Attribute)
            and node.targets[0].attr == "latest_request_id"
        )
        self.assertIsNone(ast.literal_eval(latest_assignment.value))
        storage_annotations = {
            item.target.id: annotation_text(item.annotation)
            for item in self.contract.body
            if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name)
        }
        self.assertEqual(storage_annotations["latest_request_id"], "Optional[int]")

    def test_execute_accepts_only_attempt_id_and_uses_stored_candidate(self):
        execute = self.contract_methods["execute_probe"]
        self.assertEqual([item.arg for item in execute.args.args], ["self", "attempt_id"])
        execute_source = ast.get_source_segment(SOURCE, execute)
        self.assertIn('stored_candidate = initial_attempt["candidate_value"]', execute_source)
        self.assertIn("_run_bounded_intelligent_operation(stored_candidate)", execute_source)
        self.assertIn("self.current_value = stored_candidate", execute_source)
        self.assertNotIn("candidate_value", [item.arg for item in execute.args.args])

    def test_complete_stale_guard_precedes_first_protected_storage_mutation(self):
        execute = self.contract_methods["execute_probe"]
        body = execute.body

        intelligent_index = next(
            index
            for index, statement in enumerate(body)
            if "_run_bounded_intelligent_operation" in called_attributes(statement)
        )
        save_index = next(
            index
            for index, statement in enumerate(body)
            if "_save_attempt" in called_attributes(statement)
        )
        lifecycle_indices = [
            index
            for index, statement in enumerate(body)
            if "_require_active_lifecycle" in called_attributes(statement)
        ]
        self.assertEqual(len(lifecycle_indices), 2)
        self.assertLess(lifecycle_indices[0], intelligent_index)
        self.assertGreater(lifecycle_indices[1], intelligent_index)
        self.assertLess(lifecycle_indices[1], save_index)

        load_indices = {}
        for index, statement in enumerate(body):
            if not isinstance(statement, ast.Assign) or len(statement.targets) != 1:
                continue
            target = statement.targets[0]
            if isinstance(target, ast.Name) and "_load_attempt" in called_attributes(statement):
                load_indices[target.id] = index
        self.assertLess(load_indices["initial_attempt"], intelligent_index)
        self.assertGreater(load_indices["guarded_attempt"], intelligent_index)
        self.assertLess(load_indices["guarded_attempt"], save_index)

        def guard_indices(record_name):
            status = []
            derived = []
            latest = []
            candidate = []
            for index, statement in enumerate(body):
                if not isinstance(statement, ast.Assert):
                    continue
                keys = record_keys(statement.test, record_name)
                calls = called_attributes(statement.test)
                attrs = self_attributes(statement.test)
                names = {
                    child.id
                    for child in ast.walk(statement.test)
                    if isinstance(child, ast.Name)
                }
                if "status" in keys and "STATUS_REQUESTED" in names:
                    status.append(index)
                if "request_id" in keys and "_derived_active_attempt_id" in calls:
                    derived.append(index)
                if "request_id" in keys and "latest_request_id" in attrs:
                    latest.append(index)
                if "candidate_value" in keys and "stored_candidate" in names:
                    candidate.append(index)
            return status, derived, latest, candidate

        initial_status, initial_derived, initial_latest, initial_candidate = guard_indices(
            "initial_attempt"
        )
        self.assertEqual(initial_candidate, [])
        for indices in (initial_status, initial_derived, initial_latest):
            self.assertEqual(len(indices), 1)
            self.assertLess(indices[0], intelligent_index)

        guarded_status, guarded_derived, guarded_latest, guarded_candidate = guard_indices(
            "guarded_attempt"
        )
        for indices in (
            guarded_status,
            guarded_derived,
            guarded_latest,
            guarded_candidate,
        ):
            self.assertEqual(len(indices), 1)
            self.assertGreater(indices[0], intelligent_index)
            self.assertLess(indices[0], save_index)

        counter_guard_indices = [
            index
            for index, statement in enumerate(body)
            if isinstance(statement, ast.Assert)
            and "execution_count" in self_attributes(statement.test)
            and "MAX_SAFE_INTEGER"
            in {
                child.id
                for child in ast.walk(statement.test)
                if isinstance(child, ast.Name)
            }
        ]
        self.assertEqual(len(counter_guard_indices), 1)
        self.assertGreater(counter_guard_indices[0], intelligent_index)
        self.assertLess(counter_guard_indices[0], save_index)

        persistent_mutation_indices = []
        for index, statement in enumerate(body):
            if "_save_attempt" in called_attributes(statement):
                persistent_mutation_indices.append(index)
            for child in ast.walk(statement):
                targets = []
                if isinstance(child, ast.Assign):
                    targets = child.targets
                elif isinstance(child, ast.AugAssign):
                    targets = [child.target]
                if any(
                    isinstance(target, ast.Attribute)
                    and isinstance(target.value, ast.Name)
                    and target.value.id == "self"
                    for target in targets
                ):
                    persistent_mutation_indices.append(index)
        self.assertTrue(persistent_mutation_indices)
        self.assertEqual(min(persistent_mutation_indices), save_index)
        self.assertGreater(min(persistent_mutation_indices), max(
            guarded_status + guarded_derived + guarded_latest + guarded_candidate
            + counter_guard_indices
        ))

    def test_active_identity_is_derived_and_never_stored(self):
        annotations = {
            item.target.id
            for item in self.contract.body
            if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name)
        }
        self.assertNotIn("derived_active_attempt_id", annotations)
        self.assertIn("_derived_active_attempt_id", self.contract_methods)

    def test_bounded_history_is_explicit(self):
        constants = {
            node.targets[0].id: ast.literal_eval(node.value)
            for node in TREE.body
            if isinstance(node, ast.Assign)
            and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Name)
            and isinstance(node.value, ast.Constant)
        }
        self.assertEqual(constants["MAX_ATTEMPTS"], 3)
        next_id_source = ast.get_source_segment(
            SOURCE, self.contract_methods["_next_request_id"]
        )
        self.assertIn("self.request_count < MAX_ATTEMPTS", next_id_source)

    def test_no_forbidden_probe_mechanisms_or_public_fallbacks(self):
        forbidden_identifiers = {
            "timestamp",
            "timestamps",
            "datetime",
            "event",
            "events",
            "sleep",
            "delay",
            "reset",
            "nonce",
            "generation",
            "caller",
            "requester",
            "executor",
            "wallet",
            "signer",
            "private_key",
            "rejection_log",
            "deploy",
        }
        identifiers = set()
        for node in ast.walk(TREE):
            if isinstance(node, ast.Name):
                identifiers.add(node.id.lower())
            elif isinstance(node, ast.Attribute):
                identifiers.add(node.attr.lower())
            elif isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                identifiers.add(node.name.lower())
        self.assertTrue(forbidden_identifiers.isdisjoint(identifiers))
        public_methods = {
            name: annotation_text(method.returns)
            for name, method in self.contract_methods.items()
            if decorator_text(method) & {"gl.public.write", "gl.public.view"}
        }
        self.assertEqual(public_methods["get_state"], "Gate2StateView")
        self.assertEqual(public_methods["get_attempt"], "Gate2AttemptView")
        self.assertFalse(any(name.startswith("get_request_") for name in public_methods))

    def test_structured_getters_do_not_generate_canonical_json(self):
        for name in ("get_state", "get_attempt"):
            source = ast.get_source_segment(SOURCE, self.contract_methods[name])
            self.assertNotIn("json.dumps", source)
            self.assertNotIn("sha256", source.lower())
            self.assertNotIn("canonical", source.lower())

    def test_dependency_header_is_explicit_and_stage_a_specific(self):
        lines = SOURCE.splitlines()
        self.assertEqual(lines[0], "# v0.2.16")
        self.assertEqual(
            lines[1],
            '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }',
        )


if __name__ == "__main__":
    unittest.main()
