import hashlib
import json
import math
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SUPPORT = ROOT / "tests" / "support"
sys.path.insert(0, str(SUPPORT))

from canonical_json import (  # noqa: E402
    CanonicalizationError,
    canonical_bytes,
    canonical_json,
    validate_attempt_id,
    validate_decimal_metadata,
)


VECTORS = json.loads(
    (ROOT / "fixtures" / "canonicalization-vectors.json").read_text(encoding="utf-8")
)


class CanonicalizationTests(unittest.TestCase):
    def test_machine_json_artifacts_use_duplicate_key_rejecting_parse(self):
        class DuplicateKeyError(ValueError):
            pass

        def reject_duplicates(pairs):
            result = {}
            for key, value in pairs:
                if key in result:
                    raise DuplicateKeyError(key)
                result[key] = value
            return result

        artifacts = (
            ROOT / "fixtures" / "canonicalization-vectors.json",
            ROOT / "specs" / "gate2-evidence.schema.json",
            ROOT / "specs" / "gate2-reason-codes.json",
            ROOT / "specs" / "gate2-scenarios.json",
        )
        for artifact in artifacts:
            with self.subTest(artifact=artifact.name):
                json.loads(artifact.read_text(encoding="utf-8"), object_pairs_hook=reject_duplicates)
        with self.assertRaises(DuplicateKeyError):
            json.loads('{"duplicate":1,"duplicate":2}', object_pairs_hook=reject_duplicates)

    def test_frozen_accepted_vectors_match_exact_python_bytes_and_hashes(self):
        for vector in VECTORS["accepted"]:
            with self.subTest(vector=vector["id"]):
                payload = canonical_bytes(vector["logical_input"])
                self.assertEqual(payload.decode("utf-8"), vector["canonical_json"])
                self.assertEqual(payload.hex(), vector["utf8_hex"])
                self.assertEqual(len(payload), vector["byte_length"])
                self.assertEqual(hashlib.sha256(payload).hexdigest(), vector["sha256"])

    def test_frozen_rejected_vectors_emit_no_payload_and_exact_reasons(self):
        rejected = {
            "BELOW_MIN_SAFE_INTEGER": lambda: canonical_json({"value": -9_007_199_254_740_992}),
            "ABOVE_MAX_SAFE_INTEGER": lambda: canonical_json({"value": 9_007_199_254_740_992}),
            "NEGATIVE_ZERO": lambda: canonical_json({"value": -0.0}),
            "ZERO_ATTEMPT_ID": lambda: validate_attempt_id(0),
            "NEGATIVE_ATTEMPT_ID": lambda: validate_attempt_id(-1),
            "UNPAIRED_HIGH_SURROGATE": lambda: canonical_json({"value": "\ud800"}),
            "UNPAIRED_LOW_SURROGATE": lambda: canonical_json({"value": "\udc00"}),
            "FLOAT": lambda: canonical_json({"value": 1.5}),
            "NONFINITE": lambda: canonical_json({"value": math.inf}),
        }
        for vector in VECTORS["rejected"]:
            with self.subTest(vector=vector["id"]):
                self.assertFalse(vector["must_emit_payload"])
                with self.assertRaises(CanonicalizationError) as raised:
                    rejected[vector["id"]]()
                self.assertEqual(raised.exception.reason_code, vector["reason_code"])

    def test_normalization_is_never_applied(self):
        self.assertNotEqual(canonical_bytes("é"), canonical_bytes("e\u0301"))
        self.assertEqual(
            canonical_json({"é": "precomposed", "e\u0301": "decomposed"}),
            '{"é":"decomposed","é":"precomposed"}',
        )

    def test_decimal_metadata_is_strict(self):
        for value in ("0", "1", "9007199254740992", "999999999999999999999999"):
            self.assertEqual(validate_decimal_metadata(value), value)
        self.assertEqual(
            validate_decimal_metadata("-9007199254740992", allow_negative=True),
            "-9007199254740992",
        )
        for value in ("+1", "01", "-0", "1e3", "1.0", "١"):
            with self.assertRaises(CanonicalizationError):
                validate_decimal_metadata(value, allow_negative=True)

    def test_booleans_remain_json_booleans_but_not_attempt_ids(self):
        self.assertEqual(canonical_json(True), "true")
        self.assertEqual(canonical_json(False), "false")
        for value in (True, False):
            with self.assertRaises(CanonicalizationError) as raised:
                validate_attempt_id(value)
            self.assertEqual(raised.exception.reason_code, "ATTEMPT_ID_NOT_INTEGER")

    def test_python_list_subclasses_with_extra_state_are_not_canonical_arrays(self):
        class ExtendedList(list):
            pass

        value = ExtendedList([1])
        value.extra = 2
        with self.assertRaises(CanonicalizationError) as raised:
            canonical_json(value)
        self.assertEqual(raised.exception.reason_code, "UNSUPPORTED_ARRAY_PROPERTY")

    def test_python_plain_container_domain_rejects_subclasses_and_unsupported_objects(self):
        class PlainListSubclass(list):
            pass

        class DictSubclass(dict):
            pass

        class Unsupported:
            pass

        for value, reason in (
            (PlainListSubclass([1]), "UNSUPPORTED_ARRAY_PROPERTY"),
            (DictSubclass(value=1), "CANONICAL_UNSUPPORTED_TYPE"),
            (Unsupported(), "CANONICAL_UNSUPPORTED_TYPE"),
        ):
            with self.subTest(value=type(value).__name__):
                with self.assertRaises(CanonicalizationError) as raised:
                    canonical_json(value)
                self.assertEqual(raised.exception.reason_code, reason)


if __name__ == "__main__":
    unittest.main()
