# TruthMarket V4 migration plan

Status: **proposed migration plan; V4 is unimplemented and undeployed**. This plan depends on the [architecture](V4_ARCHITECTURE.md), [state machine](V4_STATE_MACHINE.md), [economics and safety](V4_ECONOMICS_AND_SAFETY.md), [test plan](V4_TEST_PLAN.md), and pinned [GenLayer compatibility baseline](GENLAYER_COMPATIBILITY_BASELINE.md).

**Pre-implementation control:** the [V4 bounded foundation plan](V4_BOUNDED_FOUNDATION_PLAN.md) governs the evidence-producing feasibility work, hard-value selection, dependency closure, and independent authorization decision required before production coding. The linked plan does not complete or advance any migration stage.

## 1. V3 remains immutable and current

The current V3 contract is `0xa7105D2A409b769B62a456E1d57B1210B875cEA5` on Bradbury chain ID `4221`. V3 code, address, ABI, state, balances, market semantics, and current frontend configuration MUST NOT be replaced or relabelled as V4. This documentation phase changes none of them.

Existing V3 markets and positions remain on V3. No automatic balance, stake, evidence, resolution, leaderboard, or market-ID migration is proposed. Moving escrow without explicit V3 support would be technically and economically unjustified. Users MUST use the V3 contract's own available methods and receive truthful warnings about its immutable limitations, including unresolved positions that may lack a refund path.

## 2. V4 deployment identity

V4, if implemented and accepted, MUST be a new immutable contract with:

- a new checksum-display/lowercase-comparison address, never the V3 address;
- the exact closed non-claim V4 ABI in [architecture section 3.2](V4_ARCHITECTURE.md#32-closed-bounded-read-abi), including scalar market DTOs, keyed results, bounded pages/chunks, stored/effective attempt status, caller-specific cancellation eligibility, exactly four value-receiving categories, and no fee claim/treasury method; the current candidate ABI has 40 methods (`17` writes and `23` views), but its five claim-write names and beneficiaries are architectural intent and its production method count, claim statuses, delivery/reconciliation additions, and transfer sequencing remain conditional on Gate 5;
- one-based protocol identities: valid markets `1..market_count`; one shared market-local attempt sequence beginning at `1`; evidence/challenge/activity IDs beginning at `1`; zero invalid; nullable references encoded only as `null`; and commit-only ID allocation/rollback rules;
- one captured creation `t_create`, stored as `created_at`, with the checked inclusive guard `t_create+min_market_duration <= stake_cutoff_at <= t_create+max_market_duration` and all derived `uint64` checks before value or ID acceptance;
- exact processed-text schema rules: required nonempty evidence URL, optional evidence note as non-null `""`, optional challenge URL as non-null `""`, required nonempty challenge reason, and processed bytes used identically for storage, dedup, and canonical input;
- an immutable `TRUTHMARKET_V4` protocol/config identity and `fee_bps=0`;
- an independently recorded chain ID, source revision, source/config hashes, compiler/toolchain identity, deployment transaction, and verification artifacts;
- environment/config keys explicitly versioned by chain and contract version rather than one ambiguous shared address;
- frontend runtime detection by configured `(chain_id, contract_address, ABI/protocol version)`, with mismatch failure closed.

The interface MUST visibly show `V3` or `V4`, chain, and complete active contract address on market/create/transaction surfaces. Production aliases MUST resolve to exactly one versioned deployment record and MUST NOT combine V3 markets, statistics, claims, or ABI calls with V4.

## 3. Frontend transition strategy

### 3.1 Versioned routes and archive

- V3 becomes a clearly labelled read/exit-capable archive only after V4 acceptance. Direct V3 market links MUST continue to resolve to the V3-aware interface.
- New market creation defaults to V4 only after every production acceptance gate passes; before then V3 remains current.
- V3 unresolved positions MUST show the limitations and direct contract address without implying V4 rules can refund them.
- A market route MUST derive version from a versioned route or registry entry, never guess from a colliding numeric market ID.
- Disabling new V4 creation MUST NOT disable existing V4 evidence (while open), challenge, retry, finalization, cancellation, winnings, stake-refund, or bond-claim exit actions.

### 3.2 Schemas, reads, and transaction truth

V3 and V4 MUST have separate schemas, ABIs, method allowlists, cache keys, post-checks, and phase renderers. V4 views expose independent derived booleans plus display-only `effective_phase`; frontend guards are advisory and writes remain contract-authoritative.

V4 schema conformance MUST reject protocol ID zero, must not split attempt numbering by kind, and must preserve `null` rather than zero for absent attempt references. Market and attempt list pages begin with one-based ID `1`; the participant page still exposes first-stake array order with zero-based `participant_index`. Evidence/challenge DTOs always return non-null processed strings: evidence note and challenge URL may be `""`, while evidence URL and challenge reason are nonempty.

The UI MUST distinguish wallet submission, GenLayer acceptance, transaction finalized-success, transaction failure, contract `PROVISIONALLY_RESOLVED`, contract `FINALIZED`, and `REFUNDABLE`. No transaction acceptance or accepted-state read may be called final settlement.

### 3.3 Activity journal versioning

The browser-local `Activity` journal is distinct from V4's normative on-chain `ActivityRecord` index. The frontend MAY correlate them by transaction and method, but neither may overwrite or masquerade as the other.

The current on-chain `ActivityKind` candidate is `MARKET_CREATED | STAKE_ADDED | EVIDENCE_SUBMITTED | EVIDENCE_CLOSED | ATTEMPT_REQUESTED | ATTEMPT_SUCCEEDED | ATTEMPT_FAILED | ATTEMPT_EXPIRED | CHALLENGE_SUBMITTED | MARKET_FINALIZED | MARKET_CANCELLED | WINNINGS_CLAIMED | STAKE_REFUND_CLAIMED | CREATION_BOND_CLAIMED | CHALLENGE_BOND_CLAIMED | RETRY_BOND_CLAIMED`. The non-claim [architecture write/branch mapping](V4_ARCHITECTURE.md#31-write-methods) is normative without aliases or inferred classifications: one committed activity per successful non-claim public write, none per rejected/reverted non-claim write, retry represented only by the successor `ATTEMPT_REQUESTED`, every `finalize_market` branch represented by `MARKET_FINALIZED`, and `MARKET_CANCELLED` reserved for `cancel_market`. Claim-side activity kinds, observable-completion timing, paid values, and the current 27-branch total remain candidate values conditional on Gate 5's selected payout state machine and MUST be recalculated and independently reviewed before production coding if atomic parent rollback is not proven. Deferred message emission alone is never completed payment. The exact affected ID, previous/new phase, and received/paid values selected after Gate 5 are versioned contract data and MUST NOT be reclassified by frontend migration code.

The non-claim portion of activity capacity and atomic retry expiry materialization remain bounded as specified. Gate 5 MUST select the claim-side activity transitions before the full immutable capacity formula is frozen; the current candidate `4 + max_stake_calls_per_market + max_evidence + 3*A + 2*max_challenges + max_positions`, where `A=max_initial_attempts+max_reresolution_attempts`, is valid only if its one-record completed-claim model is proven. On-chain activity IDs remain one-based commit-only `pre-write activity_count+1`, and every non-null affected ID is the exact one-based evidence, attempt, or challenge ID; zero is invalid.

Every immutable Activity event key and validated record MUST namespace at least:

`truthmarket:<journal_schema_version>:<chain_id>:<contract_address>:<wallet_address>:<transaction_hash>:<event_id>`.

The contract address and wallet use canonical lowercase comparison form. Reads MUST validate every namespace component against the record and route. V3 entries MUST never be rewritten as V4, and a production alias change MUST not change historical record interpretation.

### 3.4 Statistics and leaderboard

V3 and V4 leaderboards/statistics MUST remain separate by chain and contract address. V4 leaderboard values count only observably completed V4 winnings under the Gate 5 payout state machine; emitting a deferred message is not payment. They exclude returned bonds, stake refunds, and V3 history. An optional aggregate view MUST label each source and MUST NOT present it as one on-chain table.

## 4. Deployment and decision stages

Progression is sequential for mandatory **Product Release Readiness** work; a failed mandatory product gate stops its later stages. Complete Gate 2 protocol-forensic proof is separately classified as optional **Forensic Assurance Research** by the [V4 release policy](../experiments/v4-gate2/V4_RELEASE_POLICY.md) and does not stop ordinary product planning or implementation.

### Stage 0 — specification and decision acceptance

- Independent review reports zero P0/P1/P2/P3 specification findings.
- All non-claim semantic decisions and the economic intent, beneficiaries, and amounts of claim paths affecting ABI, payable values, timing, bond accounting, participant indexing, settlement, cancellation, serialization, activity storage, and privileges are accepted in the specification. Gate 5 intentionally retains the exact claim-delivery ABI, storage, status, activity-timing, liability-transition, retry/reconciliation, and asynchronous or two-phase alternatives until that gate selects a model and the resulting specification receives independent review.
- `AI`, `C`, `G`, `AR`, `F`, `fund_unlock_delay`, both attempt caps, maximum invocation and byte-storage caps, participant/page/activity/leaderboard/stake-call caps, and every other execution/storage-dependent hard value MUST be selected and proven during mandatory product feasibility work before the affected production behavior is accepted. Purely economic bond/minimum-stake values MAY remain proposed through that work but MUST be selected and reviewed before test deployment. Gate 2's optional forensic proof is not a substitute for, or prerequisite to, these product measurements.

### Stage 1 — product feasibility and optional forensic research

Use isolated prototypes, benchmarks, minimal experiments, serializer/math harnesses, and tests to resolve the mandatory product questions in [architecture section 9](V4_ARCHITECTURE.md#9-mandatory-genlayer-feasibility-gates): two-step request/execution; product stale-write guards and their local regression/ordering coverage; cancellation over pending execution; malformed-output behavior; deferred outbound EOA/EVM message behavior, exact parent state on child failure, observable completion/failure, deterministic retry or reconciliation, reentrancy, unsolicited/forced inbound value, and exact balance accounting; SHA-256/types plus deterministic `uint64` time conversion/storage; acceptance/finality concurrency; maximum complete invocation and exact chunk-retrievable byte storage; participant/index/full-precision allocation and ranked-leaderboard claim cost; and practical timing/attempt/pagination/statistics/view execution using the selected values. Internal intelligent-contract messages are not a payout substitute because child failure is not automatically refundable. Failure of a mandatory product dependency requires architecture revision.

Gate 2 historical reconstruction, primitive attribution, and natural-overlap proof remain optional Forensic Assurance Research with status `EVIDENCE_CAPABILITY_NOT_PROVED`. Their absence does not bar an implementation branch. The controlled forensic experiment remains `BLOCKED_PENDING_SEPARATE_AUTHORIZATION` and is not part of ordinary product integration.

### Stage 2 — local implementation and schema tests

After the mandatory Stage 1 product dependencies for implementation are resolved, a V4 production-contract implementation branch may begin without complete Gate 2 forensic-evidence capability. Gate 5 MUST first select and independently review an exact payout state machine. If Bradbury reproducibly proves atomic parent rollback when a deferred external message fails, the current single-write claim names, statuses, ABI, activity mapping, and capacity candidate may be retained. Otherwise those claim portions MUST be revised to an asynchronous or two-phase model, with observable failure, deterministic retry or reconciliation, no double payment or lost liability, no claim-order dependence, reentrancy safety, and exact conservation. Then compile the future contract; run exact transition/accounting/property tests; use complete invocation-envelope/digest golden and self-contained superseded-literal negative vectors; implement the closed non-claim DTO ABI, one-based commit-only IDs and shared attempt sequence, exact single-`t_create` inclusive duration guard, processed evidence/challenge emptiness rules, first-stake participant index, precomputed allocations, stored statistics, per-user claimable aggregates, ranked leaderboard, and the Gate 5-selected claim ABI/activity model using all selected and gate-proven hard values. Select and review remaining economic values; verify four and only four value-receiving categories and no owner, fee, treasury, or sweep ABI. Schema tests MUST prove zero-ID rejection, ID rollback, exact creation boundaries, the four-field empty-after-trim matrix, the effective-status five-row truth table, atomic retry, all three finalization results, and every selected activity branch. No chain transaction occurs here.

### Stage 3 — isolated test deployment

Test deployment remains blocked until implementation is complete, selected parameters are benchmarked, all tests pass, and an independent review reports zero P0/P1/P2/P3 findings. Then deploy a new V4 address in an isolated test environment using public, recorded configuration. Deployment proof MUST require the actual returned transaction state `FINALIZED` and execution result `FINISHED_WITH_RETURN`; `ACCEPTED`, `AGREE`, or a submission hash alone is insufficient. Obtain the deployed address only from a supported typed runtime field or derivation, retrieve code and schema from Bradbury chain ID `4221`, and verify exact local source identity plus config/ABI/address identity. It MUST NOT replace the production V3 alias.

### Stage 4 — V4 smoke market

Create a minimal bounded market; verify exact payable values, stored immutable timestamps/config, evidence freeze, request/execution receipt stages, provisional state, and every view. A smoke result is not lifecycle acceptance.

### Stage 5 — complete unchallenged lifecycle

Verify create, first-stake participant indexing, multi-user/multi-side stake reconciliation, evidence, complete invocation digest, first initial request/execution, full challenge window without challenge, precomputed allocation finalization, exact rounded payouts, claims without participant rescans or refresh, creation/retry-bond claims where applicable, empty finalization, and leaderboard paid values.

### Stage 6 — complete challenged lifecycle

Verify challenge at boundaries, full window, complete challenge canonical input, first re-resolution and bonded retry variants, objective challenge-bond outcomes, cooldown, finalization, all stake/bond claims, and stale-attempt rejection.

### Stage 7 — failed-resolution/refund lifecycle

Verify malformed/failing/expired/pending intelligent transactions, stored/effective status boundaries, all cancellation reasons and precedence, hard backstop despite stale execution, zero winner, no resolution, challenged-no-reresolution, `EMPTY_CREATOR_CANCEL` versus `EMPTY_FINALIZATION`, principal refunds, and every independent bond claim.

### Stage 8 — independent audit and production candidate

Independent review MUST report zero P0/P1/P2/P3 findings. Maximum complete-invocation/chunk storage, participant allocation, full-precision arithmetic, ranked-leaderboard claim update, closed DTO/page reads, pagination, statistics updates, `uint64` time conversion, direct-value accounting, and activity-cap benchmark evidence plus exact conservation results MUST be attached. Re-run the complete [deployment acceptance criteria](V4_TEST_PLAN.md#12-deployment-acceptance-criteria) against the exact candidate source/config.

### Stage 9 — production alias update

Publish V4 address/ABI/source/config hashes first, then update only the versioned frontend routing/config alias. Enable V4 creation only after health checks and lifecycle evidence. Preserve direct V3 routes and warnings.

## 5. Rollback and deployment disable

An immutable deployed contract cannot be deleted, rolled back, patched in place, or made harmless by hiding it. “Rollback” means frontend/config/routing operations only:

1. disable **new V4 creation** in the frontend/registry while leaving all existing V4 exit-capable actions and direct routes available;
2. restore the prior versioned frontend alias without changing historical Activity or contract labels;
3. publish the affected V4 chain/address, reason, scope, and known state;
4. retain a direct V4 interface for stake/evidence windows and all resolution, challenge, retry, finalization, cancellation, and claim actions permitted by the contract;
5. never route V4 calls through the V3 ABI or suggest the V4 contract was deleted.

Because initial V4 has no guardian/pause/owner, operators cannot freeze on-chain creation or claims. Frontend creation disable is guidance, not an on-chain authorization change. A serious contract defect therefore requires transparent deprecation and a new version, while preserving access to the affected immutable deployment.

## 6. Migration acceptance checklist

- V3 address/ABI/source/config have no change, and V3 state remains on V3.
- V4 has a new address/ABI, zero-fee/no-treasury configuration, and exactly four value-receiving categories.
- Market/evidence/challenge/attempt/activity IDs are one-based and commit-only; attempts share one market-local sequence; zero is invalid; nullable references use null; the participant index remains zero-based.
- Creation uses one captured `t_create`, exact inclusive minimum/maximum cutoff bounds, and checked derived timestamps before value or ID acceptance.
- Evidence URL/challenge reason are nonempty after processing; evidence note/challenge URL are optional non-null strings; processed bytes control dedup and canonical input.
- Every mandatory Product Release Readiness feasibility dependency passed before its affected behavior was accepted; the production contract also passed the complete [release checklist](../experiments/v4-gate2/V4_RELEASE_POLICY.md#mandatory-product-release-gate), implementation, benchmark, test, and independent-review gates before deployment. Complete Gate 2 forensic proof is not asserted or required by this item.
- No automatic balance migration is claimed.
- Direct V3 and V4 routes show version, chain, and full contract address.
- V3 unresolved-position warnings are accurate and do not promise V4 refunds.
- Activity is namespaced by journal version, chain, contract, wallet, transaction, and event.
- The non-claim on-chain activity mapping is unchanged by routing: atomic retry has one successor-request record, all finalization results are `MARKET_FINALIZED`, and only cancellation is `MARKET_CANCELLED`; claim-side kinds, timing, and capacity exactly match the Gate 5-selected model.
- Schemas, statistics, leaderboards, caches, and aliases cannot mix versions.
- V4 becomes default only after the full acceptance criteria; rollback cannot block existing exits.
- Deployed source/config/ABI/address identity is independently reproducible.
- V4 is never described as implemented or deployed before those facts are evidenced.
