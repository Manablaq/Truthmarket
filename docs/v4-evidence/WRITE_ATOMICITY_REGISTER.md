# TruthMarket V4 BF-0 write-operation atomicity register

Status: `DRAFT_MANIFEST_ONLY_PRR08_NOT_EVALUATED`

## Snapshot rule

Every future PRR-08 case must capture the complete relevant prestate
and poststate, including state records, identifiers, counters, indexes,
activity, liabilities, per-user and protocol aggregates, paid totals,
leaderboard state, contract balance, attached value, deferred-message
identity/status, callback/acknowledgement state, and reconciliation state.

A rejection passes only when the required rejected snapshot is
byte-for-byte or field-for-field unchanged, except for platform
metadata that is explicitly outside contract state.

The seventeen named candidate public writes are architecture inputs, not
a frozen ABI. Gate 5 rows below are conceptual lifecycle transition
classes; they do not select or name future public methods.

## Candidate public-write atomicity coverage

| Write | Validation boundary | Identifiers | Counters/state | Activity | Liability/value | Required rejected or failure snapshot | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `create_market` | Text, value, time arithmetic, configuration and caps | Market ID and activity ID | Market, phase and protocol counters; settlement initialization | One `MARKET_CREATED` | Exact creation bond received; receipt and locked creation-bond liability aggregates increase | All state, funds, IDs and counters unchanged | `NOT_EVALUATED` |
| `stake` | Market/phase/time, side, value, arithmetic and caps | Activity ID only | Participant index, position, stake-call count, pools, aggregates | One `STAKE_ADDED` | Stake received into exact pools | No value, participant, position, pool, count or activity change | `NOT_EVALUATED` |
| `submit_evidence` | Market/time, processed text, digest uniqueness and cap | Evidence ID and activity ID | Evidence count, record and digest index | One `EVIDENCE_SUBMITTED` | Zero value | No evidence or activity ID gap and no stored content | `NOT_EVALUATED` |
| `close_evidence` | Phase, time, terminal and zero value | Activity ID | Close timestamp and phase counters | One `EVIDENCE_CLOSED` | Zero value | Phase, timestamp, counters and activity unchanged | `NOT_EVALUATED` |
| `request_resolution` | Phase, deadlines, no prior kind record, no active attempt | Attempt number and activity ID | Kind count/latest, attempt record, phase counters | One `ATTEMPT_REQUESTED` | Zero retry bond | No attempt number, record, phase or activity consumption | `NOT_EVALUATED` |
| `retry_resolution` | Exact predecessor, effective status, deadlines, cap and exact bond | Successor attempt number and activity ID | Optional predecessor expiry, successor, counts/latest, phase | Only successor `ATTEMPT_REQUESTED` | Exact retry bond received; receipt and locked retry-bond liability aggregates increase | No expiry materialization, successor, bond, liability aggregate, count or activity | `NOT_EVALUATED` |
| `execute_resolution` | Exact active attempt, terminal/phase/time/digest and post-intelligence authority | Activity ID on committed success or catchable failure; no attempt allocation | Attempt/result/phase/timing/bond/counters | `ATTEMPT_SUCCEEDED` or `ATTEMPT_FAILED` | No transfer; a successful retry bond becomes refundable, and successful changed/`INVALID` reresolution can make challenge bonds refundable | A rejected or stale case changes no bond, liability, aggregate, activity, identifier, counter, or other state. A transaction-level failure preserves the complete prestate only where the selected runtime path is proven to roll back; otherwise the selected catch/failure model must define and test its exact committed state. No same-write rollback assumption applies to deferred external payout delivery. | `NOT_EVALUATED` |
| `expire_attempt` | Exact latest stored request, effective expiry, phase and terminal | Activity ID | Attempt status and phase counters | One `ATTEMPT_EXPIRED` | Retry bond remains locked | Attempt, phase, bond and activity unchanged | `NOT_EVALUATED` |
| `challenge_resolution` | Accepted result, window, processed text, digest, cap and exact bond | Challenge ID and activity ID | Challenge count/record/index and first due timestamp | One `CHALLENGE_SUBMITTED` | Exact challenge bond received; receipt and locked challenge-bond liability aggregates increase | No ID, bond, liability aggregate, due timestamp, record or activity change | `NOT_EVALUATED` |
| `request_reresolution` | Challenges, phase/time, no prior kind record, no active attempt | Attempt number and activity ID | Kind count/latest, attempt record and phase counters | One `ATTEMPT_REQUESTED` | Zero retry bond | No attempt number, phase, count or activity consumption | `NOT_EVALUATED` |
| `finalize_market` | Accepted result, timing, no active attempt, allocation scan and conservation | Activity ID | Terminal state, settlement, allocations, bond statuses, liabilities, counters | One `MARKET_FINALIZED` for all three branches | No transfer; assigns winner or principal-refund liabilities and exactly reclassifies creation, retry, and challenge bonds | Any scan/arithmetic/conservation failure leaves all settlement, bond, liability, aggregate, activity, identifier, counter and other state at complete prestate | `NOT_EVALUATED` |
| `cancel_market` | Exact highest-precedence reason, actor rule, phase/time and terminal | Activity ID | Terminal state, refund mode, liabilities, bonds and counters | One `MARKET_CANCELLED` | No transfer; principal and every locked creation, retry, and challenge bond become refundable liabilities | Wrong reason/actor/terminal case leaves all liabilities, bonds, aggregates, activity, identifiers, counters and other state at complete prestate | `NOT_EVALUATED` |
| `claim_winnings` | Beneficiary, mode, open time, positive allocation, duplicate state, zero value, and Gate 5 delivery authority | Gate 5-conditional delivery, activity and reconciliation IDs | Admission/delivery status, winner claimability, paid totals, aggregates and leaderboard | Only at Gate 5-defined observable completion; dispatch is not completion | Exact external winnings payment; winner liability retained until proven completion | Every admission/dispatch/completion/failure/retry/callback/reconciliation rejection follows the conceptual table below; no duplicate payment, lost liability, premature paid total or premature completed activity | `BLOCKED_GATE5` |
| `claim_refund` | Beneficiary, mode, open time, positive principal, duplicate state, zero value, and Gate 5 delivery authority | Gate 5-conditional delivery, activity and reconciliation IDs | Admission/delivery status, refund claimability, principal liability and paid totals | Only at Gate 5-defined observable completion; dispatch is not completion | Exact principal payment; principal liability retained until proven completion | Every lifecycle rejection follows the conceptual table below; no duplicate payment, lost principal liability, premature paid total or premature completed activity | `BLOCKED_GATE5` |
| `claim_creation_bond` | Beneficiary, refundable status, terminal state, zero value, and Gate 5 delivery authority | Gate 5-conditional delivery, activity and reconciliation IDs | Admission/delivery status, bond status/liability and paid totals | Only at Gate 5-defined observable completion; dispatch is not completion | Exact creation-bond return; liability retained until proven completion | Every lifecycle rejection follows the conceptual table below; no duplicate return, lost liability or premature completion mutation | `BLOCKED_GATE5` |
| `claim_challenge_bond` | Challenge identity, beneficiary, refundable status, zero value, and Gate 5 delivery authority | Gate 5-conditional delivery, activity and reconciliation IDs | Admission/delivery status, per-challenge bond status/liability and aggregates | Only at Gate 5-defined observable completion; dispatch is not completion | Exact challenge-bond return; liability retained until proven completion | Every lifecycle rejection follows the conceptual table below; no duplicate return, lost liability or premature completion mutation | `BLOCKED_GATE5` |
| `claim_retry_bond` | Attempt identity, beneficiary, refundable status, zero value, and Gate 5 delivery authority | Gate 5-conditional delivery, activity and reconciliation IDs | Admission/delivery status, per-attempt bond status/liability and aggregates | Only at Gate 5-defined observable completion; dispatch is not completion | Exact retry-bond return; liability retained until proven completion | Every lifecycle rejection follows the conceptual table below; no duplicate return, lost liability or premature completion mutation | `BLOCKED_GATE5` |

## Gate 5 conceptual lifecycle atomicity coverage

These rows apply to every winnings, principal-refund, creation-bond,
challenge-bond, and retry-bond path as relevant. Gate 5 may combine or
split transition classes only after the resulting state machine, ABI,
status, activity, accounting, and capacity effects are evidenced and
independently reviewed.

| Conceptual transition class | Validation and authority boundary | Identifier/counter rule | State and activity rule | Liability/value rule | Required rejected or failure snapshot | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Claim admission/request | Exact beneficiary, terminal mode/status, claims-open time, positive exact entitlement, duplicate state, zero attached value, capacity | Optional delivery/reconciliation ID and any admission counter allocate only on committed success | Admission may mark an in-flight/requested state only if selected by Gate 5; no completed-payment activity | No payment and no liability discharge; exact entitlement remains conserved | Wrong actor/mode/time/amount/value, duplicate, terminal, or over-cap path changes no claimability, ID, counter, activity, liability, aggregate, leaderboard or balance | `BLOCKED_GATE5` |
| Payout dispatch/message emission | Admitted live delivery, exact beneficiary/amount, retry authority, idempotency key, capacity | Delivery attempt/message identity and attempt count advance only with committed dispatch | Dispatch/in-flight metadata may change as selected; no completed-payment activity or completion timestamp | Message emission is not payment; liability and paid totals remain unchanged | Rejected, duplicate, stale, wrong-amount, wrong-beneficiary, or over-cap dispatch consumes no message/delivery ID or counter and changes no economic state | `BLOCKED_GATE5` |
| Payout completion observation | Authenticated fresh callback/acknowledgement or exact reconciliation observation, live delivery identity, beneficiary and amount | No new economic-completion ID unless Gate 5 explicitly selects one; any activity ID allocates once with completion | Atomically mark completed/claimed, append the selected completed-payment activity, update timestamp, per-user/protocol aggregates and winnings leaderboard where applicable | Discharge the exact liability and increase paid totals exactly once; observed payment amount must equal the stored amount | Invalid, mismatched, duplicate, stale, already-completed or ambiguous observation changes no status, liability, paid total, aggregate, leaderboard, activity, ID or counter | `BLOCKED_GATE5` |
| Payout failure or unknown-result observation | Authenticated exact live delivery attempt and selected failure/unknown classification | Failure-observation counters or IDs, if any, advance only on committed fresh observation | May set selected failed/unknown/retryable state and observability metadata; no completed-payment activity | Liability remains fully retained; paid totals and leaderboard remain unchanged | Stale, duplicate, wrong-attempt, wrong-beneficiary or wrong-amount observation changes no state or identifier | `BLOCKED_GATE5` |
| Retry authorization | Selected failed/unknown state, exact live attempt, authorized actor, retry bound/expiry, unchanged beneficiary/amount | No dispatch/message ID; retry authorization counter changes only if the selected model requires and commits it | May set retry-authorized state only; no completed-payment activity | No payment, liability discharge, paid-total or leaderboard change | Unauthorized, premature, stale, duplicate, expired or over-cap retry request changes no state, ID, counter, activity or economic aggregate | `BLOCKED_GATE5` |
| Retry dispatch | Retry-authorized state, exact live predecessor, idempotency, beneficiary/amount, capacity | New attempt/message identity and attempt count allocate only on committed dispatch | Set selected in-flight state; preserve history needed for stale rejection; no completed-payment activity | Liability retained; paid totals and leaderboard unchanged | Rejected retry dispatch consumes no attempt/message/reconciliation ID or counter and changes no status, liability, activity or aggregate | `BLOCKED_GATE5` |
| Callback/acknowledgement handling, if selected | Authenticated callback source, exact delivery/attempt identity, beneficiary, amount, freshness, nonreentrancy | No identifier consumption on rejected callback; any completion/failure transition uses the live existing identity | Route once to completion or failure state; duplicate/stale/reentrant callback changes no activity or status | Apply completion economics only through the completion row; failure preserves liability | Unauthenticated, reentrant, duplicate, stale, mismatched or terminal callback leaves complete contract prestate unchanged | `BLOCKED_GATE5` |
| Reconciliation request | Exact unresolved/failed delivery, authorized actor, freshness, bounds, capacity | Reconciliation request ID/count allocate only on committed success and are one-to-one with the selected target identity | Set pending reconciliation metadata only; no completed-payment activity | No payment or liability discharge; paid totals unchanged | Invalid, duplicate, stale, terminal, over-cap or unauthorized request consumes no reconciliation ID/counter and changes no state | `BLOCKED_GATE5` |
| Reconciliation completion | Authenticated exact reconciliation result, live request/delivery identity, beneficiary and amount, no prior completion | Completion uses the live request/delivery identity; activity ID allocates once if selected | Apply the same one-time completed/claimed, timestamp, activity, aggregate and leaderboard transition as direct completion | Discharge exact liability and increase paid totals once | Duplicate, stale, mismatched, ambiguous or already-completed result changes no state, ID, counter, liability, paid total, activity, aggregate or leaderboard | `BLOCKED_GATE5` |
| Reconciliation failure or retry | Authenticated exact live reconciliation identity, selected failure class, retry authority/bounds | Retry request/attempt counters or IDs allocate only on committed authorized retry | May set failed/retryable/pending state; no completed-payment activity | Liability retained; paid totals and leaderboard unchanged | Invalid, stale, duplicate, unauthorized or over-cap path consumes no ID/counter and changes no economic state | `BLOCKED_GATE5` |
| Duplicate completion prevention | Any callback, acknowledgement, reconciliation result, retry result, replay, or repeated observation after completion | No new delivery, reconciliation or activity ID; no counter advance | Completed/claimed state, timestamp, activity and aggregates remain exactly unchanged | No second liability discharge or paid-total/leaderboard increase; no second external payment authorization | Complete relevant prestate equals poststate, or the exact selected deterministic no-op representation; never a second economic effect | `BLOCKED_GATE5` |
| Stale callback or reconciliation rejection | Superseded/wrong attempt, request, beneficiary, amount, market, path, or terminal state | No identifier or counter consumption | No status, activity, timestamp, aggregate or leaderboard mutation | No balance, liability or paid-total change | Complete relevant prestate equals poststate | `BLOCKED_GATE5` |
| Reentrancy and external-message authority boundary | Callback-reachable or reentrant call during admission, dispatch, completion, failure, retry or reconciliation | No nested allocation or counter advance unless explicitly selected and proven safe | No re-admission, redispatch, duplicate completion, status corruption or activity duplication | No double payment, lost liability, beneficiary/amount substitution, paid-total drift or conservation break | Reentrant/unauthorized path leaves every protected family and economic value at the exact allowed prestate | `BLOCKED_GATE5` |

## Mandatory generated cases

The eventual production suite must generate, for every public write and
every applicable conceptual Gate 5 transition:

1. every validation-family rejection;
2. boundary values immediately below, at, and above every limit;
3. identifier and counter overflow;
4. stale, duplicate, terminal, wrong-phase, wrong-attempt,
   wrong-beneficiary, and wrong-amount calls or observations;
5. zero, wrong, and unexpected attached value;
6. transaction-level rollback only where the selected runtime path is
   proven to produce rollback;
7. explicit committed catch/failure-state expectations where rollback is
   not proven or not selected;
8. before/after contract balance, complete liability, paid-total,
   per-user/protocol aggregate, leaderboard, message, callback, and
   reconciliation snapshots;
9. no consumed market, evidence, attempt, challenge, activity, delivery,
   message, or reconciliation identifier on a rejected path;
10. no activity append or phase/statistics/delivery counter drift;
11. dispatch without premature completion, liability discharge, paid
    total, leaderboard update, or completed-payment activity;
12. authenticated completion exactly once across callback,
    acknowledgement, retry, and reconciliation paths;
13. failure/unknown observation with liability retained and deterministic
    bounded retry or reconciliation;
14. duplicate completion and stale callback/reconciliation rejection;
15. reentrancy and external-message authority cases; and
16. exact retryability after every selected failure mode.

## Evidence boundary

Stage A local tests partially exercise attempt/request rejection
atomicity. V3 code and Stage A behavior cannot substitute for the
future production source. PRR-08 remains officially `NOT_EVALUATED`.

No same-write rollback assumption may be used for deferred external
payout delivery. Gate 5 must first select and prove the dispatch,
observation, failure, retry, callback/acknowledgement, reconciliation,
activity, liability, paid-total, aggregate, identifier, capacity, and
reentrancy model.
