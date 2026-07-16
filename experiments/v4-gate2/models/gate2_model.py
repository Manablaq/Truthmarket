"""Deterministic Gate 2 requirements model; not GenLayer contract code."""

from __future__ import annotations

import copy
from dataclasses import asdict, dataclass
from functools import wraps
from typing import Callable, Optional


MIN_SAFE_INTEGER = -9_007_199_254_740_991
MAX_SAFE_INTEGER = 9_007_199_254_740_991

STATUS_REQUESTED = "REQUESTED"
STATUS_SUCCEEDED = "SUCCEEDED"
STATUS_EXPIRED = "EXPIRED"

LIFECYCLE_ACTIVE = "ACTIVE"
LIFECYCLE_CANCELLED = "CANCELLED"
LIFECYCLE_TERMINAL = "TERMINAL"


class Gate2ModelError(AssertionError):
    """A deterministic model rejection with a stable reason."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def atomic_write(method: Callable):
    """Restore all model state when a conceptual write rejects."""

    @wraps(method)
    def wrapped(self: "Gate2Model", *args, **kwargs):
        before = copy.deepcopy(self.__dict__)
        try:
            return method(self, *args, **kwargs)
        except Exception:
            self.__dict__.clear()
            self.__dict__.update(before)
            raise

    return wrapped


def require_safe_integer(value: int, code: str = "VALUE_OUT_OF_RANGE") -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise Gate2ModelError("VALUE_NOT_INTEGER")
    if value < MIN_SAFE_INTEGER or value > MAX_SAFE_INTEGER:
        raise Gate2ModelError(code)
    return value


def require_attempt_id(value: int) -> int:
    require_safe_integer(value, "ATTEMPT_ID_OUT_OF_RANGE")
    if value <= 0:
        raise Gate2ModelError("ATTEMPT_ID_MUST_BE_POSITIVE")
    return value


def require_counter(value: int, code: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise Gate2ModelError(code)
    if value < 0 or value > MAX_SAFE_INTEGER:
        raise Gate2ModelError(code)
    return value


@dataclass
class Attempt:
    request_id: int
    status: str
    candidate_value: int
    predecessor_id: Optional[int]


class Gate2Model:
    """Small state machine used only to validate the approved Gate 2 plan."""

    def __init__(self):
        self.request_count = 0
        self.latest_request_id: Optional[int] = None
        self.lifecycle_status = LIFECYCLE_ACTIVE
        self.current_value = 0
        self.execution_count = 0
        self.requests: dict[int, Attempt] = {}

    @property
    def derived_active_attempt_id(self) -> Optional[int]:
        if self.lifecycle_status != LIFECYCLE_ACTIVE:
            return None
        if self.latest_request_id is None:
            return None
        attempt = self.requests.get(self.latest_request_id)
        if attempt is None or attempt.status != STATUS_REQUESTED:
            return None
        return attempt.request_id

    def _require_active_lifecycle(self) -> None:
        if self.lifecycle_status != LIFECYCLE_ACTIVE:
            raise Gate2ModelError("LIFECYCLE_NOT_ACTIVE")

    def _next_request_id(self) -> int:
        require_counter(self.request_count, "REQUEST_COUNT_INVALID")
        if self.request_count >= MAX_SAFE_INTEGER:
            raise Gate2ModelError("REQUEST_COUNT_OVERFLOW")
        return self.request_count + 1

    def _load_attempt(self, attempt_id: int) -> Attempt:
        exact_id = require_attempt_id(attempt_id)
        attempt = self.requests.get(exact_id)
        if attempt is None:
            raise Gate2ModelError("ATTEMPT_NOT_FOUND")
        return attempt

    @atomic_write
    def request_probe(self, candidate_value: int) -> int:
        self._require_active_lifecycle()
        exact_value = require_safe_integer(candidate_value)
        request_id = self._next_request_id()
        if self.request_count != 0 or self.latest_request_id is not None or self.requests:
            raise Gate2ModelError("FIRST_REQUEST_ALREADY_EXISTS")
        if self.derived_active_attempt_id is not None:
            raise Gate2ModelError("ACTIVE_ATTEMPT_EXISTS")
        self.requests[request_id] = Attempt(
            request_id=request_id,
            status=STATUS_REQUESTED,
            candidate_value=exact_value,
            predecessor_id=None,
        )
        self.request_count = request_id
        self.latest_request_id = request_id
        return request_id

    @atomic_write
    def expire_probe(self, attempt_id: int) -> str:
        self._require_active_lifecycle()
        attempt = self._load_attempt(attempt_id)
        if attempt.request_id != self.latest_request_id:
            raise Gate2ModelError("EXPIRY_REQUIRES_LATEST_ATTEMPT")
        if attempt.request_id != self.derived_active_attempt_id:
            raise Gate2ModelError("EXPIRY_REQUIRES_ACTIVE_ATTEMPT")
        if attempt.status != STATUS_REQUESTED:
            raise Gate2ModelError("ATTEMPT_NOT_REQUESTED")
        attempt.status = STATUS_EXPIRED
        return STATUS_EXPIRED

    @atomic_write
    def retry_probe(self, predecessor_id: int, candidate_value: int) -> int:
        self._require_active_lifecycle()
        predecessor = self._load_attempt(predecessor_id)
        exact_value = require_safe_integer(candidate_value)
        if predecessor.request_id != self.latest_request_id:
            raise Gate2ModelError("RETRY_REQUIRES_LATEST_PREDECESSOR")
        if predecessor.status != STATUS_EXPIRED:
            raise Gate2ModelError("RETRY_REQUIRES_EXPIRED_PREDECESSOR")
        if self.derived_active_attempt_id is not None:
            raise Gate2ModelError("ACTIVE_ATTEMPT_EXISTS")
        if any(record.predecessor_id == predecessor.request_id for record in self.requests.values()):
            raise Gate2ModelError("PREDECESSOR_ALREADY_USED")
        request_id = self._next_request_id()
        self.requests[request_id] = Attempt(
            request_id=request_id,
            status=STATUS_REQUESTED,
            candidate_value=exact_value,
            predecessor_id=predecessor.request_id,
        )
        self.request_count = request_id
        self.latest_request_id = request_id
        return request_id

    @atomic_write
    def execute_probe(self, attempt_id: int, caller: str | None = None) -> str:
        del caller  # Identity is transaction evidence; execution is permissionless.
        self._require_active_lifecycle()
        attempt = self._load_attempt(attempt_id)
        if attempt.status != STATUS_REQUESTED:
            raise Gate2ModelError("ATTEMPT_NOT_REQUESTED")
        if attempt.request_id != self.derived_active_attempt_id:
            raise Gate2ModelError("ATTEMPT_NOT_DERIVED_ACTIVE")
        if attempt.request_id != self.latest_request_id:
            raise Gate2ModelError("ATTEMPT_NOT_LATEST")
        require_counter(self.execution_count, "EXECUTION_COUNT_INVALID")
        if self.execution_count >= MAX_SAFE_INTEGER:
            raise Gate2ModelError("EXECUTION_COUNT_OVERFLOW")
        stored_candidate = attempt.candidate_value
        attempt.status = STATUS_SUCCEEDED
        self.current_value = stored_candidate
        self.execution_count += 1
        return STATUS_SUCCEEDED

    @atomic_write
    def cancel_probe(self) -> str:
        self._require_active_lifecycle()
        self.lifecycle_status = LIFECYCLE_CANCELLED
        return LIFECYCLE_CANCELLED

    @atomic_write
    def terminalize_probe(self) -> str:
        self._require_active_lifecycle()
        self.lifecycle_status = LIFECYCLE_TERMINAL
        return LIFECYCLE_TERMINAL

    def get_state(self) -> dict:
        return {
            "request_count": self.request_count,
            "latest_request_id": self.latest_request_id,
            "lifecycle_status": self.lifecycle_status,
            "current_value": self.current_value,
            "execution_count": self.execution_count,
            "requests": [asdict(self.requests[key]) for key in sorted(self.requests)],
            "derived_active_attempt_id": self.derived_active_attempt_id,
        }

    def get_attempt(self, attempt_id: int) -> dict:
        return asdict(copy.deepcopy(self._load_attempt(attempt_id)))

    def clone(self) -> "Gate2Model":
        return copy.deepcopy(self)
