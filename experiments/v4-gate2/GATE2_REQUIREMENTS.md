# TruthMarket V4 Gate 2 stale-write-protection requirements

Status: **requirements-stage feasibility work only**. Gate 1 is the only completed feasibility gate. This document does not implement a contract, authorize a deployment, or establish production V4 behavior.

Source baseline: `0c73afa73a2cdb31b12b59095f5d19ac06e9db9d`.

The finalized Bradbury Studio ABI evidence and its strict limitations are recorded in `BRADBURY_ABI_PREFLIGHT.md`. That preflight narrows the probe view design but does not prove stale-write protection, ordering, or Gate 2.

## 1. Purpose and capability

Gate 2 must prove on GenLayer Bradbury that, after authoritative state makes attempt N nonactive and creates successor N+1, execution of N cannot commit protected mutations before or after N+1 succeeds. N+1 must remain executable. After N+1 finalizes `SUCCEEDED`, stale N cannot alter the successor result, protected value, counters, attempt history, lifecycle, latest-attempt pointer, or derived active-attempt identity.

The required capability includes:

- stale N cannot overwrite a retry or newly created successor;
- stale N cannot prevent N+1 from executing successfully;
- stale N cannot overwrite N+1 after N+1 has finalized `SUCCEEDED`;
- stale execution after finalized cancellation or finalized probe-terminal state cannot mutate; and
- competing retry admission cannot create multiple active successors.

The authoritative production sources are `docs/V4_ARCHITECTURE.md` sections 2, 3.1, and 9; `docs/V4_STATE_MACHINE.md` sections 1, 2, and 5; `docs/V4_TEST_PLAN.md` sections 2 and 4; and `docs/GENLAYER_COMPATIBILITY_BASELINE.md`.

## 2. Explicit exclusions

Gate 2 does not prove or authorize:

- Gate 3 cancellation committing while an earlier intelligent execution remains unresolved;
- Gate 4 malformed or catchable intelligent output;
- Gate 5 claims, payments, transfer delivery, or reconciliation;
- Gates 6 and 10 production timing, arithmetic, or capacity limits;
- Gate 7 accepted/finalized replay, appeals, competing accepted branches, or rollback from provisional observations;
- production liabilities, activity, payouts, claims, or accounting;
- the production V4 ABI, storage layout, contract, frontend, or deployment.

Serial finalized-cancellation and probe-terminal scenarios prove only that an already-authoritative state cannot be overwritten by a later stale execution.

## 3. Normative probe state model

The minimal conceptual global state is:

```text
request_count
latest_request_id
lifecycle_status
current_value
execution_count
requests
```

Each attempt record is exactly:

```text
request_id
status
candidate_value
predecessor_id
```

Attempt status is one of:

```text
REQUESTED
SUCCEEDED
EXPIRED
```

Lifecycle status is one of:

```text
ACTIVE
CANCELLED
TERMINAL
```

`latest_request_id` and `predecessor_id` are null when absent. An attempt identifier is a positive safe integer. Attempts are retained in ascending identifier order and never removed, reused, or renumbered.

The active attempt is derived, never stored:

```text
derived_active_attempt_id =
  latest_request_id
    when lifecycle_status == ACTIVE
    and latest_request_id exists
    and requests[latest_request_id].status == REQUESTED
  otherwise null
```

The model must preserve at most one derived active attempt.

## 4. Execution invariant

An execution may mutate only when all conditions hold:

```text
lifecycle_status == ACTIVE
attempt exists
attempt.status == REQUESTED
attempt.id == derived_active_attempt_id
attempt.id == latest_request_id
execution loads attempt.candidate_value from storage
```

No caller-supplied replacement candidate is accepted. No generation/version nonce participates. No second read inside one intelligent method is claimed to observe intervening authoritative state.

A successful execution changes exactly:

```text
attempt.status: REQUESTED -> SUCCEEDED
current_value: previous -> attempt.candidate_value
execution_count: previous -> previous + 1
```

Every stale, duplicate, cancelled, terminal, zero, negative, unknown, or otherwise ineligible execution must reject and leave the complete canonical state byte-identical. Duplicate protection follows from the `REQUESTED -> SUCCEEDED` transition.

## 5. Retry ancestry

The primary lifecycle is:

```text
REQUESTED -> EXPIRED -> successor REQUESTED
```

Expiry is a timing-free scenario-construction transition. It does not prove production timestamp arithmetic or timeout boundaries.

Retry admission requires all of:

- lifecycle is `ACTIVE`;
- predecessor exists and is the exact `latest_request_id`;
- predecessor is the derived predecessor and has status `EXPIRED`;
- no derived active attempt exists;
- predecessor has not already created a successor;
- successor receives the next consecutive one-based identifier; and
- successor stores `predecessor_id` equal to the exact predecessor.

Retry rejects an active, `SUCCEEDED`, nonlatest, unknown, already-used, zero, or negative predecessor without allocating an identifier or changing state.

## 6. Conceptual future ABI — not implemented here

The following fixed structured read models are the frozen intended Stage A ABI. They are a Gate 2 design derived from the demonstrated Bradbury type features, not exact dataclasses already compiled or deployed by the ABI preflight:

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

`Gate2StateView.attempts` is the complete bounded Gate 2 probe history in ascending request-ID order. It belongs only to this probe and creates no production-market history or unbounded production ABI requirement. The Stage A Gate 2 probe SHALL retain an explicit `__init__` method because every successful Studio schema experiment in this preflight used one, while the tested minimal contract without `__init__` failed schema loading. This is a conservative probe-design requirement based on observed Studio behavior, not a claim that every GenLayer contract universally requires `__init__`.

```text
request_probe(candidate_value: int) -> int
expire_probe(attempt_id: int) -> string
retry_probe(predecessor_id: int, candidate_value: int) -> int
execute_probe(attempt_id: int) -> string
cancel_probe() -> string
terminalize_probe() -> string
get_state() -> Gate2StateView
get_attempt(attempt_id: int) -> Gate2AttemptView
```

All writes are nonpayable. `execute_probe` is permissionless, accepts only the attempt identifier, and loads the stored candidate. `expire_probe`, `cancel_probe`, and `terminalize_probe` are permissionless scenario-construction hooks, not production authorization design. `terminalize_probe()` is a probe-only terminal-state construction hook and proves no production finalization, settlement, payout, or timing behavior. No reset method or generic supersede method is permitted.

Frozen Gate 2 API behavior requirement: `get_attempt` rejects an unknown identifier. It MUST NOT return a fabricated default attempt, and the rejection MUST NOT mutate any state. This is a design requirement, not behavior proved by the Bradbury ABI preflight.

The exact `Gate2StateView` and `Gate2AttemptView` dataclasses MUST pass Studio schema generation or another authorized compiler check before Stage A can be approved. The preflight proved only the exact nested structure recorded in `BRADBURY_ABI_PREFLIGHT.md`; it did not prove every arbitrary dataclass, `Optional[int]` returning `None` end to end, or the final Gate 2 implementation source. If this exact ABI fails compilation or schema generation, Stage A stops for requirements review rather than silently changing the ABI.

## 7. Stable scenarios

The complete machine-readable matrix is `specs/gate2-scenarios.json`. It contains the mandatory IDs `G2-S01` through `G2-S19`, exact starting states, operations, authoritative categories, allowed and forbidden mutation sets, required snapshots, status rules, and reason codes. Missing, duplicate, extra, or prose-only mandatory scenarios are invalid.

### 7.1 Successful-successor overwrite protection

`G2-S08-STALE-AFTER-SUCCESSOR-SUCCEEDED` is distinct from stale-before-success, successor-after-stale, duplicate execution, and live overlap:

1. create N as `REQUESTED`;
2. expire N;
3. create N+1 with exact predecessor N;
4. prove N+1 uniquely active;
5. execute N+1 and require authoritative `FINALIZED + FINISHED_WITH_RETURN`;
6. prove N+1 is `SUCCEEDED`;
7. freeze the complete finalized canonical state and digest;
8. execute stale N and require stale-specific finalized rejection;
9. read finalized state again; and
10. require exact canonical bytes and digest equality.

The retained state is N `EXPIRED`, N+1 `SUCCEEDED`, `current_value` equal to N+1's candidate, `execution_count == 1`, latest identifier N+1, lifecycle `ACTIVE`, no derived active attempt, and unchanged complete history.

### 7.2 Scenario isolation

Fresh deployments are required for these independent scenario families:

```text
baseline and duplicate
two-attempt stale-before-success and successor-after-stale
successful-successor overwrite protection
three-attempt ordering
cancellation
probe terminalization
invalid IDs and allocation rollback
competing retry admission
overlap trial 1
overlap trial 2
overlap trial 3
```

Distinct-executor evidence may use the baseline family when its requester and executor are different public addresses. Every related attempt that establishes ancestry or staleness must share one deployment. No reset method is permitted. Every failed deployment or setup result remains in evidence; no contaminated or inconvenient deployment may be discarded.

## 8. Exactly three live-overlap trials

`G2-S18-LIVE-OVERLAP` contains exactly:

```text
G2-OVERLAP-T1
G2-OVERLAP-T2
G2-OVERLAP-T3
```

Each trial uses a fresh future deployment, is declared before submission, retains every setup result and transaction, never replaces a failed trial, never resubmits after receiving a transaction hash, and never adds an undeclared fourth trial.

Trial statuses are `PASS`, `FAIL`, `INCONCLUSIVE`, or `NOT_RUN`. Structural defects are aggregate `REQUEST_CHANGES` conditions, not trial statuses.

Trial aggregation precedence is exact:

1. a proved stale mutation produces `FAIL`;
2. a missing, extra, duplicate, substituted, discarded, undeclared, or malformed trial produces `REQUEST_CHANGES`;
3. any `NOT_RUN` trial produces `NOT_RUN`;
4. at least one `PASS`, with every other trial `PASS` or `INCONCLUSIVE`, produces `PASS`;
5. three `INCONCLUSIVE` trials produce `INCONCLUSIVE`.

## 9. Authoritative overlap ordering

`ordering_achieved` may be true only when authoritative evidence proves:

1. old N was finalized as created and uniquely active;
2. `execute_probe(N)` produced a valid transaction hash;
3. old N entered the intended intelligent-execution path;
4. old N remained authoritatively nonterminal until invalidation became authoritative;
5. N became authoritatively `EXPIRED`;
6. retry authoritatively created N+1;
7. a finalized read showed N+1 uniquely active;
8. old N terminalized, conflicted, invalidated, or re-executed only after successor authority;
9. old N committed no protected mutation; and
10. N+1 remained executable.

First-observation chronology is not transaction-order proof. Wall-clock timestamps, submission order, runner logs, `ACCEPTED`, polling gaps, account nonces alone, and `LATEST_NONFINAL` alone are unsupported.

The conceptual ordering-evidence allowlist is `CONSENSUS_HEIGHT`, `FINALIZATION_HEIGHT`, `TRANSACTION_ORDER_INDEX`, `HISTORICAL_STATUS`, `REEXECUTION_TRACE`, `CONFLICT_TRACE`, and `UNAVAILABLE`. No non-`UNAVAILABLE` type may be used until its Bradbury field source and ordering semantics are independently proven and frozen. For an executed trial, `UNAVAILABLE` forces `INCONCLUSIVE`; a trial that never obtained its required old-execution hash remains `NOT_RUN` by higher-priority trial classification. If authoritative ordering is unavailable, Gate 2 cannot pass.

### 9.1 Staged evidence-capability gate

Stage A is limited to the local Gate 2 probe, its local model/unit and compiler/ABI tests, a read-only evidence-capability inspection script or documented inspection procedure, and focused documentation. It excludes the full live runner, independent verifier executable, deployment manifests and tooling, accounts, signers, wallet handling, funding, live transaction submission, and production V4.

Stage A ends with exactly `EVIDENCE_CAPABILITY_PROVED` or `EVIDENCE_CAPABILITY_NOT_PROVED`. `EVIDENCE_CAPABILITY_PROVED` requires both of the following, conjunctively:

1. a concrete, independently reproducible authoritative evidence path proves old intelligent-path entry, proves old execution remained nonterminal through successor authority, proves successor authority preceded the old execution's authoritative result, and uses finalized state to prove that old execution committed no protected mutation; and
2. a permitted, practical, independently reproducible overlap mechanism uses the approved intelligent operation without artificial sleep, busy loops, application-selected delay endpoints, added state markers, events added solely for path-entry proof, favorable retries, replacement trials, or discarded trials.

Every accepted evidence source must freeze its exact provider/interface, API or RPC method, request parameters, response fields, types and nullability, authority/finality meaning, historical and post-finalization availability, comparison algorithm, state-version correlation, old-path semantics, conflict/re-execution semantics, independent reproduction procedure, and raw-response capture and hash procedure. Conceptual labels, rendered UI text, polling timestamps, runner observation order, submission order, and account nonces do not prove capability.

If either authoritative evidence capability or the practical permitted overlap mechanism is missing, the result is `EVIDENCE_CAPABILITY_NOT_PROVED`, Gate 2 remains inconclusive, and Stage B remains blocked. Incomplete, contradictory, integrity-defective, or assumption-based inspection instead requires `REQUEST_CHANGES`. When automated read-only network inspection is unavailable, a documented manual read-only inspection procedure may be used; lack of access is never capability proof.

Stage B may be planned only after independent Stage A review, passing local/compiler/ABI tests, structured-read proof, `EVIDENCE_CAPABILITY_PROVED`, and separate review of the exact evidence fields and comparison algorithm. Even then, Stage B planning does not authorize deployment, accounts, signers, funding, or transactions. Raw evidence remains unable to authorize `PASS` or `FAIL`; only the independent verifier may produce verified trial and scenario results.

## 10. Transaction finality

`waitForTransactionReceipt()` is only a barrier. Conclusions require typed `getTransaction({hash})` fields. Ordinary successful writes require:

```text
statusName == FINALIZED
txExecutionResultName == FINISHED_WITH_RETURN
```

Serial stale rejection should ordinarily be `FINALIZED + FINISHED_WITH_ERROR` with a bounded typed error or verified trace proving the intended guard. Wrapper, funding, nonce, schema, authorization, and RPC failures cannot count as stale protection. The overlap result enum is observed rather than prescribed; an old stale `FINISHED_WITH_RETURN` is presumptive `FAIL` because the conceptual probe has no successful no-op path.

Authoritative state proof uses finalized reads. Provisional reads are supplementary telemetry only. A transaction is never resubmitted once its hash exists.

## 11. Verdict taxonomy

The exact enum is:

```text
PASS
FAIL
REQUEST_CHANGES
INCONCLUSIVE
NOT_RUN
```

Overall precedence is exact:

1. any genuine tested invariant violation produces `FAIL`;
2. otherwise any requirements, lifecycle, runner, schema, evidence, trial, verifier, trust-anchor, or integrity defect produces `REQUEST_CHANGES`;
3. otherwise any mandatory scenario aggregate `INCONCLUSIVE` produces `INCONCLUSIVE`;
4. otherwise any mandatory scenario `NOT_RUN` produces `NOT_RUN`;
5. otherwise the verdict is `PASS`.

The three overlap trials are aggregated before overall evaluation. Human-authored verdicts cannot override computed results. Closed reason codes are in `specs/gate2-reason-codes.json`.

Raw runner evidence, structural schema validation, requirements-stage conformance helpers, future independent evidence verification, verified trial/scenario results, and aggregate composition are distinct layers. Requirements-stage helpers validate structural contracts and verdict composition only. They cannot authorize a Bradbury `PASS` or `FAIL` from raw evidence. Only a future independently reviewed verifier may recompute raw hashes, ordering, snapshots, mutations, assertions, and transaction meaning and then produce a verified trial or scenario result. Requirements-stage verified-result markers are nonserializable test mechanisms; serialization removes them and requires independent reverification.

Raw runner-declared status, reason, ordering, snapshot, assertion, or mutation fields are claims, never proof. An empty, partial, duplicate, substituted, unverified, or otherwise nonexact set of the nineteen mandatory verified scenarios produces `REQUEST_CHANGES`, never `PASS`; `G2-S18` must carry the result produced from exactly three verified trial results.

### 11.1 Mandatory overlap assertion taxonomy

Every overlap trial claim contains exactly:

```text
ORDERING_PROVED
OLD_PATH_ENTERED
NO_STALE_MUTATION
SUCCESSOR_REMAINS_EXECUTABLE
SUCCESSOR_STATE_UNCHANGED
FINAL_STATE_STABLE
```

`ORDERING_PROVED`, `OLD_PATH_ENTERED`, and `FINAL_STATE_STABLE` are evidence assertions. A verified false result caused by unavailable authoritative evidence produces `INCONCLUSIVE`. `NO_STALE_MUTATION`, `SUCCESSOR_REMAINS_EXECUTABLE`, and `SUCCESSOR_STATE_UNCHANGED` are invariant assertions; a verified false result produces `FAIL`. A missing, duplicate, extra, unknown, inherited, or malformed assertion produces `REQUEST_CHANGES` before aggregation.

## 12. Numeric interoperability

```text
MIN_SAFE_INTEGER = -9007199254740991
MAX_SAFE_INTEGER =  9007199254740991
```

Ranges:

```text
attempt_id:      1..MAX_SAFE_INTEGER
request_count:   0..MAX_SAFE_INTEGER
execution_count: 0..MAX_SAFE_INTEGER
candidate_value: MIN_SAFE_INTEGER..MAX_SAFE_INTEGER
current_value:   MIN_SAFE_INTEGER..MAX_SAFE_INTEGER
predecessor_id:  null or 1..MAX_SAFE_INTEGER
```

Reject zero or negative IDs, out-of-range IDs/values, counter overflow, floats, exponent-form numeric metadata, NaN, infinities, negative zero, direct BigInt JSON numbers, and malformed decimal metadata strings. Provider metadata outside the safe range uses canonical decimal strings: optional leading `-` only for signed fields, ASCII digits, no `+`, no exponent, and no leading zero except exact `0`.

Booleans are JSON booleans, never integers, IDs, counters, predecessors, or candidate values. An out-of-range test input that cannot be represented as a safe contract integer is retained only as canonical decimal metadata, is never emitted as canonical state, and is never submitted as a contract argument.

This safe-integer probe/evidence envelope does not replace the production architecture's `uint32` attempt type or prove production arithmetic limits.

## 13. Canonical JSON

Canonicalization accepts only null, booleans, safe integers, valid Unicode scalar strings, arrays, and objects with string keys.

Canonicalization is entirely off-chain. The contract returns the structured typed values in section 6 and does not generate canonical JSON. The future runner preserves the raw typed RPC result and its complete envelope without treating Studio or RPC presentation formatting as canonical evidence. The independent verifier maps that typed result to the frozen logical state, applies every rule in this section, emits the exact canonical UTF-8 bytes, and computes SHA-256.

- No Unicode normalization occurs. NFC, NFD, NFKC, and NFKD are prohibited.
- Unpaired surrogates and invalid scalar sequences reject; replacement with U+FFFD is prohibited.
- Quote and backslash escape as `\"` and `\\`.
- U+0008, U+0009, U+000A, U+000C, and U+000D use `\b`, `\t`, `\n`, `\f`, and `\r`.
- Other U+0000–U+001F controls use lowercase four-digit `\u00xx`.
- Slash is not escaped. U+2028 and U+2029 and all other valid non-control scalars are emitted directly as UTF-8.
- Original, non-normalized object keys sort lexicographically by strict UTF-8 bytes treated as unsigned; the first unequal byte wins and a strict prefix sorts first.
- Arrays retain order.
- Only exact built-in arrays/lists are canonical arrays. Arrays must be dense. A missing index, unexpected string property, nonenumerable property, symbol property, subclass, or unexpected prototype rejects rather than being omitted or serialized as a hole.
- Canonical objects are exact built-in Python dictionaries or JavaScript plain/null-prototype objects containing only enumerable own string-keyed properties. Mapping/class instances, inherited enumerable properties, symbol properties, and nonenumerable properties reject.
- Output is UTF-8 with no BOM, insignificant whitespace, or trailing newline.

Python key ordering is equivalent to `sorted(keys, key=lambda key: key.encode("utf-8", errors="strict"))`. Node ordering, after surrogate validation, is equivalent to `Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"))`.

The golden vectors in `fixtures/canonicalization-vectors.json` are normative. Python and Node must independently reproduce their exact text, bytes, lengths, hashes, and rejection codes.

## 14. Canonical protected snapshot

The independent verifier constructs the canonical protected snapshot from the raw structured read. The contract does not return canonical text, and the runner's structured-result claim is not verified merely because it decoded successfully.

The canonical state includes exactly:

```text
request_count
latest_request_id
lifecycle_status
current_value
execution_count
requests sorted by request_id
derived_active_attempt_id
```

Each request includes every normative attempt-record field. The runner retains the raw typed before/after results and envelopes. The verifier-produced rejection evidence retains canonical text and SHA-256 and requires byte equality, digest equality, and an independently recomputed empty observed mutation set.

## 15. Evidence, mechanical verdicts, and trust anchor

The future evidence schema is `specs/gate2-evidence.schema.json`. Every mandatory scenario and all three overlap trials appear even when `INCONCLUSIVE` or `NOT_RUN`. It records exactly eleven deployment attempts, including failed or unrun attempts, and transaction attempts classified as `NOT_SUBMITTED`, `SUBMISSION_FAILED`, `SUBMITTED_NONTERMINAL`, or `AUTHORITATIVE_TERMINAL`. `NOT_RUN` scenarios do not fabricate snapshots; `INCONCLUSIVE` scenarios retain every obtained snapshot and enumerate missing evidence; verified `PASS` and `FAIL` require complete authoritative snapshots.

The schema closes identifiers, counts, status/reason namespaces, safe structural relationships, and defined redacted payload shapes. Arbitrary canonical state uses a recursive safe-JSON definition that prohibits secret-named members. Complete semantic secret detection, cross-record uniqueness, exact scenario-family coverage, path-based mutation meaning, authoritative Bradbury ordering semantics, transaction-to-scenario completeness, snapshot integrity, and recomputation of status remain mandatory verifier-only rules. Schema acceptance alone never authorizes a verdict.

Snapshot fields in runner evidence are `snapshot_claim` records. A future verifier strictly parses their canonical JSON with duplicate-member rejection, re-encodes exact canonical bytes, recomputes SHA-256, proves semantic equality with `state`, and rejects unsafe numbers or unsupported values. Runner-supplied mutation claims are untrusted; the verifier recomputes deterministic path-based mutations from verified states and checks every before/after value.

The sole evidence authenticity anchor is:

```text
reviewed Git commit SHA + independently recorded bundle SHA-256
```

The bundle digest is `SHA256(canonical_json(bundle with top-level bundle_sha256 omitted))`. The bundle and referenced artifacts must be committed together, then independently reviewed. The verifier receives the reviewed commit and expected digest externally, verifies a clean checkout at that exact commit, and never trusts values sourced only from the bundle. Any change requires a new independent review.

## 16. Local and scheduler model limitation

Local models validate the intended transition and harness logic only. They cannot prove Bradbury conflict, invalidation, re-execution, finality, or authoritative ordering behavior. Only a later separately authorized live experiment can answer Gate 2.

## 17. Later deployment constraint

> Any later Gate 2 probe deployment requires separate authorization and must be performed through GenLayer Studio at studio.genlayer.com/contracts, with the selected network explicitly verified as the GenLayer Bradbury Testnet before deployment. This requirements phase must not add or use a contract deployment script.

No account creation, funding, wallet use, deployment, or transaction is authorized by this document.
