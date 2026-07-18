# TruthMarket V4 BF-0 product-gate register

Status: `DRAFT_PENDING_CANDIDATE_COMMIT_AND_EXTERNAL_REVIEW`

## Classification and immutable-locator rule

The `existing isolated evidence` column describes only evidence already
retained for a bounded probe, model, specification, or historical run.
The `product acceptance` column is authoritative for future V4 release
work. No row in this BF-0 register changes an official PRR status.

Every `T-*` locator below is an exact path/SHA-256 row in
[SOURCE_AND_FIXTURE_HASH_MANIFEST.md](SOURCE_AND_FIXTURE_HASH_MANIFEST.md)
at baseline commit `eea21e1617c32c447ba43da658402435126d5272` and tree
`c0991d4d0df247dfd41bf08977f5eff900a37873`. A locator does not transfer
probe or specification evidence to an absent production V4 source.

## Immutable traceability key

| Locator | Exact baseline path | SHA-256 |
| --- | --- | --- |
| `T-COMPAT` | `docs/GENLAYER_COMPATIBILITY_BASELINE.md` | `81fabb8d07a59f8500c6612a6ab9ec2da31091568bf566e5134f53676379b3b8` |
| `T-ARCH` | `docs/V4_ARCHITECTURE.md` | `92411000a0d83c2717ae7f8d57357d4644bd317c243f15521836fa4b8d544b22` |
| `T-PLAN` | `docs/V4_BOUNDED_FOUNDATION_PLAN.md` | `3c0fba8d7f1e4a2f0cfc785b910add4d8c1fb973cdd421fdd516346d46690e74` |
| `T-ECON` | `docs/V4_ECONOMICS_AND_SAFETY.md` | `bd7202c708d3e0f1e6f4bf97ad60701c27370e9c329bd4cfc49ee58b87360ca2` |
| `T-AUDIT` | `docs/V4_IMPLEMENTATION_READINESS_AUDIT.md` | `487ddb9b61f1561a953d37a3cf6ade29f904b80745966963bd18c32de392db60` |
| `T-STATE` | `docs/V4_STATE_MACHINE.md` | `22f9842968f121a872cae2b2b21e8d028c8f9712e2e3fd812444e74637c64166` |
| `T-TEST` | `docs/V4_TEST_PLAN.md` | `078d118fa6326da306c263b61ce2bbdae849f2cecff668937f75b71e39e98e3f` |
| `T-POLICY` | `experiments/v4-gate2/V4_RELEASE_POLICY.md` | `169ef8fc7544ec1f11c86079323a7ea066e338240a22b993e8e364af54fa8f9f` |
| `T-G1-REQ` | `experiments/v4-gate1/GATE1_REQUIREMENTS.md` | `f545afccdd49839b5508c3b4f80abd5748249c5bc7650b2510c628cf24c59300` |
| `T-G1-RESULT` | `experiments/v4-gate1/GATE1_RESULTS.md` | `60495421da2f27f04d26667f53cb340ceb7d60c60907e55e1a862a9eac25ef2c` |
| `T-G1-PROBE` | `experiments/v4-gate1/contracts/truth_market_v4_gate1_probe.py` | `258c9023adfca7fdee94028baa228fb112bc854ca1db05a2869b70f204eb9e1a` |
| `T-G1-TEST` | `experiments/v4-gate1/tests/test_gate1_probe.py` | `0b43c8648aa44aff6ef4445cfaef79cfe51507ac9cf5103b0694288b94793639` |
| `T-G2-REQ` | `experiments/v4-gate2/GATE2_REQUIREMENTS.md` | `21d07aba51b19a0e9eb7a484a9ea9c7e6192c10b80722b2a7503569ab1ed0253` |
| `T-G2-PROBE` | `experiments/v4-gate2/contracts/truth_market_v4_gate2_probe.py` | `97827e38b0dc606920acccdeff5b44379a5edccf733c4d521daab6cbc8d3791a` |
| `T-G2-SCENARIOS` | `experiments/v4-gate2/specs/gate2-scenarios.json` | `066d034e224d4caab87abd7a7d07faa68a5784793f44ef6277658c74bf2b8aef` |
| `T-G2-VECTORS` | `experiments/v4-gate2/fixtures/canonicalization-vectors.json` | `014e6bc11d0798f11e25849f5834c4b7e46bc36b38a4b87e6eb2641fc550a922` |
| `T-G2-MODEL` | `experiments/v4-gate2/models/gate2_model.py` | `50d5c5241142c41b41d51c308e1bc0ceee6b7040dc9376e40198f29831dd9a77` |
| `T-G2-SCHEDULER` | `experiments/v4-gate2/models/gate2_scheduler.py` | `3703900e0b0528cdd6524e114bdaaee7632864dd91754f5c50331e2555f589a8` |
| `T-G2-PY-TESTS` | `experiments/v4-gate2/tests/support/canonical_json.py`; `experiments/v4-gate2/tests/test_gate2_canonicalization.py`; `experiments/v4-gate2/tests/test_gate2_model.py`; `experiments/v4-gate2/tests/test_gate2_probe.py`; `experiments/v4-gate2/tests/test_gate2_probe_abi.py`; `experiments/v4-gate2/tests/test_gate2_scheduler.py` | `3902eee0293abc9b7e3edd3102425e46ab4cc25382a914035381c7ebd348a2d2`; `211ac0a7e77bebbf7b77990a09b0c413573b1a5da1746f011084e281dcfa6d62`; `8a7b0fa4269027d8e26194c6a49321935a03057c8482ed020e68a39cb9b1687e`; `149113782790f7f4c20801ff041a18ee14ab608e9ce1c4a5b4a3f5dbd60d125c`; `da20518c9de95382568b80d8ddc6cc85c790726d33b9e93118d08f1120c805cf`; `bd5e53d7409b7501d27e6a8ae5e4750d759ca9608d9e3af03bff895a698b23e5` |
| `T-G2-NODE-TESTS` | `experiments/v4-gate2/tests/gate2-canonicalization.test.mjs`; `experiments/v4-gate2/tests/gate2-verdict-rules.test.mjs`; `experiments/v4-gate2/tests/support/canonical-json.mjs`; `experiments/v4-gate2/tests/support/verdict-rules.mjs` | `4467bfa5ce46ef0dd320a933af47b35780cc46572cc5a95e30354bd69dc272c6`; `0e4b02a1c7385eead9ef270ffaefbfe74025ff99a23d2e5babd8759416f14d4d`; `4c4530dfa53810ed95b87e54b66ce41e4942e6a6f73b2724ca539040e8021636`; `ee2a3aa2cb8ab0cf52e60f8c146797902de109bc775f07b258a78dfe630b021d` |

## Gate-to-evidence, command, owner, acceptance, and PRR matrix

`TC-*` identifiers refer to exact rows in
[TEST_COMMAND_MANIFEST.md](TEST_COMMAND_MANIFEST.md). `NONE_GATE_SPECIFIC`
means no retained command currently owns that gate; it is not a pass.

| Gate | Accountable owner | Mandatory product question | Existing isolated evidence | Bound source/fixture rows | Current exact command IDs | Acceptance criteria locator | Related official PRRs | Missing acceptance evidence | Product acceptance and track boundary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `G1` | Gate 1 evidence owner; production release authority for transfer | Two-step request bookkeeping and later permissionless intelligent execution | `PROBE_SCOPE_PASSED` | `T-G1-REQ`, `T-G1-RESULT`, `T-G1-PROBE`, `T-G1-TEST`, `T-ARCH`, `T-STATE` | `TC-01`, `TC-02` | `T-G1-REQ` “Normative requirement matrix” and “Verdict rule”; `T-G1-RESULT` “Exact verdict” and “Requirement matrix” | `PRR-01`, `PRR-02`, `PRR-04`, `PRR-09`, `PRR-12` | Production V4 source/ABI binding, selected limits, complete market lifecycle, production tests, and Bradbury end-to-end evidence | `NOT_EVALUATED`; isolated feasibility has no separate forensic dependency and does not authorize production transfer |
| `G2` | BF-2 Gate 2 owner; state-machine and security reviewers | Stale-write authority, retries, guard ordering, and rejection atomicity across complete product state | `LOCAL_SCOPE_PARTIAL` | `T-G2-REQ`, `T-G2-PROBE`, `T-G2-SCENARIOS`, `T-G2-MODEL`, `T-G2-SCHEDULER`, `T-G2-PY-TESTS`, `T-ARCH`, `T-PLAN`, `T-AUDIT` | `TC-01`, `TC-03`, `TC-04` | `T-PLAN` “Gate 2 — Product stale-write safeguards”; `T-AUDIT` “Stale-write evidence boundary”, “Guard-order evidence boundary”, and “Rejection-atomicity boundary” | `PRR-04`, `PRR-06`, `PRR-07`, `PRR-08`, `PRR-09`, `PRR-12` | Production fields, full market/evidence/settlement/claim/accounting snapshots, ten source-bound cases, protected-mutation checker, and every-write atomicity cases | `NOT_EVALUATED`; optional historical/overlap research remains `EVIDENCE_CAPABILITY_NOT_PROVED` and cannot waive product work |
| `G3` | BF-2 Gate 3 owner; state-machine, liveness, and economics reviewers | Deterministic cancellation/backstop while intelligent work is pending or cannot complete | `NO_ISOLATED_RESULT` | `T-ARCH`, `T-PLAN`, `T-STATE`, `T-TEST`, `T-AUDIT`; `T-G2-SCHEDULER` is only a bounded partial input | `TC-03` partial scheduler/model boundary only; no Gate 3 command ID | `T-PLAN` “Gate 3 — Pending-execution cancellation and backstop” | `PRR-04`, `PRR-08`, `PRR-09`, `PRR-12`, `PRR-13`, `PRR-16` | Isolated timing/interleaving prototype, boundary vectors, one legal backstop per state, authority/liveness review, complete unchanged-state snapshots, and production binding | `NOT_EVALUATED`; mandatory product requirement |
| `G4` | BF-2 Gate 4 owner; serialization and security reviewers | Malformed, oversized, ambiguous, or semantically invalid intelligent output rejection and recovery | `SPECIFICATION_SCOPE_PARTIAL` | `T-G2-REQ`, `T-G2-VECTORS`, `T-G2-PROBE`, `T-G2-PY-TESTS`, `T-G2-NODE-TESTS`, `T-ARCH`, `T-PLAN`, `T-TEST`, `T-AUDIT` | `TC-03`, `TC-04` partial parser/verdict specification boundary | `T-PLAN` “Gate 4 — Malformed intelligent-output behavior”; `T-AUDIT` “Rejection-atomicity boundary” | `PRR-04`, `PRR-05`, `PRR-08`, `PRR-12`, `PRR-16` | Runtime catchability and transaction-failure evidence, complete golden/negative corpus, independent parser implementations, production schema/source binding, retry behavior, and unchanged-state proof | `NOT_EVALUATED`; mandatory product requirement |
| `G5` | BF-1 owner; security, economics, platform-behavior, and product reviewers | Payout admission, deferred dispatch, observable completion/failure, retry or reconciliation, accounting, and reentrancy | `CRITICAL_OPEN` | `T-COMPAT`, `T-ARCH`, `T-PLAN`, `T-ECON`, `T-STATE`, `T-TEST`, `T-AUDIT` | `NONE_GATE_SPECIFIC`; no retained payout-delivery execution command exists | `T-PLAN` “Workstream BF-1 — Gate 5 payout-delivery decision”, “Required evidence package”, and “Exit criteria”; `T-AUDIT` “Gate 5 finding”; `T-COMPAT` “Outbound transfer boundary” | `PRR-01`, `PRR-02`, `PRR-04`, `PRR-08`, `PRR-13`, `PRR-14`, `PRR-16` | Reproducible Bradbury child-message/parent-state matrix, selected state machine, ABI impact report, callback/reconciliation model if applicable, accounting invariants, capacity recomputation, and independent review | `NOT_EVALUATED`; critical product blocker for claims, refunds, ABI, statuses, activity, liabilities, paid totals, and capacity |
| `G6` | BF-2 Gate 6 owner; runtime compatibility and serialization reviewers | Supported types, SHA-256, deterministic timestamp conversion, and bounded storage | `LOCAL_SCOPE_PARTIAL` | `T-COMPAT`, `T-ARCH`, `T-PLAN`, `T-G2-VECTORS`, `T-G2-PROBE`, `T-G2-PY-TESTS`, `T-G2-NODE-TESTS` | `TC-01`, `TC-03`, `TC-04` partial canonicalization/Stage A storage boundary | `T-PLAN` “Gate 6 — Hashing, supported types, timestamp conversion, and storage”; `T-COMPAT` “Pinned versions and network” and “Supported Python generation” | `PRR-01`, `PRR-02`, `PRR-03`, `PRR-04`, `PRR-05`, `PRR-08` | Boundary probes, exact schemas, deterministic cross-run/cross-language vectors, `uint64` time conversion/overflow evidence, safe storage limits, costs, production binding, and review | `NOT_EVALUATED`; mandatory product requirement |
| `G7` | BF-2 Gate 7 owner; concurrency, state-machine, and economics reviewers | Accepted/finalized concurrency, successor authority, terminal ordering, settlement, and claimability | `HISTORICAL_AND_LOCAL_PARTIAL` | `T-G1-REQ`, `T-G1-RESULT`, `T-G2-REQ`, `T-G2-MODEL`, `T-G2-SCHEDULER`, `T-ARCH`, `T-PLAN`, `T-STATE`, `T-AUDIT` | `TC-02`, `TC-03` partial status/scheduler boundary | `T-PLAN` “Gate 7 — Accepted/finalized concurrency” | `PRR-04`, `PRR-06`, `PRR-07`, `PRR-08`, `PRR-09`, `PRR-12`, `PRR-13` | Complete deterministic interleaving matrix, accepted/finalized runtime observations, terminal-race and duplicate-payment proof, liability conservation, production source binding, and review | `NOT_EVALUATED`; mandatory product requirement; complete Gate 2 forensics remain separate |
| `G8` | BF-2 Gate 8 owner; storage, serialization, and capacity reviewers | Complete canonical invocation storage and exact bounded chunk retrieval | `NO_ISOLATED_RESULT` | `T-ARCH`, `T-PLAN`, `T-TEST`, `T-G2-REQ`, `T-G2-VECTORS`, `T-G2-PY-TESTS`, `T-G2-NODE-TESTS` | `TC-03`, `TC-04` partial serialization-vector boundary only; no Gate 8 storage command ID | `T-PLAN` “Gate 8 — Complete invocation storage and chunk retrieval” | `PRR-01`, `PRR-02`, `PRR-03`, `PRR-04`, `PRR-05`, `PRR-11`, `PRR-12`, `PRR-14`, `PRR-16` | Boundary-size storage prototype, exact reconstruction/digest vectors, chunk/count/absent-ID rejection, cost benchmark, selected byte caps, production DTO/schema binding, and review | `NOT_EVALUATED`; mandatory product requirement |
| `G9` | BF-2 Gate 9 owner; economics, arithmetic, capacity, and ordering reviewers | Participant storage, full-precision allocation, bounded claim cost, and leaderboard feasibility | `SPECIFICATION_ONLY` | `T-ARCH`, `T-PLAN`, `T-ECON`, `T-STATE`, `T-TEST`, `T-AUDIT` | `NONE_GATE_SPECIFIC`; no retained allocation/capacity command exists | `T-PLAN` “Gate 9 — Participants, allocation, claim cost, and leaderboard” | `PRR-04`, `PRR-08`, `PRR-09`, `PRR-10`, `PRR-13`, `PRR-14`, `PRR-16` | Independent full-precision allocation oracle, conservation/property tests, participant/stake/claim/leaderboard worst-case benchmarks, selected limits, Gate 5-compatible completion timing, and review | `NOT_EVALUATED`; mandatory product requirement; final acceptance depends on Gate 5 |
| `G10` | BF-2 Gate 10 owner; runtime, API, and product reviewers | Practical timing, attempts, pagination, activity, statistics, aggregate-view, and frontend-read limits | `SPECIFICATION_ONLY` | `T-ARCH`, `T-PLAN`, `T-STATE`, `T-TEST`, `T-AUDIT` | `NONE_GATE_SPECIFIC`; `TC-05`, `TC-07`, and `TC-08` are current V3/frontend boundaries only | `T-PLAN` “Gate 10 — Timing, attempts, pagination, statistics, and view limits” | `PRR-02`, `PRR-04`, `PRR-09`, `PRR-10`, `PRR-11`, `PRR-14`, `PRR-16` | Worst-case write/view benchmarks, boundary timing vectors, complete/nonoverlapping pagination traversal, selected values with safety margin, storage-growth evidence, frontend feasibility, and review | `NOT_EVALUATED`; mandatory product requirement |

## Gate 5 explicit blocked implementation surface

Until G5 selects and independently validates one delivery model, no
production implementation or freeze is authorized for:

- claim admission or claim-request consumption;
- payout dispatch or deferred external-message emission;
- payout or refund delivery;
- observable completion;
- observable failure or unknown-result handling;
- retry authorization or retry dispatch;
- callback or acknowledgement handling where the selected model uses it;
- reconciliation request, observation, completion, failure, or retry;
- claim-side activity timing or correction entries;
- liability retention, transition, or discharge;
- paid-total, per-user aggregate, protocol aggregate, or leaderboard update;
- duplicate-completion and stale-callback prevention; or
- related public ABI, status, storage, identifier, and capacity implications.

## Product and forensic separation

Mandatory Product Release Readiness includes production stale-write
guards, local behavioral regression, source-bound ordering checks,
rejection atomicity, schema compatibility, frontend integration,
security, deployment, and Bradbury end-to-end behavior.

Optional Forensic Assurance Research concerns complete historical
reconstruction and natural-overlap protocol proof. Its status remains
`EVIDENCE_CAPABILITY_NOT_PROVED`, and its controlled experiment remains
`BLOCKED_PENDING_SEPARATE_AUTHORIZATION`.

Failure or absence of optional forensic evidence must not be described
as satisfying or waiving any mandatory product gate.

## PRR status preservation

`T-POLICY` “Mandatory product-release gate” remains authoritative:
`PRR-01` through `PRR-20` are all `NOT_EVALUATED`. The mappings above
identify dependencies and evidence ownership only. They do not mark a
PRR passed, authorize production coding, freeze an ABI, derive a schema,
authorize frontend integration, authorize deployment, or establish
Builder Program readiness.
