# TruthMarket V4 contract architecture

Status: **proposed specification; V4 is not implemented or deployed**. `MUST`, `MUST NOT`, `SHOULD`, and `MAY` are requirements for a future V4 implementation. **Verified V3** statements are supported by the current repository. GenLayer-dependent requirements are blocked by the feasibility gates in section 9.

Companion specifications: [state machine](V4_STATE_MACHINE.md), [economics and safety](V4_ECONOMICS_AND_SAFETY.md), [migration plan](V4_MIGRATION_PLAN.md), and [test plan](V4_TEST_PLAN.md).

## 1. Product scope and trust boundaries

TruthMarket V4 is a GEN-denominated claim-market protocol with `YES`, `NO`, and `INVALID` staking, bounded evidence submission, GenLayer AI-assisted resolution, one bounded challenge round, finalization, proportional integer payouts, and principal refunds when safe resolution cannot complete. It is not an oracle guarantee, URL archive, source authenticator, V3 in-place upgrade, investment guarantee, or proof of an unverified GenLayer capability.

| Layer | Enforced or interpreted behavior | Limitation |
| --- | --- | --- |
| Contract | Bounds, exact payable values, contract time, phases, attempts, canonical-invocation membership/order, bonds, settlement, and claims. | It does not establish that a claim or URL is true. |
| Frontend | Guidance, address/version labels, transaction monitoring, warnings, and display-only derived state. | It MUST NOT override contract authorization or equate transaction acceptance with finality. |
| Validator/AI | Interprets immutable criteria against the exact committed invocation envelope and returns a bounded object. | Its accepted result is provisional until market finalization. |
| External URL | A user-supplied, bounded identifier. | V4 does not fetch, archive, authenticate, or content-verify it. |

**Verified V3:** `contracts/truth_market.py` supplies URL strings, notes, and timestamps to `gl.nondet.exec_prompt`; it does not fetch or authenticate page content. The V4 baseline likewise supplies stored metadata only. Adding retrieved content requires a separately reviewed serializer version and verified retrieval mechanism.

GenLayer transaction **acceptance**, GenLayer transaction **finality**, `PROVISIONALLY_RESOLVED`, and `FINALIZED` are distinct. The first two concern a write transaction; the latter two are contract business states. A frontend MUST report them separately.

## 2. Types and contract entities

The closed ABI aliases are `MarketId=uint256`, `EvidenceId=uint32`, `ChallengeId=uint32`, `AttemptNo=uint32`, `ActivityId=uint32`, `Offset=uint32`, `PageLimit=uint16`, and `Timestamp=uint64`. Every protocol record ID is one-based: zero is invalid and never identifies a market, attempt, evidence record, challenge, or activity record. Nullable references use `null`, never numeric zero. The participant array remains zero-based; only `participant_index_plus_one[address]=zero_based_index+1` uses zero as an absence sentinel. GEN amounts are unsigned `uint256` wei, addresses use the platform's exact 20-byte `address` type, and booleans use `bool`. Every contract-time read MUST be a nonnegative value that converts exactly to `Timestamp`; conversion, addition, and subtraction MUST reject on overflow, underflow, or any value above `MAX_UINT64`. Gate 6 MUST prove deterministic `uint64` storage and gate 10 MUST prove contract-time conversion/arithmetic. Failure requires architecture revision before production-contract coding. Strings are processed by section 6. The enums below are closed except where a bullet explicitly marks a Gate 5 candidate:

- `Outcome = YES | NO | INVALID`.
- `MarketPhase = OPEN | EVIDENCE_CLOSED | RESOLUTION_REQUESTED | PROVISIONALLY_RESOLVED | RERESOLUTION_REQUESTED | FINALIZED | REFUNDABLE | CANCELLED`.
- `AttemptKind = INITIAL | RERESOLUTION`; `AttemptStatus = REQUESTED | SUCCEEDED | FAILED | EXPIRED`.
- `Confidence = LOW | MEDIUM | HIGH`; `EvidenceKind = ORDINARY | CHALLENGE`.
- `FailureCode = MALFORMED_JSON | INVALID_OUTPUT_SCHEMA | OUTPUT_LIMIT_EXCEEDED | INVALID_REFERENCE | INVALID_UNICODE`.
- Candidate `BondStatus = NONE | LOCKED | REFUNDABLE | ADDED_TO_SETTLEMENT | CLAIMED`; the production set is not closed until Gate 5 selects exact delivery, in-flight, failure, retry, reconciliation, completed-payment, and `CLAIMED` transition semantics. Any additional statuses require corresponding ABI, activity, accounting, and test revisions plus independent review.
- `SettlementMode = NONE | WINNERS | REFUNDS | EMPTY_CANCEL`.
- `TerminalReason = NONE | EMPTY_CREATOR_CANCEL | EMPTY_FINALIZATION | INITIAL_REQUEST_DEADLINE_MISSED | INITIAL_ATTEMPTS_EXHAUSTED | RERESOLUTION_REQUEST_DEADLINE_MISSED | RERESOLUTION_ATTEMPTS_EXHAUSTED | HARD_BACKSTOP`.
- Candidate `ActivityKind = MARKET_CREATED | STAKE_ADDED | EVIDENCE_SUBMITTED | EVIDENCE_CLOSED | ATTEMPT_REQUESTED | ATTEMPT_SUCCEEDED | ATTEMPT_FAILED | ATTEMPT_EXPIRED | CHALLENGE_SUBMITTED | MARKET_FINALIZED | MARKET_CANCELLED | WINNINGS_CLAIMED | STAKE_REFUND_CLAIMED | CREATION_BOND_CLAIMED | CHALLENGE_BOND_CLAIMED | RETRY_BOND_CLAIMED`; non-claim kinds are closed, while claim kinds may require Gate 5-reviewed amendment.
- `EffectivePhase = FINALIZED | REFUNDABLE | CANCELLED | CANCELLATION_ELIGIBLE | RERESOLUTION_REQUESTED | CHALLENGE_PENDING | CHALLENGE_WINDOW | PROVISIONALLY_RESOLVED | RESOLUTION_REQUESTED | EVIDENCE_CLOSED | OPEN`.

All arrays and counters MUST be bounded. “Input” below means canonical validator input.

### 2.1 `Market`

| Field | Type | Meaning | Mutability/lifecycle | Bound | Input |
| --- | --- | --- | --- | --- | --- |
| `market_id` | `uint256` | Globally consecutive one-based identity. | Set once at creation to the pre-write `market_count+1`; never reused. | `1..market_count` after commit; checked. | Yes |
| `creator` | `address` | Author and creation-bond beneficiary. | Immutable. | One address. | No |
| `title` | `string` | Market claim title. | Trimmed once; immutable. | `max_title_bytes`. | Yes |
| `description` | `string` | Market claim scope. | Trimmed once; immutable. | `max_description_bytes`. | Yes |
| `yes_criteria` | `string` | Immutable YES rule. | Trimmed once; immutable. | `max_criteria_bytes`. | Yes |
| `no_criteria` | `string` | Immutable NO rule. | Trimmed once; immutable. | `max_criteria_bytes`. | Yes |
| `invalid_criteria` | `string` | Immutable INVALID rule. | Trimmed once; immutable. | `max_criteria_bytes`. | Yes |
| `created_at` | `Timestamp` | Creation time. | Immutable. | `0..MAX_UINT64`. | Yes |
| `stake_cutoff_at` | `Timestamp` | Exclusive stake end. | Captured at creation; immutable. | Config duration bounds. | Yes |
| `evidence_cutoff_at` | `Timestamp` | Exclusive evidence end. | Captured at creation; immutable. | Equal to stake cutoff in baseline. | Yes |
| `fund_unlock_at` | `Timestamp` | First hard-backstop instant. | Captured at creation; MUST NOT extend. | Construction invariant below. | Yes |
| `initial_request_deadline_at` | `Timestamp` | Inclusive initial request/retry deadline. | Derived and stored at creation; immutable. | `< fund_unlock_at`. | Yes |
| `phase` | `MarketPhase` | Stored authorization state. | Only table transitions. | Closed enum. | No |
| `evidence_closed_at` | `Timestamp?` | Actual close time. | Null, then set once. | `>= evidence_cutoff_at`. | Yes |
| `accepted_attempt_no` | `uint32?` | Initial success, replaced only by successful re-resolution. | Monotonic selection. | Existing succeeded attempt. | Through explicit prior result |
| `final_attempt_no` | `uint32?` | Attempt used by terminal resolution settlement, including empty/refund modes. | Set exactly once by `finalize_market`. | One succeeded accepted attempt. | No |
| `latest_initial_attempt_no` | `uint32?` | Latest initial attempt. | Updated only when an initial attempt is appended. | Existing initial attempt/null. | No |
| `latest_reresolution_attempt_no` | `uint32?` | Latest re-resolution attempt. | Updated only when a re-resolution is appended. | Existing re-resolution/null. | No |
| `initial_attempt_count` | `uint32` | Initial attempts created. | Increment exactly once per initial request. | `max_initial_attempts`. | No |
| `reresolution_attempt_count` | `uint32` | Re-resolution attempts created. | Increment exactly once per re-resolution request. | `max_reresolution_attempts`. | No |
| `challenge_window_start_at` | `Timestamp?` | Inclusive challenge start. | Set once on initial success. | One timestamp/null. | Yes for re-resolution |
| `challenge_window_end_at` | `Timestamp?` | Exclusive challenge end. | Set once to start plus `C`. | Exact `C`. | Yes for re-resolution |
| `reresolution_due_at` | `Timestamp?` | Inclusive request/retry deadline. | Set once on first valid challenge to `window_end + G`. | `< fund_unlock_at`. | Yes for re-resolution |
| `finalizable_at` | `Timestamp?` | Earliest finalization. | Initial success: window end; re-resolution success: completion plus `F`. | Successful paths make it `< U`. | Yes for re-resolution |
| `terminal_at` | `Timestamp?` | Terminal transition time. | Null, then set once. | One timestamp. | No |
| `terminal_reason` | `TerminalReason` | Exact terminal cause. | Starts `NONE`; written exactly once at terminalization. `finalize_market` sets `EMPTY_FINALIZATION` only for `T=0`, otherwise `NONE`; `cancel_market` cannot set `NONE` or `EMPTY_FINALIZATION`. | Closed enum. | No |
| `yes_pool` | `uint256` | Aggregate YES stake. | Increases before stake cutoff only. | Exact reconciliation/overflow checks. | No |
| `no_pool` | `uint256` | Aggregate NO stake. | Increases before stake cutoff only. | Exact reconciliation/overflow checks. | No |
| `invalid_pool` | `uint256` | Aggregate INVALID stake. | Increases before stake cutoff only. | Exact reconciliation/overflow checks. | No |
| `total_pool` | `uint256` | Exact outcome-pool sum. | Increases before stake cutoff only. | Exact reconciliation/overflow checks. | No |
| `participant_addresses` | `address[]` | Complete market-local participant index in first-successful-stake order. | Append once per newly funded address; never remove/reorder. | `max_positions`. | No |
| `participant_count` | `uint32` | Exact `len(participant_addresses)`. | Increment with the same first-stake append. | `max_positions`. | No |
| `participant_index_plus_one` | `mapping(address=>uint32)` | Zero means absent; registered address at zero-based index `i` stores `i+1`. | Set once on first successful positive stake. | Consistent with array/count. | No |
| `positions` | `mapping(address=>Position)` | Exact funded position/allocation/claim record by participant. | Created on first stake; contribution fields increase before cutoff; settlement/claim fields follow terminal rules. | One per indexed participant. | No |
| `stake_call_count` | `uint32` | Successful stake writes. | Increment once per successful stake. | `max_stake_calls_per_market`. | No |
| `evidence_count` | `uint32` | Accepted ordinary evidence count. | Increment in evidence window only. | `max_evidence`. | Through complete array, not counter |
| `evidence_records` | `Evidence[]` | Complete ordinary evidence in ascending ID order. | Append-only before cutoff. | `max_evidence`. | Yes |
| `evidence_digest_seen` | `mapping(bytes32=>bool)` | Exact ordinary dedup membership. | False to true with accepted evidence. | One per evidence. | No |
| `challenge_count` | `uint32` | Accepted challenge count. | Increment in challenge window only. | `max_challenges`. | Through complete array, not counter |
| `challenge_records` | `Challenge[]` | Complete challenges in ascending ID order. | Append-only during challenge window. | `max_challenges`. | Yes for re-resolution |
| `challenge_digest_seen` | `mapping(bytes32=>bool)` | Exact challenge dedup membership. | False to true with accepted challenge. | One per challenge. | No |
| `resolution_attempts` | `ResolutionAttempt[]` | Every attempt in ascending global market-local attempt number. | Append-only. Historical records never delete/reorder. | Combined attempt caps. | Selected attempt and prior result |
| `activity_count` | `uint32` | Consecutive market-local activity records. | Increment once for every successful non-claim market write; claim-side increments follow the Gate 5-selected activity model. | `max_activity_records_per_market`. | No |
| `activity_records` | `ActivityRecord[]` | Append-only queryable audit history. | Every successful non-claim public write appends exactly one record under the closed non-claim mapping. Claim-side activity is created only at the Gate 5-selected observable economic-completion point; deferred external-message emission is not payment completion and does not authorize a completed-claim activity. Never delete/reorder. | Gate 5-recomputed exact activity cap. | No |
| `config` | `MarketConfig` | Complete per-market snapshot. | Immutable at creation. | Field bounds below. | Selected fields below |
| `creation_bond` | `CreationBond` | Creator's independent liability. | Status rules below. | Exact configured amount. | No |
| `settlement` | `Settlement` | Exact settlement and claim totals. | Created as `mode=NONE`; terminalization writes one terminal mode and later claims update only paid totals. | One record. | No |
| `funds_received_wei` | `uint256` | Successful stake and bond value received for this market. | Increases exactly with one of the four value-receiving writes. | Checked sum. | No |
| `funds_paid_wei` | `uint256` | Observably completed winnings, principal, and returned-bond payments under the Gate 5-selected payout state machine. | Exact update point is unresolved until Gate 5; never increases merely because a deferred message was emitted. | `<=funds_received_wei`. | No |
| `stake_liability_wei` | `uint256` | Outstanding stake-origin liability. | Moves from unsettled stake to winner/refund assignment without changing amount; decreases on successful stake-origin payment. | `<=total_pool`. | No |
| `locked_bond_liability_wei` | `uint256` | Sum of original amounts of bonds currently `LOCKED`. | Exact per-bond status reconciliation. | `<=funds_received_wei`. | No |
| `refundable_bond_liability_wei` | `uint256` | Sum of original amounts of bonds currently `REFUNDABLE`. | Exact per-bond status reconciliation; decreases after successful return. | `<=funds_received_wei`. | No |
| `settlement_added_bond_liability_wei` | `uint256` | Outstanding, not-yet-paid part of challenge bonds in `ADDED_TO_SETTLEMENT`. | Increases at winner finalization; decreases with winner payments using exact attribution. | `<=funds_received_wei`. | No |
| `refundable_challenge_bonds_by_user_wei` | `mapping(address=>uint256)` | Exact aggregate of this user's challenge bonds currently `REFUNDABLE`. | Increases on each challenge `LOCKED->REFUNDABLE`; decreases only on successful typed claim. | Reconciles per-bond records. | No |
| `refundable_retry_bonds_by_user_wei` | `mapping(address=>uint256)` | Exact aggregate of this user's retry bonds currently `REFUNDABLE`. | Increases on each retry `LOCKED->REFUNDABLE`; decreases only on successful typed claim. | Reconciles per-bond records. | No |

### 2.2 Other records

Every market-local record identifier is `uint32`; market IDs remain `uint256`. Configuration MUST prove that each per-market record count and the sum of both attempt caps fit `uint32`, and incrementing an ID or count cannot overflow. IDs are allocated only if the complete public write commits: rejected, reverted, transaction-level failed, or rolled-back writes consume none. Evidence, challenge, and activity allocation is respectively `evidence_id=pre-write evidence_count+1`, `challenge_id=pre-write challenge_count+1`, and `activity_id=pre-write activity_count+1`. Attempt kinds share one market-local sequence: before any attempt request, `total_attempt_count=initial_attempt_count+reresolution_attempt_count`; the new `attempt_no=total_attempt_count+1` with checked arithmetic, and after commit the kind-count sum equals the highest allocated attempt number. The first attempt of either kind is number `1`; a catchably failed execution changes only the existing record's status. A first-kind attempt has `predecessor_attempt_no=null`; a retry has the exact non-null one-based predecessor. No ID is renumbered, reused, removed, or reordered, and zero is invalid for every protocol record ID.

| `Position` field | Type | Meaning | Mutability/lifecycle | Bound | Input |
| --- | --- | --- | --- | --- | --- |
| `market_id` | `uint256` | Parent market. | Immutable on first successful stake. | Existing market. | No |
| `user` | `address` | Participant identity. | Immutable on first successful stake. | One address. | No |
| `yes_wei` | `uint256` | YES contribution. | Increases on successful YES stake only. | Pool/overflow checks. | No |
| `no_wei` | `uint256` | NO contribution. | Increases on successful NO stake only. | Pool/overflow checks. | No |
| `invalid_wei` | `uint256` | INVALID contribution. | Increases on successful INVALID stake only. | Pool/overflow checks. | No |
| `total_contributed_wei` | `uint256` | Exact three-side sum. | Increases by every successful stake. | Pool/overflow checks. | No |
| `winning_allocation_wei` | `uint256` | Precomputed winner allocation under Option A. | Zero until positive-winner finalization, then written exactly once before claims open. | `<=distributable_wei`. | No |
| `winning_claimed` | `bool` | Winner allocation consumed under the Gate 5-selected payout state machine. | Exact transition/retry timing is unresolved; MUST NOT assume synchronous transfer rollback. | Boolean. | No |
| `winning_paid_wei` | `uint256` | Successfully paid winner amount. | Zero, then exact allocation once. | `<=winning_allocation_wei`. | No |
| `stake_refund_claimed` | `bool` | Principal refund consumed under the Gate 5-selected payout state machine. | Exact transition/retry timing is unresolved; MUST NOT assume synchronous transfer rollback. | Boolean. | No |
| `refunded_stake_wei` | `uint256` | Successfully returned principal. | Zero, then `total_contributed_wei` once. | Exact principal. | No |

| `Evidence` field | Type | Meaning | Mutability/lifecycle | Bound | Input |
| --- | --- | --- | --- | --- | --- |
| `evidence_id` | `uint32` | Consecutive one-based market-local ID. | Set to pre-write `evidence_count+1` only on commit; never reused. | `1..max_evidence`; zero invalid. | Yes |
| `market_id` | `uint256` | Parent market. | Immutable. | Existing market. | Yes |
| `submitter` | `address` | Submitting account. | Immutable. | One address. | Yes |
| `url` | `string` | Required unauthenticated external identifier. | Exact-processed once and immutable. | `1..max_evidence_url_bytes` UTF-8 bytes. | Yes |
| `note` | `string` | Optional submitter metadata represented as a non-null string. | Exact-processed once and immutable; empty is stored as `""`. | `0..max_evidence_note_bytes` UTF-8 bytes. | Yes |
| `submitted_at` | `Timestamp` | Contract acceptance time. | Immutable. | Before evidence cutoff. | Yes |
| `content_digest` | `bytes32` | SHA-256 of the domain-tagged dedup object. | Immutable and unique among ordinary evidence in the market. | 32 bytes. | Yes |

| `ResolutionAttempt` field | Type | Meaning | Mutability/lifecycle | Bound | Input |
| --- | --- | --- | --- | --- | --- |
| `market_id` | `uint256` | Parent market. | Immutable. | Existing market. | Yes |
| `attempt_no` | `uint32` | Consecutive one-based market-local number shared by both attempt kinds. | Set to pre-write `initial_attempt_count+reresolution_attempt_count+1` only on commit; never reused. | `1..(initial_attempt_count+reresolution_attempt_count)`; zero invalid. | Yes |
| `kind` | `AttemptKind` | Initial or re-resolution. | Immutable. | Closed enum. | Yes |
| `stored_status` | `AttemptStatus` | Persisted status. | `REQUESTED` changes once to `SUCCEEDED`, `FAILED`, or `EXPIRED`. Terminalization does not rewrite history. | Closed enum. | No |
| `requester` | `address` | Attempt requester/bond beneficiary. | Immutable. | One address. | No |
| `requested_at` | `Timestamp` | Request time. | Immutable. | Admission window. | Yes |
| `execute_by` | `Timestamp` | Exclusive execution end. | Immutable. | Exact timeout by kind. | Yes |
| `predecessor_attempt_no` | `uint32?` | Null for first kind attempt; latest failed/effectively expired predecessor for retry. | Immutable. | Earlier same-kind attempt. | Yes |
| `canonical_input_version` | `uint16` | Frozen market-input schema version. | Immutable. | Exactly `1`. | Through market input |
| `envelope_version` | `uint16` | Frozen invocation-envelope version. | Immutable. | Exactly `1`. | Yes |
| `serializer_version` | `uint16` | Canonical serializer version. | Immutable. | Exactly `1`. | Through envelope |
| `prompt_template_version` | `uint16` | Fixed AI instruction/call profile version. | Immutable. | Exactly `1`. | Yes |
| `canonical_invocation_bytes` | `bytes` | Exact canonical envelope snapshot constructed by the request method. | Immutable after request; execution and later audit read the same bytes. | `max_canonical_invocation_bytes`; gate 8 MUST benchmark and select the cap. | Complete input |
| `input_digest` | `bytes32` | SHA-256 of complete canonical invocation bytes. | Immutable; recomputed at execution; the digest itself is not serialized into its own preimage. | 32 bytes. | No |
| `ordinary_evidence_ids` | `uint32[]` | Frozen complete ascending ordinary set. | Immutable. | `max_evidence`. | Yes |
| `challenge_ids` | `uint32[]` | Frozen complete ascending challenge set; empty for initial. | Immutable. | `max_challenges`. | Yes |
| `prior_attempt_no` | `uint32?` | Successful challenged initial attempt for re-resolution. | Immutable. | Null initial; non-null re-resolution. | Yes |
| `executor` | `address?` | Successful/catchable-failure executor. | Null, then set once with stored terminal attempt status. | One address. | No |
| `completed_at` | `Timestamp?` | Contract-recorded success/failure time. | Null, then set once. | One timestamp. | Prior result only |
| `verdict` | `Outcome?` | Substantive result. | Set only on `SUCCEEDED`. | Closed enum/null. | Prior result only |
| `confidence` | `Confidence?` | Bounded confidence. | Set only on `SUCCEEDED`. | Closed enum/null. | Prior result only |
| `reasoning` | `string?` | Bounded exact-trimmed reasoning. | Set only on `SUCCEEDED`. | `max_reasoning_bytes`. | Prior result only |
| `accepted_items` | `EvidenceReference[]` | Closed typed references. | Set only on `SUCCEEDED`; immutable. | `max_output_items`. | Prior result only |
| `rejected_items` | `RejectedEvidenceReference[]` | Closed typed references/reasons. | Set only on `SUCCEEDED`; immutable. | `max_output_items`. | Prior result only |
| `risk_flags` | `string[]` | Bounded returned flags. | Set only on `SUCCEEDED`; immutable. | Config byte/count caps. | Prior result only |
| `failure_code` | `FailureCode?` | Catchable malformed-output classification. | Set only on `FAILED`. | Closed enum/null. | No |
| `retry_bond_wei` | `uint256` | Zero for first kind attempt; exact retry bond otherwise. | Immutable. | Configured amount. | No |
| `retry_bond_status` | `BondStatus` | Independent retry-bond state. | `NONE`, or lifecycle in section 7. | Retry subset. | No |
| `retry_bond_paid_wei` | `uint256` | Successfully returned retry bond. | Zero, then exact bond once. | `<=retry_bond_wei`. | No |
| `retry_bond_claimed_at` | `Timestamp?` | Successful bond claim time. | Null, then set once. | One timestamp. | No |

The effective status function is exact:

```text
effective_status(attempt, now) =
    EXPIRED
        if attempt.stored_status == REQUESTED
        and now >= attempt.execute_by
    otherwise attempt.stored_status
```

Therefore stored `REQUESTED` is effectively `REQUESTED` before `execute_by` and effectively `EXPIRED` at or after `execute_by`; stored `SUCCEEDED`, `FAILED`, and `EXPIRED` always remain the same effective status. `expiry_materialized := (stored_status == EXPIRED)`: a time-derived expiry has effective `EXPIRED` with `expiry_materialized=false`, while a stored expiry has effective `EXPIRED` with `expiry_materialized=true`. Effective status is a view result, not stored state. `active_attempt_no` is also derived, not a `Market` storage field: it is the unique latest applicable attempt number when the market is nonterminal and that attempt's `effective_status=REQUESTED`, otherwise null.

| `Challenge` field | Type | Meaning | Mutability/lifecycle | Bound | Input |
| --- | --- | --- | --- | --- | --- |
| `challenge_id` | `uint32` | Consecutive one-based market-local ID. | Set to pre-write `challenge_count+1` only on commit; never reused. | `1..max_challenges`; zero invalid. | Yes |
| `market_id` | `uint256` | Parent market. | Immutable. | Existing market. | Yes |
| `challenged_attempt_no` | `uint32` | Exact successful initial attempt. | Immutable. | Existing initial success. | Yes |
| `challenger` | `address` | Submitter and bond beneficiary. | Immutable. | One address. | Yes |
| `url` | `string` | Optional unauthenticated challenge identifier represented as a non-null string. | Exact-processed once and immutable; empty is stored as `""`. | `0..max_evidence_url_bytes` UTF-8 bytes. | Yes |
| `reason` | `string` | Required challenge rationale. | Exact-processed once and immutable. | `1..max_challenge_reason_bytes` UTF-8 bytes. | Yes |
| `submitted_at` | `Timestamp` | Contract acceptance time. | Immutable. | Full challenge window. | Yes |
| `content_digest` | `bytes32` | Domain-tagged dedup digest. | Immutable and unique among challenges in market. | 32 bytes. | Yes |
| `bond_wei` | `uint256` | Exact received bond. | Immutable. | Configured amount. | No |
| `bond_status` | `BondStatus` | Current independent liability. | The challenge-bond economic lifecycle is closed through `LOCKED`, `REFUNDABLE`, and `ADDED_TO_SETTLEMENT` assignment. The current single-write candidate additionally uses `CLAIMED` only at observable payment completion. Exact delivery, in-flight, failed, retryable, reconciled, completed-payment, and `CLAIMED` transition states remain conditional on Gate 5. If Gate 5 requires additional states, `BondStatus`, ABI, activity mapping, liabilities, aggregates, and tests MUST be revised and independently reviewed before production implementation. `CLAIMED` and `ADDED_TO_SETTLEMENT` remain mutually exclusive, settlement-added bonds are never returned to the challenger, and assignment remains claim-order independent. | Exact beneficiary, original amount, and economic assignment are closed; delivery-status set is Gate 5 conditional. | No |
| `bond_paid_wei` | `uint256` | Amount returned to challenger. | Zero, then exact bond once. | `<=bond_wei`. | No |
| `bond_settlement_paid_wei` | `uint256` | Added amount already consumed by winner transfers. | Increases only from `ADDED_TO_SETTLEMENT`. | `<=bond_wei`. | No |
| `bond_claimed_at` | `Timestamp?` | Successful return time. | Null, then set once. | One timestamp. | No |

`EvidenceReference` is exactly `{kind: EvidenceKind, id: uint32}`. `RejectedEvidenceReference` is exactly `{kind: EvidenceKind, id: uint32, reason: string}`, where `reason` is nonempty after exact trim and at most `max_rejection_reason_bytes`. Both are immutable output records; membership and ordering follow section 6.

| `CreationBond` field | Type | Meaning | Mutability/lifecycle | Bound | Input |
| --- | --- | --- | --- | --- | --- |
| `beneficiary` | `address` | Creator entitled to return. | Immutable at creation. | One address. | No |
| `original_amount_wei` | `uint256` | Exact received amount. | Immutable at creation. | Configured positive amount. | No |
| `status` | `BondStatus` | Current consumed/liability state. | The economic lifecycle is closed through `LOCKED` and `REFUNDABLE` assignment, and creation bonds never use `ADDED_TO_SETTLEMENT`. The current single-write candidate moves to `CLAIMED` only at observable payment completion. Exact delivery, in-flight, failed, retryable, reconciled, or completed-payment statuses and the transition into `CLAIMED` remain conditional on Gate 5; any additional state requires ABI, activity, accounting, and test revision plus independent review before production implementation. `CLAIMED` and `ADDED_TO_SETTLEMENT` remain mutually exclusive in every selected model. | Exact beneficiary and amount are closed; delivery-status set is Gate 5 conditional. | No |
| `amount_paid_wei` | `uint256` | Returned amount. | Zero, then original amount once. | `<=original`. | No |
| `claimed_at` | `Timestamp?` | Gate 5-selected observable completed-payment time. | Current single-write candidate is null, then set once with `CLAIMED`; exact timing follows the Gate 5-selected delivery model. | At most one completed-payment time. | No |

| `Settlement` field | Type | Meaning | Mutability/lifecycle | Bound | Input |
| --- | --- | --- | --- | --- | --- |
| `market_id` | `uint256` | Parent. | Set at market creation and immutable. | Existing market. | No |
| `mode` | `SettlementMode` | Winner, refund, or empty mode. | `NONE` then one terminal mode. | Closed enum. | No |
| `outcome` | `Outcome?` | Winning outcome. | Required only for `WINNERS`. | Closed enum/null. | No |
| `winning_pool_wei` | `uint256` | Frozen `W`. | Set once. | `<=stake_pool_wei`. | No |
| `stake_pool_wei` | `uint256` | Frozen `T`. | Set once. | Exact market total. | No |
| `bond_bonus_wei` | `uint256` | Frozen added challenge bonds `B`. | Set once. | Held challenge bonds. | No |
| `distributable_wei` | `uint256` | Exact assigned winner amount. | Set once; `T+B` only in winner mode. | Held funds. | No |
| `paid_out_wei` | `uint256` | Successful winner transfers. | Increases after claims. | `<=distributable_wei`. | No |
| `refundable_stake_wei` | `uint256` | Assigned principal. | Set once in refund mode. | Exactly `T`. | No |
| `refunded_stake_wei` | `uint256` | Successful principal transfers. | Increases after claims. | `<=refundable`. | No |
| `fee_bps` | `uint16` | Zero-fee invariant if stored. | Immutable zero only. | Exactly `0`. | No |
| `fee_wei` | `uint256` | Zero fee amount if stored. | Immutable zero only. | Exactly `0`. | No |
| `created_at` | `Timestamp?` | Settlement creation time. | Null before terminalization, then set once. | One timestamp/null. | No |
| `claims_open_at` | `Timestamp?` | Claim opening time. | Null before terminalization, then set once equal to `created_at`. | One timestamp/null. | No |

At market creation the one stored `Settlement` is initialized with immutable `market_id`, `mode=NONE`, `outcome=null`, `created_at=null`, `claims_open_at=null`, and every numeric field zero. Terminalization atomically writes only the terminal mode, outcome, settlement amounts, and timestamps; the Gate 5-selected payout state machine determines when later observable payment completion changes applicable paid totals.

| `ActivityRecord` field | Type | Meaning | Mutability/lifecycle | Bound | Input |
| --- | --- | --- | --- | --- | --- |
| `activity_id` | `uint32` | Consecutive one-based market-local ID. | Set to pre-write `activity_count+1` only on commit; never reused. | `1..max_activity_records_per_market`; zero invalid. | No |
| `market_id` | `uint256` | Parent market. | Immutable. | Existing market. | No |
| `kind` | `ActivityKind` | Exact successful non-claim classification determined only by the called public method and the branch table in section 3.1; claim classification is selected by Gate 5. | Immutable. | Non-claim kinds closed; claim portion Gate 5 conditional. | No |
| `caller` | `address` | Write caller. | Immutable. | One address. | No |
| `recorded_at` | `Timestamp` | Committed contract time. | Immutable. | One timestamp. | No |
| `affected_record_id` | `uint32?` | Exact related evidence, attempt, or challenge ID for the activity kinds defined below; otherwise null. | Immutable. | Existing ID/null. | No |
| `previous_phase` | `MarketPhase?` | Phase before the write; null only for `MARKET_CREATED`. | Immutable. | Closed enum/null. | No |
| `new_phase` | `MarketPhase` | Phase after the write. | Immutable. | Closed enum. | No |
| `value_received_wei` | `uint256` | Exact successful value accepted by the write. | Immutable. | Held funds. | No |
| `value_paid_wei` | `uint256` | Exact observably completed payment attributed to this record under the Gate 5-selected model. | Immutable. | Paid funds. | No |

### 2.3 Protocol indexes

| Field | Type | Meaning | Mutability/lifecycle | Bound | Input |
| --- | --- | --- | --- | --- | --- |
| `market_ids` | `uint256[]` | All markets in ascending one-based creation-ID order beginning with `1`. | Append once per successful creation; never remove/reorder. | `max_markets`. | No |
| `market_count` | `uint32` | Exact market array length and highest allocated `MarketId`. | Successful creation allocates `market_id=pre-write market_count+1`, then sets `market_count=market_id`. | `max_markets`; valid IDs exactly `1..market_count`. | No |
| `leaderboard_addresses` | `address[]` | Stored rank order: descending paid winnings, then ascending unsigned 20-byte address. | Append on first paid winner; atomically reposition after every later winning payment. | `max_leaderboard_entries`. | No |
| `leaderboard_count` | `uint32` | Exact leaderboard address-array length. | Increment on first successful winner payment for an address. | `max_leaderboard_entries`. | No |
| `leaderboard_index_plus_one` | `mapping(address=>uint32)` | Zero if absent; otherwise one-based current rank. | Updated atomically for every address moved by ranking maintenance. | Bijection with ranked array. | No |
| `leaderboard_paid_wei` | `mapping(address=>uint256)` | Actual successfully transferred V4 winnings. | Increases only after a winner transfer succeeds. | Checked aggregate paid amount. | No |
| `protocol_open_market_count` | `uint32` | Markets currently `OPEN`. | Increment on creation; decremented on phase exit. | `<=market_count`. | No |
| `protocol_evidence_closed_market_count` | `uint32` | Markets currently `EVIDENCE_CLOSED`. | Mirrors stored phase transitions. | `<=market_count`. | No |
| `protocol_resolution_requested_market_count` | `uint32` | Markets currently `RESOLUTION_REQUESTED`. | Mirrors stored phase transitions. | `<=market_count`. | No |
| `protocol_provisionally_resolved_market_count` | `uint32` | Markets currently `PROVISIONALLY_RESOLVED`. | Mirrors stored phase transitions. | `<=market_count`. | No |
| `protocol_reresolution_requested_market_count` | `uint32` | Markets currently `RERESOLUTION_REQUESTED`. | Mirrors stored phase transitions. | `<=market_count`. | No |
| `protocol_finalized_market_count` | `uint32` | Markets currently `FINALIZED`. | Increases on final winner settlement. | `<=market_count`. | No |
| `protocol_refundable_market_count` | `uint32` | Markets currently `REFUNDABLE`. | Increases on terminal refund settlement. | `<=market_count`. | No |
| `protocol_cancelled_market_count` | `uint32` | Markets currently `CANCELLED`. | Increases on empty terminal settlement. | `<=market_count`. | No |
| `protocol_stake_received_wei` | `uint256` | All successful stake receipts. | Increases with successful `stake` only. | Checked total. | No |
| `protocol_bonds_received_wei` | `uint256` | All successful creation, challenge, and retry bond receipts. | Increases with those three value categories only. | Checked total. | No |
| `protocol_funds_received_wei` | `uint256` | Sum of all market `funds_received_wei`. | Mirrors every successful value receipt. | Checked contract total. | No |
| `protocol_funds_paid_wei` | `uint256` | Sum of all market `funds_paid_wei`. | Mirrors every successful transfer. | `<=protocol_funds_received_wei`. | No |
| `protocol_stake_liability_wei` | `uint256` | Sum of all market stake liabilities. | Mirrors each market liability transition. | Checked contract total. | No |
| `protocol_locked_bond_liability_wei` | `uint256` | Sum of all market locked-bond liabilities. | Mirrors each per-bond transition. | Checked contract total. | No |
| `protocol_refundable_bond_liability_wei` | `uint256` | Sum of all market refundable-bond liabilities. | Mirrors each per-bond transition/claim. | Checked contract total. | No |
| `protocol_settlement_added_bond_liability_wei` | `uint256` | Sum of all outstanding settlement-added challenge-bond liabilities. | Mirrors finalization and winner claims. | Checked contract total. | No |
| `protocol_winnings_paid_wei` | `uint256` | Successful winner transfers only. | Increases after `claim_winnings` transfer success. | `<=protocol_funds_paid_wei`. | No |
| `protocol_principal_refunded_wei` | `uint256` | Successful stake-principal refunds only. | Increases after `claim_refund` transfer success. | `<=protocol_stake_received_wei`. | No |
| `protocol_creation_bonds_returned_wei` | `uint256` | Successful creation-bond returns. | Increases after typed claim success. | `<=protocol_bonds_received_wei`. | No |
| `protocol_challenge_bonds_returned_wei` | `uint256` | Successful challenge-bond returns. | Increases after typed claim success. | `<=protocol_bonds_received_wei`. | No |
| `protocol_retry_bonds_returned_wei` | `uint256` | Successful retry-bond returns. | Increases after typed claim success. | `<=protocol_bonds_received_wei`. | No |
| `protocol_fee_wei` | `uint256` | Protocol fees collected. | Immutable zero. | Exactly `0`. | No |

Every stored phase change MUST decrement exactly one old-phase counter and increment exactly one new-phase counter in the same transaction. Creation increments `market_count` and `protocol_open_market_count`. At every committed state, the eight phase counters sum exactly to `market_count`; none is derived by scanning markets. Receipt and payment aggregates update atomically with their corresponding market accounting. `protocol_funds_received_wei=protocol_stake_received_wei+protocol_bonds_received_wei`, and section 7's exact conservation equation remains authoritative.

The ranked leaderboard is the selected bounded strategy. A successful winning claim first computes the user's new `leaderboard_paid_wei`, then inserts or repositions that user so the stored array is strictly ordered by descending paid amount and ascending unsigned address, updating every moved index-plus-one entry atomically. `rank=index+1` is one-based. `get_leaderboard` never sorts. Gate 9 MUST benchmark the maximum selected leaderboard capacity and worst-case ranking update; production-contract coding is blocked until this critical claim operation fits platform limits with safety margin.

### 2.4 `ProtocolConfig` and `MarketConfig`

`ProtocolConfig` is immutable for the deployment. It contains one deployment value for every individually named `MarketConfig` field below, with the identical type, meaning, and hard bound, plus these protocol-only fields. No field may mutate after deployment. It has no owner, fee recipient, treasury, or mutable production alias. A market copies every `MarketConfig` value so a future address/config cannot affect it.

| `ProtocolConfig`-only field | Type | Meaning | Required bound | Input |
| --- | --- | --- | --- | --- |
| `max_markets` | `uint32` | Maximum markets appendable by this deployment. | Positive gate-selected cap; creation at cap rejects before value. | No |
| `max_page_size` | `uint16` | Maximum records or bytes returned by a paginated view/chunk. | Positive gate-selected immutable cap. | No |
| `max_leaderboard_entries` | `uint32` | Capacity for every possible distinct paid winner. | Exact checked `max_markets*max_positions`, fits `uint32`, and gate-benchmarked. | No |

The complete `ProtocolConfig` schema is therefore the three rows above followed by every row of the `MarketConfig` table in that exact order. `MarketConfig` excludes those three protocol-only fields; views use the immutable deployment values.

Every market stores the following immutable snapshot:

| `MarketConfig` field | Type | Meaning | Required bound/construction | Input |
| --- | --- | --- | --- | --- |
| `protocol_version` | `string` | `TRUTHMARKET_V4` identity. | Exact deployment token; immutable bytes. | Yes |
| `canonical_input_version` | `uint16` | Market-input schema version. | Exactly `1`. | Yes |
| `envelope_version` | `uint16` | AI invocation envelope version. | Exactly `1`. | Yes |
| `serializer_version` | `uint16` | Canonical JSON profile version. | Exactly `1`. | Yes |
| `prompt_template_version` | `uint16` | Fixed instruction/call-profile version. | Exactly `1`. | Yes |
| `chain_id` | `uint256` | Deployment chain identity. | Exact runtime identity. | Yes |
| `contract_address` | `address` | Deployment contract identity. | Exact runtime identity. | Yes |
| `min_stake_wei` | `uint256` | Minimum positive stake call. | Positive proposed deployment constant. | No |
| `creation_bond_wei` | `uint256` | Exact market-creation bond. | Positive proposed deployment constant. | No |
| `challenge_bond_wei` | `uint256` | Exact challenge bond. | Positive proposed deployment constant. | No |
| `retry_bond_wei` | `uint256` | Exact retry bond. | Positive proposed deployment constant. | No |
| `fee_bps` | `uint16` | Fee rate. | MUST equal `0`. | No |
| `min_market_duration` | `uint64` | Minimum user deadline offset. | Positive and `<=max_market_duration`. | Yes |
| `max_market_duration` | `uint64` | Maximum user deadline offset. | Positive and `>=min_market_duration`. | Yes |
| `initial_attempt_timeout` (`AI`) | `uint64` | Initial execution duration. | Positive. | Yes |
| `challenge_window_duration` (`C`) | `uint64` | Full challenge interval. | Positive. | Yes |
| `reresolution_request_grace` (`G`) | `uint64` | Request interval after challenge close. | Positive. | Yes |
| `reresolution_attempt_timeout` (`AR`) | `uint64` | Re-resolution execution duration. | Positive. | Yes |
| `finalization_cooldown` (`F`) | `uint64` | Re-resolution cooldown. | Positive. | Yes |
| `fund_unlock_delay` | `uint64` | Delay from stake/evidence cutoff to `U`. | Positive and `>=AI+C+G+AR+F`; overflow safe. | Yes |
| `max_initial_attempts` | `uint32` | Initial attempt cap. | Positive. | Yes |
| `max_reresolution_attempts` | `uint32` | Re-resolution attempt cap. | Positive; sum with initial cap `<=4_294_967_295`. | Yes |
| `max_title_bytes` | `uint32` | Title UTF-8 cap. | Positive hard limit. | Yes |
| `max_description_bytes` | `uint32` | Description UTF-8 cap. | Positive hard limit. | Yes |
| `max_criteria_bytes` | `uint32` | Per-criterion UTF-8 cap. | Positive hard limit. | Yes |
| `max_evidence_url_bytes` | `uint32` | Evidence/challenge URL cap. | Positive hard limit. | Yes |
| `max_evidence_note_bytes` | `uint32` | Ordinary note cap. | Positive hard limit. | Yes |
| `max_challenge_reason_bytes` | `uint32` | Challenge reason cap. | Positive hard limit. | Yes |
| `max_reasoning_bytes` | `uint32` | AI reasoning cap. | Positive hard limit. | Yes |
| `max_rejection_reason_bytes` | `uint32` | Rejection reason cap. | Positive hard limit. | Yes |
| `max_risk_flag_bytes` | `uint32` | Per-risk-flag cap. | Positive hard limit. | Yes |
| `max_evidence` | `uint32` | Ordinary evidence cap. | Positive hard limit. | Yes |
| `max_challenges` | `uint32` | Challenge cap. | Positive hard limit. | Yes |
| `max_risk_flags` | `uint32` | Risk-flag count cap. | Positive hard limit. | Yes |
| `max_output_items` | `uint32` | Accepted plus rejected reference cap. | Positive hard limit. | Yes |
| `max_canonical_invocation_bytes` | `uint32` | Stored complete invocation snapshot cap and chunk-view total-length cap. | Positive measured hard cap selected in gate 8. | No |
| `max_positions` | `uint32` | Unique funded-address cap. | Positive hard measured cap; production coding blocked until gate-proven. | No |
| `max_stake_calls_per_market` | `uint32` | Successful stake-write cap used to bound activity. | Positive and at least `max_positions`. | No |
| `max_activity_records_per_market` | `uint32` | Exact append-only activity capacity. | At least the Gate 5-selected lifecycle formula; overflow safe. | No |

Every contract-time value and calculated timestamp MUST fit `Timestamp`; all additions and `AI + C + G + AR + F` MUST use checked arithmetic against `MAX_UINT64`. Construction MUST require positive `max_markets`, `max_page_size`, `max_canonical_invocation_bytes`, `max_positions`, and every count/cap marked positive. It MUST require `max_initial_attempts>0`, `max_reresolution_attempts>0`, `max_initial_attempts+max_reresolution_attempts<=4_294_967_295`, and `max_leaderboard_entries=max_markets*max_positions<=4_294_967_295` using checked multiplication. It MUST require `min_market_duration>0` and `max_market_duration>=min_market_duration`, both as exact `uint64` values. Initial V4 sets `evidence_cutoff_at=stake_cutoff_at` and `fund_unlock_at=stake_cutoff_at+fund_unlock_delay` at creation. Creation captures one `t_create` and MUST reject unless `t_create+min_market_duration <= stake_cutoff_at <= t_create+max_market_duration`, every term and derived timestamp converts exactly to `uint64`, `initial_request_deadline_at >= evidence_cutoff_at`, and enough configured lifetime exists for all terms. All additions are checked before comparison; no configuration or market value may later change.

Let `A=max_initial_attempts+max_reresolution_attempts`. The non-claim activity sources are independently bounded, and an effective expiry materialized inside `retry_resolution` creates no extra record: that call consumes only the successor's `ATTEMPT_REQUESTED` record. The current single-write claim candidate uses the checked construction `max_activity_records_per_market >= 4 + max_stake_calls_per_market + max_evidence + 3*A + 2*max_challenges + max_positions`; its claim terms cover one creation-bond record, up to `A` retry-bond records, every challenge-bond record, and one position claim per participant. That complete formula is normative only if Gate 5 proves one completed-claim record and atomic parent rollback. Otherwise Gate 5 MUST define the request/completion/failure/retry-or-reconciliation branches and the capacity MUST be recomputed so no valid exit can exhaust it. A stake at `max_stake_calls_per_market` still rejects before value and mutation; critical resolution, terminalization, and Gate 5-selected payout/reconciliation actions MUST NOT fail for activity capacity.

## 3. Proposed public interface

Exactly four method categories receive value: market creation bond, stake, challenge bond, and retry bond. Every other method requires zero attached value. EOA/EVM payouts are deferred external messages through the ghost/EVM layer, not proven synchronous calls. Gate 5 MUST select the exact claim state machine, accounting/activity timing, failure observation, retry or reconciliation rule, and reentrancy boundary before any production claim code is written. No row below may be implemented on an assumption of same-write transfer rollback.

### 3.1 Write methods

| Method | Permissions, state, time, value | Mutations and record | Idempotency, rejection, recovery |
| --- | --- | --- | --- |
| `create_market(title, description, yes_criteria, no_criteria, invalid_criteria, stake_cutoff_at) payable -> market_id` | Anyone; exact creation bond; processed strings nonempty/in bounds. Capture `t_create` once at entry and require checked `t_create+min_market_duration <= stake_cutoff_at <= t_create+max_market_duration`; `t_create` and every derived timestamp fit `uint64`; timing/config/activity construction valid; market count below cap. | After all guards pass, allocates `market_id=pre-write market_count+1`, stores `created_at=t_create`, immutable market/config/bond, empty indexes, zero pools/counters, `OPEN`, `terminal_reason=NONE`, initializes the exact `Settlement` defaults from section 2.2, updates `market_count=market_id` and protocol receipt/phase/statistics aggregates, then appends `MARKET_CREATED`. | Never idempotent; wrong value/text/time/conversion/overflow/cap rejects without funds, state, counter, market ID, or activity-ID consumption. `market_id=0` is never allocated. |
| `stake(market_id, side) payable` | Anyone; `OPEN`; `now < stake_cutoff_at`; side closed enum; value `>= min_stake_wei`; stake-call cap; participant cap only if index is absent. | Before accepting value, determines whether `participant_index_plus_one[caller]=0`. A new participant is appended once, mapped to `index+1`, and counted atomically with creation/update of the `Position`; existing participants are never re-appended. Then adds value to the exact position side/pools and appends `STAKE_ADDED`. | Each successful call accumulates. A first stake beyond `max_positions`, any stake beyond call cap, zero/late/terminal/overflow failure rejects before value, position, index, pool, count, or activity mutation. |
| `submit_evidence(market_id, url, note) -> evidence_id` | Anyone; `OPEN`; `now < evidence_cutoff_at`; zero value. Process both strings under section 6.1; require URL length `1..max_evidence_url_bytes` and note length `0..max_evidence_note_bytes`; count below cap; processed-content digest unseen. | Appends `evidence_id=pre-write evidence_count+1`, the immutable processed URL/note record, and `EVIDENCE_SUBMITTED`. | Empty-after-trim URL, oversize/invalid text, exact processed duplicate, or cap rejects without ID; empty-after-trim note is stored as `""`. No null, truncation, or recovery mutation. |
| `close_evidence(market_id)` | Anyone; `OPEN`; `evidence_cutoff_at <= now < U`; zero value. | Sets phase and close time, then appends activity kind `EVIDENCE_CLOSED`. | Once only; duplicate/early/at-or-after-backstop/terminal rejects. |
| `request_resolution(market_id) -> attempt_no` | Anyone; zero value; `EVIDENCE_CLOSED`; **no `INITIAL` attempt has ever existed** (`initial_attempt_count=0` and latest null); derived active attempt is null; `now <= initial_request_deadline_at`. | Computes `attempt_no=initial_attempt_count+reresolution_attempt_count+1`; for the first market attempt this is `1`. Freezes complete invocation; appends `INITIAL` with `predecessor=null`, `stored_status=REQUESTED`, zero/`NONE` retry bond, increments count/latest, sets `RESOLUTION_REQUESTED`, and appends `ATTEMPT_REQUESTED` for that one-based attempt. | After any initial record, including failed/expired, MUST reject; successors use `retry_resolution`. Any rejection consumes no attempt number. |
| `retry_resolution(market_id, predecessor_attempt_no) payable -> attempt_no` | Anyone; exact retry bond; nonzero predecessor exists, is latest of the applicable kind, and has `stored_status=FAILED` or `effective_status=EXPIRED`; derived active attempt is null; kind cap not reached. Initial retry requires no initial success, phase `EVIDENCE_CLOSED` after materialized failure/expiry or `RESOLUTION_REQUESTED` only for the effectively expired predecessor being atomically materialized, and `now <= initial_request_deadline_at`. Re-resolution retry requires challenges, no re-resolution success, phase `PROVISIONALLY_RESOLVED` after materialized failure/expiry or `RERESOLUTION_REQUESTED` only for the effectively expired predecessor being atomically materialized, `now >= challenge_window_end_at`, `now <= reresolution_due_at`, and `now + AR + F <= U`. | Atomically materializes predecessor `stored_status=EXPIRED` if time-derived, computes the shared-sequence `attempt_no=initial_attempt_count+reresolution_attempt_count+1`, appends it with `stored_status=REQUESTED`, the exact predecessor and complete invocation digest, creates independent `LOCKED` bond, increments kind count/latest, changes phase, and appends only `ATTEMPT_REQUESTED` for the new successor. | Zero/wrong predecessor, wrong amount/phase, effective `REQUESTED`, stored/effective `SUCCEEDED`, stale/wrong-kind predecessor, derived active attempt, cap, overflow, or admission deadline rejects without number or value consumption. No caller exclusivity. The compound materialization never appends `ATTEMPT_EXPIRED`. |
| `execute_resolution(market_id, attempt_no)` | Anyone, subject to feasibility gate; exact attempt has `effective_status=REQUESTED` and equals derived active number; zero value. Initial: `now < execute_by` and `now+C+G+AR+F <= U`. Re-resolution: `now < execute_by` and `now+F <= U`. Always `now < U`. | Reconstructs the complete envelope and recomputes its SHA-256. On well-formed substantive output, sets `stored_status=SUCCEEDED` and appends `ATTEMPT_SUCCEEDED`; initial sets provisional/window/finalizable; re-resolution replaces accepted result and sets cooldown. Catchable malformed output sets `stored_status=FAILED`, failure code, and appends `ATTEMPT_FAILED`. Successful retry bond immediately becomes `REFUNDABLE`. Derived active becomes null from status. | Stale/superseded/terminal/digest mismatch/late rejects. Transaction-level rollback may leave stored `REQUESTED` and appends no activity; expiry/retry/cancel recovers. Feasibility not assumed. |
| `expire_attempt(market_id, attempt_no)` | Anyone; zero value; exact latest `stored_status=REQUESTED`; `effective_status=EXPIRED`; phase is `RESOLUTION_REQUESTED` for `INITIAL` or `RERESOLUTION_REQUESTED` for `RERESOLUTION`; market nonterminal and `now < U`. | Sets `stored_status=EXPIRED`; restores `EVIDENCE_CLOSED` for `INITIAL` or `PROVISIONALLY_RESOLVED` for `RERESOLUTION`; appends `ATTEMPT_EXPIRED` for that attempt. Retry bond remains `LOCKED`; historical status is not otherwise rewritten. | Early/wrong-phase/stale/already materialized/terminal rejects; hard backstop uses cancel instead. |
| `challenge_resolution(market_id, initial_attempt_no, url, reason) payable -> challenge_id` | Anyone; exact challenge bond; stored `PROVISIONALLY_RESOLVED`; accepted attempt is the specified successful one-based `INITIAL`; `challenge_window_start_at <= now < challenge_window_end_at`; process strings under section 6.1; require URL length `0..max_evidence_url_bytes`, reason length `1..max_challenge_reason_bytes`, and cap/dedup pass. | Appends `challenge_id=pre-write challenge_count+1`, immutable processed challenge with `LOCKED` bond, and `CHALLENGE_SUBMITTED`. An empty-after-trim URL is stored as `""`; first challenge fixes `reresolution_due_at=challenge_window_end_at+G`. Initial result can never finalize thereafter. | Empty-after-trim reason, oversize/invalid text, exact processed duplicate, exact-end/late, wrong value/result, or cap rejects without ID. No null, truncation, or withdrawal. |
| `request_reresolution(market_id) -> attempt_no` | Anyone; zero value; phase `PROVISIONALLY_RESOLVED`; at least one challenge; **no `RERESOLUTION` attempt has ever existed** (`reresolution_attempt_count=0` and latest null); derived active attempt is null; `now >= challenge_window_end_at`; `now <= reresolution_due_at`; `now+AR+F <=U`. | Computes the next shared-sequence `attempt_no=initial_attempt_count+reresolution_attempt_count+1`; thus an initial attempt followed by the first re-resolution uses consecutive numbers. Freezes the complete re-resolution invocation; appends it with `stored_status=REQUESTED` and zero/`NONE` retry bond; increments count/latest, changes phase, and appends `ATTEMPT_REQUESTED`. | After any re-resolution record, including failed/expired, MUST reject; wrong phase and every other failed guard reject without consuming a number; successors use bonded retry. |
| `finalize_market(market_id)` | Anyone; zero value; successful accepted attempt; `now >= finalizable_at` and `now < U`; derived active attempt null. If challenges exist, accepted attempt MUST be successful `RERESOLUTION`. | Applies exact precedence: `T=0` gives `CANCELLED/EMPTY_CANCEL/EMPTY_FINALIZATION` and all settlement amounts/outcome zero/null; else `W=0` gives `REFUNDABLE/REFUNDS/NONE` with principal `T`; else scans the complete participant index, precomputes every allocation with full-precision arithmetic, requires their sum `T+B`, then commits `FINALIZED/WINNERS/NONE` and opens claims. Sets final attempt in all three resolution-terminal modes, makes creation/all locked retry bonds refundable, handles challenge bonds, and always appends `MARKET_FINALIZED`. | Any allocation error, scan/overflow failure, challenge pending, requested re-resolution, early, stale initial, or terminal rejects atomically. Production-contract coding is blocked until the maximum scan and arithmetic pass feasibility prototypes. `MARKET_FINALIZED` classifies the action even when the resulting phase is `CANCELLED` or `REFUNDABLE`. |
| `cancel_market(market_id, reason)` | Anyone except creator-only empty reason; zero value; exact predicate/precedence in section 5. | Nonempty: `REFUNDABLE/REFUNDS`, principal liability, all locked bonds refundable. Empty: `CANCELLED/EMPTY_CANCEL`. Sets one terminal reason/time and appends `MARKET_CANCELLED`, which no other method may produce. | Caller-supplied reason MUST equal highest-precedence true predicate. Terminal markets reject; stale execution cannot revive them. |
| `claim_winnings(market_id) -> amount` | Beneficiary position owner; `FINALIZED/WINNERS`; `now>=claims_open_at`; stored `winning_allocation_wei>0`; not claimed; zero value. | Economic intent: pay only the caller's precomputed allocation without a participant rescan and credit the ranked leaderboard only for an observably completed payment. Exact state, activity, liability, leaderboard, message, and reconciliation sequencing is selected by Gate 5. | Duplicate/zero allocation/wrong mode rejects. External-message failure semantics are unresolved; same-write rollback MUST NOT be assumed. |
| `claim_refund(market_id) -> amount` | Position owner; `REFUNDABLE/REFUNDS`; positive total stake; unclaimed; zero value. | Economic intent: pay exactly contributed stake principal and never a bond. Exact state, activity, liability, message, and reconciliation sequencing is selected by Gate 5. | Duplicate/zero/wrong mode rejects. External-message failure semantics are unresolved; same-write rollback MUST NOT be assumed. |
| `claim_creation_bond(market_id) -> amount` | Exact stored beneficiary; bond status `REFUNDABLE`; terminal `FINALIZED`, `REFUNDABLE`, or `CANCELLED`; zero value. | Economic intent: return the exact creation bond once. Exact claim status, activity, liability, message, and reconciliation sequencing is selected by Gate 5. | `LOCKED`, `ADDED_TO_SETTLEMENT` (impossible for this type), completed claim, or wrong caller rejects. External-message failure semantics remain unresolved. |
| `claim_challenge_bond(market_id, challenge_id) -> amount` | Exact challenger; status `REFUNDABLE`; terminal or nonterminal after changed/`INVALID` successful re-resolution; zero value. | Economic intent: return the exact challenge bond once and reconcile its beneficiary aggregate. Exact claim status, activity, liability, message, and reconciliation sequencing is selected by Gate 5. | `LOCKED`, `ADDED_TO_SETTLEMENT`, completed claim, or wrong ID/caller rejects. External-message failure semantics remain unresolved. |
| `claim_retry_bond(market_id, attempt_no) -> amount` | Exact attempt requester; bonded attempt and status `REFUNDABLE`; terminal or nonterminal after that attempt succeeds; zero value. | Economic intent: return the exact retry bond once and reconcile its beneficiary aggregate. Exact claim status, activity, liability, message, and reconciliation sequencing is selected by Gate 5. | Zero/`NONE`, `LOCKED`, `ADDED_TO_SETTLEMENT` (impossible), completed claim, or wrong caller rejects. External-message failure semantics remain unresolved. |

Every successful non-claim market write MUST append exactly one `ActivityRecord` to the market-local indexed `activity_records` array and increment `activity_count`; rejected or transaction-level reverted non-claim writes append nothing and consume no activity ID. Gate 5 selects the exact claim request/completion/failure/retry-or-reconciliation append rules. Every committed new record uses `activity_id=pre-write activity_count+1`; IDs start at `1`, are consecutive, and array index `i` contains `activity_id=i+1`. Every non-null `affected_record_id` is the exact one-based evidence, attempt, or challenge ID named by its selected activity kind; zero is never an affected record ID. The Gate 5-recomputed activity capacity MUST cover every selected exit and reconciliation action. Event logs MAY mirror these records only after platform support is proven, but logs are not the normative audit store. Critical resolution, terminalization, payout, and reconciliation actions MUST NOT be blocked by activity capacity.

The following table is the exhaustive projection selected before platform feasibility. Non-claim rows are normative. The five claim rows are conditional architectural intent: their activity timing and the current 27-branch total remain valid only if Gate 5 proves atomic parent rollback and the single-write model. Otherwise the ABI, activity projection/count, claim statuses, and tests MUST be amended and independently reviewed before production V4 coding.

| Public write | Successful branch | `ActivityKind` | `affected_record_id` | `previous_phase` | `new_phase` | `value_received_wei` | `value_paid_wei` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `create_market` | only | `MARKET_CREATED` | `null` | `null` | `OPEN` | exact creation bond | `0` |
| `stake` | only | `STAKE_ADDED` | `null` | current phase before call (`OPEN`) | same phase (`OPEN`) | exact accepted stake value | `0` |
| `submit_evidence` | only | `EVIDENCE_SUBMITTED` | new evidence ID | `OPEN` | `OPEN` | `0` | `0` |
| `close_evidence` | only | `EVIDENCE_CLOSED` | `null` | `OPEN` | `EVIDENCE_CLOSED` | `0` | `0` |
| `request_resolution` | first initial request | `ATTEMPT_REQUESTED` | new attempt number | `EVIDENCE_CLOSED` | `RESOLUTION_REQUESTED` | `0` | `0` |
| `retry_resolution` | initial; predecessor already stored `FAILED` or `EXPIRED` | `ATTEMPT_REQUESTED` | new successor attempt number | `EVIDENCE_CLOSED` | `RESOLUTION_REQUESTED` | exact retry bond | `0` |
| `retry_resolution` | initial; atomically materializes time-derived predecessor expiry | `ATTEMPT_REQUESTED` | new successor attempt number | `RESOLUTION_REQUESTED` | `RESOLUTION_REQUESTED` | exact retry bond | `0` |
| `retry_resolution` | re-resolution; predecessor already stored `FAILED` or `EXPIRED` | `ATTEMPT_REQUESTED` | new successor attempt number | `PROVISIONALLY_RESOLVED` | `RERESOLUTION_REQUESTED` | exact retry bond | `0` |
| `retry_resolution` | re-resolution; atomically materializes time-derived predecessor expiry | `ATTEMPT_REQUESTED` | new successor attempt number | `RERESOLUTION_REQUESTED` | `RERESOLUTION_REQUESTED` | exact retry bond | `0` |
| `execute_resolution` | substantive initial success | `ATTEMPT_SUCCEEDED` | executed attempt number | `RESOLUTION_REQUESTED` | `PROVISIONALLY_RESOLVED` | `0` | `0` |
| `execute_resolution` | substantive re-resolution success | `ATTEMPT_SUCCEEDED` | executed attempt number | `RERESOLUTION_REQUESTED` | `PROVISIONALLY_RESOLVED` | `0` | `0` |
| `execute_resolution` | catchably malformed initial result | `ATTEMPT_FAILED` | executed attempt number | `RESOLUTION_REQUESTED` | `EVIDENCE_CLOSED` | `0` | `0` |
| `execute_resolution` | catchably malformed re-resolution result | `ATTEMPT_FAILED` | executed attempt number | `RERESOLUTION_REQUESTED` | `PROVISIONALLY_RESOLVED` | `0` | `0` |
| `expire_attempt` | initial | `ATTEMPT_EXPIRED` | expired attempt number | `RESOLUTION_REQUESTED` | `EVIDENCE_CLOSED` | `0` | `0` |
| `expire_attempt` | re-resolution | `ATTEMPT_EXPIRED` | expired attempt number | `RERESOLUTION_REQUESTED` | `PROVISIONALLY_RESOLVED` | `0` | `0` |
| `challenge_resolution` | only | `CHALLENGE_SUBMITTED` | new challenge ID | `PROVISIONALLY_RESOLVED` | `PROVISIONALLY_RESOLVED` | exact challenge bond | `0` |
| `request_reresolution` | first re-resolution request | `ATTEMPT_REQUESTED` | new re-resolution attempt number | `PROVISIONALLY_RESOLVED` | `RERESOLUTION_REQUESTED` | `0` | `0` |
| `finalize_market` | `T=0` empty finalization | `MARKET_FINALIZED` | `null` | `PROVISIONALLY_RESOLVED` | `CANCELLED` | `0` | `0` |
| `finalize_market` | `T>0 AND W=0` principal-refund finalization | `MARKET_FINALIZED` | `null` | `PROVISIONALLY_RESOLVED` | `REFUNDABLE` | `0` | `0` |
| `finalize_market` | `T>0 AND W>0` winner finalization | `MARKET_FINALIZED` | `null` | `PROVISIONALLY_RESOLVED` | `FINALIZED` | `0` | `0` |
| `cancel_market` | any cancellation reason with `T=0` | `MARKET_CANCELLED` | `null` | exact nonterminal stored phase before cancellation | `CANCELLED` | `0` | `0` |
| `cancel_market` | any cancellation reason with `T>0` | `MARKET_CANCELLED` | `null` | exact nonterminal stored phase before cancellation | `REFUNDABLE` | `0` | `0` |
| `claim_winnings` | conditional completed-payment branch | `WINNINGS_CLAIMED` | `null` | `FINALIZED` | `FINALIZED` | `0` | exact observably completed winnings |
| `claim_refund` | conditional completed-payment branch | `STAKE_REFUND_CLAIMED` | `null` | `REFUNDABLE` | `REFUNDABLE` | `0` | exact observably completed principal |
| `claim_creation_bond` | conditional completed-payment branch | `CREATION_BOND_CLAIMED` | `null` | current phase | same phase | `0` | exact observably completed creation-bond return |
| `claim_challenge_bond` | conditional completed-payment branch | `CHALLENGE_BOND_CLAIMED` | challenge ID | current phase | same phase | `0` | exact observably completed challenge-bond return |
| `claim_retry_bond` | conditional completed-payment branch | `RETRY_BOND_CLAIMED` | attempt number | current phase | same phase | `0` | exact observably completed retry-bond return |

`retry_resolution` never emits or stores `ATTEMPT_EXPIRED`; its one activity record is always `ATTEMPT_REQUESTED` for the newly created successor. The predecessor's stored status transition is visible through the attempt views. `MARKET_FINALIZED` classifies the successful resolution-finalization action, not only the `FINALIZED` terminal phase. Therefore the empty and zero-winning-pool branches also use `MARKET_FINALIZED`. `MARKET_CANCELLED` is reserved exclusively for successful `cancel_market`, across empty creator cancellation, missed deadlines, exhausted attempts, and hard backstop. A transaction-level rollback creates no activity record.

The non-claim activity invariants are exact; claim-side entries remain candidate design until Gate 5:

1. Every successful non-claim public write appends exactly one activity record under the closed mapping. Claim-side activity is created only at the Gate 5-defined observable economic completion point, never merely when a deferred message is emitted.
2. Every reverted or rejected write appends zero activity records.
3. Every activity ID is consecutive and is consumed only if the complete write commits successfully.
4. The activity kind is determined only by the called method and the exact branch table above.
5. Compound internal state effects create no additional activity records.
6. `retry_resolution` is always classified as the successor `ATTEMPT_REQUESTED`.
7. `finalize_market` is always `MARKET_FINALIZED`, regardless of its three terminal result branches.
8. `MARKET_CANCELLED` is produced only by `cancel_market`.
9. `affected_record_id`, `previous_phase`, `new_phase`, `value_received_wei`, and `value_paid_wei` match the table exactly.
10. Claim-side activity timing, accounting consumption, external-message failure, and retry/reconciliation semantics are conditional on Gate 5. No synchronous or same-write rollback rule is normative before that gate passes.

### 3.2 Closed, bounded read ABI

Storage entities are not ABI return types. No public view returns a mapping, an internal storage object, the full participant/evidence/challenge/attempt/activity collection, or another unpaginated protocol collection. DTO object fields appear in the exact order declared below; implementations MUST reject or fail schema conformance for a missing, extra, reordered, wrong-type, or wrong-optionality result field.

Every page applies the same rules: `limit>0`, `limit<=ProtocolConfig.max_page_size`, `offset<=total_count`, `items.length<=limit`, `next_offset=offset+items.length`, and `has_more=(next_offset<total_count)`. `offset=total_count` returns an empty page with `next_offset=total_count` and `has_more=false`; a greater offset rejects. Reads do not mutate. Page arrays are bounded by `max_page_size` and use the collection order stated below.

#### 3.2.1 Configuration and market DTOs

`MarketConfigView` has the exact following field order. Each field has the same immutable value and bound as its individually specified `MarketConfig` storage row; it contains no collection:

| Field | Type |
| --- | --- |
| `protocol_version` | `string` |
| `canonical_input_version` | `uint16` |
| `envelope_version` | `uint16` |
| `serializer_version` | `uint16` |
| `prompt_template_version` | `uint16` |
| `chain_id` | `uint256` |
| `contract_address` | `address` |
| `min_stake_wei` | `uint256` |
| `creation_bond_wei` | `uint256` |
| `challenge_bond_wei` | `uint256` |
| `retry_bond_wei` | `uint256` |
| `fee_bps` | `uint16` |
| `min_market_duration` | `uint64` |
| `max_market_duration` | `uint64` |
| `initial_attempt_timeout` | `uint64` |
| `challenge_window_duration` | `uint64` |
| `reresolution_request_grace` | `uint64` |
| `reresolution_attempt_timeout` | `uint64` |
| `finalization_cooldown` | `uint64` |
| `fund_unlock_delay` | `uint64` |
| `max_initial_attempts` | `uint32` |
| `max_reresolution_attempts` | `uint32` |
| `max_title_bytes` | `uint32` |
| `max_description_bytes` | `uint32` |
| `max_criteria_bytes` | `uint32` |
| `max_evidence_url_bytes` | `uint32` |
| `max_evidence_note_bytes` | `uint32` |
| `max_challenge_reason_bytes` | `uint32` |
| `max_reasoning_bytes` | `uint32` |
| `max_rejection_reason_bytes` | `uint32` |
| `max_risk_flag_bytes` | `uint32` |
| `max_evidence` | `uint32` |
| `max_challenges` | `uint32` |
| `max_risk_flags` | `uint32` |
| `max_output_items` | `uint32` |
| `max_canonical_invocation_bytes` | `uint32` |
| `max_positions` | `uint32` |
| `max_stake_calls_per_market` | `uint32` |
| `max_activity_records_per_market` | `uint32` |

`ProtocolConfigView` field order is `max_markets:uint32`, `max_page_size:uint16`, `max_leaderboard_entries:uint32`, `market_defaults:MarketConfigView`.

`SettlementView` field order is:

| Field | Type |
| --- | --- |
| `market_id` | `MarketId` |
| `mode` | `SettlementMode` |
| `outcome` | `Outcome?` |
| `winning_pool_wei` | `uint256` |
| `stake_pool_wei` | `uint256` |
| `bond_bonus_wei` | `uint256` |
| `distributable_wei` | `uint256` |
| `paid_out_wei` | `uint256` |
| `refundable_stake_wei` | `uint256` |
| `refunded_stake_wei` | `uint256` |
| `fee_bps` | `uint16` |
| `fee_wei` | `uint256` |
| `created_at` | `Timestamp?` |
| `claims_open_at` | `Timestamp?` |

`CreationBondView` field order is `beneficiary:address`, `original_amount_wei:uint256`, `status:BondStatus`, `amount_paid_wei:uint256`, `claimed_at:Timestamp?`.

`MarketView` is the bounded scalar projection returned by `get_market`; its exact field order is:

| Field | Type |
| --- | --- |
| `market_id` | `MarketId` |
| `creator` | `address` |
| `title` | `string` bounded by `max_title_bytes` |
| `description` | `string` bounded by `max_description_bytes` |
| `yes_criteria` | `string` bounded by `max_criteria_bytes` |
| `no_criteria` | `string` bounded by `max_criteria_bytes` |
| `invalid_criteria` | `string` bounded by `max_criteria_bytes` |
| `phase` | `MarketPhase` |
| `effective_phase` | `EffectivePhase` |
| `created_at` | `Timestamp` |
| `stake_cutoff_at` | `Timestamp` |
| `evidence_cutoff_at` | `Timestamp` |
| `evidence_closed_at` | `Timestamp?` |
| `fund_unlock_at` | `Timestamp` |
| `initial_request_deadline_at` | `Timestamp` |
| `challenge_window_start_at` | `Timestamp?` |
| `challenge_window_end_at` | `Timestamp?` |
| `reresolution_due_at` | `Timestamp?` |
| `finalizable_at` | `Timestamp?` |
| `terminal_at` | `Timestamp?` |
| `terminal_reason` | `TerminalReason` |
| `yes_pool_wei` | `uint256` |
| `no_pool_wei` | `uint256` |
| `invalid_pool_wei` | `uint256` |
| `total_pool_wei` | `uint256` |
| `participant_count` | `uint32` |
| `stake_call_count` | `uint32` |
| `evidence_count` | `uint32` |
| `challenge_count` | `uint32` |
| `initial_attempt_count` | `uint32` |
| `reresolution_attempt_count` | `uint32` |
| `activity_count` | `uint32` |
| `latest_initial_attempt_no` | `AttemptNo?` |
| `latest_reresolution_attempt_no` | `AttemptNo?` |
| `accepted_attempt_no` | `AttemptNo?` |
| `final_attempt_no` | `AttemptNo?` |
| `active_attempt_no` | `AttemptNo?` |
| `challenge_window_open` | `bool` |
| `challenge_pending` | `bool` |
| `has_active_attempt` | `bool` |
| `cancellation_eligible` | `bool` |
| `permissionless_cancellation_eligible` | `bool` |
| `creator_cancellation_eligible` | `bool` |
| `ready_to_finalize` | `bool` |
| `claimable` | `bool` |
| `funds_received_wei` | `uint256` |
| `funds_paid_wei` | `uint256` |
| `stake_liability_wei` | `uint256` |
| `locked_bond_liability_wei` | `uint256` |
| `refundable_bond_liability_wei` | `uint256` |
| `settlement_added_bond_liability_wei` | `uint256` |
| `creation_bond` | `CreationBondView` |
| `settlement` | `SettlementView` |
| `config` | `MarketConfigView` |

`MarketView` MUST NOT contain participant addresses or mappings, positions, evidence/challenge/attempt/activity arrays or mappings, allocation/claim mappings, invocation bytes, or another paginated collection.

`MarketSummaryView` field order is `market_id:MarketId`, `title:string` bounded by `max_title_bytes`, `phase:MarketPhase`, `effective_phase:EffectivePhase`, `stake_cutoff_at:Timestamp`, `total_pool_wei:uint256`, `accepted_outcome:Outcome?`, `participant_count:uint32`, `challenge_count:uint32`, `terminal_reason:TerminalReason`. `accepted_outcome` is null exactly when `accepted_attempt_no` is null; otherwise it is the immutable verdict of that referenced successful attempt. `MarketSummaryPage` contains summaries in ascending market-ID order beginning with `1`; at every committed state its valid market IDs are exactly `1..market_count`.

#### 3.2.2 Position, evidence, attempt, challenge, and activity DTOs

`PositionView` field order is `found:bool`, `market_id:MarketId`, `user:address`, `participant_index:uint32?`, `yes_wei:uint256`, `no_wei:uint256`, `invalid_wei:uint256`, `total_contributed_wei:uint256`, `winning_allocation_wei:uint256`, `winning_claimed:bool`, `refunded_stake_wei:uint256`, `stake_refund_claimed:bool`. If absent, `found=false`, the returned `market_id` and `user` equal the request, `participant_index=null`, amounts are zero, and flags are false. If found, `participant_index=participant_index_plus_one[user]-1` and all position/index/pool invariants hold.

`WinningAllocationView` field order is `found:bool`, `market_id:MarketId`, `user:address`, `allocation_wei:uint256`, `claimed:bool`, `paid_wei:uint256`; `found` means a funded `Position` exists. An absent position returns requested identity plus zero/false, and a found nonwinner also has zero/false allocation fields.

`EvidenceView` field order is `market_id:MarketId`, `evidence_id:EvidenceId`, `submitter:address`, `url:string`, `note:string`, `submitted_at:Timestamp`, `content_digest:bytes32`; the URL is nonempty, the optional note is a non-null string and may equal `""`, and both are the processed values under section 6.1. `EvidenceResult` field order is `found:bool`, `evidence:EvidenceView?`; `found=false` requires `evidence=null`, while `found=true` requires the exact record.

`ResolutionAttemptView` field order is:

| Field | Type |
| --- | --- |
| `market_id` | `MarketId` |
| `attempt_no` | `AttemptNo` |
| `kind` | `AttemptKind` |
| `stored_status` | `AttemptStatus` |
| `effective_status` | `AttemptStatus` |
| `expiry_materialized` | `bool` |
| `requester` | `address` |
| `requested_at` | `Timestamp` |
| `execute_by` | `Timestamp` |
| `predecessor_attempt_no` | `AttemptNo?` |
| `canonical_input_version` | `uint16` |
| `envelope_version` | `uint16` |
| `serializer_version` | `uint16` |
| `prompt_template_version` | `uint16` |
| `input_digest` | `bytes32` |
| `canonical_invocation_byte_length` | `uint32` |
| `ordinary_evidence_count` | `uint32` |
| `challenge_count` | `uint32` |
| `retry_bond_wei` | `uint256` |
| `retry_bond_status` | `BondStatus` |
| `retry_bond_paid_wei` | `uint256` |
| `retry_bond_claimed_at` | `Timestamp?` |
| `executor` | `address?` |
| `completed_at` | `Timestamp?` |
| `failure_code` | `FailureCode?` |
| `verdict` | `Outcome?` |
| `confidence` | `Confidence?` |
| `reasoning` | `string?` bounded by `max_reasoning_bytes` |
| `prior_attempt_no` | `AttemptNo?` |
| `accepted_item_count` | `uint32` |
| `rejected_item_count` | `uint32` |
| `risk_flag_count` | `uint32` |

It never returns `canonical_invocation_bytes` or output arrays. `effective_status` uses the formula in section 2.2; `expiry_materialized` is true exactly when `stored_status=EXPIRED`, and is false for an unmaterialized time-derived expiry and every other stored status. Each output count equals the exact length of its corresponding stored bounded output array. `ResolutionAttemptResult` field order is `found:bool`, `attempt:ResolutionAttemptView?`; `found=false` requires `attempt=null`, `found=true` requires the exact requested record, and a missing record MUST NOT alias a latest attempt.

`EvidenceReferenceView` field order is `kind:EvidenceKind`, `id:uint32`. `RejectedEvidenceReferenceView` field order is `kind:EvidenceKind`, `id:uint32`, `reason:string` bounded by `max_rejection_reason_bytes`. `RiskFlagView` contains exactly `value:string` bounded by `max_risk_flag_bytes`. These output collections use their stored canonical order and dedicated pages.

`ChallengeView` field order is `market_id:MarketId`, `challenge_id:ChallengeId`, `challenged_attempt_no:AttemptNo`, `challenger:address`, `url:string`, `reason:string`, `submitted_at:Timestamp`, `content_digest:bytes32`, `bond_wei:uint256`, `bond_status:BondStatus`, `bond_paid_wei:uint256`, `bond_settlement_paid_wei:uint256`, `bond_claimed_at:Timestamp?`; the optional URL is a non-null processed string and may equal `""`, while the processed reason is nonempty. `ChallengeResult` field order is `found:bool`, `challenge:ChallengeView?`; `found=false` requires `challenge=null`.

`ActivityView` field order is `market_id:MarketId`, `activity_id:ActivityId`, `kind:ActivityKind`, `caller:address`, `recorded_at:Timestamp`, `affected_record_id:uint32?`, `previous_phase:MarketPhase?`, `new_phase:MarketPhase`, `value_received_wei:uint256`, `value_paid_wei:uint256`. `previous_phase=null` only for `MARKET_CREATED`; `affected_record_id` follows section 3.1. `ActivityResult` field order is `found:bool`, `activity:ActivityView?`; `found=false` requires `activity=null`.

#### 3.2.3 Page, aggregate, and statistics DTOs

Each named page below has the exact field order `items:<item-type>[]`, `offset:Offset`, `next_offset:Offset`, `total_count:uint32`, `has_more:bool`:

| Page record | Item type and deterministic order |
| --- | --- |
| `MarketSummaryPage` | `MarketSummaryView`; ascending market ID |
| `ParticipantPage` | `address`; first-successful-stake order |
| `EvidencePage` | `EvidenceView`; ascending evidence ID |
| `ResolutionAttemptPage` | `ResolutionAttemptView`; ascending shared-sequence attempt number beginning with `1` |
| `EvidenceReferencePage` | `EvidenceReferenceView`; stored canonical reference order |
| `RejectedEvidenceReferencePage` | `RejectedEvidenceReferenceView`; stored canonical reference order |
| `RiskFlagPage` | `RiskFlagView`; stored result order |
| `ChallengePage` | `ChallengeView`; ascending challenge ID |
| `ActivityPage` | `ActivityView`; ascending activity ID |
| `LeaderboardPage` | `LeaderboardEntryView`; stored rank order |

Page `total_count` sources are exact: `MarketSummaryPage=market_count`, `ParticipantPage=participant_count`, `EvidencePage=evidence_count`, `ResolutionAttemptPage=initial_attempt_count+reresolution_attempt_count`, each attempt-output page equals its corresponding stored output count, `ChallengePage=challenge_count`, `ActivityPage=activity_count`, and `LeaderboardPage=leaderboard_count`.

`BytesPage` field order is `items:bytes`, `offset:Offset`, `next_offset:Offset`, `total_count:uint32`, `has_more:bool`. Here `limit` is a byte count, `items.length<=limit<=max_page_size`, and `total_count=canonical_invocation_byte_length<=max_canonical_invocation_bytes`.

`ClaimableView` field order is `winnings_wei:uint256`, `stake_refund_wei:uint256`, `creation_bond_wei:uint256`, `challenge_bonds_wei:uint256`, `retry_bonds_wei:uint256`, `total_claimable_wei:uint256`, with the last field equal to the checked sum of the first five. Winnings are the caller's positive unclaimed stored allocation only when winner claims are open; stake refund is the caller's unclaimed principal only when refund claims are open; creation bond is its original amount only when the user is beneficiary and status is `REFUNDABLE`; challenge/retry values are the corresponding stored per-user refundable aggregates. It returns amounts only. Challenge and retry IDs are discovered through their pages. `NONE`, `LOCKED`, `ADDED_TO_SETTLEMENT`, and `CLAIMED` bonds do not contribute. This view performs no collection scan; each typed aggregate MUST equal the sum of that user's corresponding refundable per-bond records.

`CancellationEligibilityView` field order is `eligible:bool`, `authorized:bool`, `permissionless:bool`, `creator_only:bool`, `highest_precedence_reason:TerminalReason`.

`ProtocolStatsView` field order is:

| Field | Type |
| --- | --- |
| `protocol_version` | `string` |
| `chain_id` | `uint256` |
| `contract_address` | `address` |
| `total_market_count` | `uint32` |
| `open_market_count` | `uint32` |
| `evidence_closed_market_count` | `uint32` |
| `resolution_requested_market_count` | `uint32` |
| `provisionally_resolved_market_count` | `uint32` |
| `reresolution_requested_market_count` | `uint32` |
| `finalized_market_count` | `uint32` |
| `refundable_market_count` | `uint32` |
| `cancelled_market_count` | `uint32` |
| `total_stake_received_wei` | `uint256` |
| `total_bonds_received_wei` | `uint256` |
| `total_funds_received_wei` | `uint256` |
| `total_funds_paid_wei` | `uint256` |
| `total_stake_liability_wei` | `uint256` |
| `total_locked_bond_liability_wei` | `uint256` |
| `total_refundable_bond_liability_wei` | `uint256` |
| `total_settlement_added_bond_liability_wei` | `uint256` |
| `total_winnings_paid_wei` | `uint256` |
| `total_principal_refunded_wei` | `uint256` |
| `total_creation_bonds_returned_wei` | `uint256` |
| `total_challenge_bonds_returned_wei` | `uint256` |
| `total_retry_bonds_returned_wei` | `uint256` |
| `protocol_fee_wei` | `uint256` |
| `fee_bps` | `uint16` |

Every statistics field reads the stored protocol aggregates in section 2.3; `get_stats` MUST NOT scan markets. The eight phase counts sum to `total_market_count`; `total_funds_received_wei=total_stake_received_wei+total_bonds_received_wei`; `total_funds_paid_wei=total_winnings_paid_wei+total_principal_refunded_wei+total_creation_bonds_returned_wei+total_challenge_bonds_returned_wei+total_retry_bonds_returned_wei`; financial liabilities satisfy section 7's exact conservation equation; and both fee fields are always zero.

`LeaderboardEntryView` field order is `user:address`, `winnings_paid_wei:uint256`, `rank:uint32`; rank is one-based and equals the item's stored-array index plus one. `LeaderboardPage.total_count=leaderboard_count`; it reads exactly the requested slice of the already ranked index and never scans or sorts beyond that page.

#### 3.2.4 Candidate complete public method signatures

The current candidate ABI contains 40 methods: 17 writes and 23 views. The non-claim portion and economic claim intent are closed. The five claim write entries below, plus any claim-delivery acknowledgement, retry, reconciliation, or status methods required by deferred execution, remain conditional on Gate 5. Therefore the production V4 ABI count is not final until Gate 5 passes. If Gate 5 changes this candidate, the complete method count and manifest MUST be recalculated and independently reviewed. Within the candidate table, `void` means no return value and no implementation-defined tuple is permitted:

| Method | Complete signature |
| --- | --- |
| create | `create_market(title:string, description:string, yes_criteria:string, no_criteria:string, invalid_criteria:string, stake_cutoff_at:Timestamp) payable -> MarketId` |
| stake | `stake(market_id:MarketId, side:Outcome) payable -> void` |
| evidence write | `submit_evidence(market_id:MarketId, url:string, note:string) -> EvidenceId` |
| evidence close | `close_evidence(market_id:MarketId) -> void` |
| initial request | `request_resolution(market_id:MarketId) -> AttemptNo` |
| retry | `retry_resolution(market_id:MarketId, predecessor_attempt_no:AttemptNo) payable -> AttemptNo` |
| execute | `execute_resolution(market_id:MarketId, attempt_no:AttemptNo) -> void` |
| expire | `expire_attempt(market_id:MarketId, attempt_no:AttemptNo) -> void` |
| challenge | `challenge_resolution(market_id:MarketId, initial_attempt_no:AttemptNo, url:string, reason:string) payable -> ChallengeId` |
| re-resolution request | `request_reresolution(market_id:MarketId) -> AttemptNo` |
| finalize | `finalize_market(market_id:MarketId) -> void` |
| cancel | `cancel_market(market_id:MarketId, reason:TerminalReason) -> void` |
| winnings claim | `claim_winnings(market_id:MarketId) -> uint256` |
| principal claim | `claim_refund(market_id:MarketId) -> uint256` |
| creation-bond claim | `claim_creation_bond(market_id:MarketId) -> uint256` |
| challenge-bond claim | `claim_challenge_bond(market_id:MarketId, challenge_id:ChallengeId) -> uint256` |
| retry-bond claim | `claim_retry_bond(market_id:MarketId, attempt_no:AttemptNo) -> uint256` |
| protocol config | `get_protocol_config() -> ProtocolConfigView` |
| market | `get_market(market_id:MarketId) -> MarketView` |
| market list | `list_markets(offset:Offset, limit:PageLimit) -> MarketSummaryPage` |
| participant count | `get_participant_count(market_id:MarketId) -> uint32` |
| participants | `get_participants(market_id:MarketId, offset:Offset, limit:PageLimit) -> ParticipantPage` |
| position | `get_position(market_id:MarketId, user:address) -> PositionView` |
| allocation | `get_winning_allocation(market_id:MarketId, user:address) -> WinningAllocationView` |
| evidence | `get_evidence(market_id:MarketId, evidence_id:EvidenceId) -> EvidenceResult` |
| evidence list | `list_evidence(market_id:MarketId, offset:Offset, limit:PageLimit) -> EvidencePage` |
| attempt | `get_resolution_attempt(market_id:MarketId, attempt_no:AttemptNo) -> ResolutionAttemptResult` |
| attempt list | `list_resolution_attempts(market_id:MarketId, offset:Offset, limit:PageLimit) -> ResolutionAttemptPage` |
| invocation bytes | `get_attempt_invocation_chunk(market_id:MarketId, attempt_no:AttemptNo, offset:Offset, limit:PageLimit) -> BytesPage` |
| accepted items | `list_attempt_accepted_items(market_id:MarketId, attempt_no:AttemptNo, offset:Offset, limit:PageLimit) -> EvidenceReferencePage` |
| rejected items | `list_attempt_rejected_items(market_id:MarketId, attempt_no:AttemptNo, offset:Offset, limit:PageLimit) -> RejectedEvidenceReferencePage` |
| risk flags | `list_attempt_risk_flags(market_id:MarketId, attempt_no:AttemptNo, offset:Offset, limit:PageLimit) -> RiskFlagPage` |
| challenge | `get_challenge(market_id:MarketId, challenge_id:ChallengeId) -> ChallengeResult` |
| challenge list | `list_challenges(market_id:MarketId, offset:Offset, limit:PageLimit) -> ChallengePage` |
| activity | `get_activity(market_id:MarketId, activity_id:ActivityId) -> ActivityResult` |
| activity list | `list_activity(market_id:MarketId, offset:Offset, limit:PageLimit) -> ActivityPage` |
| claimable | `get_claimable(market_id:MarketId, user:address) -> ClaimableView` |
| cancellation | `get_cancellation_eligibility(market_id:MarketId, caller:address) -> CancellationEligibilityView` |
| statistics | `get_stats() -> ProtocolStatsView` |
| leaderboard | `get_leaderboard(offset:Offset, limit:PageLimit) -> LeaderboardPage` |

Every market-scoped view rejects a missing market ID: `market_id=0` and `market_id>market_count` are missing and reject. Every protocol-record argument equal to zero rejects as invalid. For positive child IDs, keyed `Result` views return `found=false` only for a missing child record of an existing market; `PositionView.found=false` applies only to a missing user position in an existing market. Attempt-output/invocation pages reject a missing attempt. No method returns an unspecified flag, shorthand object, mapping, unbounded array, or implementation-defined result.

## 4. Stored and derived phases

Stored phases alone authorize writes. `get_market` MUST independently compute:

- `challenge_window_open := phase=PROVISIONALLY_RESOLVED AND accepted kind=INITIAL AND challenge_window_start_at <= now < challenge_window_end_at`.
- `challenge_pending := challenge_count>0 AND no RERESOLUTION attempt has SUCCEEDED AND market nonterminal`.
- `has_active_attempt := active_attempt_no != null`, where `active_attempt_no` is computed from the unique latest applicable attempt with `effective_status=REQUESTED`, `now<execute_by`, and a nonterminal market. A stored request past `execute_by` has effective status `EXPIRED` and is not active.
- `cancellation_eligible := market nonterminal AND at least one exact section 5 predicate is currently exercisable by some authorized caller`.
- `permissionless_cancellation_eligible := market nonterminal AND the highest-precedence true reason is one of HARD_BACKSTOP, INITIAL_ATTEMPTS_EXHAUSTED, RERESOLUTION_ATTEMPTS_EXHAUSTED, INITIAL_REQUEST_DEADLINE_MISSED, or RERESOLUTION_REQUEST_DEADLINE_MISSED`.
- `creator_cancellation_eligible := market nonterminal AND EMPTY_CREATOR_CANCEL is the highest-precedence true reason`.
- `claimable := (settlement.claims_open_at!=null AND now>=settlement.claims_open_at AND ((settlement.mode=WINNERS AND settlement.paid_out_wei<settlement.distributable_wei) OR (settlement.mode=REFUNDS AND settlement.refunded_stake_wei<settlement.refundable_stake_wei))) OR refundable_bond_liability_wei>0`. This market-wide boolean includes nonterminal retry/challenge-bond availability but does not identify a beneficiary; `get_claimable(market_id,user)` does.
- `ready_to_finalize := section 3 finalization guards are all true`.

The UI-oriented `effective_phase` MUST NOT authorize contract actions. Its first matching label is: (1) stored terminal; (2) `CANCELLATION_ELIGIBLE`; (3) `RERESOLUTION_REQUESTED`; (4) `CHALLENGE_PENDING`; (5) `CHALLENGE_WINDOW`; (6) `PROVISIONALLY_RESOLVED`; (7) `RESOLUTION_REQUESTED`; (8) `EVIDENCE_CLOSED`; (9) `OPEN`.

`get_cancellation_eligibility` returns the exact `CancellationEligibilityView`: `eligible=cancellation_eligible`; `authorized=true` exactly when the supplied caller may invoke the highest-precedence reason; `permissionless` and `creator_only` reflect that reason's authorization class; and `highest_precedence_reason` is the exact `TerminalReason`, or `NONE` if no predicate is true. For permissionless reasons every address is authorized. For `EMPTY_CREATOR_CANCEL`, only the stored creator is authorized. The frontend MUST NOT infer that `cancellation_eligible` alone grants the current viewer permission.

## 5. Timing and cancellation

Let immutable durations be `AI=initial_attempt_timeout`, `C=challenge_window_duration`, `G=reresolution_request_grace`, `AR=reresolution_attempt_timeout`, and `F=finalization_cooldown`; each MUST be positive. Let `U=fund_unlock_at`.

At the beginning of `create_market`, the contract MUST capture exactly one contract-time value `t_create:Timestamp`; the complete operation uses no second time read. If creation commits, `created_at=t_create`. With `min_market_duration>0` and `max_market_duration>=min_market_duration`, the absolute user-supplied `stake_cutoff_at` is admissible exactly when the checked inclusive inequality holds:

`t_create + min_market_duration <= stake_cutoff_at <= t_create + max_market_duration`.

The addition-based form is normative. A subtraction implementation may be equivalent only after proving `stake_cutoff_at>=t_create` and no underflow. Exact minimum and maximum are accepted; one unit before the minimum or after the maximum rejects; `stake_cutoff_at<=t_create` rejects; and overflow of either bound rejects. Creation then derives `evidence_cutoff_at=stake_cutoff_at`, `fund_unlock_at=stake_cutoff_at+fund_unlock_delay`, and `initial_request_deadline_at=fund_unlock_at-(AI+C+G+AR+F)` with checked `uint64` arithmetic. It rejects unless every operation fits and `initial_request_deadline_at>=evidence_cutoff_at`. No funds, state, market/activity ID, or counter is accepted until all checks pass.

`initial_request_deadline_at = U - (AI + C + G + AR + F)`.

Creation captures `U=stake_cutoff_at+fund_unlock_delay` and then the initial deadline formula. Construction MUST prove the runtime contract time converts exactly to `Timestamp`, the duration sum and every timestamp addition are `<=MAX_UINT64`, subtraction cannot underflow, and the resulting deadline is at or after evidence cutoff. Opening boundaries are inclusive. Stake/evidence, challenge ends, and attempt execution ends are exclusive. Expressly inclusive request deadlines use `<=`. At `U`, hard-backstop terminalization is allowed and all ordinary progression is rejected.

An initial request/retry is admitted only at `now <= initial_request_deadline_at`; `execute_by=requested_at+AI`. Initial execution requires `now < execute_by` and `now+C+G+AR+F<=U`. Initial success at `t` sets `challenge_window_start_at=t`, `challenge_window_end_at=t+C`, and `finalizable_at=t+C`. If challenged, that initial finalization remains blocked regardless of the timestamp, and `reresolution_due_at=challenge_window_end_at+G`.

A first re-resolution or retry requires `now>=challenge_window_end_at`, `now<=reresolution_due_at`, and `now+AR+F<=U`; `execute_by=requested_at+AR`. Execution requires `now<execute_by` and `now+F<=U`. Success at `t` sets `finalizable_at=t+F`. Because execution is strictly before the admitted attempt's `execute_by`, every successful `finalizable_at` is strictly before `U` even when admission uses `<=`.

`cancel_market` evaluates the closed predicates below and MUST store exactly the highest-precedence true reason:

| Reason | Exact predicate | Result |
| --- | --- | --- |
| `HARD_BACKSTOP` | `now>=U` and nonterminal. Overrides a stale/external pending transaction, subject to feasibility gate. | Nonempty `REFUNDABLE/REFUNDS`; empty `CANCELLED/EMPTY_CANCEL`. |
| `RERESOLUTION_ATTEMPTS_EXHAUSTED` | Challenges exist; no re-resolution succeeded; no active `REQUESTED` attempt; re-resolution count equals cap; nonterminal. | Same by pool. |
| `INITIAL_ATTEMPTS_EXHAUSTED` | No initial success; no active `REQUESTED` attempt; initial count equals cap; nonterminal. | Same by pool. |
| `RERESOLUTION_REQUEST_DEADLINE_MISSED` | Challenges exist; no re-resolution success; no active requested re-resolution; `now>reresolution_due_at`; nonterminal. | Same by pool. |
| `INITIAL_REQUEST_DEADLINE_MISSED` | No initial success; no active requested attempt; `now>initial_request_deadline_at`; nonterminal. | Same by pool. |
| `EMPTY_CREATOR_CANCEL` | Caller is creator; `phase=OPEN`; `total_pool=0`; `evidence_count=0`; no attempt exists; `now<U`. | `CANCELLED/EMPTY_CANCEL`. |

Precedence is hard backstop, applicable attempt-cap exhaustion, applicable request-deadline missed, then empty creator cancel. A caller-supplied lower-precedence reason while a higher one is true MUST reject. Every terminal transition sets `terminal_at`, makes creation and all remaining locked retry bonds refundable, and handles challenges per section 7.

For every `cancel_market` reason, `claims_open_at=terminal_at`. If `T>0`, settlement is exactly `REFUNDABLE/REFUNDS` with `outcome=null`, `winning_pool_wei=0`, `stake_pool_wei=T`, `bond_bonus_wei=0`, `distributable_wei=0`, and `refundable_stake_wei=T`. If `T=0`, settlement is exactly `CANCELLED/EMPTY_CANCEL` with `outcome=null` and every stake/winner/refund amount zero. In both cases the selected cancellation reason is retained, `final_attempt_no` remains null, every still-locked challenge/retry bond becomes `REFUNDABLE`, the creation bond becomes `REFUNDABLE`, and no winner allocation is created.

## 6. Resolution and consensus-exact serialization

### 6.1 Text, primitive, JSON, and digest profile

User text MUST contain only valid Unicode scalar values; invalid/surrogate input is rejected, never replaced. No NFC, NFD, NFKC, or NFKD normalization occurs. Trim only U+0009, U+000A, U+000D, and U+0020 from both ends; preserve every other scalar and do not collapse internal text. Encode the processed value as strict UTF-8, apply the field-specific byte bound, and store, digest, and serialize that processed value rather than the raw input. No input is truncated.

The evidence/challenge input rules are exact:

| Field | Processed UTF-8 byte length | Empty after trim | Stored representation |
| --- | --- | --- | --- |
| Ordinary evidence `url` | `1..max_evidence_url_bytes` | Reject | Required non-null processed string |
| Ordinary evidence `note` | `0..max_evidence_note_bytes` | Accept | `""`, never null |
| Challenge `url` | `0..max_evidence_url_bytes` | Accept | `""`, never null |
| Challenge `reason` | `1..max_challenge_reason_bytes` | Reject | Required non-null processed string |

Whitespace-only values made solely from the four trim scalars become empty and follow this table. U+00A0 nonbreaking space is not trimmed, so a U+00A0-only value is nonempty and is accepted when within the applicable cap. A challenge may omit a new URL by supplying an empty/trimmed-empty string and rely on its required reason plus already committed evidence.

Addresses are `0x` plus exactly 40 lowercase hex characters encoding the unsigned 20-byte value with leading zeroes. Address order is ascending unsigned 20-byte value. Unsigned integers, including every `Timestamp` in `0..MAX_UINT64`, are JSON number tokens in base-10 ASCII, with no leading zero except `0`, sign, decimal point, or exponent. Booleans are `true`/`false`; absent optionals are `null`; enums are exact uppercase tokens.

Canonical JSON is UTF-8 without BOM or whitespace. Objects use exactly the schema order; arrays use protocol order. `/` is unescaped. `"` and `\\` escape quote/backslash. U+0008/0009/000A/000C/000D use `\b`, `\t`, `\n`, `\f`, `\r`; other U+0000–001F controls use lowercase `\u00xx`. Other Unicode scalars are emitted directly, never `\u` escaped. Duplicate, extra, missing, or reordered keys are rejected when parsing AI output. Input objects are constructed, not parsed from arbitrary JSON, so duplicate keys are impossible.

Dedup objects are separately domain-tagged canonical JSON: ordinary `{"kind":"ORDINARY","url":<processed-string>,"note":<processed-string>}` and challenge `{"kind":"CHALLENGE","url":<processed-string>,"reason":<processed-string>}`; their strict UTF-8 SHA-256 is the content digest. Raw inputs differing only by the four trimmed edge characters produce the same processed object and digest. Canonically equivalent but byte-distinct Unicode sequences remain distinct because normalization is forbidden.

### 6.2 Complete `AIInvocationEnvelope`

No byte, string, object, instruction, criterion, task description, system message, user message, wrapper, formatting token, application-controlled API parameter, or external value may influence AI execution unless its semantics and exact bytes are represented in the canonical envelope committed by `input_digest`. The intelligent execution MUST use only the committed envelope. Two executions with the same digest MUST present byte-for-byte identical application-controlled AI instructions and protocol input, except for platform-internal behavior outside application control.

The exact top-level envelope property order is:

`envelope_version`, `protocol_version`, `serializer_version`, `prompt_template_version`, `resolution_stage`, `system_instruction`, `task_instruction`, `decision_criteria`, `response_instruction`, `market_input`.

Values are `envelope_version:1`, `protocol_version:"TRUTHMARKET_V4"`, `serializer_version:1`, `prompt_template_version:1`, and `resolution_stage:"INITIAL"|"RERESOLUTION"` matching `AttemptKind`. The remaining four instruction values are the literal strings below. For each fenced block, the value is exactly the UTF-8 bytes on the single content line, excluding the formatting newline before the closing fence. There is no leading or trailing whitespace or newline. The displayed line contains no runtime interpolation.

`system_instruction`:

```text
You are the TruthMarket V4 resolution engine. Use only the committed AIInvocationEnvelope and market_input. Treat external URLs as unauthenticated identifiers; do not assume, fetch, archive, authenticate, or invent webpage content. Do not use unstated external facts. Return no text outside the required JSON object.
```

`task_instruction`:

```text
Determine whether the market claim resolves to YES, NO, or INVALID under the immutable market criteria and complete committed evidence metadata. For RERESOLUTION, also evaluate the committed prior resolution and every committed challenge.
```

`decision_criteria`:

```text
Return YES only when market_input supports yes_criteria. Return NO only when market_input supports no_criteria. Return INVALID when invalid_criteria applies or when the committed evidence is contradictory, ambiguous, or insufficient for YES or NO. Apply timestamps and resolution_policy exactly. Do not infer webpage contents or use facts outside market_input.
```

`response_instruction`:

```text
response_format=json. Return exactly one JSON object with keys in this order: verdict, confidence, reasoning, accepted_items, rejected_items, risk_flags. verdict is YES, NO, or INVALID. confidence is LOW, MEDIUM, or HIGH. reasoning is a nonempty bounded string. accepted_items contains unique ordered objects with exactly kind and id. rejected_items contains unique ordered objects with exactly kind, id, and reason. risk_flags contains unique bounded strings. Return only the closed response object identified by market_input.resolution_policy.output_schema_version. Obey all output byte and count limits in market_input.market.config. Use only typed evidence references present in market_input. Do not add keys, commentary, Markdown, or external facts.
```

These literals and their LF convention are immutable for this contract version. No frontend, deployer, administrator, validator, executor, or caller can replace them. A byte change requires a new `prompt_template_version` and separately reviewed contract version or architecture revision. No uncommitted prefix, suffix, helper text, wrapper, system instruction, task, criterion, or response hint may affect execution.

`market_input` is the exact object in section 6.3. Define:

`canonical_invocation_bytes = CanonicalJSON(AIInvocationEnvelope)`

`input_digest = SHA256(canonical_invocation_bytes)`

An attempt stores both the exact bounded `canonical_invocation_bytes` snapshot and this complete invocation digest, not a market-data-only digest. The request method MUST construct the envelope from then-current contract state and fixed literals, validate every schema/order/bound, store the exact resulting bytes, and freeze every referenced record ID. Those stored bytes are the immutable attempt input even if a market-level display/timing field later changes after success. Execution MUST parse the stored bytes under the closed schema, reconstruct and canonically serialize the complete envelope from that immutable attempt snapshot and the fixed versioned literals, require byte equality with `canonical_invocation_bytes`, recompute SHA-256, require equality with `input_digest`, and pass only its committed contents to the nondeterministic path. Historical digest verification therefore remains possible after completion and does not depend on later mutable market fields.

Prompt-template version 1 fixes the application call profile: the primary prompt/user argument is the strict UTF-8 decoding of `canonical_invocation_bytes`; an API `response_format` argument, if required, is exactly `"json"`, whose semantics and token are committed in `response_instruction`. If GenLayer requires separate `task` and `criteria` arguments, they MUST be reconstructed byte-for-byte from `task_instruction` and `decision_criteria`; any system or response argument MUST likewise be the corresponding literal. No other application argument or helper string is permitted. Whether this mapping is supported is part of the mandatory AI-envelope/two-step feasibility work; failure requires architecture revision before production-contract coding.

### 6.3 Exact `market_input` schemas

Initial and re-resolution `market_input` use this exact property order:

`schema_version`, `protocol_version`, `chain_id`, `contract_address`, `market_id`, `attempt_no`, `attempt_kind`, `requested_at`, `execute_by`, `predecessor_attempt_no`, `market`, `ordinary_evidence`, `prior_resolution`, `challenges`, `resolution_policy`.

- Scalar identities use the primitive encoding above. Market, attempt, evidence, and challenge IDs are their exact one-based protocol values; zero never enters canonical input as an ID. Activity is not validator input.
- `schema_version` and `canonical_input_version` are the JSON number `1`; `protocol_version` is exactly `"TRUTHMARKET_V4"`; `chain_id` and `contract_address` are the stored deployment identity; `attempt_no` is the record's number; `attempt_kind` is its exact enum; and request/execute times are frozen record values.
- The predecessor is JSON `null` for a first kind attempt and a number for retry.
- `market` order is: `title`, `description`, `yes_criteria`, `no_criteria`, `invalid_criteria`, `created_at`, `stake_cutoff_at`, `evidence_cutoff_at`, `fund_unlock_at`, `initial_request_deadline_at`, `evidence_closed_at`, `challenge_window_start_at`, `challenge_window_end_at`, `reresolution_due_at`, `finalizable_at`, `config`. `evidence_closed_at` is required and non-null. The four later timing optionals are `null` in initial input; their stored integer values are required in re-resolution input.
- `config` exact order is `protocol_version`, `canonical_input_version`, `envelope_version`, `serializer_version`, `prompt_template_version`, `chain_id`, `contract_address`, `min_market_duration`, `max_market_duration`, `initial_attempt_timeout`, `challenge_window_duration`, `reresolution_request_grace`, `reresolution_attempt_timeout`, `finalization_cooldown`, `fund_unlock_delay`, `max_initial_attempts`, `max_reresolution_attempts`, `max_title_bytes`, `max_description_bytes`, `max_criteria_bytes`, `max_evidence_url_bytes`, `max_evidence_note_bytes`, `max_challenge_reason_bytes`, `max_reasoning_bytes`, `max_rejection_reason_bytes`, `max_risk_flag_bytes`, `max_evidence`, `max_challenges`, `max_risk_flags`, `max_output_items`. Economic, canonical-byte-storage, participant, pagination, stake-call, activity, and leaderboard fields do not enter validator input.
- Each ordinary record order is `id`, `submitter`, `url`, `note`, `submitted_at`, `content_digest`; `id` is the exact one-based evidence ID, `url` and `note` are the exact processed non-null strings, and digest is lowercase `0x` plus 64 hex. The array is complete and ascending from ID `1`.
- Initial input has `prior_resolution:null` and `challenges:[]`.
- Re-resolution `prior_resolution` order is `attempt_no`, `completed_at`, followed by the exact successful initial-output fields in section 6.4 order. Attempt references use the shared one-based sequence. Each challenge order is `id`, `challenged_attempt_no`, `challenger`, `url`, `reason`, `submitted_at`, `content_digest`; IDs are exact one-based values, text is the exact processed non-null string representation, and the complete array is ascending from ID `1`.
- `resolution_policy` order is `allowed_verdicts`, `insufficient_evidence_verdict`, `external_url_policy`, `output_schema_version`, with exact values `["YES","NO","INVALID"]`, `"INVALID"`, `"UNAUTHENTICATED_IDENTIFIER_ONLY"`, and `1`.

No frontend data, fetched webpage content, pagination choice, map iteration, transaction metadata, caller preference, or mutable off-chain data may enter the bytes. Accepted evidence/challenges are never silently truncated. No application-controlled AI influence may exist outside the envelope. Execution reconstructs the full schema from frozen records and MUST match the stored digest.

The accepted test fixtures already use one-based example market, attempt, evidence, and challenge IDs and text values valid under the field rules above, so these origin and admission clarifications do not change their normative bytes. Tests MUST still reconstruct every fixture independently; this statement is not a substitute for byte-length and SHA-256 verification.

### 6.4 Exact output schema

The only successful output is an object with fixed order and keys: `verdict`, `confidence`, `reasoning`, `accepted_items`, `rejected_items`, `risk_flags`. `verdict` is `YES|NO|INVALID`; `confidence` is `LOW|MEDIUM|HIGH`; reasoning byte length is `1..max_reasoning_bytes` after the exact trim.

An accepted reference is exactly `{"kind":"ORDINARY","id":1}` or `{"kind":"CHALLENGE","id":1}` in that order. A rejected item is exactly `{"kind":"ORDINARY","id":1,"reason":"..."}` (or `CHALLENGE`) in that order. IDs MUST belong to the frozen kind-specific input. References are unique across both arrays and the arrays are ascending by `(kind order ORDINARY then CHALLENGE, id)`; no required input must be classified, but no reference may be invented. Rejection reasons are nonempty and byte bounded. `risk_flags` contains at most `max_risk_flags` unique, nonempty, trimmed strings, each byte bounded, in returned order. Total item count is bounded by `max_output_items` and input count.

Extra/missing/reordered/duplicate keys, duplicate references, wrong types/enums/order, invalid Unicode, out-of-input IDs, and byte/count excess are malformed execution, not substantive `INVALID`. Contradictory, ambiguous, or insufficient **well-formed evidence** yields the substantive `INVALID` verdict under immutable criteria.

## 7. Settlement, bonds, and exact accounting

V4 has no protocol fee: `fee_bps=0`, `fee_wei=0`, no fee recipient/liability/claim/transfer exists, and no administrator or treasury may withdraw market funds. A future nonzero fee requires a separately reviewed contract version or architecture revision.

Let `T=Y+N+I`, `W` be the accepted outcome pool, `B` be challenge bonds terminally `ADDED_TO_SETTLEMENT`, and `D=T+B`. Payout arithmetic uses a feasibility-gated full-precision primitive, never ordinary potentially overflowing multiplication:

`q_u = floor_mul_div(s_u,D,W) = floor((s_u*D)/W)`

`r_u = mul_mod(s_u,D,W) = (s_u*D) mod W`

The conceptual product has at least 512-bit precision for `uint256` operands, or an equivalent verified algorithm that returns the same quotient and remainder without intermediate overflow. `W>0` is a precondition. Failure to prove this primitive on GenLayer blocks production-contract coding; no valid market may become unfinalizable because `s_u*D` overflows.

V4 selects **Option A: precomputed allocations**. Positive-winner finalization MUST scan `participant_addresses[0:participant_count]`, load each participant's final-outcome stake, ignore zero winning-side stakes, compute every base/remainder, and choose exactly `R=D-sum(q_u)` bonus recipients by descending remainder then ascending unsigned 20-byte address. Before claims open it MUST write each `Position.winning_allocation_wei=q_u` plus its bonus, keep `winning_claimed=false`, and require `sum(winning_allocation_wei)=D`. Addresses are enumerated in first-stake order but ranking is independent of that order. `claim_winnings` reads only the stored allocation and claim flag and never rescans participants.

For every market, the complete participant index MUST satisfy:

- `participant_count = len(participant_addresses) <= max_positions`;
- `participant_index_plus_one[user]=0` exactly when `user` is absent;
- for every array index `i`, `participant_index_plus_one[participant_addresses[i]]=i+1`;
- every listed address has one existing `Position` with positive `total_contributed_wei`, and every positive position has exactly one listed address;
- `sum(position.yes_wei for participant_addresses)=yes_pool`;
- `sum(position.no_wei for participant_addresses)=no_pool`;
- `sum(position.invalid_wei for participant_addresses)=invalid_pool`;
- `sum(position.total_contributed_wei for participant_addresses)=total_pool`; and
- each position has `total_contributed_wei=yes_wei+no_wei+invalid_wei`.

Addresses are appended exactly once on their first successful positive stake, never removed or reordered. Additional stakes by a registered participant do not change the index or count.

The finalization scan/ranking/allocation writes require immutable hard `max_positions`. Production-contract coding is blocked until the participant storage layout, full-precision arithmetic, and maximum scan are proven by isolated prototypes; test deployment is later blocked until measured worst-case finalization fits practical limits with safety margin. A symbolic bound is not feasibility evidence.

Finalization outcome precedence is exact:

1. `T=0`: `CANCELLED/EMPTY_CANCEL`, `terminal_reason=EMPTY_FINALIZATION`, `outcome=null`, and `winning_pool_wei=stake_pool_wei=bond_bonus_wei=distributable_wei=refundable_stake_wei=0`. No winnings or principal-refund claim exists. Creation and other independently refundable bonds use only their typed claim methods.
2. Else `W=0`: `REFUNDABLE/REFUNDS`, `terminal_reason=NONE`, `outcome=null`, `winning_pool_wei=0`, `stake_pool_wei=T`, `bond_bonus_wei=distributable_wei=0`, and `refundable_stake_wei=T`; every participant receives exactly `yes_wei+no_wei+invalid_wei`, and no challenge bond is added.
3. Else: `FINALIZED/WINNERS`, `terminal_reason=NONE`, the accepted `outcome`, `winning_pool_wei=W`, `stake_pool_wei=T`, `bond_bonus_wei=B`, `distributable_wei=T+B`, and zero refundable principal.

Claim eligibility has no expiry and unclaimed liabilities remain permanently assigned. The selected Gate 5 state machine MUST reject or idempotently contain duplicates. Leaderboard totals may increase only for an observably completed winnings payment; refunds and returned bonds are excluded.

Bond disposition is exact:

- Creation: `LOCKED -> REFUNDABLE` on every terminal transition; never added; beneficiary claims once.
- Retry: first kind attempt is `NONE`. A bonded attempt starts `LOCKED`; its own success immediately makes it `REFUNDABLE` and increases its requester's `refundable_retry_bonds_by_user_wei` by the exact bond. Failure/expiry leaves it `LOCKED` while another protocol attempt may resolve. Every terminal transition makes every remaining locked retry bond refundable and performs the same per-user increase. Retry bonds are never added or forfeited. Attempt N remains independently claimable after N fails, N+1 succeeds, and the market finalizes.
- Challenge: on successful re-resolution, if its verdict differs from the initial verdict **or is `INVALID`**, every locked challenge bond becomes `REFUNDABLE` immediately and increases its challenger's `refundable_challenge_bonds_by_user_wei` by the exact bond. If it equals the initial non-`INVALID` verdict, bonds remain locked until terminalization: positive-pool `WINNERS` makes each `ADDED_TO_SETTLEMENT`; any refund/cancellation/zero-winning-pool path makes each `REFUNDABLE` and performs the same per-user increase. `ADDED_TO_SETTLEMENT` cannot be claimed. This comparison uses only stored closed-enum verdicts.

For each bond, any completed-payment status selected by Gate 5 requires prior `REFUNDABLE`; `ADDED_TO_SETTLEMENT` and completed payment are mutually exclusive. Each per-user refundable challenge/retry aggregate equals the exact sum of that beneficiary's outstanding refundable bond liabilities. Its transition during request, delivery, failure, retry, or reconciliation is selected by Gate 5. Bond amounts observably paid to beneficiaries or onward to winners, plus every outstanding or in-flight liability category required by that selected model, MUST equal bonds received per market and contract-wide.

For the following invariant, the unsuffixed mathematical names denote the corresponding exact market fields ending in `_wei`; the contract-wide equation substitutes the six `protocol_*_wei` fields.

Under the current single-write candidate, and only if Gate 5 proves its atomic semantics, every committed observable state uses:

`funds_received = funds_paid + stake_liability + locked_bond_liability + refundable_bond_liability + settlement_added_bond_liability`.

At winner settlement, `stake_liability=T` and `settlement_added_bond_liability=B`; assigned payouts total `T+B`. Gate 5 MUST preserve stake-origin-first and ascending challenge-ID bond attribution without claim-order dependence, but it may require explicit in-flight/reconciliation fields before liabilities are reduced. This attribution never changes the user's payout. There is no fee category. Production-contract coding is blocked until Gate 5 proves outbound failure behavior, exact conservation, and whether unsolicited direct transfers are impossible; if inbound surplus is possible, this revision must add an explicit nonwithdrawable quarantined-surplus category first.

## 8. Administration

The accepted baseline is no owner, guardian, pause, proxy, mutable configuration, emergency withdrawal, treasury, or fee recipient. No role can change an existing market, verdict, pool, position, evidence, attempt, deadline, bond, payout formula, or claim; block exits; confiscate/redirect escrow; or revive a terminal market. New parameters require a new address and explicit version routing. An optional guardian is rejected for initial V4, not part of baseline guarantees.

## 9. Mandatory GenLayer feasibility gates

No V4 production-contract coding may begin until repository evidence or isolated throwaway prototypes prove all ten gates below. Before then, work is limited to documentation, minimal experiments, benchmarks, serializer/math harnesses, and feasibility prototypes that do not constitute the V4 production contract:

1. deterministic request bookkeeping followed by separate intelligent execution;
2. stale execution cannot overwrite a retry, successful successor, or terminal cancellation;
3. hard-backstop cancellation succeeds despite unresolved earlier intelligent execution;
4. catchable malformed output can record `FAILED`, and transaction-level rollback/pending behavior is understood;
5. deferred EOA/EVM payout behavior through the ghost/EVM layer: exact parent state after external-message or receiving-EVM failure, observable failure, deterministic retry/reconciliation, one economic payment, no double claim or lost liability, no claim-order dependence, reentrancy safety, exact conservation, and whether unsolicited or forced inbound value changes balance without a protocol receipt. Internal intelligent-contract value messages are not a substitute because child failure is not automatically refundable. Atomic parent rollback may retain the single-write claim model only with reproducible Bradbury evidence; otherwise the ABI, activity mapping, claim statuses, and tests require independently reviewed asynchronous or two-phase redesign;
6. SHA-256, deterministic `bytes32`/integer storage, and deterministic conversion/storage of contract time as `Timestamp=uint64`;
7. accepted-state versus finalized-state concurrency behavior;
8. bounded complete canonical-invocation size plus deterministic storage and chunked retrieval of the exact bounded byte-array snapshot, including all fixed instructions and maximum market input;
9. the exact participant index/storage layout, full-precision `floor_mul_div`/`mul_mod`, maximum-participant finalization scan/allocation-write cost, and worst-case ranked-leaderboard claim update with safety margin;
10. deterministic contract-time conversion/arithmetic and all timing, attempt, pagination, statistics, and bounded-view operations fit practical execution limits using the selected hard values.

**Unsupported but disclosed:** the approved Gate 1 experiment proves only gate 1's two-step capability. Gate 5 and gates 2–4 and 6–10 remain unresolved. A failed gate blocks production-contract coding and deployment and requires explicit redesign. The pinned API rules are maintained in [GenLayer compatibility baseline](GENLAYER_COMPATIBILITY_BASELINE.md).

## 10. Decision register

This register closes the non-claim architecture and the economic intent, beneficiaries, and amounts of claim paths. Gate 5 intentionally remains open for the exact payout-delivery state machine, including claim ABI additions, delivery and reconciliation statuses, activity timing, liability transitions, retry behavior, and asynchronous or two-phase alternatives. No production claim implementation is authorized until Gate 5 selects one model and the resulting ABI, storage, activity, accounting, and tests receive independent review. Numeric production constants remain proposed until feasibility benchmark/economic review.

| ID | Question | Recommended/selected option | Alternatives | Safety implications | Economic implications | Complexity | Status/gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V4-D01 | Creation bond | Exact refundable configured amount; never slashed/added; delivery mechanics remain Gate 5 conditional. | Zero; slash. | Independent one-time liability. | Spam cost but returned. | Medium. | economic rule accepted; value before test deployment; delivery Gate 5 |
| V4-D02 | Challenge bond | Exact amount and objective verdict comparison in section 7; delivery mechanics remain Gate 5 conditional. | Always return; always slash. | Never penalized for resolver failure. | Unchanged non-invalid result can reward winners. | High. | economic rule accepted; value before test deployment; delivery Gate 5 |
| V4-D03 | Challenge duration | Immutable positive `C`; full exclusive-end window. | Creator choice. | Prevents premature finalization. | Bounded lock. | Low. | semantic rule accepted; value selected and proven during feasibility work before production-contract coding |
| V4-D04 | Attempt caps | Separate positive finite kind caps. | One cap; no retries. | Bounded failure path. | Limits retry cost. | Medium. | semantic rule accepted; values selected and proven during feasibility work before production-contract coding |
| V4-D05 | Cancellation timeout | Immutable `U` plus exact earlier predicates/precedence. | Backstop only. | Permissionless release path. | Bounds escrow duration. | Medium. | semantic rule accepted; value selected and proven during feasibility work before production-contract coding |
| V4-D06 | Protocol fee | Zero; no fee ABI/liability. | Future nonzero version. | Removes treasury extraction. | No protocol revenue. | Low. | accepted |
| V4-D07 | Unclaimed funds | Perpetual assigned claim liabilities; no sweep; exact delivery/retry mechanics remain Gate 5 conditional. | Expiry. | No confiscation. | Dormant assigned escrow. | Medium. | economic rule accepted; delivery Gate 5 |
| V4-D08 | Zero winning pool with `T>0` | Principal refunds; no bond bonus. | Redistribution. | No division by zero. | No winner payout. | Low. | accepted |
| V4-D09 | Evidence dedup | Exact domain-tagged canonical SHA-256; no semantic claims. | URL only; allow duplicates. | Deterministic. | Reduces exact spam only. | Medium. | accepted, SHA gate |
| V4-D10 | Creator powers | Immutable metadata; empty creator cancel only. | Editing/moderation. | Prevents creator capture. | Mistakes require cancel before activity. | Low. | accepted |
| V4-D11 | Guardian | None. | Refund-only guardian. | No privileged blocker/seizure. | No discretionary rescue. | Low. | accepted |
| V4-D12 | Upgrade | Immutable new addresses/version routing. | Proxy. | No hidden upgrade authority. | Version liquidity separation. | Medium. | accepted |
| V4-D13 | Two-step execution | Request then execution, contingent on gates. | Single intelligent write. | Enables durable expiry if feasible. | Extra transaction. | High. | accepted architecture; all gates before production-contract coding |
| V4-D14 | Appeals | One challenge round; cooldown then finalization. | Recursive appeals. | Bounded input/liveness. | Limited appeal depth. | Medium. | accepted |
| V4-D15 | Multi-side positions | Allowed with side-specific payout and one principal refund. | One side/user. | Exact reconciliation required. | Enables hedging. | Medium. | accepted |
| V4-D16 | Serializer/digest | Exact custom canonical JSON and SHA-256 over the complete invocation envelope. | CBOR; market-data-only digest. | Consensus exact if gates pass. | Fixed input cost. | High. | accepted architecture; all gates before production-contract coding |
| V4-D17 | Remainder allocation | Largest remainder/address tie-break with precomputed allocations and full-precision arithmetic. | Claim-time rescan; dust to final claimant. | Exact, claim-order-independent payouts. | Fair deterministic dust. | High. | accepted architecture; gate 9 before production-contract coding |
| V4-D18 | Participant indexing | Immutable first-stake address array plus index-plus-one mapping; Option A allocation storage. | Claim-time full scan; external index. | Complete on-chain enumeration/reconciliation. | Finalization bears scan/write cost. | High. | accepted architecture; gate 9 before production-contract coding |
| V4-D19 | AI invocation binding | Versioned envelope commits every instruction/data byte and fixed API mapping. | Market-data-only digest; mutable helper prompt. | Prevents same digest with different application instructions. | Larger canonical input. | High. | accepted architecture; gates 1, 6, and 8 before production-contract coding |
| V4-D20 | Audit storage | Bounded append-only market-local indexed records with constructed non-claim capacity; claim branches and final capacity remain Gate 5 conditional. | Platform events only; optional audit. | Exit actions cannot be blocked by audit exhaustion. | Predictable storage cost. | High. | non-claim architecture accepted; claim storage/capacity Gate 5 |
| V4-D21 | Empty resolution finalization | `CANCELLED/EMPTY_CANCEL/EMPTY_FINALIZATION`; bond-only claims. | `REFUNDABLE`; creator cancel reason. | Closed unambiguous terminal semantics. | No stake liability. | Low. | accepted |
| V4-D22 | Read ABI | Closed bounded non-claim scalar/keyed/page DTOs in section 3.2; no storage entity or mapping return; Gate 5 may require additional claim-delivery status DTOs or methods. | Storage-object returns; off-chain indexing only. | Prevents unbounded or incompatible reads. | More ABI surface. | High. | non-claim read ABI accepted; claim-delivery additions Gate 5 |
| V4-D23 | Leaderboard | Stored descending-winnings/address rank with one-based rank; mutation occurs only at Gate 5-selected observable payment completion. | First-payment order; view-time sort. | No unbounded view sort; claim update must fit. | Ranking includes only paid winnings. | High. | ranking accepted; completion timing Gate 5; capacity/cost gate 9 |
| V4-D24 | Timestamp | Exact `uint64` storage and checked arithmetic. | Platform integer; `uint256`. | Closed ABI and overflow behavior. | None. | Medium. | accepted; platform conversion/storage proven in gates 6 and 10 before production-contract coding |
| V4-D25 | Claimable aggregates | Stored per-user refundable challenge/retry economic aggregates; Gate 5 may add delivery, in-flight, failure, retry, or reconciliation fields. | Bounded scan in view. | Constant-layout aggregate view. | Additional writes/storage. | Medium. | economic aggregate accepted; delivery storage Gate 5 |
| V4-D26 | Statistics | Stored non-claim phase/receipt and economic payment/liability aggregates with no market scan; exact in-flight/reconciliation additions remain Gate 5 conditional. | Full scan; off-chain only. | Bounded exact view and reconciliation. | Additional write accounting. | Medium. | non-claim/economic intent accepted; delivery accounting Gate 5 |
| V4-D27 | Protocol ID origin | All market/evidence/challenge/attempt/activity IDs are one-based; zero invalid; attempt kinds share one market-local sequence; null remains the only absent reference. | Zero-based or per-kind attempt numbering. | Prevents ABI, digest, and activity-history divergence. | None. | Low. | accepted |
| V4-D28 | Creation duration | One captured `t_create`; checked inclusive `t_create+min <= stake_cutoff_at <= t_create+max`; exact derived timestamp checks before any receipt/ID. | Subtraction-first or unspecified boundaries. | Prevents boundary and multi-time-read disagreement. | None. | Medium. | accepted; time operations remain gates 6 and 10 |
| V4-D29 | Evidence/challenge emptiness | Evidence URL and challenge reason required; evidence note and challenge URL optional as non-null `""`; exact processing precedes bounds/digest/storage. | Implicit emptiness or null optionals. | Prevents schema/digest/admission divergence. | None. | Medium. | accepted |

Decision gates: the non-claim normative alternatives and claim economic intent above are closed, while the Gate 5-controlled delivery ABI, storage, statuses, activity, retry/reconciliation, and accounting alternatives remain explicitly open. `AI`, `C`, `G`, `AR`, `F`, `fund_unlock_delay`, both attempt caps, maximum invocation and byte-storage caps, participant/page/activity/leaderboard/stake-call caps, and every other execution/storage-dependent hard cap MUST be selected and proven during feasibility work. All ten gates, including timing feasibility with those actual values, MUST pass before a V4 production-contract implementation branch begins. Before test deployment, implementation must be complete, remaining economic values selected, all tests pass, and an independent review report zero P0/P1 findings. Before production, complete the [migration acceptance stages](V4_MIGRATION_PLAN.md) and repeat independent review with zero P0/P1 findings.
