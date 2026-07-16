"""Harness-only Gate 2 schedules; never evidence of Bradbury behavior."""

from __future__ import annotations

import copy
from dataclasses import dataclass

from gate2_model import (
    Gate2Model,
    Gate2ModelError,
    STATUS_SUCCEEDED,
)


@dataclass
class PausedExecution:
    attempt_id: int
    candidate_value: int


def begin_old_execution(model: Gate2Model, attempt_id: int) -> PausedExecution:
    attempt = model.get_attempt(attempt_id)
    return PausedExecution(
        attempt_id=attempt["request_id"],
        candidate_value=attempt["candidate_value"],
    )


def attempt_old_commit(
    model: Gate2Model,
    paused: PausedExecution,
    platform_behavior: str,
) -> dict:
    """Model a safe state re-check or an unsafe stale-snapshot commit."""

    before = copy.deepcopy(model.get_state())
    if platform_behavior == "RECHECK_AND_REJECT":
        try:
            model.execute_probe(paused.attempt_id)
        except Gate2ModelError as error:
            return {
                "platform_behavior": platform_behavior,
                "rejected": True,
                "reason": error.code,
                "before": before,
                "after": model.get_state(),
                "invariant_violated": False,
            }
        raise AssertionError("guarded stale commit unexpectedly succeeded")

    if platform_behavior == "COMMIT_OLD_SNAPSHOT":
        # Deliberately unsafe conceptual platform outcome. This is not a model API.
        old = model.requests[paused.attempt_id]
        old.status = STATUS_SUCCEEDED
        model.current_value = paused.candidate_value
        model.execution_count += 1
        return {
            "platform_behavior": platform_behavior,
            "rejected": False,
            "reason": "STALE_SNAPSHOT_COMMITTED",
            "before": before,
            "after": model.get_state(),
            "invariant_violated": True,
        }

    raise ValueError("unknown platform behavior")


def run_schedule_a(platform_behavior: str) -> dict:
    """Old starts/pauses; N expires; N+1 is created; old commit is attempted."""

    model = Gate2Model()
    old_id = model.request_probe(11)
    paused = begin_old_execution(model, old_id)
    model.expire_probe(old_id)
    successor_id = model.retry_probe(old_id, 22)
    result = attempt_old_commit(model, paused, platform_behavior)
    result.update(schedule="A", old_attempt_id=old_id, successor_attempt_id=successor_id)
    return result


def run_schedule_b(platform_behavior: str) -> dict:
    """Schedule A plus successful N+1 before the old commit is attempted."""

    model = Gate2Model()
    old_id = model.request_probe(11)
    paused = begin_old_execution(model, old_id)
    model.expire_probe(old_id)
    successor_id = model.retry_probe(old_id, 22)
    model.execute_probe(successor_id)
    result = attempt_old_commit(model, paused, platform_behavior)
    result.update(schedule="B", old_attempt_id=old_id, successor_attempt_id=successor_id)
    return result
