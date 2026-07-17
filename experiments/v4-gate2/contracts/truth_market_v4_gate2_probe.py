# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

"""Nonproduction TruthMarket V4 Gate 2 stale-write protection probe.

This bounded probe exists only for Stage A compatibility and state-machine tests.
It is not production V4 and does not establish Bradbury ordering behavior.
"""

import json
from dataclasses import dataclass
from typing import Optional

from genlayer import *


MIN_SAFE_INTEGER = -9_007_199_254_740_991
MAX_SAFE_INTEGER = 9_007_199_254_740_991
MAX_ATTEMPTS = 3

STATUS_REQUESTED = "REQUESTED"
STATUS_SUCCEEDED = "SUCCEEDED"
STATUS_EXPIRED = "EXPIRED"

LIFECYCLE_ACTIVE = "ACTIVE"
LIFECYCLE_CANCELLED = "CANCELLED"
LIFECYCLE_TERMINAL = "TERMINAL"


@dataclass
class Gate2AttemptView:
    request_id: int
    status: str
    candidate_value: int
    predecessor_id: Optional[int]


@dataclass
class Gate2StateView:
    request_count: int
    latest_request_id: Optional[int]
    lifecycle_status: str
    current_value: int
    execution_count: int
    derived_active_attempt_id: Optional[int]
    attempts: list[Gate2AttemptView]


class TruthMarketV4Gate2Probe(gl.Contract):
    """Bounded, deterministic Gate 2 probe; never production market code."""

    requests: TreeMap[str, str]
    request_count: int
    latest_request_id: Optional[int]
    lifecycle_status: str
    current_value: int
    execution_count: int

    def __init__(self):
        self.request_count = 0
        self.latest_request_id = None
        self.lifecycle_status = LIFECYCLE_ACTIVE
        self.current_value = 0
        self.execution_count = 0

    def _require_safe_integer(self, value: int) -> int:
        assert type(value) is int, "VALUE_NOT_INTEGER"
        assert MIN_SAFE_INTEGER <= value <= MAX_SAFE_INTEGER, "VALUE_OUT_OF_RANGE"
        return value

    def _require_attempt_id(self, attempt_id: int) -> int:
        self._require_safe_integer(attempt_id)
        assert attempt_id > 0, "ATTEMPT_ID_MUST_BE_POSITIVE"
        return attempt_id

    def _require_counter(self, value: int, code: str) -> int:
        assert type(value) is int, code
        assert 0 <= value <= MAX_SAFE_INTEGER, code
        return value

    def _require_active_lifecycle(self):
        assert self.lifecycle_status == LIFECYCLE_ACTIVE, "LIFECYCLE_NOT_ACTIVE"

    def _latest_request_id_view(self) -> Optional[int]:
        return self.latest_request_id

    def _next_request_id(self) -> int:
        self._require_counter(self.request_count, "REQUEST_COUNT_INVALID")
        assert self.request_count < MAX_SAFE_INTEGER, "REQUEST_COUNT_OVERFLOW"
        assert self.request_count < MAX_ATTEMPTS, "BOUNDED_HISTORY_EXHAUSTED"
        return self.request_count + 1

    def _load_attempt(self, attempt_id: int) -> dict:
        exact_id = self._require_attempt_id(attempt_id)
        encoded = self.requests.get(str(exact_id), None)
        assert encoded is not None, "ATTEMPT_NOT_FOUND"
        record = json.loads(encoded)
        assert type(record) is dict, "ATTEMPT_RECORD_INVALID"
        assert record.get("request_id") == exact_id, "ATTEMPT_RECORD_INVALID"
        return record

    def _save_attempt(self, attempt: dict):
        self.requests[str(attempt["request_id"])] = json.dumps(
            attempt,
            separators=(",", ":"),
            sort_keys=True,
        )

    def _attempt_view(self, attempt: dict) -> Gate2AttemptView:
        return Gate2AttemptView(
            request_id=attempt["request_id"],
            status=attempt["status"],
            candidate_value=attempt["candidate_value"],
            predecessor_id=attempt["predecessor_id"],
        )

    def _derived_active_attempt_id(self) -> Optional[int]:
        if self.lifecycle_status != LIFECYCLE_ACTIVE:
            return None
        latest_id = self._latest_request_id_view()
        if latest_id is None:
            return None
        attempt = self._load_attempt(latest_id)
        if attempt["status"] != STATUS_REQUESTED:
            return None
        return attempt["request_id"]

    def _predecessor_has_successor(self, predecessor_id: int) -> bool:
        for request_id in range(1, self.request_count + 1):
            attempt = self._load_attempt(request_id)
            if attempt["predecessor_id"] == predecessor_id:
                return True
        return False

    def _run_bounded_intelligent_operation(self, stored_candidate: int) -> str:
        prompt = (
            "Return exactly READY after considering the stored Gate 2 probe "
            f"candidate integer {stored_candidate}."
        )

        def classify_stored_candidate() -> str:
            return str(gl.nondet.exec_prompt(prompt)).strip().upper()

        result = gl.eq_principle.prompt_non_comparative(
            classify_stored_candidate,
            task="Return exactly READY for this bounded Gate 2 probe operation.",
            criteria="The result is exactly READY and contains no other text.",
        )
        assert result == "READY", "INTELLIGENT_RESULT_INVALID"
        return result

    @gl.public.write
    def request_probe(self, candidate_value: int) -> int:
        self._require_active_lifecycle()
        exact_value = self._require_safe_integer(candidate_value)
        request_id = self._next_request_id()
        assert self.request_count == 0, "FIRST_REQUEST_ALREADY_EXISTS"
        assert self.latest_request_id is None, "FIRST_REQUEST_ALREADY_EXISTS"
        assert self._derived_active_attempt_id() is None, "ACTIVE_ATTEMPT_EXISTS"
        self._save_attempt(
            {
                "request_id": request_id,
                "status": STATUS_REQUESTED,
                "candidate_value": exact_value,
                "predecessor_id": None,
            }
        )
        self.request_count = request_id
        self.latest_request_id = request_id
        return request_id

    @gl.public.write
    def expire_probe(self, attempt_id: int) -> str:
        self._require_active_lifecycle()
        attempt = self._load_attempt(attempt_id)
        assert attempt["request_id"] == self.latest_request_id, (
            "EXPIRY_REQUIRES_LATEST_ATTEMPT"
        )
        assert attempt["request_id"] == self._derived_active_attempt_id(), (
            "EXPIRY_REQUIRES_ACTIVE_ATTEMPT"
        )
        assert attempt["status"] == STATUS_REQUESTED, "ATTEMPT_NOT_REQUESTED"
        attempt["status"] = STATUS_EXPIRED
        self._save_attempt(attempt)
        return STATUS_EXPIRED

    @gl.public.write
    def retry_probe(self, predecessor_id: int, candidate_value: int) -> int:
        self._require_active_lifecycle()
        predecessor = self._load_attempt(predecessor_id)
        exact_value = self._require_safe_integer(candidate_value)
        assert predecessor["request_id"] == self.latest_request_id, (
            "RETRY_REQUIRES_LATEST_PREDECESSOR"
        )
        assert predecessor["status"] == STATUS_EXPIRED, (
            "RETRY_REQUIRES_EXPIRED_PREDECESSOR"
        )
        assert self._derived_active_attempt_id() is None, "ACTIVE_ATTEMPT_EXISTS"
        assert not self._predecessor_has_successor(predecessor_id), (
            "PREDECESSOR_ALREADY_USED"
        )
        request_id = self._next_request_id()
        self._save_attempt(
            {
                "request_id": request_id,
                "status": STATUS_REQUESTED,
                "candidate_value": exact_value,
                "predecessor_id": predecessor["request_id"],
            }
        )
        self.request_count = request_id
        self.latest_request_id = request_id
        return request_id

    @gl.public.write
    def execute_probe(self, attempt_id: int) -> str:
        self._require_active_lifecycle()
        initial_attempt = self._load_attempt(attempt_id)
        assert initial_attempt["status"] == STATUS_REQUESTED, "ATTEMPT_NOT_REQUESTED"
        assert initial_attempt["request_id"] == self._derived_active_attempt_id(), (
            "ATTEMPT_NOT_DERIVED_ACTIVE"
        )
        assert initial_attempt["request_id"] == self.latest_request_id, (
            "ATTEMPT_NOT_LATEST"
        )
        stored_candidate = initial_attempt["candidate_value"]
        self._run_bounded_intelligent_operation(stored_candidate)

        # The guard is repeated immediately before mutation. These reads belong to
        # one execution snapshot; they do not claim to observe intervening state.
        self._require_active_lifecycle()
        guarded_attempt = self._load_attempt(attempt_id)
        assert guarded_attempt["status"] == STATUS_REQUESTED, (
            "ATTEMPT_NOT_REQUESTED"
        )
        assert guarded_attempt["request_id"] == self._derived_active_attempt_id(), (
            "ATTEMPT_NOT_DERIVED_ACTIVE"
        )
        assert guarded_attempt["request_id"] == self.latest_request_id, (
            "ATTEMPT_NOT_LATEST"
        )
        assert guarded_attempt["candidate_value"] == stored_candidate, (
            "STORED_CANDIDATE_CHANGED"
        )
        self._require_counter(self.execution_count, "EXECUTION_COUNT_INVALID")
        assert self.execution_count < MAX_SAFE_INTEGER, "EXECUTION_COUNT_OVERFLOW"

        guarded_attempt["status"] = STATUS_SUCCEEDED
        self._save_attempt(guarded_attempt)
        self.current_value = stored_candidate
        self.execution_count += 1
        return STATUS_SUCCEEDED

    @gl.public.write
    def cancel_probe(self) -> str:
        self._require_active_lifecycle()
        self.lifecycle_status = LIFECYCLE_CANCELLED
        return LIFECYCLE_CANCELLED

    @gl.public.write
    def terminalize_probe(self) -> str:
        self._require_active_lifecycle()
        self.lifecycle_status = LIFECYCLE_TERMINAL
        return LIFECYCLE_TERMINAL

    @gl.public.view
    def get_state(self) -> Gate2StateView:
        attempts = [
            self._attempt_view(self._load_attempt(request_id))
            for request_id in range(1, self.request_count + 1)
        ]
        return Gate2StateView(
            request_count=self.request_count,
            latest_request_id=self._latest_request_id_view(),
            lifecycle_status=self.lifecycle_status,
            current_value=self.current_value,
            execution_count=self.execution_count,
            derived_active_attempt_id=self._derived_active_attempt_id(),
            attempts=attempts,
        )

    @gl.public.view
    def get_attempt(self, attempt_id: int) -> Gate2AttemptView:
        return self._attempt_view(self._load_attempt(attempt_id))
