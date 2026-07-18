# TruthMarket V4 test plan

Status: **proposed test plan for an unimplemented and undeployed V4**. It is normative with the [architecture](V4_ARCHITECTURE.md), [state machine](V4_STATE_MACHINE.md), [economics and safety](V4_ECONOMICS_AND_SAFETY.md), [migration plan](V4_MIGRATION_PLAN.md), and pinned [GenLayer compatibility baseline](GENLAYER_COMPATIBILITY_BASELINE.md). Passing current V3 repository tests does not satisfy this future plan.

## 1. Test layers and oracles

The future suite MUST include pure serializer/math tests, contract unit tests, generated state/property tests, adversarial ordered-transaction tests, GenLayer feasibility prototypes, maximum-bound benchmarks, isolated deployment integration, and versioned frontend integration. Every write test asserts state, accounting, recorded event/result, exact accepted value, and rejection rollback. Gate 5 MUST first prove the deferred external-message lifecycle and select the payout state machine; payout tests then assert its exact parent/child states, observable completion and failure, retry or reconciliation, idempotency, reentrancy safety, and conservation. No test may assume same-write payout rollback before that proof.

Reference oracles are the closed enums, formulas, schemas, predicates, and inequalities in the linked specifications. No frontend state is a contract oracle. GenLayer transaction acceptance is never treated as transaction finalized-success or market settlement.

The current activity candidate uses this enum and no aliases: `MARKET_CREATED | STAKE_ADDED | EVIDENCE_SUBMITTED | EVIDENCE_CLOSED | ATTEMPT_REQUESTED | ATTEMPT_SUCCEEDED | ATTEMPT_FAILED | ATTEMPT_EXPIRED | CHALLENGE_SUBMITTED | MARKET_FINALIZED | MARKET_CANCELLED | WINNINGS_CLAIMED | STAKE_REFUND_CLAIMED | CREATION_BOND_CLAIMED | CHALLENGE_BOND_CLAIMED | RETRY_BOND_CLAIMED`. Every successful non-claim public write must match exactly one row of the [architecture activity mapping](V4_ARCHITECTURE.md#31-write-methods), including affected ID, previous/new phase, and received value; every rejected or transaction-level reverted write appends none. Claim-side kinds, timing, paid values, success branches, and failure branches MUST be replaced by the exact Gate 5-selected model if atomic parent rollback is not proven.

## 2. Unit-test matrix: every write

| Method | Required success cases | Required rejection/recovery cases |
| --- | --- | --- |
| `create_market` | first market ID `1`, second `2`; one captured `t_create` stored as `created_at`; exact checked inclusive `t_create+min <= cutoff <= t_create+max`; all derived `uint64` timestamps/bond; empty participant/activity indexes; exact preterminal `Settlement` defaults and phase/statistics aggregates; first activity ID `1` | each empty/oversize/invalid-Unicode field; wrong bond; market ID zero; one before min/one after max; all bound/derived overflows and deadline underflow; market/attempt/activity-formula cap; every rejection/rollback consumes no funds, market ID, activity ID, or counter |
| `stake` | each side; repeat; multi-side; first stake atomically appends address/maps index+1/creates position; later stake never appends; exact pool/position/activity totals | zero/below min; invalid side; at/after cutoff; terminal; participant/stake-call cap before value; failed stake appends nothing; side/pool/index/arithmetic overflow; wrong payable value |
| `submit_evidence` | first evidence ID `1`; required processed URL; optional processed note including `""`; exact trim/bytes/digest; ascending IDs; maximum accepted | raw/trimmed-empty URL; duplicate after trim; oversize; invalid scalar; count cap; no truncation/ID gap; every rejection consumes no ID |
| `close_evidence` | exact cutoff and later while `<U`; close time stored once | one second early; exact/after `U`; duplicate; terminal |
| `request_resolution` | only first-ever initial; first market attempt number `1`; complete frozen input uses one-based IDs; predecessor null; zero/`NONE` bond | attempt zero; failed initial then zero-bond rerequest; expired initial then rerequest; any previous initial; active; after deadline; nonzero value; each rejection consumes no number |
| `retry_resolution` initial | exact nonzero latest failed and stored/time-derived expired predecessor; next shared-sequence number; materialize expiry; independent bond; count/latest/active | predecessor zero; wrong bond low/high; effectively requested/succeeded/wrong kind/stale/missing predecessor; active request; cap; one second after admission; initial already succeeded; no rejected retry consumes a number |
| `execute_resolution` initial | valid complete invocation-envelope digest/output; stored status succeeds; derived active becomes null; times/window/finalizable exact; own retry bond refundable | any uncommitted prompt/task/criteria/wrapper; stale/nonactive/superseded; at/after execute end; insufficient downstream time; at `U`; digest mismatch; terminal; transaction rollback behavior |
| malformed initial execution | catchable schema failure stores `FAILED`/code and makes derived active null without allocating another attempt number | substantive well-formed `INVALID` must instead succeed; uncatchable failure behavior captured by prototype |
| `expire_attempt` initial | exact execute boundary and later before `U`; materializes effective expiry; active view already null; bond remains locked | one second early; stale/success/failed; at/after `U` uses hard backstop |
| `challenge_resolution` | first challenge ID `1`; start, midwindow, one instant before end; optional processed URL including `""`; required processed reason; exact bond; all records/dedup; first sets due | empty-after-trim reason; invalid/oversize text; before start; exact/after end; zero/wrong attempt/kind/value; duplicate after trim; cap; terminal; every rejection consumes no ID |
| `request_reresolution` | only first-ever after full window; challenges complete; next number follows all initial attempts in the shared sequence; zero/`NONE` bond | failed re-resolution then zero-bond rerequest; expired re-resolution then rerequest; any prior re-resolution; no challenge; before end; after due; active; insufficient `AR+F`; nonzero value; no rejection consumes a number |
| `retry_resolution` re-resolution | exact latest failed/expired predecessor; exact bond; all admission guards | wrong bond; requested/succeeded/stale/wrong-kind predecessor; active; cap; after due; insufficient time; no challenge |
| `execute_resolution` re-resolution | valid complete challenge invocation; replaces accepted result; makes derived active null; cooldown; own bond refund; objective challenge transitions | stale initial/latest; at/after expiry; insufficient `F`; terminal; digest/output/reference failure; earlier attempt cannot overwrite |
| malformed re-resolution | stores failed if catchable; makes derived active null; bonds remain locked | malformed must not become `INVALID`; transaction rollback path remains recoverable |
| `expire_attempt` re-resolution | exact boundary; returns no-active challenged provisional | early/stale/terminal/backstop cases |
| `finalize_market` | unchallenged initial after exact window; successful re-resolution after exact cooldown; YES/NO/INVALID; complete participant scan; full-precision quotient/remainder; all precomputed allocations written and summed before claims; exact winner/refund/empty modes/reasons; all bond dispositions | before time; any challenge with initial; active/pending re-resolution; stale accepted; at/after `U`; participant/index/pool mismatch; unsafe arithmetic; allocation sum mismatch; terminal; no division by zero |
| `cancel_market` | every reason and precedence combination; pool/nonpool result; all locked bonds assigned | every ineligible near-match; false/lower-precedence reason; exact inclusive request deadline; terminal duplicate |
| `claim_winnings` | Gate 5-selected lifecycle reads stored allocation without participant rescan and produces exactly one observable payment; paid statistics and leaderboard change only at the proven completion point | wrong user/mode; loser/zero; duplicate; ranking-cap/cost failure; deferred-message failure, retry/reconciliation, and reentrancy under selected model |
| `claim_refund` | Gate 5-selected lifecycle pays exact multi-side principal only once | bond excluded; wrong mode/user; zero/duplicate; deferred-message failure and selected recovery |
| `claim_creation_bond` | Gate 5-selected lifecycle pays the exact beneficiary after normal finalization, refundability, or empty cancellation | nonbeneficiary; locked; added (unreachable type asserted); already completed or in-flight; deferred-message failure and recovery |
| `claim_challenge_bond` | Gate 5-selected lifecycle pays each independent eligible bond exactly once | locked; settlement-added; already completed or in-flight; wrong caller/ID; deferred-message failure and recovery |
| `claim_retry_bond` | Gate 5-selected lifecycle pays own successful retry and every eligible earlier failed bond exactly once | zero/`NONE`; locked; added (unreachable); already completed or in-flight; wrong requester/attempt; deferred-message failure and recovery |

Explicit retry regression sequences MUST include failed and expired zero-bond rerequest rejection for both stages, multiple callers racing the same predecessor, multiple retry submissions, wrong attached amount, active-request rejection, cap rejection, admission-deadline rejection, and attempt N failed/N+1 succeeded/N independently claimed.

### 2.1 One-based identifier allocation tests

The ID oracle is exact: successful creation allocates `market_id=pre-write market_count+1` and then `market_count=market_id`; attempts allocate `initial_attempt_count+reresolution_attempt_count+1` across one shared market-local sequence; evidence, challenge, and activity allocate their applicable pre-write count plus one. Zero is invalid and nullable references use `null`.

Tests MUST prove first/second market IDs `1/2`; rejected and market-cap-rejected creation consumes no ID; market zero and IDs above `market_count` reject; first attempt is `1`; an initial attempt followed by first re-resolution is consecutive; every retry continues the same sequence; rejected first request/retry consumes none; catchably failed execution creates no number; attempt zero rejects; first-kind predecessor is null and retries store the exact existing one-based predecessor; first evidence/challenge/activity IDs are `1`; all counters remain gap-free after rejection and transaction rollback; claim-side activity/ID behavior across deferred-message failure follows the Gate 5-selected state machine; and every list begins with the first one-based ID. Participant `participant_index` remains zero-based and MUST NOT be tested as a protocol ID.

## 3. Unit-test matrix: every view

| View | Required assertions |
| --- | --- |
| `get_protocol_config` | exact `ProtocolConfigView` field order/types/bounds; no owner/fee recipient; values match all view caps |
| `get_market` | every declared `MarketView` scalar/nested DTO equals state; independent booleans/display precedence; no mapping, participant/evidence/challenge/attempt/activity collection, invocation bytes, or internal storage object |
| `list_markets` | exact `MarketSummaryView` and `MarketSummaryPage`; valid IDs exactly `1..market_count`, ascending from `1`; first/second IDs `1/2`; rejected creation creates no gap; deployment cap; no full market return |
| `get_participant_count` | exact array length at zero, after first stakes, and after repeat/multi-side stakes |
| `get_participants` | exact `ParticipantPage`; immutable first-stake order; array/mapping/position consistency |
| `get_position` | exact `PositionView` order/types; absent defaults and found participant index; one/multiple sides and reconciliation |
| `get_winning_allocation` | exact `WinningAllocationView`; zero/false defaults; stored allocation/claim/paid state |
| `get_evidence` | exact `EvidenceResult`; zero ID rejects; present one-based record and positive-missing `found=false/evidence=null`; processed nonempty URL and non-null possibly-empty note |
| `list_evidence` | exact `EvidencePage`; ascending IDs beginning `1`, maximum evidence, no gap after failure, no map-order influence |
| `get_resolution_attempt` | exact `ResolutionAttemptResult`; zero rejects; all scalar/count/bond/result fields; stored/effective/materialized status; positive missing never aliases latest; no invocation/output arrays |
| `list_resolution_attempts` | exact `ResolutionAttemptPage`; shared initial/re-resolution/retry numbers ascending from `1`; no gaps after rejection/failure; no status aliasing |
| `get_attempt_invocation_chunk` | exact `BytesPage`; zero/final/partial chunks; byte cap; reconstruction equals stored snapshot; no full-byte ordinary view |
| `list_attempt_accepted_items` | exact `EvidenceReferencePage`; stored canonical order, membership, bounds, final/empty pages |
| `list_attempt_rejected_items` | exact `RejectedEvidenceReferencePage`; stored canonical order, reason bounds, final/empty pages |
| `list_attempt_risk_flags` | exact `RiskFlagPage`; stored result order, string bounds, final/empty pages |
| `get_challenge` | exact `ChallengeResult`; zero rejects; every field, processed optional URL/nonempty reason, and positive-missing `found=false/challenge=null` |
| `list_challenges` | exact `ChallengePage`; ascending one-based records from `1`, no gaps after failure, exact bond states |
| `get_activity` | exact `ActivityResult`; zero rejects; present one-based record and positive-missing `found=false/activity=null` |
| `list_activity` | exact `ActivityPage`; consecutive IDs beginning `1`, exact schemas/values/null mappings and one-based affected IDs; one record per successful non-claim write and none per rejected/reverted non-claim write; claim-side timing follows the Gate 5-selected observable-completion model |
| `get_claimable` | exact `ClaimableView`; checked six-field sum; nonterminal refundable bonds included; excluded statuses; per-user aggregate reconciliation; no scan or ID array |
| `get_cancellation_eligibility` | exact `CancellationEligibilityView`; market-wide, permissionless, creator-only, caller authorization, and reason combinations |
| `get_stats` | exact stored `ProtocolStatsView`; phase-count sum, receipts/payments/liabilities, fee zero; no market scan |
| `get_leaderboard` | exact `LeaderboardEntryView`/`LeaderboardPage`; descending paid winnings, ascending-address ties, one-based rank; no view-time sort; refunds/bonds/V3 excluded |

Every paginated view and byte chunk MUST be tested with limit zero, one, exact `max_page_size`, one over cap, offset zero, offset equal count, offset one over count, full page, final partial page, and empty collection. Each exact page must assert `offset`, `next_offset`, `total_count`, `has_more`, item type/order, and `items.length<=limit`; reads MUST not mutate. ABI conformance tests reject missing, extra, reordered, wrong-type, or wrong-optional DTO fields where the target ABI codec can observe them. Static call-graph/cost tests MUST prove no view performs an unbounded market, participant, challenge, attempt, output, activity, invocation, or leaderboard scan.

## 4. State-transition and adversarial ordering tests

Generate every row and forbidden edge in the [state table](V4_STATE_MACHINE.md#2-complete-transition-table). At minimum:

- terminal phases cannot revive and cancellation/finalization cannot both commit;
- challenge one instant before end permanently blocks the initial result; request re-resolution only after full window;
- finalize and challenge near-simultaneously: chain order plus exclusive end gives one deterministic valid result;
- request re-resolution and cancel near due: at exact due request is eligible; strictly after due cancellation is eligible; committed state rejects stale loser;
- finalize and hard-backstop cancel near `U`: finalization is only `<U`; cancellation is only `>=U`;
- intelligent execution completing after cancellation eligibility or terminal cancellation rejects without state/bond change;
- retry execution and a successor request racing cannot create two active requests; stale execution cannot overwrite;
- multiple callers requesting the same retry produce at most one successor/bond;
- initial success after its `execute_by` or after request expiration rejects;
- re-resolution result after absolute backstop rejects;
- no challenge recursion exists after successful re-resolution;
- frontend accounts/wallet races may show stale UI, but only committed contract state authorizes writes.

For every attempt status, views MUST assert stored status, effective status, and `expiry_materialized` under this exact five-row matrix:

| Stored status | Time condition | Expected effective status | Expected `expiry_materialized` |
| --- | --- | --- | --- |
| `REQUESTED` | `now<execute_by` | `REQUESTED` | `false` |
| `REQUESTED` | `now>=execute_by` | `EXPIRED` | `false` |
| `SUCCEEDED` | before, at, and after `execute_by` | `SUCCEEDED` | `false` |
| `FAILED` | before, at, and after `execute_by` | `FAILED` | `false` |
| `EXPIRED` | before, at, and after `execute_by` | `EXPIRED` | `true` |

The test oracle is the function `effective_status(attempt,now)=EXPIRED if stored_status=REQUESTED AND now>=execute_by; otherwise stored_status`, with `expiry_materialized=(stored_status=EXPIRED)`. At one unit before `execute_by`, a stored request is effective `REQUESTED` and `active_attempt_no` identifies it. At the exact boundary, stored remains `REQUESTED`, effective is `EXPIRED`, materialized is false, and active is null. `expire_attempt` or atomic retry changes stored to `EXPIRED` and materialized to true without changing its effective status. Terminalization makes active null without rewriting an unresolved historical stored status. No ordinary write may treat effective expiry as active.

### 4.1 Exact activity projection tests

Every non-claim case below MUST assert exactly one new consecutive activity ID, the exact kind and affected ID, exact previous/new phases, exact received value, and no other activity record. For every non-claim row, repeat at least one rejected/reverted case and assert no record or ID consumption. Transaction-level execution rollback MUST append none and restore all state. The five claim rows describe the current atomic candidate only; Gate 5 MUST prove it or replace them with exact request/completion/failure/retry activity oracles.

| Required case | Expected activity and branch oracle |
| --- | --- |
| `create_market` | `MARKET_CREATED`; affected null; null -> `OPEN`; creation bond received; zero paid |
| first and repeated `stake` | `STAKE_ADDED`; affected null; `OPEN` -> `OPEN`; exact stake received; zero paid |
| `submit_evidence` | `EVIDENCE_SUBMITTED`; affected new evidence ID; `OPEN` -> `OPEN`; zero values |
| `close_evidence` | `EVIDENCE_CLOSED`; affected null; `OPEN` -> `EVIDENCE_CLOSED`; zero values |
| ordinary first request | `ATTEMPT_REQUESTED`; affected new attempt; `EVIDENCE_CLOSED` -> `RESOLUTION_REQUESTED`; zero values |
| initial retry after stored failure | `ATTEMPT_REQUESTED`; affected successor; `EVIDENCE_CLOSED` -> `RESOLUTION_REQUESTED`; retry bond received |
| initial retry after stored expiry | `ATTEMPT_REQUESTED`; affected successor; `EVIDENCE_CLOSED` -> `RESOLUTION_REQUESTED`; retry bond received |
| initial atomic time-derived expiry plus retry | only `ATTEMPT_REQUESTED` for successor; `RESOLUTION_REQUESTED` -> `RESOLUTION_REQUESTED`; retry bond received; no `ATTEMPT_EXPIRED` record |
| successful initial execution | `ATTEMPT_SUCCEEDED`; affected executed attempt; `RESOLUTION_REQUESTED` -> `PROVISIONALLY_RESOLVED`; zero values |
| catchably malformed initial execution | `ATTEMPT_FAILED`; affected executed attempt; `RESOLUTION_REQUESTED` -> `EVIDENCE_CLOSED`; zero values |
| explicit initial expiry | `ATTEMPT_EXPIRED`; affected expired attempt; `RESOLUTION_REQUESTED` -> `EVIDENCE_CLOSED`; zero values |
| `challenge_resolution` | `CHALLENGE_SUBMITTED`; affected new challenge ID; `PROVISIONALLY_RESOLVED` -> same; challenge bond received; zero paid |
| first re-resolution request | `ATTEMPT_REQUESTED`; affected new re-resolution attempt; `PROVISIONALLY_RESOLVED` -> `RERESOLUTION_REQUESTED`; zero values |
| re-resolution retry after stored failure or expiry | `ATTEMPT_REQUESTED`; affected successor; `PROVISIONALLY_RESOLVED` -> `RERESOLUTION_REQUESTED`; retry bond received |
| re-resolution atomic time-derived expiry plus retry | only `ATTEMPT_REQUESTED` for successor; `RERESOLUTION_REQUESTED` -> `RERESOLUTION_REQUESTED`; retry bond received; no `ATTEMPT_EXPIRED` record |
| successful re-resolution execution | `ATTEMPT_SUCCEEDED`; affected executed attempt; `RERESOLUTION_REQUESTED` -> `PROVISIONALLY_RESOLVED`; zero values |
| catchably malformed re-resolution execution | `ATTEMPT_FAILED`; affected executed attempt; `RERESOLUTION_REQUESTED` -> `PROVISIONALLY_RESOLVED`; zero values |
| explicit re-resolution expiry | `ATTEMPT_EXPIRED`; affected expired attempt; `RERESOLUTION_REQUESTED` -> `PROVISIONALLY_RESOLVED`; zero values |
| unchallenged or challenged winner finalization | `MARKET_FINALIZED`; affected null; `PROVISIONALLY_RESOLVED` -> `FINALIZED`; zero values |
| zero-winning-pool finalization | `MARKET_FINALIZED`; affected null; `PROVISIONALLY_RESOLVED` -> `REFUNDABLE`; zero values |
| empty `T=0` finalization | `MARKET_FINALIZED`; affected null; `PROVISIONALLY_RESOLVED` -> `CANCELLED`; zero values |
| every `cancel_market` reason with `T=0` | `MARKET_CANCELLED`; affected null; exact prior nonterminal phase -> `CANCELLED`; zero values |
| every `cancel_market` reason with `T>0` | `MARKET_CANCELLED`; affected null; exact prior nonterminal phase -> `REFUNDABLE`; zero values |
| `claim_winnings` (atomic candidate, Gate 5 conditional) | `WINNINGS_CLAIMED` only at observably completed payment; affected null; `FINALIZED` -> same; exact winnings paid |
| `claim_refund` (atomic candidate, Gate 5 conditional) | `STAKE_REFUND_CLAIMED` only at observably completed payment; affected null; `REFUNDABLE` -> same; exact principal paid |
| `claim_creation_bond` (atomic candidate, Gate 5 conditional) | `CREATION_BOND_CLAIMED` only at observably completed payment; affected null; current phase -> same; exact creation bond paid |
| `claim_challenge_bond` (atomic candidate, Gate 5 conditional) | `CHALLENGE_BOND_CLAIMED` only at observably completed payment; affected challenge ID; current phase -> same; exact challenge bond paid |
| `claim_retry_bond` (atomic candidate, Gate 5 conditional) | `RETRY_BOND_CLAIMED` only at observably completed payment; affected attempt number; current phase -> same; exact retry bond paid |

Static manifest tests MUST enumerate the exact closed non-claim writes and the five current candidate claim-write intents separately, match every non-claim successful result branch to exactly one row of the architecture mapping, detect missing or duplicate branches, prove `retry_resolution` maps only to `ATTEMPT_REQUESTED`, prove all three `finalize_market` branches map to `MARKET_FINALIZED`, and prove `MARKET_CANCELLED` maps only to `cancel_market`. The current candidate has 17 writes, of which five claim entries are Gate 5 conditional. After Gate 5, tests MUST recalculate and freeze the selected complete ABI method count, claim statuses, activity branches, total branch count, and activity capacity, followed by independent review. The candidate formula `4 + max_stake_calls_per_market + max_evidence + 3*A + 2*max_challenges + max_positions` is accepted only if Gate 5 proves the one-record completed-claim candidate.

## 5. Timing construction and boundary properties

For generated valid configurations, compute:

`initial_request_deadline_at = U-(AI+C+G+AR+F)`.

For creation, capture one `t_create` and use no other time value. Assert `created_at=t_create`, `min_market_duration>0`, `max_market_duration>=min_market_duration`, and the normative checked inclusive guard:

`t_create+min_market_duration <= stake_cutoff_at <= t_create+max_market_duration`.

Test one unit before the minimum, exact minimum, one after minimum, one before maximum, exact maximum, and one after maximum. Exact endpoints accept. Also test time zero, near `MAX_UINT64`, overflow of each `t_create+duration` bound, overflow of `stake_cutoff_at+fund_unlock_delay`, underflow of the initial-deadline subtraction, exact `initial_request_deadline_at=evidence_cutoff_at`, and one unit below that required relation. Every rejected case MUST leave market/activity IDs, market count, funds, and state unchanged.

Assert `Timestamp=uint64`, deterministic exact conversion of runtime contract time, positive durations, every sum/addition `<=MAX_UINT64`, non-underflow subtraction, deadline at/after evidence cutoff, and successful admitted paths produce `finalizable_at<U`. Generated vectors MUST cover time zero, `MAX_UINT64`, one above maximum rejection, every addition overflow, every subtraction underflow, and exact-boundary valid arithmetic. Gate prototypes MUST prove platform conversion/storage/comparison behavior; failure requires architecture revision before production-contract coding.

For **each** timestamp below, test one contract-time unit before, exactly at, and one unit after (using one second if contract time is seconds):

| Timestamp | Exact boundary oracle |
| --- | --- |
| `stake_cutoff_at` | stake allowed before; rejected exact/after |
| `evidence_cutoff_at` | evidence allowed before; rejected exact/after; close allowed exact/after |
| `initial_request_deadline_at` | first/retry request allowed through exact; missed cancel only after |
| initial `execute_by` | execution before; expiry at exact/after |
| `challenge_window_start_at` | challenge at/after start |
| `challenge_window_end_at` | challenge before; re-resolution/finalization at/after |
| `reresolution_due_at` | request/retry through exact; missed cancel only after |
| re-resolution `execute_by` | execution before; expiry at exact/after |
| `finalizable_at` | finalization at/after but only while `<U` |
| `fund_unlock_at` | ordinary progress before only; hard backstop exact/after |

Also test initial admission property `now+C+G+AR+F<=U`, re-resolution admission `now+AR+F<=U`, and execution `now+F<=U` at `-1/exact/+1`, while confirming exclusive execution time makes eventual finalizable time strictly `<U`.

## 6. Cancellation reason and precedence matrix

For each reason, test the exact predicate, every single-clause false near-match, pool `0` and `>0`, locked bond conversion, stored reason/time, and terminal irreversibility:

- `EMPTY_CREATOR_CANCEL`: creator/noncreator; phase; zero/nonzero pool; zero/nonzero evidence; no/some attempt; before/at `U`.
- `INITIAL_REQUEST_DEADLINE_MISSED`: no initial success, no active request, strictly after deadline; exact deadline rejects.
- `INITIAL_ATTEMPTS_EXHAUSTED`: count exactly cap, no initial success/active; below cap rejects.
- `RERESOLUTION_REQUEST_DEADLINE_MISSED`: challenge exists, no re-resolution success/active re-resolution, strictly after due; exact due rejects.
- `RERESOLUTION_ATTEMPTS_EXHAUSTED`: challenge, exact cap, no success/active; below cap rejects.
- `HARD_BACKSTOP`: exact/after `U` in every nonterminal phase, including active initial/re-resolution.

Generate combinations proving precedence: hard backstop over all; applicable kind cap over kind deadline; kind deadline over empty creator cancel. A caller supplying any lower reason MUST fail. Where initial and re-resolution predicates might be syntactically true, stored challenge/success stage MUST select only the applicable kind.

Resolution-terminal tests MUST separately cover `T=0,W=0` after an unchallenged successful initial and after a successful re-resolution. Both MUST produce `CANCELLED/EMPTY_CANCEL/EMPTY_FINALIZATION`, null outcome, every settlement amount zero, no winnings or principal-refund claim, a claimable creation bond and other independently refundable bonds, and duplicate finalization rejection. They MUST distinguish this from creator-only `EMPTY_CREATOR_CANCEL` and from every permissionless cancellation reason. `finalize_market` must reject any requested reason argument because it has none; `cancel_market` must reject `NONE` and `EMPTY_FINALIZATION`.

Market-creation tests MUST inspect the preterminal stored `Settlement`: `market_id` already equals the new market ID and is immutable; `mode=NONE`; `outcome`, `created_at`, and `claims_open_at` are null; every numeric field is zero. Every terminalization test MUST prove that only the permitted terminal fields change atomically and `market_id` never changes.

## 7. Accounting and property tests

After every generated operation, assert:

For the current atomic payout candidate:

`funds_received = funds_paid + stake_liability + locked_bond_liability + refundable_bond_liability + settlement_added_bond_liability`.

Gate 5 MUST either prove that equation across external-message failure with `funds_paid` increasing only on observable payment completion, or select a revised exact equation with explicit in-flight/reconciliation categories.

Also assert:

- participant count equals array length; index-plus-one is a bijection; every listed address has one positive position; every positive position is listed exactly once; first stake appends and every later stake does not;
- each side pool equals its side-position sum over `participant_addresses`; `total_pool=Y+N+I=sum(total_contributed_wei)` and each position total equals its three sides;
- precomputed winner allocations sum exactly `T+B` before claims open and never exceed escrow; claims read only stored allocation; fee rate/amount/liability/recipient are always zero/absent;
- refunds sum exactly contributed principal and never include/overrun bonds;
- per-bond and aggregate received equals amounts paid to beneficiaries/winners plus locked, refundable, and settlement-added outstanding amounts;
- no bond is both claimed and added, claimed twice, omitted, or fictional;
- every observably completed returned-bond payment decreases exactly one refundable category; winner payments consume stake origin first, then settlement-added bonds in ascending challenge-ID order, and all paid totals increase exactly at the Gate 5-proven completion point;
- each per-user refundable challenge/retry aggregate equals that user's refundable per-bond sum after every transition and claim, so `ClaimableView` needs no collection scan;
- all eight stored phase counters sum to `market_count`; every transition moves exactly one phase count; stored receipt/payment/liability/type totals reconcile with markets without a `get_stats` scan;
- stored leaderboard entries remain descending by paid winnings then ascending address, one-based ranks/index mappings reconcile, and pagination does not sort;
- winner/principal economic payments occur exactly once; external-message failure is observable and preserves or restores an exact retryable/reconcilable liability under the Gate 5-selected model;
- no earlier attempt overwrites later accepted/final attempt;
- every successful non-claim write has exactly one consecutive bounded activity record and transaction-level reverted non-claim writes have none; claim activity records follow the Gate 5-selected branches; selected activity capacity remains for every permitted exit and reconciliation action;
- every terminal market exposes all applicable stake and bond release paths; `EMPTY_FINALIZATION` exposes bond-only claims;
- unclaimed winner/principal/bond amounts remain assigned indefinitely.

Exact integer scenarios MUST include one winner; equal winners; uneven stakes; one-wei remainder; multiple equal remainders/address tie; `YES`, `NO`, and `INVALID`; `T=0`; `W=0`; zero fee; challenge-bond bonus; multi-side user; double claim; and winners who never claim. Test `floor_mul_div` and `mul_mod` against a big-integer oracle at zero, one, `MAX_UINT256`, products above `MAX_UINT256`, and divisors near one/maximum; no valid vector may fail from intermediate overflow. A nonzero fee input/config MUST reject rather than exercise a dormant formula.

## 8. Canonical serialization and output tests

Tests MUST construct both complete initial and re-resolution `AIInvocationEnvelope` objects, assert exact key order/UTF-8 bytes/SHA-256, store the exact bounded canonical invocation bytes, reparse/recanonicalize/recompute at execution, and mutate every field one byte at a time to prove digest change. The digest preimage includes all fixed instructions and complete `market_input`; it is never a market-data-only digest. Stored bytes and their digest MUST remain reproducible after success changes market-level `finalizable_at` or accepted-result fields. Ordinary and challenge arrays must be complete/ascending; map insertion and pagination order must not matter. Output IDs must be members of the frozen typed set.

Input text tests MUST validate Unicode scalars, trim only U+0009/U+000A/U+000D/U+0020, perform no normalization, encode strict UTF-8, apply byte bounds without truncation, and use the processed string identically for storage, dedup, and canonical input. The exact empty-after-trim oracle is:

| Field | Expected empty-after-trim result |
| --- | --- |
| Evidence URL | Reject |
| Evidence note | Accept and store `""` |
| Challenge URL | Accept and store `""` |
| Challenge reason | Reject |

For all four fields test raw empty; spaces only; tabs/newlines/carriage returns only; the permitted trim characters around valid content; U+00A0 only; one-byte valid content; exact maximum; one byte over maximum; invalid Unicode; combining sequence versus precomposed character; no truncation; and duplicate digest after edge trimming. Raw strings differing only by trimmed edge characters MUST deduplicate; canonically equivalent byte-distinct Unicode MUST remain distinct. Optional note/URL values are never null. Challenge-without-URL must remain valid when its processed reason is nonempty.

The following scalar/profile golden byte strings have exact SHA-256 hex digests (bytes inside each code span are the complete UTF-8 input):

| Case | Exact canonical bytes | SHA-256 |
| --- | --- | --- |
| ASCII | `{"text":"ASCII"}` | `9d85b22d83740c2c8c35163fdf75ccf3942e70773a4b09396bd4cf58142f7d36` |
| Non-ASCII U+00E9 | `{"text":"é"}` | `42d3cbf59fdccced04e5dff14433fb52d34d58e385e9770ffd896ff517d63b92` |
| Combining `e` + U+0301, no normalization | `{"text":"é"}` | `9b53287cd41955684903378d2b1b4a3ddea9d80d67dcd026319a7c5a9a8a8b42` |
| Permitted edge trim input becomes `x` | `{"text":"x"}` | `fcd1ccec08db6f78a81fee6c26da9e6b8d0d3ba58b4403713fffebcfaa6cf119` |
| U+00A0 nonbreaking spaces preserved | `{"text":" x "}` | `1b37da2b5e558a8d610fff0303133328562e69e15de45ad48b0f366df5467418` |
| Quote, slash, backslash, named controls, U+0001 | `{"text":"\"/\\\b\t\n\f\r\u0001"}` | `e3da66cfdbf28a2e2c1a25858e4a510d532ecd63f1ea40b21a49010275589fc8` |
| Leading-zero address | `{"address":"0x0000000000000000000000000000000000000001"}` | `a73ff2479e8ad87bdaebd2a4811e15d6d385ca6c9897b0211f46db5356b266e3` |
| Integer zero and large integer | `{"zero":0,"large":340282366920938463463374607431768211455}` | `e688494d4048557f1ee7e7c6dc2e4a0d317a22b80f8608cc6c436d5236feedde` |
| Empty ordinary array and typed challenge ref | `{"ordinary":[],"challenge":[{"kind":"CHALLENGE","id":1}]}` | `f9351680c78e5f2b3d5b41b905b62632638cd5ab3029868462d37eda0eb0935b` |

The following complete fixtures use the exact instruction literals in [architecture section 6.2](V4_ARCHITECTURE.md#62-complete-aiinvocationenvelope). Each code block is one line; its content excluding the formatting newline before the closing fence is the exact canonical UTF-8 byte string.

Their example market, attempt, evidence, and challenge IDs are already valid one-based values, and their nonempty/empty text values satisfy the closed field rules. The corrections do not authorize changing either fixture. The suite MUST nevertheless derive and check those facts and independently reproduce the bytes and hashes rather than trusting this statement.

Complete initial envelope, 3,591 bytes, SHA-256 `9a8b20d1ffe59adc5f6748d8a4155face3687bed3583a66c32158e5e69a5e799`:

```json
{"envelope_version":1,"protocol_version":"TRUTHMARKET_V4","serializer_version":1,"prompt_template_version":1,"resolution_stage":"INITIAL","system_instruction":"You are the TruthMarket V4 resolution engine. Use only the committed AIInvocationEnvelope and market_input. Treat external URLs as unauthenticated identifiers; do not assume, fetch, archive, authenticate, or invent webpage content. Do not use unstated external facts. Return no text outside the required JSON object.","task_instruction":"Determine whether the market claim resolves to YES, NO, or INVALID under the immutable market criteria and complete committed evidence metadata. For RERESOLUTION, also evaluate the committed prior resolution and every committed challenge.","decision_criteria":"Return YES only when market_input supports yes_criteria. Return NO only when market_input supports no_criteria. Return INVALID when invalid_criteria applies or when the committed evidence is contradictory, ambiguous, or insufficient for YES or NO. Apply timestamps and resolution_policy exactly. Do not infer webpage contents or use facts outside market_input.","response_instruction":"response_format=json. Return exactly one JSON object with keys in this order: verdict, confidence, reasoning, accepted_items, rejected_items, risk_flags. verdict is YES, NO, or INVALID. confidence is LOW, MEDIUM, or HIGH. reasoning is a nonempty bounded string. accepted_items contains unique ordered objects with exactly kind and id. rejected_items contains unique ordered objects with exactly kind, id, and reason. risk_flags contains unique bounded strings. Return only the closed response object identified by market_input.resolution_policy.output_schema_version. Obey all output byte and count limits in market_input.market.config. Use only typed evidence references present in market_input. Do not add keys, commentary, Markdown, or external facts.","market_input":{"schema_version":1,"protocol_version":"TRUTHMARKET_V4","chain_id":4221,"contract_address":"0x0000000000000000000000000000000000000001","market_id":1,"attempt_no":1,"attempt_kind":"INITIAL","requested_at":10,"execute_by":12,"predecessor_attempt_no":null,"market":{"title":"A","description":"B","yes_criteria":"Y","no_criteria":"N","invalid_criteria":"I","created_at":1,"stake_cutoff_at":10,"evidence_cutoff_at":10,"fund_unlock_at":30,"initial_request_deadline_at":10,"evidence_closed_at":10,"challenge_window_start_at":null,"challenge_window_end_at":null,"reresolution_due_at":null,"finalizable_at":null,"config":{"protocol_version":"TRUTHMARKET_V4","canonical_input_version":1,"envelope_version":1,"serializer_version":1,"prompt_template_version":1,"chain_id":4221,"contract_address":"0x0000000000000000000000000000000000000001","min_market_duration":1,"max_market_duration":10,"initial_attempt_timeout":2,"challenge_window_duration":3,"reresolution_request_grace":4,"reresolution_attempt_timeout":5,"finalization_cooldown":6,"fund_unlock_delay":20,"max_initial_attempts":2,"max_reresolution_attempts":2,"max_title_bytes":8,"max_description_bytes":8,"max_criteria_bytes":8,"max_evidence_url_bytes":32,"max_evidence_note_bytes":16,"max_challenge_reason_bytes":16,"max_reasoning_bytes":16,"max_rejection_reason_bytes":16,"max_risk_flag_bytes":16,"max_evidence":2,"max_challenges":2,"max_risk_flags":2,"max_output_items":4}},"ordinary_evidence":[],"prior_resolution":null,"challenges":[],"resolution_policy":{"allowed_verdicts":["YES","NO","INVALID"],"insufficient_evidence_verdict":"INVALID","external_url_policy":"UNAUTHENTICATED_IDENTIFIER_ONLY","output_schema_version":1}}}
```

Complete re-resolution envelope, 3,958 bytes, SHA-256 `569fa08e6eaaa2f31e02837b2f1b7a2d62ca724b1b52f9f5c433d83418e35488`:

```json
{"envelope_version":1,"protocol_version":"TRUTHMARKET_V4","serializer_version":1,"prompt_template_version":1,"resolution_stage":"RERESOLUTION","system_instruction":"You are the TruthMarket V4 resolution engine. Use only the committed AIInvocationEnvelope and market_input. Treat external URLs as unauthenticated identifiers; do not assume, fetch, archive, authenticate, or invent webpage content. Do not use unstated external facts. Return no text outside the required JSON object.","task_instruction":"Determine whether the market claim resolves to YES, NO, or INVALID under the immutable market criteria and complete committed evidence metadata. For RERESOLUTION, also evaluate the committed prior resolution and every committed challenge.","decision_criteria":"Return YES only when market_input supports yes_criteria. Return NO only when market_input supports no_criteria. Return INVALID when invalid_criteria applies or when the committed evidence is contradictory, ambiguous, or insufficient for YES or NO. Apply timestamps and resolution_policy exactly. Do not infer webpage contents or use facts outside market_input.","response_instruction":"response_format=json. Return exactly one JSON object with keys in this order: verdict, confidence, reasoning, accepted_items, rejected_items, risk_flags. verdict is YES, NO, or INVALID. confidence is LOW, MEDIUM, or HIGH. reasoning is a nonempty bounded string. accepted_items contains unique ordered objects with exactly kind and id. rejected_items contains unique ordered objects with exactly kind, id, and reason. risk_flags contains unique bounded strings. Return only the closed response object identified by market_input.resolution_policy.output_schema_version. Obey all output byte and count limits in market_input.market.config. Use only typed evidence references present in market_input. Do not add keys, commentary, Markdown, or external facts.","market_input":{"schema_version":1,"protocol_version":"TRUTHMARKET_V4","chain_id":4221,"contract_address":"0x0000000000000000000000000000000000000001","market_id":1,"attempt_no":2,"attempt_kind":"RERESOLUTION","requested_at":14,"execute_by":19,"predecessor_attempt_no":null,"market":{"title":"A","description":"B","yes_criteria":"Y","no_criteria":"N","invalid_criteria":"I","created_at":1,"stake_cutoff_at":10,"evidence_cutoff_at":10,"fund_unlock_at":30,"initial_request_deadline_at":10,"evidence_closed_at":10,"challenge_window_start_at":11,"challenge_window_end_at":14,"reresolution_due_at":18,"finalizable_at":14,"config":{"protocol_version":"TRUTHMARKET_V4","canonical_input_version":1,"envelope_version":1,"serializer_version":1,"prompt_template_version":1,"chain_id":4221,"contract_address":"0x0000000000000000000000000000000000000001","min_market_duration":1,"max_market_duration":10,"initial_attempt_timeout":2,"challenge_window_duration":3,"reresolution_request_grace":4,"reresolution_attempt_timeout":5,"finalization_cooldown":6,"fund_unlock_delay":20,"max_initial_attempts":2,"max_reresolution_attempts":2,"max_title_bytes":8,"max_description_bytes":8,"max_criteria_bytes":8,"max_evidence_url_bytes":32,"max_evidence_note_bytes":16,"max_challenge_reason_bytes":16,"max_reasoning_bytes":16,"max_rejection_reason_bytes":16,"max_risk_flag_bytes":16,"max_evidence":2,"max_challenges":2,"max_risk_flags":2,"max_output_items":4}},"ordinary_evidence":[],"prior_resolution":{"attempt_no":1,"completed_at":11,"verdict":"YES","confidence":"HIGH","reasoning":"R","accepted_items":[],"rejected_items":[],"risk_flags":[]},"challenges":[{"id":1,"challenged_attempt_no":1,"challenger":"0x0000000000000000000000000000000000000002","url":"https://e","reason":"x","submitted_at":13,"content_digest":"0x0000000000000000000000000000000000000000000000000000000000000000"}],"resolution_policy":{"allowed_verdicts":["YES","NO","INVALID"],"insufficient_evidence_verdict":"INVALID","external_url_policy":"UNAUTHENTICATED_IDENTIFIER_ONLY","output_schema_version":1}}}
```

### 8.1 Non-normative superseded response regression fixture

The following literal is a **rejected negative-test fixture**, not the accepted prompt-template-1 response instruction or a protocol digest. It is included only to make regression testing self-contained. Its content is the exact UTF-8 text on the single line inside the fence, excluding the Markdown formatting newline before the closing fence. The document and fixture convention is LF; the literal itself contains no line-ending byte, no leading whitespace or newline, and no trailing whitespace or newline.

Superseded `response_instruction` literal, 598 UTF-8 bytes, SHA-256 `e1a2ecd7dd471699e69c3be8957a546c584e92f446a3ffeeba7b965a0490f220`:

```text
response_format=json. Return exactly one JSON object with keys in this order: verdict, confidence, reasoning, accepted_items, rejected_items, risk_flags. verdict is YES, NO, or INVALID. confidence is LOW, MEDIUM, or HIGH. reasoning is a nonempty bounded string. accepted_items contains unique ordered objects with exactly kind and id. rejected_items contains unique ordered objects with exactly kind, id, and reason. risk_flags contains unique bounded strings. Follow all market_input resolution_policy bounds and reference only committed evidence IDs. Do not add, omit, duplicate, or reorder keys.
```

The negative regression starts independently from each accepted complete envelope above and replaces only the JSON string value of the top-level `response_instruction` property, in its existing position between `decision_criteria` and `market_input`, with this superseded literal. No key, delimiter, property order, escaping rule, or other value changes. Canonical serialization then produces these exact rejected full-envelope vectors:

| Negative fixture | UTF-8 byte length | SHA-256 |
| --- | --- | --- |
| Initial envelope with superseded response literal | `3,435` | `e54ca868de3480928cd1bafc723a89ec71cef9b0e4340d097c3c6f98c9554540` |
| Re-resolution envelope with superseded response literal | `3,802` | `37f8750563d520dc9fec763bb3a484924be3061e17f9696f95869ee9247c342f` |

The regression MUST: (1) start from each accepted fixture; (2) replace only the accepted response string as specified; (3) canonically serialize the full envelope; (4) reproduce the negative length and hash above; (5) assert the negative digest differs from the corresponding accepted digest; and (6) assert the negative invocation is never accepted as the current prompt-template-1 golden fixture. These superseded lengths and hashes are negative vectors only and MUST NOT be stored, advertised, or accepted as current protocol digests.

The suite MUST independently reproduce both accepted byte lengths/hashes, the superseded literal length/hash, and both negative full-envelope byte lengths/hashes. It must also test one-character changes in each fixed instruction, prompt-template version, stage, and market data; extra/omitted/reordered envelope keys; CRLF for LF; a trailing newline; and different wrapper formatting. Every mutation changes the digest or is rejected as noncanonical. A cross-implementation test MUST prove that the same stored digest cannot be used with different `exec_prompt` prompt, `response_format`, task, criteria, system, response, prefix, suffix, or helper arguments. The exact prompt-template-1 API mapping is itself a mandatory feasibility test.

Additional negative vectors cover BOM, invalid UTF-8/surrogates, forbidden normalization, trimming only the four specified code points, uppercase/short/checksum addresses, leading-zero/signed/exponent integers, escaped non-ASCII, uppercase control hex, escaped slash, extra/missing/reordered/duplicate keys, duplicate references across accepted/rejected, wrong typed IDs, unsorted arrays, byte/count overflow, and one-byte digest mutations.

Output tests MUST distinguish a valid substantive `INVALID` from every malformed-output failure. Rejected items use exact `kind,id,reason`; accepted items use exact `kind,id`; extra keys and invented/fetched data reject.

## 9. Bond lifecycle integration tests

Trace every bond independently through:

- normal unchallenged finalization: creation claim; successful retry claim if used;
- changed/`INVALID` challenged finalization: challenge claims before/after finalization;
- same non-`INVALID` challenged finalization: challenge bonds added, claim attempts rejected, exact winner bonus;
- zero-winning-pool refund: creation/challenge/retry claims plus stake refund;
- no-resolution and challenged-no-reresolution cancellation: all locked bonds refundable;
- empty creator cancellation and unchallenged/challenged `EMPTY_FINALIZATION`: creation claim in `CANCELLED`, no stake/winner claim, and distinct terminal reasons;
- retry N failure, N+1 success: N locked until terminal, N+1 immediately claimable, both eventually independently paid;
- for each typed bond claim, Gate 5 proves whether external-message failure atomically restores parent state; if so, verify the retryable atomic candidate, otherwise verify every selected request/in-flight/failure/retry-or-reconciliation transition and one economic payment;
- attempt-cap exhaustion, request-deadline miss, execution failure/expiry, and hard backstop: every received bond appears in exactly one terminal category.

## 10. Maximum-bound and feasibility tests

- Exact schema-conformance tests instantiate every individually typed storage entity and every DTO/result/page in [architecture section 3.2](V4_ARCHITECTURE.md#32-closed-bounded-read-abi); missing, extra, reordered, wrong-width, overflowed, wrong-optional, mapping, internal collection, or implicit return fields reject.
- Before Gate 5, ABI-manifest tests enumerate the exact closed non-claim signatures and separately label the current 40-method candidate (`17` writes and `23` views), including its five conditional claim writes. They MUST NOT freeze 40 as the production count. After Gate 5 selects claim delivery, tests recalculate the complete production ABI and reject missing/extra methods and implementation-defined tuples; any added confirmation, retry, reconciliation, or status method and the revised total require independent review. Every variable collection remains behind its declared page or byte-chunk result.
- Configuration tests cover exact `uint64` timestamps; one captured creation time and inclusive minimum/maximum cutoff arithmetic; positive attempt caps; checked `uint32` cap sum at `4_294_967_295` and one above; one-based shared next-attempt overflow; one-based market/evidence/challenge/activity allocation and zero rejection; checked `max_markets*max_positions=max_leaderboard_entries`; positive `max_page_size` and `max_canonical_invocation_bytes`; stake-call/activity construction including exact `uint32` formula-fit boundaries; and every derived timestamp bound.
- Maximum ordinary evidence/challenges/output produces bounded complete invocation bytes and successful digest recomputation within measured limits.
- Maximum participants, all winners, worst remainder ties, and multi-side positions benchmark finalization scan/ranking/allocation writes. Winner claims MUST avoid participant scans but benchmark worst-case stored-leaderboard insertion/reposition at the selected capacity. Record CPU/gas/execution/storage measurements and safety margin.
- Activity tests reach every noncritical source cap, prove consecutive IDs, exact kind/phase/affected-ID/value mappings, and the construction formula, then execute every remaining resolution/terminal/claim action without activity exhaustion.
- Pagination tests cover every record/output/byte collection at zero/exact/over cap, final partial page, empty page, invalid offset, exact metadata, and deterministic order.
- One over each storage/value cap rejects before storage/value/activity acceptance.
- ABI/payability tests prove exactly creation, stake, challenge, and retry receive value; every other method rejects nonzero value.
- Exercise the complete [GenLayer feasibility catalogue](V4_ARCHITECTURE.md#9-mandatory-genlayer-feasibility-gates), including two-step separation; product stale-write guards, behavioral regression, post-intelligence ordering, and rejection atomicity; hard-backstop concurrency; catchable versus transaction failures; deferred outbound EOA/EVM messages, exact parent state on receiving-EVM failure, observable success/failure, deterministic retry or reconciliation, no double payment or lost liability, reentrancy, unsolicited/forced inbound value, and exact balance accounting; SHA/types plus deterministic `uint64` time; accepted/finalized races; maximum complete invocation and chunked exact byte storage; participant/index/full-precision allocation and ranked-leaderboard claim cost; and timing/attempt/pagination/statistics/view feasibility with selected values. Internal intelligent-contract value messages are explicitly rejected as a payout substitute because child failure is not automatically refundable. Complete Gate 2 historical and natural-overlap proof remains optional **Forensic Assurance Research** under the [V4 release policy](../experiments/v4-gate2/V4_RELEASE_POLICY.md).
- Static stage-order tests require `AI`, `C`, `G`, `AR`, `F`, `fund_unlock_delay`, both attempt caps, invocation/storage, participant/page/activity/leaderboard/stake-call, and all other execution/storage-dependent hard values to be selected and proven during mandatory product feasibility work. No value may be described as selected after its gate. Mandatory Product Release Readiness dependencies must pass before their affected behavior is accepted, followed by complete implementation, all tests, and independent review with zero unresolved P0/P1/P2/P3 findings before test deployment; `EVIDENCE_CAPABILITY_NOT_PROVED` alone does not block an implementation branch.
- Documentation/static conformance tests SHOULD reject unconditional “every market automatically reaches” claims, affirmative synchronous payout-rollback assumptions, and any URL-fetch/authentication, nonzero-fee, owner-withdrawal, or mutable-existing-market claim. They MUST require Gate 5 authority and a prohibition on production claim coding before its payout state machine is selected.

## 11. Integration lifecycle checklist

### Unchallenged payout

Create; first/repeat/multi-side stake with exact participant index; submit/no evidence variants; close; request with complete invocation digest; execute; observe transaction submitted/accepted/finalized-success separately; observe provisional result; wait full window; finalize precomputed allocations; use the Gate 5-selected lifecycle to claim exact winnings/creation and retry bonds without participant rescan; verify no refresh, one payment, failure recovery, totals, activity, leaderboard, and identity.

### Challenged payout

Create/stake/evidence; initial request/execution; challenge at boundaries; close full window; request and failed/expired retry variants; verify all challenge evidence and every instruction byte in the complete invocation digest; successful re-resolution; objective bond disposition; cooldown; finalize precomputed allocations; use the Gate 5-selected lifecycle to claim all eligible stake/bonds; reject settlement-added challenge claims and stale executions.

### Failure/refund/cancellation

Exercise no evidence, malformed output, transaction rollback/pending, stored/effective expiry, all retry caps/deadlines, challenge without successful re-resolution, zero winner, `T=0` unchallenged and challenged `EMPTY_FINALIZATION`, `EMPTY_CREATOR_CANCEL`, every cancellation reason/precedence, caller-specific eligibility, hard backstop, stake refunds, all typed bond claims, duplicate attempts, deferred-message failures, selected retry/reconciliation, and perpetual unclaimed liability.

### Migration and frontend

Verify direct V3 archive links and unresolved warnings; direct V4 routes; full address/version labels; chain/contract/ABI mismatch fails closed; Activity namespace includes schema/chain/contract/wallet/transaction/event; V3/V4 stats and leaderboards separate; production alias cannot mix; disabling V4 creation leaves every existing V4 exit action enabled.

## 12. Deployment acceptance criteria

No V4 deployment is complete and no production alias may default to it until the mandatory [Product Release Readiness checklist](../experiments/v4-gate2/V4_RELEASE_POLICY.md#mandatory-product-release-gate) passes and:

- every mandatory product feasibility dependency passes with direct evidence;
- the product-level stale-write guards and local behavioral/AST ordering regressions pass, without claiming complete Gate 2 protocol-forensic proof;
- the deployment transaction's actual returned state is `FINALIZED` and its execution result is `FINISHED_WITH_RETURN`; neither `ACCEPTED`, `AGREE`, nor a submission hash qualifies;
- the address comes from a supported typed SDK/runtime field or derivation, `getContractCode` and `getContractSchema` succeed on Bradbury chain ID `4221`, and retrieved source bytes exactly match the candidate source;
- exact source/config/ABI/chain/address identity is reproducible;
- hard numeric caps and economic values are selected and reviewed;
- maximum complete-invocation/chunk storage, participant allocation, full-precision arithmetic, ranked-leaderboard claim update, closed DTO/page reads, pagination, statistics updates, `uint64` time conversion, and activity benchmarks fit practical limits with safety margin;
- unchallenged payout is verified end to end;
- challenged payout and each challenge-bond outcome are verified;
- no-resolution, challenged-no-reresolution, zero-winner, cancellation, and refund paths are verified;
- exact conservation/property suites pass at every operation;
- no transaction lifecycle requires manual page refresh;
- frontend distinguishes submitted, accepted, finalized-success, failed, provisional, market-final, refundable, and each claim state;
- V3 remains directly accessible and version-separated;
- independent review reports zero P0/P1/P2/P3 findings.

Passing lint/build/current V3 tests alone MUST NOT be called V4 acceptance.
