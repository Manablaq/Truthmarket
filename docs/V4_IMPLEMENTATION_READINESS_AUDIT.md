# TruthMarket V4 implementation-readiness audit

## Audit status

`V4 IMPLEMENTATION-READINESS AUDIT COMPLETE — READY FOR BOUNDED FOUNDATION PLAN`

- Audit scope: Product Release Readiness items PRR-01 through PRR-08.
- Repository baseline: `cd242dc2499b676e111167b8b5c92e5b5334eedf` on `main`.
- This is an evidence and planning record only.
- No production V4 contract source exists at this baseline.
- No readiness, production coding, integration, deployment, release, or submission authorization follows from this audit.

The conclusion is limited: the repository has enough evidence to plan bounded foundation work. Production V4 implementation is not ready to begin.

## Official policy statuses

The governing [V4 release policy](../experiments/v4-gate2/V4_RELEASE_POLICY.md) records:

- Product V4 implementation: `AUTHORIZED_TO_PLAN`
- Product V4 integration: `NOT_STARTED`
- Bradbury deployment: `NOT_AUTHORIZED`
- End-to-end Bradbury validation: `NOT_STARTED`
- Builder Program submission: `NOT_READY`
- Forensic evidence capability: `EVIDENCE_CAPABILITY_NOT_PROVED`
- Controlled forensic experiment: `BLOCKED_PENDING_SEPARATE_AUTHORIZATION`

PRR-01 through PRR-20 remain officially `NOT_EVALUATED`. The analytical statuses below are audit classifications only and do not modify those official statuses.

## Current implementation inventory

| Inventory item | Exact path | Role and boundary | SHA-256 |
|---|---|---|---|
| V3 production/current contract | [`contracts/truth_market.py`](../contracts/truth_market.py) | Current product contract. It provides the V3 market, stake, evidence, resolution, claim, and V3 view surface; it is not a V4 implementation or V4 atomicity proof. | `b07a8983a4c879f64a33de33408f47d5062e7973903df23224a365c3afb4bee0` |
| Gate 1 feasibility probe | [`experiments/v4-gate1/contracts/truth_market_v4_gate1_probe.py`](../experiments/v4-gate1/contracts/truth_market_v4_gate1_probe.py) | Isolated feasibility probe for bounded supported types and method behavior; nonproduction. | `258c9023adfca7fdee94028baa228fb112bc854ca1db05a2869b70f204eb9e1a` |
| Gate 2 Stage A probe | [`experiments/v4-gate2/contracts/truth_market_v4_gate2_probe.py`](../experiments/v4-gate2/contracts/truth_market_v4_gate2_probe.py) | Bounded nonproduction stale-write/state-machine probe with repeated post-intelligence authority guards. It is not the production V4 contract and does not implement the separate canonicalization or verdict-rule evidence packages; those are owned by the Gate 2 fixtures, support code, specifications, and Python/Node test suites. | `97827e38b0dc606920acccdeff5b44379a5edccf733c4d521daab6cbc8d3791a` |
| V3 frontend ABI consumer | [`lib/genlayer.ts`](../lib/genlayer.ts) | V3-shaped public method manifest and read/write adapter. | `fc207d344ca3f6cc7f2150ef0c6e1f615c8b43ddb409d28945b513fe7ad3b589` |
| V3 frontend DTO consumer | [`lib/schemas.ts`](../lib/schemas.ts) | V3 response parsing and validation, including JSON-string-shaped contract results. | `6d2d6ce6b66612fb419f773b3445ef83d5c2b563346aa13685da854266001ea1` |
| Frontend deployment configuration | [`lib/config.ts`](../lib/config.ts) | Current contract/network configuration source; it contains no production V4 identity. | `43a83ad54a73e2288d5bae20771b59c5d32547a2ce35dc88192b2254d13c103c` |
| Gate 2 vectors | [`experiments/v4-gate2/fixtures/canonicalization-vectors.json`](../experiments/v4-gate2/fixtures/canonicalization-vectors.json) | Shared probe/specification canonicalization fixtures, not a binding to production serializers. | `014e6bc11d0798f11e25849f5834c4b7e46bc36b38a4b87e6eb2641fc550a922` |
| Production V4 source | Absent | No independently reviewable production V4 source exists. | Not applicable |
| Production V4 ABI | Absent | The architecture contains a candidate interface, but no frozen production ABI artifact exists. | Not applicable |
| Production V4 schema | Absent | No schema derived from an actual production V4 source exists. | Not applicable |
| Production V4 tests | Absent | Existing V3, probe, model, specification, frontend, and source-order tests do not validate a production V4 source. | Not applicable |

The current deployed/product contract is V3. V4 is neither implemented nor deployed at this baseline. The architecture and state-machine documents are specifications, not implementation artifacts.

## PRR-01 through PRR-08 evidence matrix

| PRR ID | Requirement | Official status | Analytical audit status | Current evidence | Evidence boundary | Missing evidence | Blocking dependency | Smallest next action | Blocks bounded planning | Blocks production coding | Blocks deployment | Blocks submission |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PRR-01 | Production V4 contract source is frozen and reviewed | `NOT_EVALUATED` | `NOT_SATISFIED` | Architecture, state machine, economics, migration, and test specifications exist | Specifications do not constitute source | Complete source, frozen scope, source hash, review report, and closed decisions | Gate 5, remaining mandatory product gates, hard values, ABI | Complete BF-0 through BF-5 and authorize an exact source scope | No | Yes | Yes | Yes |
| PRR-02 | Public ABI is frozen and frontend-compatible | `NOT_EVALUATED` | `NOT_SATISFIED` | Candidate V4 interface and V3 frontend manifests can be compared | Candidate methods remain decision-dependent; frontend is V3-shaped | ABI snapshot/hash, DTO encoding, payability, constructor, compatibility tests | Gate 5 and other ABI-affecting gates/limits | Produce the BF-4 ABI manifest after dependency closure | No | Yes | Yes | Yes |
| PRR-03 | Contract schema derives successfully | `NOT_EVALUATED` | `NOT_SATISFIED` | Historical Stage A probe schema evidence is recorded by the Gate 2 materials | Probe derivation cannot transfer to a different or absent production source | Production source hash, exact derivation command, tool/compiler version, network, output, schema hash | PRR-01 source existence and freeze | Define a reproducible derivation record; execute it only against frozen production source | No | Yes | Yes | Yes |
| PRR-04 | Python contract tests pass | `NOT_EVALUATED` | `NOT_SATISFIED` | Gate 1 14/14 and Gate 2 69/69 pass; existing sources compile | Suites validate probes/models/spec rules, not production V4 | Source-bound production transition, invariant, accounting, property, bounds, payability, claim/refund, and schema tests | Production source and Gate 5/accounting decisions | Approve the PRR-04 test manifest before coding | No | Yes | Yes | Yes |
| PRR-05 | Node canonicalization and verdict tests pass | `NOT_EVALUATED` | `PARTIALLY_EVIDENCED` | Gate 2 Node 24/24 and repository Node 77/77 pass against current fixtures and frontend/spec code | Isolated fixtures are not bound to production contract and frontend serializers | Cross-language golden/negative vectors, full envelopes, mutations, rejection behavior, production binding | Gates 4, 6, 8 and frozen serialization ABI | Freeze the PRR-05 vector and binding manifest | No | Yes | Yes | Yes |
| PRR-06 | Stale-write behavioral regression passes | `NOT_EVALUATED` | `PARTIALLY_EVIDENCED` | Stage A probe/model tests cover attempt authority and stale-result rejection | Probe fields omit full market, evidence, settlement, claims, refunds, activity, and accounting | Ten production source-bound regression cases and complete snapshots | Product Gate 2 and production state design | Freeze the PRR-06 ten-case manifest | No | Yes | Yes | Yes |
| PRR-07 | Post-intelligence guard ordering passes | `NOT_EVALUATED` | `PARTIALLY_EVIDENCED` | Probe source and AST/source-order tests place repeated guards after intelligence and before probe mutations | Proof covers only named probe fields and operations | Production protected-mutation manifest and source-bound dominance checker | Final intelligent operations and production storage manifest | Freeze protected fields/operations and checker contract | No | Yes | Yes | Yes |
| PRR-08 | No rejected transaction consumes state or identifiers | `NOT_EVALUATED` | `PARTIALLY_EVIDENCED` | Probe/model rejection tests cover a limited attempt/request surface | No full production write surface, value/liability behavior, or rollback proof exists | Every-write atomicity cases with complete state, ID, counter, activity, and value snapshots | Frozen writes, payability, Gate 5, and transaction-semantics evidence | Freeze the PRR-08 write-operation atomicity manifest | No | Yes | Yes | Yes |

## ABI gap summary

The candidate V4 ABI is not frozen. Material V3-to-V4 gaps include:

- V3 combines resolution behavior; V4 specifies distinct `request_resolution` and `execute_resolution` stages.
- V3 has no complete retry, expiry, cancellation, or reresolution lifecycle matching the V4 state machine.
- Claim/refund methods and bond-delivery behavior remain dependent on Gate 5.
- V4 requires bounded paginated reads where V3 exposes unpaginated or differently shaped reads.
- V4 specifies typed DTOs while current V3 frontend consumers parse JSON strings for several results.
- Evidence/challenge returns, identifiers, statuses, and lifecycle rules differ.
- Status and enum names, numeric representations, and closed values require a frozen manifest.
- Constructor parameters and immutable configuration remain uncertain until hard values and supported storage are selected.
- Zero-ID behavior and whether zero is invalid, sentinel, or first identifier are not frozen.
- Optional/null encoding is not frozen across contract, schema, and TypeScript consumers.
- Payability and direct-value rejection/acceptance differ across proposed operations and remain incomplete.
- Gate 5 can add or change claim, delivery, acknowledgement, retry, and reconciliation methods.

## Test ownership

| Suite | Result | What it validates | What it does not validate |
|---|---|---|---|
| Gate 1 Python | 14/14 pass | Gate 1 probe supported-type and feasibility behavior | Production V4 behavior |
| Gate 2 Python | 69/69 pass | Python canonicalization, Stage A probe/model authority and rejection behavior, scheduler behavior, ABI/schema-shape checks, and AST/source-order checks | Production market, accounting, payout, or ABI behavior |
| Gate 2 Node | 24/24 pass | JavaScript canonicalization and verdict rules against Gate 2 fixtures | Production frontend/contract serializer binding |
| Repository Node | 77/77 pass | Current Node specification/frontend/unit tests | Production V4 implementation or integration |
| Python compilation | Pass | V3, Gate 1 probe, and Gate 2 probe are syntactically valid in the available Python toolchain | Schema derivation or runtime compatibility of an absent production source |
| ESLint | Pass | Current linted TypeScript/JavaScript scope | Production V4 correctness |
| TypeScript no-emit | Pass | Current TypeScript scope type-checks | Compatibility with an absent production V4 ABI |

Passing probe and specification tests is not equivalent to passing production V4 tests.

## Stale-write evidence boundary

The Stage A probe locally demonstrates attempt/request ancestry, a current authoritative attempt, rejection of nonauthoritative results, and repeated checks after the intelligent operation before mutation of its bounded probe result/status fields. It does not contain the complete production market, evidence, challenge, settlement, claim, refund, activity, leaderboard, liability, or accounting structures. Its protected fields therefore cannot prove production behavior.

The future production PRR-06 package must include:

1. An old request completes before a successor exists and is handled according to the frozen state machine.
2. A successor becomes authoritative before the old result is received.
3. The old result arrives after the successor becomes authoritative.
4. A stale result cannot change the market outcome or resolution result.
5. A stale result cannot change evidence or its digest/storage references.
6. A stale result cannot change attempt counters or retry metadata.
7. A stale result cannot consume a new identifier.
8. A rejected retry leaves all state, identifiers, counters, activity, and liabilities unchanged.
9. A cancelled or expired request cannot later mutate state.
10. A valid current request can still finalize normally after the stale paths are rejected.

## Guard-order evidence boundary

The Gate 2 probe performs the intelligent operation, repeats authority/status guards, then writes the bounded probe result. Existing AST/source-order evidence checks that local pattern. It applies only to the probe operations and fields.

Production PRR-07 requires a protected-mutation manifest covering every intelligent operation and, where applicable, authoritative request/attempt IDs, outcome, resolution result, evidence digest or storage, status, finalized timestamp, counters, retry metadata, settlement/claimability, activity, leaderboard, liabilities, and accounting. A source-bound AST/static checker must prove repeated post-intelligence guards dominate every protected mutation on every success and failure path.

## Rejection-atomicity boundary

The probe covers limited invalid attempts, retries, and stale results. It does not cover every production write, payable-value category, or complete state graph.

In V3, `submit_evidence` computes and advances the evidence identifier before later storage mutations. That ordering is an atomicity concern to test; it is not proof of a defect because repository evidence does not establish that a thrown transaction can persist the increment. V3 cannot substitute for production V4 atomicity evidence.

Production writes must validate before allocating identifiers and must be tested using complete pre/post snapshots of storage, identifiers, counters, activity, liabilities, and transferred/retained value. Required rejection classes include invalid creation, invalid stake, empty or invalid evidence, duplicate evidence, invalid challenge, unauthorized resolution, invalid retry, stale attempt, premature claim, duplicate claim, invalid refund, and nonzero value sent to nonpayable operations.

## Gate 5 finding

Gate 5 remains unresolved. It blocks production claim/payout implementation and public ABI freeze because it controls:

- synchronous versus asynchronous/two-phase delivery;
- child-call failure behavior and parent rollback;
- observable delivery success and failure;
- retry and reconciliation semantics;
- claim statuses and claimability updates;
- activity timing;
- liability transitions;
- reentrancy controls;
- direct-value treatment;
- exact conservation; and
- public ABI additions or changes.

## Remaining product-feasibility findings

| Gate | Unresolved product question | Blocking scope |
|---|---|---|
| Gate 2 | Production stale-write safeguards across the full product state | Intelligent resolution and all dependent mutations; complete forensic reconstruction is not a product prerequisite |
| Gate 3 | Pending-execution cancellation and backstop behavior | Cancellation, expiry, liveness, refund eligibility |
| Gate 4 | Malformed intelligent-output rejection and state preservation | Resolution parsing, retry, evidence/result storage |
| Gate 6 | Hashing, supported types, timestamp conversion, and storage | Canonical serialization, identifiers, configuration, time fields |
| Gate 7 | Accepted/finalized concurrency semantics | Finality, successor authority, claims, settlement timing |
| Gate 8 | Complete invocation storage and bounded chunk retrieval | Envelope persistence, reads, evidence packages, storage caps |
| Gate 9 | Participants, full-precision allocation, claim cost, and leaderboard | Settlement/accounting, participant caps, claim and leaderboard subsystem |
| Gate 10 | Timing, attempts, pagination, statistics, and view limits | Runtime caps, bounded views, retry and frontend pagination ABI |

These gates remain mandatory product-feasibility work. Complete forensic observability is a separate research track and is not a product blocker.

## Hard-value finding

No execution, storage, or economic value may be treated as selected without benchmark evidence. The unresolved register includes creation bond, minimum stake, challenge bond, retry bond, `AI`, `C`, `G`, `AR`, `F`, fund-unlock delay, attempt caps, market caps, participant caps, stake-call caps, evidence count and byte caps, challenge count and byte caps, intelligent-output caps, invocation-byte caps, pagination sizes, activity limits, leaderboard limits, and statistics/view limits. Units, safe types, conservation relationships, tested ranges, margins, source of truth, and review status are also unresolved.

## Findings

### P1

- **No production V4 source or independent review.** Impact: PRR-01, schema derivation, and production source-bound testing cannot be truthfully completed. Smallest safe resolution: close prerequisite decisions, authorize an exact source scope, hash it, and obtain an independent review.
- **Gate 5 and public ABI instability.** Impact: claim, refund, delivery, reconciliation, accounting, and frontend method shapes can change. Smallest safe resolution: complete the Gate 5 evidence package and select one reviewed model before ABI freeze.
- **Unresolved mandatory gates and hard values.** Impact: implementation could encode unsupported types, unsafe bounds, or incomplete lifecycle behavior. Smallest safe resolution: execute BF-2 and BF-3 with reproducible evidence and decision records.
- **V3-shaped frontend.** Impact: current method and DTO consumers are incompatible with the candidate V4 lifecycle and typed reads. Smallest safe resolution: freeze the production ABI first, then build a source-bound compatibility matrix before integration.
- **Production rejection atomicity is unproved.** Impact: rejected writes could consume identifiers, state, activity, liabilities, or value without detection. Smallest safe resolution: approve and execute a complete every-write PRR-08 snapshot manifest against production source.
- **V3 cannot substitute for production atomicity proof.** Impact: rollback assumptions or V3 behavior could be incorrectly transferred to a different V4 design. Smallest safe resolution: prove transaction semantics and validation/allocation ordering against the eventual production V4 source.

### P2

- **Stage A schema evidence reproducibility gap.** Impact: the historical probe result is not a complete source-hash/tool-version/network/output proof package. Smallest safe resolution: normalize the Stage A record in BF-0, retaining an explicit unresolved label for any missing datum.
- **Probe-only guard-order proof.** Impact: unlisted production fields could mutate before repeated guards. Smallest safe resolution: freeze a production protected-mutation manifest and hash the source-bound checker.
- **Isolated vectors are not bound to production serializers.** Impact: Python, Node, frontend, and contract bytes/hashes could diverge. Smallest safe resolution: add independent cross-language golden and negative vectors with implementation-binding tests.
- **No canonical production ABI/schema artifact.** Impact: reviews and frontend consumers have no immutable interface reference. Smallest safe resolution: generate and hash both artifacts only after BF-4 entry criteria pass.
- **Probe lacks payable, evidence, challenge, settlement, claim, and refund coverage.** Impact: current passing results cannot support those production subsystems. Smallest safe resolution: include every subsystem in the PRR-04 through PRR-08 manifests before implementation.

### P3

- **Node package module-type warning.** Impact: Node reparses an affected module and emits avoidable diagnostic noise; current test correctness is not changed. Smallest safe resolution: address module classification in a separately authorized package-maintenance change, with lockfile and test review.

## Audit conclusion

The repository is ready for the [bounded foundation plan](V4_BOUNDED_FOUNDATION_PLAN.md). It is not ready for production V4 contract coding. The next phase is evidence-producing feasibility work, hard-value benchmarking, and decision closure followed by independent review.

No contact with GenLayer is required as a generic prerequisite. Contacting GenLayer remains optional only when reproducible local work encounters a real platform-blocking issue that cannot be resolved from available specifications and tooling.
