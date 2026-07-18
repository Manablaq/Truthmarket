# TruthMarket V4 BF-0 protected-mutation register

Status: `DRAFT_MANIFEST_ONLY_NOT_PRODUCTION_PROOF`

## Purpose

This register identifies state families and authority boundaries that a
future source-bound PRR-07 checker must protect. It does not assert that
an absent production source implements any row.

The seventeen named candidate public writes are architecture inputs, not
a frozen ABI. Gate 5 lifecycle rows below are conceptual transition
classes and MUST NOT be interpreted as prematurely selected public
method names.

## Boundary classification taxonomy

| Code | Boundary class | Checker obligation |
| --- | --- | --- |
| `AUTH` | Caller identity, beneficiary identity, or authorization | Prove the exact authorized actor and reject substitutes before protected mutation. |
| `TIME` | Contract time, deadline, window, or boundary arithmetic | Prove the selected inclusive/exclusive rule and overflow-safe conversion before mutation. |
| `VALUE` | Attached value, payability, contract balance, or economic amount | Prove the exact accepted value category for the operation or transition, and reject every disallowed zero, wrong, missing, excess, or unexpected value without retention or protected mutation. |
| `DET` | Deterministic text processing, canonicalization, serialization, digest, or arithmetic | Prove canonical bytes/values and bounds before allocation or mutation. |
| `AI` | Intelligent or nondeterministic return | Repeat all authority and stale/terminal guards after return and before first protected mutation. |
| `MSG` | Deferred external-message emission or payout dispatch | Treat emission as dispatch only, never as observable payment completion. |
| `ACK` | Callback or acknowledgement, if selected by Gate 5 | Authenticate source, delivery identity, attempt, amount, beneficiary, and freshness before mutation. |
| `RECON` | Reconciliation request, read, or delivery observation | Bind the observation to an exact delivery identity and reject stale, ambiguous, or duplicate results. |
| `CAP` | Storage, identifier, counter, activity, page, participant, or other capacity | Check limits and overflow before allocation; critical terminal/delivery recovery must retain a feasible path. |
| `TERM` | Phase, terminal state, active/latest identity, duplicate, stale, or retry authority | Prove exact live authority immediately before the first protected mutation. |

“No intelligent call” is not a complete boundary classification. Every
row below names all materially relevant authority or atomicity classes.

A future fail-closed checker MUST reject any `VALUE`-classified operation or
conceptual transition whose row does not state exactly one accepted caller-
attached-value category (`ZERO_ONLY`, `EXACT_POSITIVE_AMOUNT`, or
`EXACT_BOND_AMOUNT`) and the point before which that category is enforced.
Outgoing beneficiary/payout amount is never a substitute for caller-attached
value. Internal implementation does not create an exemption: any externally
callable boundary reaching a `VALUE` transition must enforce the row's category
before the first listed mutation.

## Candidate public-write coverage

| Candidate operation | Boundary classes | Protected state families | Required authority or ordering rule | Evidence status |
| --- | --- | --- | --- | --- |
| `create_market` | `AUTH`, `TIME`, `VALUE`, `DET`, `CAP` | Market record, settlement defaults, market/phase/protocol counters, creation bond, receipt and locked-liability aggregates, activity | Enforce `EXACT_BOND_AMOUNT` before accepting value or the first ID, balance, liability, or activity mutation; validate actor-independent configuration, processed text, time arithmetic, and every cap; commit as one transition | `MANIFEST_ONLY_NOT_EVALUATED` |
| `stake` | `AUTH`, `TIME`, `VALUE`, `CAP`, `TERM` | Participant array/index, position, side/total pools, receipt aggregates, activity | Enforce `EXACT_POSITIVE_AMOUNT` before accepting value or mutating an index; validate market/phase/time, side, arithmetic, participant/stake-call caps, and terminal state | `MANIFEST_ONLY_NOT_EVALUATED` |
| `submit_evidence` | `AUTH`, `TIME`, `VALUE`, `DET`, `CAP`, `TERM` | Evidence count/record/digest index and activity | Enforce `ZERO_ONLY` before evidence/activity ID allocation or any mutation; validate market/time, processed bytes, digest uniqueness, cap, and terminal state | `MANIFEST_ONLY_NOT_EVALUATED` |
| `close_evidence` | `AUTH`, `TIME`, `VALUE`, `TERM` | Market phase, evidence-close timestamp, phase counters, activity | Enforce `ZERO_ONLY` before the phase/timestamp/counter/activity transition; validate caller rule, boundary time, phase, and terminal state | `MANIFEST_ONLY_NOT_EVALUATED` |
| `request_resolution` | `AUTH`, `TIME`, `VALUE`, `DET`, `CAP`, `TERM` | Attempt sequence/count/latest, invocation digest, phase/counters, activity | Enforce `ZERO_ONLY` before attempt/phase/counter/activity allocation; prove no existing kind record or active attempt, validate deadlines/envelope/caps, and allocate only on committed success | `MANIFEST_ONLY_NOT_EVALUATED` |
| `retry_resolution` | `AUTH`, `TIME`, `VALUE`, `DET`, `CAP`, `TERM` | Predecessor materialization, successor attempt, counts/latest, retry bond, receipt and locked-liability aggregates, phase, activity | Enforce `EXACT_BOND_AMOUNT` before expiry/successor/value/liability/activity mutation; revalidate exact latest predecessor, deadline, retry cap, and envelope; commit as one transition | `MANIFEST_ONLY_NOT_EVALUATED` |
| `execute_resolution` | `AUTH`, `TIME`, `VALUE`, `DET`, `AI`, `CAP`, `TERM` | Terminal state; phase; active/latest identity; attempt status; accepted result; timing; retry/challenge bond records; refundable-liability, beneficiary, and protocol aggregates; settlement-facing fields; phase counters; activity | Enforce `ZERO_ONLY` before invocation and again before the first post-return protected mutation; after intelligent return, repeat terminal, phase, exact-attempt, active/latest, time, digest, and result-validity guards; no stale or rejected result may mutate any listed family | `PRODUCTION_CHECKER_ABSENT` |
| `expire_attempt` | `AUTH`, `TIME`, `VALUE`, `TERM` | Attempt status, phase/counters, activity; retry bond remains locked | Enforce `ZERO_ONLY` before attempt/phase/counter/activity mutation; require the exact latest effectively expired request, phase, and nonterminal authority | `MANIFEST_ONLY_NOT_EVALUATED` |
| `challenge_resolution` | `AUTH`, `TIME`, `VALUE`, `DET`, `CAP`, `TERM` | Challenge count/record/digest index, due timestamp, locked bond, receipt and locked-liability aggregates, activity | Enforce `EXACT_BOND_AMOUNT` before challenge/activity ID, bond, receipt, liability, or activity mutation; validate accepted result, window, beneficiary/caller rule, processed text, digest uniqueness, cap, and terminal state | `MANIFEST_ONLY_NOT_EVALUATED` |
| `request_reresolution` | `AUTH`, `TIME`, `VALUE`, `DET`, `CAP`, `TERM` | Shared attempt sequence/count/latest, invocation digest, phase/counters, activity | Enforce `ZERO_ONLY` before attempt/phase/counter/activity allocation; require challenges, no prior kind record, no active attempt, valid envelope/caps, and nonterminal authority | `MANIFEST_ONLY_NOT_EVALUATED` |
| `finalize_market` | `AUTH`, `TIME`, `VALUE`, `DET`, `CAP`, `TERM` | Terminal phase/reason/time, settlement, allocations, bond dispositions, market/beneficiary/protocol liabilities and aggregates, phase/protocol counters, activity | Enforce `ZERO_ONLY` before any terminal, allocation, liability, aggregate, counter, or activity mutation; precompute and validate accepted result, timing, no active attempt, complete allocation, arithmetic, conservation, capacities, and terminal authority before one terminal commit | `MANIFEST_ONLY_NOT_EVALUATED` |
| `cancel_market` | `AUTH`, `TIME`, `VALUE`, `CAP`, `TERM` | Terminal phase/reason/time, refund mode/principal liability, all locked bond dispositions, market/beneficiary/protocol liability aggregates, phase counters, activity | Enforce `ZERO_ONLY` before any terminal, refund, bond, liability, aggregate, counter, or activity mutation; require the exact highest-precedence cancellation predicate, actor rule, capacity, phase, and terminal authority before one terminal commit | `MANIFEST_ONLY_NOT_EVALUATED` |
| `claim_winnings` | `AUTH`, `TIME`, `VALUE`, `MSG`, `ACK`, `RECON`, `CAP`, `TERM` | Admission/delivery status, winner liability, paid totals, per-user/protocol aggregates, leaderboard, activity, delivery/reconciliation state and IDs | Enforce `ZERO_ONLY` before any admission, dispatch, identifier, status, liability, activity, or message mutation; Gate 5 must define admission, dispatch, completion, failure, retry, callback/reconciliation, duplicate prevention, stale authority, and reentrancy; dispatch alone cannot discharge liability or create completed-payment activity | `BLOCKED_GATE5` |
| `claim_refund` | `AUTH`, `TIME`, `VALUE`, `MSG`, `ACK`, `RECON`, `CAP`, `TERM` | Admission/delivery status, principal liability, paid totals, per-user/protocol aggregates, activity, delivery/reconciliation state and IDs | Enforce `ZERO_ONLY` before any admission, dispatch, identifier, status, liability, activity, or message mutation; Gate 5 must define exact observable completion, failure recovery, duplicate prevention, stale authority, and reentrancy; dispatch alone cannot consume principal liability | `BLOCKED_GATE5` |
| `claim_creation_bond` | `AUTH`, `TIME`, `VALUE`, `MSG`, `ACK`, `RECON`, `CAP`, `TERM` | Creation-bond delivery status/liability, paid totals, per-user/protocol aggregates, activity, delivery/reconciliation state and IDs | Enforce `ZERO_ONLY` before any admission, dispatch, identifier, status, liability, activity, or message mutation; Gate 5 must preserve one exact beneficiary/payment, retain liability until proven completion, and reject duplicate or stale observations | `BLOCKED_GATE5` |
| `claim_challenge_bond` | `AUTH`, `TIME`, `VALUE`, `MSG`, `ACK`, `RECON`, `CAP`, `TERM` | Per-challenge delivery status/liability, beneficiary/protocol aggregates, paid totals, activity, delivery/reconciliation state and IDs | Enforce `ZERO_ONLY` before any admission, dispatch, identifier, status, liability, activity, or message mutation; Gate 5 must define exact per-challenge admission and delivery lifecycle, retry/reconciliation authority, completion timing, and duplicate prevention | `BLOCKED_GATE5` |
| `claim_retry_bond` | `AUTH`, `TIME`, `VALUE`, `MSG`, `ACK`, `RECON`, `CAP`, `TERM` | Per-attempt delivery status/liability, beneficiary/protocol aggregates, paid totals, activity, delivery/reconciliation state and IDs | Enforce `ZERO_ONLY` before any admission, dispatch, identifier, status, liability, activity, or message mutation; Gate 5 must define exact per-attempt admission and delivery lifecycle, retry/reconciliation authority, completion timing, and duplicate prevention | `BLOCKED_GATE5` |

## Gate 5 conceptual lifecycle transition coverage

These transition classes apply to each claim/refund/bond-return economic
path as relevant. Gate 5 may combine or split them after evidence, but
none may disappear from the audit model.

| Conceptual transition class | Boundary classes | Protected state families | Required authority or ordering rule | Evidence status |
| --- | --- | --- | --- | --- |
| Claim admission/request | `AUTH`, `TIME`, `VALUE`, `CAP`, `TERM` | Claimability, admission/delivery status, beneficiary, amount, liability reference, optional delivery/reconciliation ID, activity reservation if selected | Enforce `ZERO_ONLY` at the externally callable boundary before consuming claimability, allocating an ID, or any admission mutation; validate beneficiary, mode/status, open time, positive exact beneficiary amount, duplicate state, capacities, and terminal authority | `BLOCKED_GATE5` |
| Payout dispatch/message emission | `AUTH`, `VALUE`, `MSG`, `CAP`, `TERM` | Delivery attempt/status, exact beneficiary/amount, idempotency key, message identity, attempt counter; liability and paid totals remain unchanged | Enforce `ZERO_ONLY` at every externally callable boundary reaching dispatch before any attempt/status/idempotency/message identity/counter mutation or message emission; dispatch only from an admitted retry-authorized state; persist exact identity needed to observe delivery; message emission is not completion | `BLOCKED_GATE5` |
| Payout completion observation | `AUTH`, `ACK`, `RECON`, `TERM` | Delivery status, claim/bond consumed state, liability discharge, paid totals, per-user/protocol aggregates, winnings leaderboard, completion timestamp, completed-payment activity | Accept only an authenticated, fresh, exact-identity and exact-amount observation; update all completion effects once and atomically | `BLOCKED_GATE5` |
| Payout failure or unknown-result observation | `AUTH`, `ACK`, `RECON`, `TERM` | Delivery failure/unknown status, observability metadata, retry/reconciliation eligibility; liability, paid totals, leaderboard, and completed-payment activity remain unchanged | Bind failure/unknown result to the exact live delivery attempt; preserve economic liability and prevent premature completion | `BLOCKED_GATE5` |
| Retry authorization | `AUTH`, `TIME`, `CAP`, `TERM` | Retryable status, actor authority, retry bounds/expiry, attempt counter ceiling, exact beneficiary/amount and prior delivery identity | Authorize only a selected failure/unknown state and exact current attempt; no message, liability discharge, paid-total update, or completed-payment activity occurs | `BLOCKED_GATE5` |
| Retry dispatch | `AUTH`, `VALUE`, `MSG`, `CAP`, `TERM` | New delivery attempt identity/idempotency key, attempt count/status, exact beneficiary/amount; liability retained | Enforce `ZERO_ONLY` at every externally callable boundary reaching retry dispatch before any attempt identity/idempotency/count/status mutation or message emission; allocate/advance only on committed authorized retry dispatch; reject duplicate, stale, over-cap, or wrong-beneficiary-amount retry without consumption | `BLOCKED_GATE5` |
| Callback/acknowledgement handling, if selected | `AUTH`, `ACK`, `CAP`, `TERM` | Callback source/identity, delivery status, attempt freshness, completion/failure effects, liability, paid totals, activity and aggregates | Authenticate callback source and exact attempt; route once to completion or failure rules; reject reentrant, duplicate, stale, or mismatched callbacks unchanged | `BLOCKED_GATE5` |
| Reconciliation request | `AUTH`, `TIME`, `RECON`, `CAP`, `TERM` | Reconciliation request ID, target delivery/attempt identity, requester/authority, status and count; economic liability retained | Allocate only after exact unresolved/failed eligibility and capacity checks; rejection consumes no reconciliation ID or counter | `BLOCKED_GATE5` |
| Reconciliation completion | `AUTH`, `RECON`, `TERM` | Reconciliation status, delivery completion, claim/bond consumed state, liability discharge, paid totals, aggregates, leaderboard, timestamp and activity | Bind exact request/delivery/amount and apply the same single-completion effects as direct observation; prevent double completion across paths | `BLOCKED_GATE5` |
| Reconciliation failure or retry | `AUTH`, `TIME`, `RECON`, `CAP`, `TERM` | Reconciliation failure/retry status, attempt counts, observation metadata; liability and paid totals unchanged | Preserve liability; authorize bounded retry only for the exact live reconciliation identity; no completed-payment activity | `BLOCKED_GATE5` |
| Duplicate completion prevention | `AUTH`, `ACK`, `RECON`, `TERM` | All delivery, claimability, liability, paid-total, aggregate, leaderboard, activity and identifier families | Any already-completed delivery observed through dispatch callback, acknowledgement, retry, or reconciliation must reject or no-op exactly as selected without a second economic mutation | `BLOCKED_GATE5` |
| Stale callback or reconciliation rejection | `AUTH`, `ACK`, `RECON`, `TERM` | Current delivery/reconciliation identity and every protected economic/activity family | A superseded, wrong-attempt, wrong-beneficiary, wrong-amount, terminal, or otherwise stale observation changes no state and consumes no identifier | `BLOCKED_GATE5` |
| Reentrancy and external-message authority boundary | `AUTH`, `MSG`, `ACK`, `RECON`, `TERM` | Admission/delivery/reconciliation locks or statuses, liabilities, paid totals, aggregates, leaderboard, activity and IDs | No callback-reachable or reentrant path may re-admit, redispatch, complete twice, change beneficiary/amount, lose liability, or bypass exact live identity checks | `BLOCKED_GATE5` |

## Stage A coverage boundary

| Stage A surface | Bounded coverage |
| --- | --- |
| `execute_probe` | Repeated post-intelligence authority checks protect the bounded probe's lifecycle, active attempt, attempt status, current value, and execution count. |
| `request_probe`, `expire_probe`, `retry_probe` | Local tests cover bounded request allocation, expiry, successor authority, identifiers, and atomic rejection. |
| `cancel_probe`, `terminalize_probe` | Local tests cover terminal precedence and rejection of later execution. |
| `get_state`, `get_attempt` | Views expose the bounded probe state only and do not prove production DTO or storage coverage. |

The Stage A source omits production markets, evidence collections,
challenges, settlement, claims, refunds, complete activity, protocol
statistics, and full accounting. Its checker and tests therefore
cannot be reused as production PRR-07 proof without an independently
reviewed production manifest and source-bound dominance checker.

## Required production checker contract

The future checker must:

1. bind to an exact production source SHA-256;
2. classify every public write and conceptual delivery transition using
   the `AUTH`, `TIME`, `VALUE`, `DET`, `AI`, `MSG`, `ACK`, `RECON`,
   `CAP`, and `TERM` taxonomy;
3. enumerate every intelligent/nondeterministic call, deferred external
   message, callback/acknowledgement entry, reconciliation observation,
   and reentrant/callback-reachable path;
4. enumerate every protected assignment and mutating helper reachable
   after each boundary;
5. prove repeated caller, terminal, phase, active/latest attempt,
   delivery/reconciliation identity, beneficiary, amount, and freshness
   guards dominate the first protected mutation where applicable;
6. prove message dispatch does not masquerade as payment completion and
   that liability discharge, paid totals, leaderboard, and completed
   activity occur only at the Gate 5-selected observable completion;
7. prove duplicate, stale, rejected, failed, and over-cap paths consume
   no state, value, identifier, counter, activity, liability, paid-total,
   per-user aggregate, protocol aggregate, or leaderboard mutation;
8. fail closed for unknown operations, transition classes, boundary
   categories, fields, helper calls, dynamic dispatch, or new state
   families; and
9. be hashed and independently reviewed with the protected source.
