# TruthMarket V4 bounded foundation plan

## Plan status

- Plan status: `PLANNING_ONLY`
- Production V4 source: `NOT_STARTED`
- Public V4 ABI: `NOT_FROZEN`
- Production coding authorization: `NOT_AUTHORIZED`
- Deployment: `NOT_AUTHORIZED`
- Frontend integration: `NOT_STARTED`
- Current implementation-gate decision: `PRODUCTION_FOUNDATION_IMPLEMENTATION_NOT_AUTHORIZED`

This plan does not modify any official status in the [V4 release policy](../experiments/v4-gate2/V4_RELEASE_POLICY.md). It turns the [implementation-readiness audit](V4_IMPLEMENTATION_READINESS_AUDIT.md) into an evidence-producing program; it neither authorizes nor begins implementation.

## Objectives

- Resolve every mandatory product dependency needed for safe implementation.
- Select the Gate 5 payout-delivery model from reproducible evidence.
- Establish tested hard values and capacity limits.
- Freeze a reproducible public ABI and source-scope manifest only after dependencies close.
- Define PRR-04 through PRR-08 test packages before production coding.
- Permit an independent reviewer to authorize only a bounded first implementation slice after every entry criterion passes.

## Non-objectives

- Deployment, GenLayer Studio use, wallet use, funding, signing, or transactions.
- Frontend V4 integration or Builder Program submission.
- Complete forensic reconstruction or proof of forensic evidence capability.
- Unsupported readiness, compatibility, or safety claims.
- Production contract, ABI, test, frontend, or deployment coding before the authorization gate passes.

## Governing principles

1. Evidence before assertion.
2. Validation before identifier allocation.
3. No public ABI before dependency closure.
4. No payout implementation before Gate 5.
5. No hard-coded cap without benchmark evidence.
6. Probe evidence never silently transfers to production.
7. Frontend follows the frozen contract, not the reverse.
8. Every stage receives independent review.
9. No deployment until all applicable release checks pass.
10. No contacting GenLayer as a generic prerequisite.

## Program controls

Every evidence artifact must record its repository commit, source and fixture SHA-256 hashes, exact command, tool and runtime versions, inputs, outputs, environment/network status, result, reviewer, and known boundary. Prototype branches must remain isolated from production paths. A failed experiment produces a decision input, not an authorization.

Entry to a workstream means only that its permitted evidence work may begin. Exit requires every stated deliverable, criterion, and independent review; absence of a recorded failure is not a pass.

## Workstream BF-0 — Evidence normalization

### Purpose

Create reproducible baselines before new feasibility work.

### Entry criteria

- The audit baseline commit and source identities are independently rechecked.
- Work is confined to evidence and decision records; no production source path is created.

### Deliverables

- Source and fixture hash manifest.
- Test-command manifest with expected counts and ownership boundaries.
- Stage A schema-derivation evidence record, or an explicit unresolved status for every unrecoverable datum.
- Product-gate register separating product requirements from optional forensic research.
- Decision register with owner, prerequisite, alternatives, evidence, status, and review.
- Protected-mutation register covering candidate operations and state families.
- Write-operation atomicity register covering validation, identifiers, counters, activity, liabilities, and value.

### Exit criteria

- No contradictory evidence statement remains.
- Every artifact is bound to source/fixture hashes and exact tool versions.
- Evidence boundaries distinguish V3, Gate 1, Gate 2 Stage A, model/specification, frontend, and future production work.
- Zero unresolved P0, P1, P2, or P3 documentation/evidence-normalization findings remain.
- An independent reviewer signs the evidence index.

No network schema derivation is part of this documentation task. A later derivation must be separately recorded and must not require a wallet, funding, signing, or transaction.

## Workstream BF-1 — Gate 5 payout-delivery decision

BF-1 is the critical path for claim/refund behavior, accounting, and public ABI freeze. It may start after BF-0 establishes the evidence format. Neither candidate is selected by this plan.

### Candidate A — synchronous/direct delivery

Candidate A may be selected only when a reproducible isolated prototype proves:

- receiving-call failure behavior and the exact observable result;
- parent rollback behavior for every pre-call and post-call mutation;
- no lost liability on failure;
- no double payment across repetition, replay, or retry;
- safe, authorized, and idempotent retry behavior;
- reentrancy safety for every callback-reachable state;
- exact accounting conservation before, during, and after delivery.

Failure to prove any item rejects Candidate A; it does not permit an assumption.

### Candidate B — asynchronous or two-phase delivery

Candidate B must define and prove:

- pending, completed, failed, and retryable states and their legal transitions;
- acknowledgement or reconciliation methods and observability;
- liability retention until proven delivery;
- idempotency keys and duplicate-call outcomes;
- retry authority, bounds, expiry, and recovery;
- activity timing and correction/reconciliation entries;
- claimability updates and terminal status;
- no double payment and no lost liability;
- reentrancy safety;
- exact accounting conservation.

### Required evidence package

- Isolated nonproduction prototype and source hash.
- Receiving-target/failure matrix, including rejection, exception, reentrancy, replay, timeout/unknown result, and repeated acknowledgement.
- Complete payout-delivery state machine.
- ABI impact report for claim, refund, delivery, acknowledgement, retry, and reconciliation.
- Accounting proof and executable invariant tests.
- Retry/reconciliation specification.
- Independent security and product review.
- Final decision record selecting exactly one model and rejecting the other with evidence-based reasoning.

### Exit criteria

- Exactly one delivery model is selected; the other is explicitly rejected with reasoning.
- Child failure, rollback, observability, retry, reconciliation, reentrancy, activity timing, liability, and conservation are resolved.
- No unresolved P0, P1, P2, or P3 finding remains in the Gate 5 package.
- Independent review accepts the model and its ABI consequences.
- The public claim/refund portion of the ABI is eligible to freeze; it is not frozen merely by BF-1 exit.

## Workstream BF-2 — Remaining product-feasibility gates

BF-2 gates may proceed in parallel after BF-0, subject to their listed cross-dependencies. Every gate remains mandatory product work. Complete forensic reconstruction is not a Gate 2 product requirement.

### Gate 2 — Product stale-write safeguards

- **Question:** Can attempt/request ancestry and successor authority prevent every stale intelligent result from mutating the full product state?
- **Prototype or benchmark:** Extend an isolated nonproduction model/probe with representative market, evidence, activity, settlement, and accounting snapshots; do not copy it into a production path.
- **Exact inputs:** Old/current/successor request IDs, attempt ancestry, pre/post-intelligence status changes, cancellation/expiry, valid/malformed results, retries, and the ten PRR-06 scenarios.
- **Exact outputs:** Mutation trace, accepted/rejected result, complete before/after snapshots, identifiers consumed, and guard trace.
- **Pass criteria:** Only the authoritative live attempt can mutate protected state; stale/rejected paths are byte-for-byte unchanged; a current valid result still finalizes.
- **Failure consequence:** Resolution and all dependent production writes remain blocked.
- **Architecture impact:** Freeze authority, ancestry, cancellation, expiry, and finalization rules.
- **ABI impact:** May affect request, execute, retry, cancel, reresolution, status, and attempt views.
- **Evidence package:** Source/fixture hashes, ten-case regression log, mutation manifest, AST trace, tool versions, and review report.
- **Independent review:** Required for authority model, case completeness, and evidence boundary.

### Gate 3 — Pending-execution cancellation and backstop

- **Question:** What deterministic transition ends a resolution that is pending or cannot complete, without enabling unauthorized finalization or trapped liabilities?
- **Prototype or benchmark:** Isolated timing/cancellation state machine with adversarial interleavings.
- **Exact inputs:** Request time, deadline, accepted/finalized observation, caller authority, attempt count, successor request, market phase, and boundary timestamps.
- **Exact outputs:** Status, authoritative attempt, refund/claim eligibility flags, activity entry, and unchanged-state rejection snapshots.
- **Pass criteria:** Exactly one legal backstop path exists for each state; early, duplicate, unauthorized, stale, and boundary-invalid actions preserve state.
- **Failure consequence:** Cancellation, expiry, liveness, refund eligibility, and related methods remain blocked.
- **Architecture impact:** Freeze time boundaries and terminal/nonterminal transitions.
- **ABI impact:** May alter cancel, expire, retry, request, refund, and status views.
- **Evidence package:** Transition table, boundary vectors, failure matrix, state invariants, and hashes.
- **Independent review:** Required for liveness, authority, timing, and liability implications.

### Gate 4 — Malformed intelligent-output behavior

- **Question:** Can every malformed, oversized, ambiguous, or semantically invalid intelligent output be rejected without mutation or identifier consumption?
- **Prototype or benchmark:** Parser/verdict harness around the isolated intelligent operation.
- **Exact inputs:** Valid schema; missing/extra fields; wrong types/enums; invalid Unicode/bytes; oversized output; conflicting verdict; truncated output; and one-byte mutations.
- **Exact outputs:** Parse/verdict classification, rejection reason, payload/no-payload result, mutation trace, and retry eligibility.
- **Pass criteria:** Only canonical valid output produces a result; every rejected vector produces no payload and no state/ID/activity/value change.
- **Failure consequence:** Production intelligent execution and result storage remain blocked.
- **Architecture impact:** Freeze output schema, error classes, size limits, and retry semantics.
- **ABI impact:** May affect result DTOs, error/status views, retry, and output retrieval.
- **Evidence package:** Golden/negative corpus, byte/hash manifest, independent implementations, and results.
- **Independent review:** Required for completeness and parser independence.

### Gate 6 — Hashing, supported types, timestamp conversion, and storage

- **Question:** Which runtime types, hash operations, timestamp conversions, and storage encodings are deterministic and supported at required bounds?
- **Prototype or benchmark:** Minimal type/hash/time/storage probes with boundary values and round trips.
- **Exact inputs:** Empty/min/max text and bytes, supported integers including `u64` boundaries, timestamps/timezones, collections, DTOs, digests, and invalid/overflow values.
- **Exact outputs:** Stored/retrieved values, canonical bytes, digest, converted timestamp, schema, exception, and execution/storage cost.
- **Pass criteria:** Deterministic cross-run/cross-language results, explicit overflow rejection, lossless supported round trips, and measured safe bounds.
- **Failure consequence:** Affected identifiers, serialization, configuration, and time fields remain blocked.
- **Architecture impact:** Freeze supported storage types, hash profile, time conversion, and overflow rules.
- **ABI impact:** Fixes integer/time/digest/DTO representations.
- **Evidence package:** Source hashes, schemas, vectors, cost results, tool/runtime versions, and type decision record.
- **Independent review:** Required for determinism, conversion, bounds, and storage claims.

### Gate 7 — Accepted/finalized concurrency

- **Question:** How do accepted and finalized observations interact with successor authority, cancellation, settlement, and claimability under concurrent calls?
- **Prototype or benchmark:** Deterministic interleaving model plus isolated runtime experiment where locally possible.
- **Exact inputs:** Accepted/finalized states, old/current/successor requests, cancellations, retries, claims, and every relevant ordering.
- **Exact outputs:** Authoritative state, legal next actions, liabilities, activity, and complete snapshots.
- **Pass criteria:** Every interleaving has one conserved, deterministic result; stale or duplicate calls cannot finalize or pay twice.
- **Failure consequence:** Finality-dependent settlement, claims, cancellation, and retry remain blocked.
- **Architecture impact:** Freeze accepted/finalized meanings and transition authority.
- **ABI impact:** May affect status DTOs, execute/finalize, cancel, retry, claim, and event/activity timing.
- **Evidence package:** Interleaving matrix, invariants, model/probe hashes, and result traces.
- **Independent review:** Required for concurrency completeness and liability conservation.

### Gate 8 — Complete invocation storage and chunk retrieval

- **Question:** Can complete canonical invocation envelopes be stored and retrieved within safe bounded costs without truncation or ambiguity?
- **Prototype or benchmark:** Isolated envelope storage with deterministic chunked reads at boundary sizes.
- **Exact inputs:** Initial/reresolution envelopes, min/max fields, Unicode/bytes, boundary and over-bound sizes, chunk indices/sizes, and absent IDs.
- **Exact outputs:** Stored length/hash, chunks, reconstructed bytes, costs, rejection reason, and zero/absent behavior.
- **Pass criteria:** Exact reconstruction and digest equality within selected limits; deterministic bounds; invalid chunks and over-limit inputs reject unchanged.
- **Failure consequence:** Invocation persistence/retrieval and any dependent evidence package remain blocked.
- **Architecture impact:** Freeze envelope completeness, storage layout, byte caps, retention, and chunk rules.
- **ABI impact:** Fixes invocation DTOs and chunk/count/metadata views.
- **Evidence package:** Complete envelopes, reconstruction vectors, cost benchmark, schema/hashes, and review.
- **Independent review:** Required for completeness, boundedness, and retrieval semantics.

### Gate 9 — Participants, allocation, claim cost, and leaderboard

- **Question:** Can participant storage, full-precision allocation, bounded claims, and leaderboard updates conserve value and remain feasible at capacity?
- **Prototype or benchmark:** Allocation/reference model plus participant/claim/leaderboard capacity benchmarks.
- **Exact inputs:** Zero/min/max stakes, ties, dust/remainders, participant and stake-call boundaries, repeated/invalid claims, leaderboard ties, and worst-case winners.
- **Exact outputs:** Per-user entitlement, remainder destination, total liability, claim cost, rank/order, and unchanged-state rejections.
- **Pass criteria:** Exact conservation, deterministic allocation/ties, bounded cost at selected limits, no duplicate claim, and reproducible leaderboard order.
- **Failure consequence:** Settlement allocation, claims, participant caps, statistics, and leaderboard remain blocked.
- **Architecture impact:** Freeze precision, rounding/remainder, participant representation, liability, and ranking rules.
- **ABI impact:** Affects stake, settlement/claim, participant, entitlement, leaderboard, and statistics DTOs.
- **Evidence package:** Independent allocation oracle, property tests, benchmarks, vectors, and accounting review.
- **Independent review:** Required for arithmetic, economic safety, capacity, and ordering.

### Gate 10 — Timing, attempts, pagination, statistics, and view limits

- **Question:** Which bounds make timing, attempts, paginated reads, activity, statistics, and aggregate views deterministic and feasible?
- **Prototype or benchmark:** Worst-case runtime/storage benchmark for each bounded write/view and page boundary.
- **Exact inputs:** Time boundaries, attempt maxima, empty/first/last/out-of-range pages, maximum records/bytes, activity windows, leaderboard/statistics limits, and invalid sizes.
- **Exact outputs:** Result DTO, next cursor/count, cost, storage growth, error, and unchanged state for rejected writes.
- **Pass criteria:** Every selected limit has measured margin; page traversal is complete/nonoverlapping; invalid bounds reject deterministically; views stay within budgets.
- **Failure consequence:** Affected timing, retries, pagination, activity, statistics, leaderboard, and frontend reads remain blocked.
- **Architecture impact:** Freeze limits, cursor semantics, view aggregation, and boundary timing.
- **ABI impact:** Fixes pagination arguments/returns, attempt/timing fields, and bounded view methods.
- **Evidence package:** Benchmark matrix, traversal vectors, selected-value rationale, schemas/hashes, and review.
- **Independent review:** Required for coverage, margins, determinism, and frontend feasibility.

## Workstream BF-3 — Hard-value and capacity benchmarks

BF-3 consumes BF-2 measurements and Gate 5 accounting constraints. Independent entries may be benchmarked in parallel, but no value is selected before its dependencies and review close.

### Hard-value register

| Category | Values requiring evidence |
|---|---|
| Economics | Creation bond, minimum stake, challenge bond, retry bond, `AI`, `C`, `G`, `AR`, `F`, fund-unlock delay |
| Lifecycle | Attempt caps, market caps, timing/deadline bounds |
| Participation | Participant caps, stake-call caps |
| Evidence and challenge | Count caps and per-item/aggregate byte caps |
| Intelligence | Intelligent-output caps, complete invocation-byte caps |
| Reads | Pagination sizes, activity limits, leaderboard limits, statistics/view limits |

Every register row must contain value name, unit, exact type, safety/conservation relationship, benchmark method, tested range, selected value or `UNSELECTED`, rationale, failure margin, affected methods/DTOs/storage, source of truth, prerequisite gates, evidence hashes, and review status. No value may be described as selected before evidence exists.

### Exit criteria

- Every implementation-relevant hard value is either selected with evidence or explicitly blocks its subsystem.
- Selected values fit proven runtime/storage/type bounds and economic conservation relationships.
- Boundary, over-bound, and worst-case combinations are tested.
- Source-of-truth and downstream ABI/configuration consumers are named.
- Independent product, security, and engineering reviews accept each selected value and margin.
- No unresolved P0/P1/P2/P3 hard-value finding remains.

## Workstream BF-4 — ABI and source manifest freeze

BF-4 may begin only after all relevant BF-1 through BF-3 decisions are accepted. Gate 5-dependent methods cannot freeze before Gate 5 selection.

### Entry criteria

- BF-1 has selected one reviewed payout-delivery model.
- Every BF-2 gate affecting the proposed first slice has passed.
- Every hard value/type affecting a public signature, DTO, payability rule, rejection rule, or constructor has been selected.
- Architecture and decision registers have no unresolved contradiction.

### Deliverables

- Constructor and immutable-configuration manifests.
- Public write-method and public view-method manifests.
- Argument names, order, types, validation, authority, and lifecycle preconditions.
- Return types and DTO field order/types.
- Closed status and enum definitions with representations.
- Optional/null encoding and zero-ID behavior.
- Payability table and value-receiving categories.
- Rejection/atomicity rules.
- Pagination, statistics, leaderboard, invocation, and activity rules.
- Canonical ABI artifact and SHA-256 hash.
- Source-scope manifest naming every authorized future production file and prohibited scope.
- Method-by-method frontend compatibility matrix.
- Independent ABI/source-scope review report.

### Exit criteria

- Every public method and DTO is dependency-closed and internally consistent.
- Contract, schema, frontend types, test manifests, and documentation agree exactly.
- ABI and source-scope artifacts are hashed, reproducible, and independently reviewed.
- No unresolved P0/P1/P2/P3 ABI/source-manifest finding remains.
- Freeze does not itself authorize coding, integration, or deployment.

## Workstream BF-5 — PRR-04 through PRR-08 test manifests

BF-5 specifies evidence before implementation so tests cannot be retrofitted to an accidental design. Manifest design may proceed alongside BF-1 through BF-3; approval waits for BF-4 consistency.

### PRR-04 production Python test package

The manifest must bind tests to production source hashes and cover all legal transitions, invariants, accounting/conservation, property tests, negative cases, min/max/over-bound values, payability/value rejection, claims/refunds, and schema/source checks. It must name commands, versions, deterministic seeds, expected counts, fixture hashes, and coverage ownership.

### PRR-05 canonicalization/verdict package

The manifest must require independent Python and Node implementations, complete initial/reresolution invocation envelopes, exact canonical bytes and hashes, malformed and semantic-negative vectors, one-byte mutations, rejected vectors producing no payload, and explicit binding tests proving the frontend and contract use the reviewed implementations. Golden-vector generation and verification must be independently reviewable.

### PRR-06 stale-write package

The production package must require all ten audit cases: old request before successor; successor authoritative before old result; old result after successor; no stale outcome/result mutation; no stale evidence mutation; no stale counter/retry mutation; no stale identifier consumption; rejected retry leaves all state unchanged; cancelled/expired request cannot later mutate; and valid current request can finalize normally.

### PRR-07 guard-order package

The manifest must list every intelligent operation and protected mutation; require repeated post-intelligence guards; prove guard dominance over every protected mutation on success and failure paths; and provide a source-bound AST/static checker with checker hash, exact command, expected findings, negative checker fixtures, and independent review.

### PRR-08 rejection-atomicity package

Every public write must record complete pre-state and post-state, identifier and counter snapshots, activity snapshot, liability/value snapshot, expected rejection, and an exact unchanged-state assertion. The matrix must include invalid creation, stake, evidence, challenge, resolution, retry, stale attempt, claim, refund, and nonzero value to every nonpayable operation, including empty/invalid and duplicate forms, unauthorized calls, premature calls, and boundary failures.

### Exit criteria

- Each package names its production artifact binding, command, tool versions, fixtures, expected case count, outputs, and reviewer.
- Positive, negative, boundary, property, and mutation cases map to architecture requirements.
- No probe result is accepted as a production pass.
- The five packages and BF-4 manifests agree exactly.
- Independent test/security review approves completeness.
- No unresolved P0/P1/P2/P3 test-manifest finding remains.

## Workstream BF-6 — Production implementation authorization gate

Production V4 coding may begin only when all of the following are recorded as passed:

- Gate 5 is selected and independently reviewed.
- All mandatory product-feasibility dependencies needed for the first slice pass.
- Relevant hard values and types are selected with evidence.
- Constructor and public ABI manifests are frozen and hashed.
- Source-scope manifest is frozen and names a bounded production path.
- Protected-mutation manifest is frozen.
- Write-operation atomicity manifest is frozen.
- PRR-04 through PRR-08 test manifests are independently approved.
- No unresolved P0, P1, P2, or P3 finding remains.
- An independent reviewer explicitly authorizes the bounded source-file scope.
- The authorized work contains no deployment, frontend integration, wallet, funding, signing, or transaction action.

Only after every entry criterion passes may the decision be changed to `PRODUCTION_FOUNDATION_IMPLEMENTATION_AUTHORIZED`. Until that explicit reviewed decision, it remains `PRODUCTION_FOUNDATION_IMPLEMENTATION_NOT_AUTHORIZED`.

### BF-6 output

A signed decision record must name the accepted evidence hashes, first-slice files, excluded files/subsystems, required tests, branch, reviewer, expiry/supersession rules, and prohibition on deployment. BF-6 does not itself create code.

## Future first coded slice

The following are potential contents only after BF-6 authorization. This plan neither authorizes nor implements them.

| Potential component | Required prerequisite | Why it may be safe after that prerequisite |
|---|---|---|
| Isolated production V4 source path | BF-4 source-scope freeze and BF-6 | Prevents probe promotion and bounds review/diff scope |
| Exact supported storage types | Gate 6 and BF-3 | Uses measured, reviewed runtime-compatible representations |
| Immutable configuration structure | Gates 6/10, BF-3, BF-4 | Constructor/types/limits are closed before storage is fixed |
| Closed enums and identifiers | Gates 2/3/7, BF-4 | Lifecycle and zero-ID semantics are frozen |
| Strict text processing | Gates 4/6/8 and PRR-05 manifest | Canonical bytes, bounds, and invalid-input behavior are specified |
| Deterministic canonical serialization and hashing helpers | Gates 4/6/8 and PRR-05 | Independent vectors and algorithms are frozen |
| Internal validation helpers | BF-4 rejection rules and PRR-08 manifest | Validation order and every rejection snapshot are defined |
| Commit-only ID allocation | Gate 2 and PRR-08 manifest | Allocation occurs only after validation on committed success |
| Stale-write guard primitives | Gate 2 and PRR-06/07 manifests | Authority and protected-mutation dominance are reviewed |
| Nonclaim state structures | Relevant Gates 2/3/6/7/8/10 and BF-4 | Excludes payout-dependent state and uses frozen types/lifecycle |
| Bounded typed views | Gates 6/8/10, BF-3, BF-4 | DTO, pagination, storage, and cost limits are measured |
| Source-bound tests | BF-5 and BF-6 | Tests have preapproved production ownership and evidence format |

## Excluded from the first coded slice

Unless explicitly cleared by completed workstreams and a later BF-6 decision, exclude:

- claim transfers, refund transfers, and bond delivery;
- settlement completion and payout liability discharge;
- leaderboard mutation dependent on unresolved allocation/capacity;
- intelligent execution dependent on unresolved storage, finality, or output constraints;
- every public method or DTO affected by an unresolved ABI decision;
- frontend integration;
- deployment, GenLayer Studio, wallets, funding, signing, and transactions.

## Dependency graph

```text
current audit baseline
        |
        v
BF-0 evidence normalization ------------------------------+
        |                                                  |
        +--> BF-1 Gate 5 payout delivery [CRITICAL]        |
        |       |                                          |
        +--> BF-2 Gates 2/3/4/6/7/8/9/10 [PARALLEL]        |
        |       |                                          |
        +--> BF-3 benchmarks <-----------------------------+
                |             (consumes BF-1/BF-2 evidence)
                +----------------------+-------------------+
                                       v
                         BF-4 ABI/source manifest freeze
                                       |
BF-5 PRR-04..PRR-08 test manifests ----+  (designs in parallel;
                                       |   approval after BF-4)
                                       v
                          independent review of BF-0..BF-5
                                       |
                                       v
                     BF-6 implementation authorization gate
                                       |
                         [currently NOT AUTHORIZED]
                                       |
                                       v
                    future bounded production coding slice
                                       |
                         source freeze + independent review
                                       |
                                       +--> PRR-01 / PRR-02
                                       +--> schema derivation --> PRR-03
                                       +--> source-bound tests --> PRR-04..PRR-08
                                       |
                                       v
                       separate frontend-integration decision
                                       |
                                       v
                              frontend integration
                                       |
                                       v
                 predeployment-applicable PRR evidence
             (PRR-17/18 and local portions of PRR-14..16)
                                       |
                                       v
                    independent deployment authorization
                                       |
                         [separately required]
                                       |
                                       v
                              Bradbury deployment
                                       |
                                       +--> PRR-09..PRR-13
                                       +--> Bradbury portions of PRR-14..PRR-16
                                       +--> PRR-19 deployment identity
                                       |
                                       v
                  Bradbury end-to-end lifecycle and frontend
                                   validation
                                       |
                                       v
                 complete every applicable PRR-01..PRR-20
                  (including PRR-20 evidence-backed claims)
                                       |
                                       v
                 final independent release and Builder Program
                              readiness decision
```

Nodes may proceed in parallel only where shown. No downstream arrow is an automatic authorization; each named review/gate must issue its own explicit decision. Local or predeployment evidence satisfies only its stated boundary and cannot substitute for Bradbury deployment-dependent evidence.

## Workstream ownership and branch strategy

The branch names below are planning names only. This task creates none of them.

| Workstream | Recommended isolated branch | Allowed files | Prohibited files/actions | Required review | Merge dependency | Parallel status |
|---|---|---|---|---|---|---|
| BF-0 | `docs/v4-evidence-normalization` | Evidence manifests and decision/product-gate registers | Production contract/frontend/deploy code; network derivation without a separate approved procedure | Evidence and release-policy review | Audit record accepted | Starts first |
| BF-1 | `experiment/v4-gate5-payout-delivery` | Isolated experiment, fixtures/tests, Gate 5 report | Production path, deployment, wallet/funding/transactions, premature ABI freeze | Security, economics, platform-behavior, product | BF-0 | Critical; may run beside BF-2 |
| BF-2 Gate 2 | `experiment/v4-gate2-product-stale-write` | Isolated product model/probe, fixtures/tests, report | Probe copy to production; forensic-expansion prerequisite | State-machine and security | BF-0 | Parallel with other BF-2 gates |
| BF-2 Gate 3 | `experiment/v4-gate3-cancellation` | Isolated model/probe, timing fixtures/tests, report | Production implementation/deployment | State-machine, liveness, economics | BF-0 | Parallel subject to Gate 2/7 shared review |
| BF-2 Gate 4 | `experiment/v4-gate4-malformed-output` | Isolated parser/verdict harness, vectors/tests, report | Production implementation or accepting ambiguous output | Serialization and security | BF-0 | Parallel with Gate 6/8 coordination |
| BF-2 Gate 6 | `experiment/v4-gate6-types-time` | Isolated type/hash/time/storage probes and report | Production storage types or config changes | Runtime compatibility and serialization | BF-0 | Parallel; feeds Gates 4/8/10 |
| BF-2 Gate 7 | `experiment/v4-gate7-finality` | Interleaving model/probe, fixtures/tests, report | Production finality/claim code | Concurrency, state-machine, economics | BF-0 | Parallel with Gate 2/3 coordination |
| BF-2 Gate 8 | `experiment/v4-gate8-invocation-storage` | Isolated storage/chunk probe, vectors/benchmarks, report | Production storage or frontend integration | Storage, serialization, capacity | BF-0; coordinate Gate 6 | Parallel |
| BF-2 Gate 9 | `experiment/v4-gate9-allocation-capacity` | Allocation oracle, capacity probes/tests, report | Production settlement/claim/leaderboard code | Economics, arithmetic, capacity | BF-0; Gate 5 constraints for final acceptance | Parallel benchmarking |
| BF-2 Gate 10 | `experiment/v4-gate10-runtime-limits` | Timing/page/view benchmarks, fixtures/tests, report | Production caps/config or frontend changes | Runtime, API, product | BF-0; coordinate Gates 6/8/9 | Parallel benchmarking |
| BF-3 | `docs/v4-hard-value-register` | Benchmark records, value register, decision records | Unbenchmarked selections; production config/package changes | Engineering, security, economics, product | Relevant BF-1/BF-2 evidence | Rows may benchmark in parallel |
| BF-4 | `docs/v4-abi-source-manifest` | ABI/source/constructor/DTO/payability manifests and compatibility matrix | Contract/frontend implementation; deployment | ABI, contract, frontend, security | Relevant BF-1/BF-2 and BF-3 complete | Begins only after dependencies close |
| BF-5 | `tests/v4-prr04-prr08-manifests` | Test specifications, fixture manifests, checker specification | Production implementation or retroactive pass claims | Test, contract, security | Design after BF-0; approval after BF-4 | Design in parallel; approval serialized |
| BF-6 | `docs/v4-implementation-authorization` | Reviewed authorization decision only | Code, deployment, integration, implicit authorization | Independent release authority | BF-0 through BF-5 accepted | Serialized final gate |

All future branches require clean-base verification and an exact permitted-file manifest. Merge order follows dependency closure, not branch completion time.

## Completion definition

This bounded foundation plan is complete only when:

- every workstream has delivered its evidence and met every exit criterion;
- dependencies, critical path, and parallel paths are unambiguous;
- Gate 5 and every mandatory product gate have reviewed decisions;
- no unresolved decision is represented as solved;
- relevant hard values, ABI, source scope, protected mutations, atomicity writes, and tests are frozen and hashed;
- no coding authorization is accidentally or implicitly granted;
- no deployment authorization is granted;
- the work maps directly to PRR-01 through PRR-08 and preserves later PRR-09 through PRR-20 gates;
- no unresolved P0, P1, P2, or P3 documentation finding remains.

Completion of this plan permits BF-6 to make a separate decision. It does not itself authorize production coding, frontend integration, deployment, or submission.
