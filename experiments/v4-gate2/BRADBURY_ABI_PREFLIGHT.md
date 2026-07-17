# TruthMarket V4 Gate 2 Bradbury ABI preflight

Status: finalized Bradbury Studio ABI evidence only. This record does not prove stale-write protection, authoritative overlap ordering, or completion of Gate 2.

## Finalized evidence

### Reproducibility context

```text
Studio URL: https://studio.genlayer.com/contracts
Selected network: GenLayer Bradbury Testnet
Contract source header: # v0.2.16
py-genlayer dependency pin: 1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6
Contract address: 0xC1f19Be3aF6333845e0D9e51f5271Efda22EEE0f
Deployment transaction: 0xfee0c14c15fab08e32a4bbfc2650ea7db35de8473a2d0c930fe7950caf00751d
statusName: FINALIZED
txExecutionResultName: FINISHED_WITH_RETURN
resultName: AGREE
Source byte length: 813 UTF-8 bytes including final LF
Source SHA-256: 901782b80a6144393b11811fcb7cbea675c4a75de4f35843aeb6408a5b841317
```

Studio application/compiler build identifier was not exposed in the captured evidence.

### Authoritative deployment result

```text
Network: GenLayer Bradbury Testnet
Contract address: 0xC1f19Be3aF6333845e0D9e51f5271Efda22EEE0f
Deployment transaction: 0xfee0c14c15fab08e32a4bbfc2650ea7db35de8473a2d0c930fe7950caf00751d
statusName: FINALIZED
txExecutionResultName: FINISHED_WITH_RETURN
resultName: AGREE
```

The read used the finalized selector. `get_state` returned the expected nested structured value. No code upgrade and no second deployment occurred.

### Logical decoded finalized read result

The following object is the logical decoded finalized read result. The raw RPC envelope was not independently preserved in this documentation amendment.

```json
{
  "active_attempt": 2,
  "attempts": [
    {
      "attempt_id": 1,
      "status": "FAILED"
    },
    {
      "attempt_id": 2,
      "status": "ACTIVE"
    }
  ]
}
```

Raw Studio formatting is not canonical evidence. A future runner must preserve the raw typed result and complete RPC envelope. The independent verifier remains responsible for mapping that result to the frozen logical state, canonical JSON encoding, UTF-8 bytes, SHA-256, and mutation comparison.

## Exact deployed source

The deployed source was exactly the following 813 UTF-8 bytes, including the final LF:

```python
# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass
from typing import Optional
from genlayer import *


@dataclass
class AttemptView:
    attempt_id: int
    status: str


@dataclass
class StateView:
    active_attempt: Optional[int]
    attempts: list[AttemptView]


class AbiProbe(gl.Contract):
    def __init__(self):
        pass

    @gl.public.view
    def get_state(self) -> StateView:
        return StateView(
            active_attempt=2,
            attempts=[
                AttemptView(
                    attempt_id=1,
                    status="FAILED",
                ),
                AttemptView(
                    attempt_id=2,
                    status="ACTIVE",
                ),
            ],
        )
```

```text
SHA-256: 901782b80a6144393b11811fcb7cbea675c4a75de4f35843aeb6408a5b841317
```

### Proven facts

This preflight proves only that:

- this exact source generated a Studio schema;
- this exact source deployed on GenLayer Bradbury Testnet;
- the deployment finalized with `FINISHED_WITH_RETURN` and `AGREE`;
- the nested dataclasses serialized successfully;
- `list[AttemptView]` serialized successfully;
- `Optional[int]` was accepted by schema generation; and
- the finalized `get_state` read returned the expected nested structure.

The Stage A Gate 2 probe SHALL retain an explicit `__init__` method because every successful Studio schema experiment in this preflight used one, while the tested minimal contract without `__init__` failed schema loading. This is a conservative probe-design requirement based on observed Studio behavior, not a claim that every GenLayer contract universally requires `__init__`.

## Not proven

This preflight does not prove that:

- every arbitrary dataclass shape is supported;
- an explicit constructor is universally mandatory;
- `# v0.2.16` is universally mandatory;
- `None` completed an end-to-end deployed return path;
- the Gate 2 structured models compile until their exact source is separately checked;
- stale execution is rejected;
- authoritative old-path entry or overlap ordering is observable; or
- Gate 2 has passed.

Production V4 remains blocked.

## Proposed Gate 2 design derived from the evidence

The larger structured views below are the frozen intended Stage A ABI. They are a proposed bounded probe ABI selected because the demonstrated nested dataclass, list, and `Optional[int]` schema features support this design direction. The exact larger dataclasses have not compiled or deployed as part of this preflight and remain Stage A implementation proof obligations.

```python
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
```

```text
get_state() -> Gate2StateView
get_attempt(attempt_id: int) -> Gate2AttemptView
```

The exact dataclasses must pass Studio schema generation or another authorized compiler check before Stage A can be approved. `Optional[int]` returning `None` end to end was not proved. The bounded `attempts` list belongs only to this Gate 2 probe and creates no production unbounded-history requirement. If this exact ABI fails compilation or schema generation, Stage A stops for requirements review; the ABI must not be changed silently.

As a frozen Gate 2 API behavior requirement, rather than a behavior proved by this preflight, `get_attempt(attempt_id)` rejects an unknown identifier, returns no fabricated default attempt, and does not mutate state on rejection.
