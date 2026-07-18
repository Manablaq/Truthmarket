# TruthMarket V4 BF-0 Stage A schema-derivation record

Status: `PARTIALLY_EVIDENCED_UNRESOLVED_HISTORICAL_EVIDENCE`

## Exact current source identity

- Repository: `https://github.com/Manablaq/Truthmarket`
- Path:
  `experiments/v4-gate2/contracts/truth_market_v4_gate2_probe.py`
- Exact byte length: `10600`
- SHA-256:
  `97827e38b0dc606920acccdeff5b44379a5edccf733c4d521daab6cbc8d3791a`
- Storage-type fix commit:
  `805b4c9ca5b3a2146a9861b6bfa8faddfefd7db7`
- Merge commit:
  `9935e1a84ba29cf9a2153def8296cc16807049b8`
- Production status: isolated nonproduction Stage A probe

## Public surface

| Method | Category |
| --- | --- |
| `request_probe(candidate_value)` | Write |
| `expire_probe(attempt_id)` | Write |
| `retry_probe(predecessor_id, candidate_value)` | Write |
| `execute_probe(attempt_id)` | Write |
| `cancel_probe()` | Write |
| `terminalize_probe()` | Write |
| `get_state()` | View |
| `get_attempt(attempt_id)` | View |

## Immutable provenance locator for the historical claim

- Pull request: `https://github.com/Manablaq/Truthmarket/pull/11`
- Title: `fix(gate2): use supported Stage A storage types`
- Author: GitHub login `Manablaq`, display name `Mr Albert`
- Created: `2026-07-17T10:41:36Z`
- Merged: `2026-07-17T10:59:15Z`
- Last captured update: `2026-07-17T11:04:34Z`
- Claim location: pull-request body, section `Public ABI`
- Exact PR-body UTF-8 bytes: `1296`
- Exact PR-body SHA-256:
  `b9855900438e8b1b213b20ec12f40de426d7f5597994759a6b0ef1109f0e2ea6`
- GitHub review objects in the captured PR record: none

The body identity is reproducible with authenticated GitHub access:

```bash
gh pr view 11   --repo Manablaq/Truthmarket   --json body |
python3 -c '
import hashlib
import json
import sys

body = json.load(sys.stdin)["body"].encode("utf-8")
print(len(body), hashlib.sha256(body).hexdigest())
'
```

## Recoverable historical facts

The exact PR body states that Bradbury `gen_getContractSchema`
succeeded twice for the exact committed source and that the runs
produced reproducible schema output with the eight public methods above.

BF-0 can independently recover the repository, source and merge commits,
source bytes, source digest, public surface, PR locator, and exact captured
PR-body identity. It cannot independently verify the two response
envelopes or their equality because those bytes were not retained.
The PR body is author-authored provenance for the historical claim, not
an independent reproduction report.

This is historical schema-compatibility evidence for the isolated
probe. It is not production V4 schema evidence and does not prove
runtime execution, stale-write behavior on Bradbury, or the optional
forensic experiment.

## Unrecoverable or unretained data

The retained repository and PR record do not contain:

- the exact complete schema request and parameters;
- the exact endpoint or read-interface response envelope;
- the complete raw schema output bytes;
- a complete retained SHA-256 digest of that schema output;
- the exact Studio/compiler application build identifier;
- the resolved server-side compiler/runtime identity;
- an independently retained second-run response;
- a signed independent reproduction report.

These items are classified
`UNRESOLVED_HISTORICAL_EVIDENCE`. They must not be reconstructed from
memory, abbreviated notes, method counts, or later source.

## Distinct older ABI preflight

`BRADBURY_ABI_PREFLIGHT.md` binds a different 813-byte `AbiProbe`
source with SHA-256
`901782b80a6144393b11811fcb7cbea675c4a75de4f35843aeb6408a5b841317`.

That preflight retains evidence only for its own nested dataclass/list
and `Optional[int]` schema boundary. It cannot substitute for the
current 10600-byte Stage A source.

## BF-0 disposition

- PR-body claim provenance retained: `YES`.
- Exact source, merge, PR locator, and PR-body identity retained: `YES`.
- Independent schema-output reproduction retained: `NO`.
- Fully reproducible historical package: `NO`.
- Evidence fabrication or inferred raw output: `PROHIBITED`.
- Network schema derivation during BF-0: `NOT_AUTHORIZED`.
- Future read-only derivation: requires a separately reviewed
  procedure and complete output retention.
- Production PRR-03 status: `NOT_EVALUATED`.
