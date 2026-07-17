# TruthMarket V4 economics and safety

Status: **proposed, unimplemented, and undeployed**. This document is normative with the [architecture](V4_ARCHITECTURE.md), [state machine](V4_STATE_MACHINE.md), [migration plan](V4_MIGRATION_PLAN.md), [test plan](V4_TEST_PLAN.md), and pinned [GenLayer compatibility baseline](GENLAYER_COMPATIBILITY_BASELINE.md). Symbolic production limits require benchmarking; they are not evidence of feasibility.

## 1. Assets and exact accounting domains

Stake and every bond are separate wei-denominated liabilities. `fee_bps` and `fee_wei` MUST be zero. There is no fee recipient, treasury liability, owner withdrawal, administrative sweep, or fee claim method.

The current candidate `ActivityKind` enum is `MARKET_CREATED | STAKE_ADDED | EVIDENCE_SUBMITTED | EVIDENCE_CLOSED | ATTEMPT_REQUESTED | ATTEMPT_SUCCEEDED | ATTEMPT_FAILED | ATTEMPT_EXPIRED | CHALLENGE_SUBMITTED | MARKET_FINALIZED | MARKET_CANCELLED | WINNINGS_CLAIMED | STAKE_REFUND_CLAIMED | CREATION_BOND_CLAIMED | CHALLENGE_BOND_CLAIMED | RETRY_BOND_CLAIMED`. Non-claim kinds and writes use the exhaustive closed [architecture mapping](V4_ARCHITECTURE.md#31-write-methods). The five claim kinds and current 27-branch total are conditional on Gate 5 proving the single-write model; otherwise activity timing/mapping and the total MUST be recalculated and independently reviewed before production coding. Only creation, stake, challenge, and retry records have nonzero received value, and only an observably completed claim payment may have nonzero paid value.

The unsuffixed mathematical names below denote the corresponding exact `Market` fields ending in `_wei`; the contract-wide equation substitutes the six exact `protocol_*_wei` fields. The current equation is conditional on Gate 5 proving atomic parent rollback. If deferred delivery requires an in-flight category, the schema and equation MUST be revised before implementation. Under the atomic candidate, at every observable committed state:

`funds_received = funds_paid + stake_liability + locked_bond_liability + refundable_bond_liability + settlement_added_bond_liability`.

- `funds_received`: successful stake and bond value accepted by the contract.
- `funds_paid`: observably completed winnings, principal refunds, and returned bonds; deferred message emission alone is not payment.
- `stake_liability`: stake-origin funds in the unsettled pool, winner settlement, or refund principal, exactly one category at a time; it excludes added challenge-bond origin.
- `locked_bond_liability`: per-bond records with `LOCKED`.
- `refundable_bond_liability`: per-bond records with `REFUNDABLE`.
- `settlement_added_bond_liability`: outstanding challenge-bond-origin funds with `ADDED_TO_SETTLEMENT` represented in winner allocations but not yet paid.

There is no unattributed surplus. Feasibility gate 5 MUST establish whether unsolicited or forced direct transfers can change contract balance without a protocol receipt. If they can, this architecture MUST be revised before production-contract coding to add an explicit, nonwithdrawable, user-accounting-excluded quarantine category; an inequality is not an acceptable substitute.

## 2. Threat model

| Threat | Contract requirement | Residual limitation |
| --- | --- | --- |
| Malicious creator | Criteria/config immutable; creator has only exact empty pre-activity cancel. | Creator may write biased criteria; users choose whether to participate. |
| Spam/duplicate evidence | Process exact text first, then domain-tagged SHA-256 dedup; raw inputs differing only by the four trimmed edge scalars collide intentionally, while non-normalized byte-distinct Unicode remains distinct. | Mirrors, query changes, and paraphrases are not semantic duplicates. |
| Empty/oversized notes, URLs, or reasons | Evidence URL and challenge reason require `1..cap` processed UTF-8 bytes; evidence note and challenge URL allow `0..cap` as non-null strings; invalid Unicode, oversize, and truncation reject before storage/value/ID. | Bounded text can still be dishonest. |
| Challenge griefing | Exact bond, one full window, count cap, one challenge round. | Amount can affect access; value needs economic review. |
| Resolution spam | First kind attempt free once; every retry exact-bonded; caps/deadlines and one active attempt. | Permissionless execution still consumes caller resources. |
| Deadline front-running | Contract time and explicit inclusive/exclusive inequalities are authoritative. | Ordering of valid same-boundary transactions follows committed chain order. |
| Zero winning pool with `T>0` | Principal refund; no division or forced redistribution. | No speculative winner payoff. |
| Validator disagreement/malformed output | Closed output; malformed is failure, not `INVALID`; finite retry/refund path. | GenLayer transaction semantics require proof. |
| Failed/indefinitely pending intelligent transaction | Durable request, expiry, stale guards, and hard backstop, all feasibility-gated. | Contract does not run automatically. |
| Repeated claims/reentrancy | Gate 5-selected idempotency, explicit liability state, observable completion/failure, deterministic retry or reconciliation, and reentrancy safety. | Deferred external-message parent-state behavior is unresolved. |
| Stale frontend | Contract authorization and address/version labels control; Activity is convenience only. | Accepted reads are not finality proof. |
| Dishonest external URLs | Canonical policy says unauthenticated identifier only; no fetch/authentication claim. | Validator sees stored metadata, not page truth. |
| Privileged abuse | No owner, guardian, pause, proxy, treasury, mutable config, or escrow escape. | Operational frontend aliases still require transparent controls. |

## 3. Economic protections and bond disposition

All numeric values below are proposed immutable configuration parameters. Every execution/storage-dependent timing or cap value MUST be selected and proven during feasibility work before production-contract coding; purely economic bond and minimum-stake values MUST be selected after economic review and before test deployment. Exactly four write categories receive value: market creation bond, stake, challenge bond, and retry bond; every other write requires zero.

Protocol identities are uniformly one-based. Successful market, evidence, challenge, attempt, and activity writes allocate the applicable pre-write count plus one only on commit; attempt kinds share the sum of both attempt counts. Zero is invalid, nullable references use `null`, and rejected or rolled-back value-receiving writes consume neither funds nor IDs. The participant array remains zero-based and uses index-plus-one only as its membership sentinel.

- `CONFIG_MIN_STAKE_WEI`: exact minimum per stake call. It SHOULD make position spam nontrivial without excluding intended users.
- `CONFIG_CREATION_BOND_WEI`: exact payable creation bond. It is always returned at terminalization and never slashed or added.
- `CONFIG_CHALLENGE_BOND_WEI`: exact payable challenge bond. Its objective disposition is below.
- `CONFIG_RETRY_BOND_WEI`: exact payable amount for every successor attempt. It is never forfeited or added.
- Protocol fee: normatively zero. Nonzero fee design is rejected/deferred to a separately reviewed future contract version.

The candidate `BondStatus` is `NONE`, `LOCKED`, `REFUNDABLE`, `ADDED_TO_SETTLEMENT`, or `CLAIMED`. `CLAIMED` timing is conditional on Gate 5; an asynchronous/two-phase model may require additional independently reviewed statuses.

| Bond/event | Exact transition | Beneficiary and claim |
| --- | --- | --- |
| Creation received | `LOCKED` | Creator/recorded beneficiary. |
| Any terminal transition | creation `LOCKED->REFUNDABLE` | `claim_creation_bond`; terminal only; once. |
| First attempt of a kind | `retry_bond_wei=0`, status `NONE` | No liability or claim. |
| Bonded retry received | `LOCKED` | That attempt's requester. |
| That retry succeeds | `LOCKED->REFUNDABLE` immediately | `claim_retry_bond`, even before market terminalization. |
| That retry fails/expires | remains `LOCKED` while protocol may continue | It is not forfeited; terminalization later refunds it. |
| Any terminal transition | every remaining retry `LOCKED->REFUNDABLE` | Each requester claims each attempt independently once. |
| Challenge received | `LOCKED` | That challenge's challenger. |
| Re-resolution succeeds with verdict different from initial, or verdict `INVALID` | every challenge `LOCKED->REFUNDABLE` immediately | Each challenger claims independently. |
| Re-resolution succeeds with same non-`INVALID` verdict | remains `LOCKED` until terminalization | Prevents premature addition when zero-pool/refund remains possible. |
| Positive-winner finalization after same non-`INVALID` verdict | each challenge `LOCKED->ADDED_TO_SETTLEMENT` | Cannot be claimed; exact amount enters `B`. |
| Any refund/cancellation/zero-winner path | every challenge still `LOCKED->REFUNDABLE` | Resolver failure never penalizes challenger. |

If retry N fails, retry N+1 succeeds, and the market later finalizes, N's bond becomes refundable at finalization and N+1's was refundable at its own success; each requester can claim once. A successful challenge bond is never judged by confidence/reasoning; only closed-enum initial/re-resolution verdict comparison is used. There is no recursive appeal.

For every bond:

- original amount is immutable;
- completed payment requires prior `REFUNDABLE` and paid amount equals original; the exact status transition is selected by Gate 5;
- `ADDED_TO_SETTLEMENT` can only occur for challenge bonds and can never become `CLAIMED`;
- EOA/EVM payment uses a deferred ghost/EVM external message; no state/liability transition may assume synchronous call or same-write rollback;
- Gate 5 MUST preserve winner stake-origin-first and ascending challenge-ID added-bond attribution, and select exact request, in-flight, paid, failed, retry, and reconciliation transitions;
- each `LOCKED->REFUNDABLE` challenge/retry transition increases the beneficiary's exact outstanding liability once, and observable completion consumes it once without double claim or claim-order dependence;
- amounts observably paid plus locked, refundable, settlement-added, and any Gate 5-required in-flight liabilities equal received exactly;
- unclaimed refundable amounts remain permanently assigned.

## 4. Settlement mathematics

Let `T=Y+N+I`, outcome pool `W`, added challenge bonds `B`, and `D=T+B`. Fee is absent; nothing is subtracted.

For each winner with stake `s_u` on the final outcome, ordinary fixed-width multiplication is forbidden. The feasibility-gated full-precision operations are:

`q_u = floor_mul_div(s_u,D,W)` and `r_u = mul_mod(s_u,D,W)`.

These return the quotient and remainder of the conceptual at-least-512-bit product `s_u*D` divided by `W`, or use an equivalent verified nonoverflowing algorithm. `R=D-sum(q_u)`. Exactly `R` winners with greatest remainder receive one extra wei; ties are ascending unsigned 20-byte address. A user with multiple sides is indexed once and only `s_u` on the winning side enters the formula. This yields exactly `sum(payout_u)=D` and never divides by zero or overflows an intermediate product.

| Outcome | Exact settlement |
| --- | --- |
| `T>0`, `W>0` | `FINALIZED/WINNERS/NONE`; all `T+B` assigned to precomputed winner allocations. |
| `T>0`, `W=0` | `REFUNDABLE/REFUNDS/NONE`; each user receives total contributed principal; all locked bonds refundable; `B=0`. |
| `T=0` after successful accepted resolution | `CANCELLED/EMPTY_CANCEL/EMPTY_FINALIZATION`; outcome and all settlement amounts are zero/null; no stake claim; all locked bonds refundable. |
| Resolution never succeeds | Exact cancellation predicate creates principal refunds/empty cancel. |
| Challenge exists but re-resolution never succeeds | Initial cannot finalize; exact re-resolution deadline/cap/backstop predicate refunds. |

Every cancellation with `T>0` stores `REFUNDABLE/REFUNDS`, null outcome, stake pool and refundable principal equal to `T`, and zero winning pool, bond bonus, and distributable amount. Every cancellation with `T=0` stores `CANCELLED/EMPTY_CANCEL`, null outcome, and zero for every settlement amount. In either case `claims_open_at=terminal_at`, no winner allocation exists, and all independently refundable bonds remain available only through their typed claims.

The Gate 5-selected model MUST prevent a second economic payment and MUST preserve or deterministically reconcile liability after external-message failure; synchronous claim rollback is not assumed. Users who never complete a claim retain assigned liabilities without expiry or sweep. Leaderboard credit is the exact observably completed `claim_winnings` payment, including allocated added bonds and rounding wei; it excludes stake refunds and returned bonds. Whether leaderboard mutation occurs in the request or completion/reconciliation step is Gate 5 conditional. Stored ordering remains descending paid winnings with ascending unsigned-address ties and one-based ranks; Gate 9 must prove the worst-case update at the selected capacity.

At winner settlement, outstanding `stake_liability=T` and `settlement_added_bond_liability=B`, while assigned payouts total `T+B`. Finalization scans the immutable first-stake participant array once, ignores zero winning-side stakes, ranks by remainder/address, writes every exact `winning_allocation_wei`, proves their sum, and only then opens eligibility. A winning payout reads one stored allocation and preserves stake-origin-first, then ascending challenge-ID added-bond attribution without rescanning participants. Gate 5 selects when those liabilities move to in-flight or paid categories.

No V4 production-contract coding may begin until an isolated prototype proves the exact participant array/mapping layout, full-precision arithmetic, and maximum-position finalization scan/allocation writes. Test deployment remains blocked until the selected hard cap fits practical GenLayer limits with documented safety margin. Bounded-but-too-large is still unsafe.

For every market, `participant_count=len(participant_addresses)`, the index-plus-one mapping is a bijection with the array, every indexed address has one positive position, every funded position is indexed, each position total equals its three side amounts, and array-wide side/total sums equal the four market pools. A new participant beyond `max_positions` or a stake beyond `max_stake_calls_per_market` rejects before receiving value; later stakes by an existing participant do not append again.

## 5. Bounded fund-release paths

The contract is not autonomous. The exact liveness claim is:

> Assuming the chain remains available and at least one caller successfully submits the permissionless terminalizing transaction, every unresolved market has an on-chain terminalization path no later than `fund_unlock_at`.

The path exists; automatic terminalization is not claimed.

| Nonterminal condition | Permissionless next step | Finite exit |
| --- | --- | --- |
| `OPEN` before cutoffs | stake/evidence or wait | close at cutoff; hard backstop |
| Initial never requested | first request through inclusive deadline | deadline-missed cancel strictly after; hard backstop |
| Initial `REQUESTED` | execute before exclusive expiry | expire/retry/cap/deadline cancel; hard backstop |
| Initial failed/expired | exact bonded retry if admitted | cap/deadline cancel; hard backstop |
| Unchallenged provisional | finalize at window end | winner/refund/`EMPTY_FINALIZATION`; hard backstop |
| Challenged provisional | wait full window; first re-resolution | due/cap cancel; hard backstop |
| Re-resolution `REQUESTED` | execute before exclusive expiry | expire/retry/cap/due cancel; hard backstop |
| Re-resolution failed/expired | exact bonded retry if admitted | cap/due cancel; hard backstop |
| Successful re-resolution | finalize after cooldown | winner/refund/`EMPTY_FINALIZATION` before `U` |
| Any unresolved nonterminal at `now>=U` | hard-backstop cancel | refund/empty terminal despite stale attempt, feasibility-gated |

`U=stake_cutoff_at+fund_unlock_delay` is captured at creation and immutable; the delay is at least `AI+C+G+AR+F`. Admission and exclusive execution inequalities in the [architecture](V4_ARCHITECTURE.md#5-timing-and-cancellation) ensure every successful happy path finishes before `U`. Challenge admission always leaves the full window and re-resolution path. No terminal state can be revived; stale execution checks terminal state and active attempt identity.

All stake, creation bonds, challenge bonds, and retry bonds have one terminal disposition. No resolver, creator, guardian, or owner is needed to unlock funds. Whether hard-backstop cancellation can commit while an earlier intelligent transaction remains unresolved is a deployment-blocking feasibility gate.

## 6. Determinism and hard bounds

`create_market` captures one exact `t_create:Timestamp`. It stores `created_at=t_create` and accepts the absolute cutoff only under the checked inclusive inequality `t_create+min_market_duration <= stake_cutoff_at <= t_create+max_market_duration`. Both endpoints are valid; any bound or derived-timestamp overflow/underflow rejects before value, ID, activity, or state. Derived timestamps are exactly `evidence_cutoff_at=stake_cutoff_at`, `U=stake_cutoff_at+fund_unlock_delay`, and `initial_request_deadline_at=U-(AI+C+G+AR+F)`, with `initial_request_deadline_at>=evidence_cutoff_at` required.

The following names are required hard immutable deployment parameters; numeric values MUST remain symbolic until storage/input/execution benchmarks justify them:

| Bound | Required property |
| --- | --- |
| `CONFIG_MAX_TITLE_BYTES`, `CONFIG_MAX_DESCRIPTION_BYTES`, `CONFIG_MAX_CRITERIA_BYTES` | Positive strict UTF-8 byte caps after exact trim. |
| `CONFIG_MAX_EVIDENCE_URL_BYTES`, `CONFIG_MAX_EVIDENCE_NOTE_BYTES`, `CONFIG_MAX_CHALLENGE_REASON_BYTES` | Positive strict UTF-8 byte caps. |
| `CONFIG_MAX_EVIDENCE` | Finite total ordinary records; all included, no truncation. |
| `CONFIG_MAX_CHALLENGES` | Finite single-round challenges; all included. |
| `CONFIG_MAX_INITIAL_ATTEMPTS`, `CONFIG_MAX_RERESOLUTION_ATTEMPTS` | Separate positive `uint32` caps whose checked sum is `<=4_294_967_295`. |
| `CONFIG_MAX_POSITIONS` | Measured hard address cap for participant enumeration and precomputed allocations. |
| `CONFIG_MAX_STAKE_CALLS_PER_MARKET` | Positive cap at least `max_positions`; bounds noncritical repeated stake writes. |
| `CONFIG_MAX_ACTIVITY_RECORDS_PER_MARKET` | Checked lifecycle formula guarantees capacity for every permitted write and all exits. |
| `CONFIG_MAX_PAGE_SIZE` | Positive immutable `uint16` cap for every paginated record or byte-chunk view. |
| `CONFIG_MAX_MARKETS`, `CONFIG_MAX_LEADERBOARD_ENTRIES` | Positive selected `uint32` market cap; leaderboard capacity is the checked product `max_markets*max_positions` and worst-case claim reposition is gate-benchmarked. |
| `CONFIG_MAX_CANONICAL_INVOCATION_BYTES` | Positive measured `uint32` cap for stored invocation snapshots and bounded chunk retrieval. |
| `CONFIG_MIN_MARKET_DURATION`, `CONFIG_MAX_MARKET_DURATION` | Exact `uint64`; minimum positive, maximum at least minimum; checked inclusive creation guard `t_create+min <= stake_cutoff_at <= t_create+max`. |
| `CONFIG_CHALLENGE_WINDOW_DURATION` | Positive immutable full-window duration. |
| `AI`, `G`, `AR`, `F` | Positive immutable durations; overflow-safe construction. |
| `CONFIG_FUND_UNLOCK_DELAY` | Positive immutable delay, at least `AI+C+G+AR+F`; `U=cutoff+delay` must not overflow. |
| Output byte/count caps | Positive bounds for reasoning, rejected reasons, flags, and total references. |

Participant enumeration is immutable first-successful-stake array order; evidence, attempt, challenge, and activity order is ascending numeric ID; remainder ties are ascending unsigned 20-byte address. Map iteration MUST NOT affect canonical bytes or payouts. Text processing, complete invocation envelope, canonical JSON, output validation, and SHA-256 are exactly specified in [architecture section 6](V4_ARCHITECTURE.md#6-resolution-and-consensus-exact-serialization).

Those numeric IDs are one-based: valid markets are `1..market_count`; evidence/challenge/activity allocate their pre-write count plus one; attempts allocate `initial_attempt_count+reresolution_attempt_count+1` in one shared market-local sequence. Canonical input and activity affected IDs use the exact allocated values. Evidence/challenge strings are processed before bounds, digest, storage, and canonical serialization; evidence URL and challenge reason are required, while evidence note and challenge URL use `""` rather than null when empty.

Every stored contract timestamp and ABI timestamp is `Timestamp=uint64`. Runtime contract time must convert exactly; all additions/subtractions are checked against `MAX_UINT64`. Gates 6 and 10 must prove the platform representation, deterministic conversion, storage, comparison, and arithmetic before production-contract coding.

Activity classification never follows an implementation-selected economic interpretation. An atomic `retry_resolution` records only `ATTEMPT_REQUESTED` for the paid successor retry; its internal predecessor expiry has no second record. Every `finalize_market` result, including empty cancellation and zero-winning-pool refund, records `MARKET_FINALIZED`; only `cancel_market` records `MARKET_CANCELLED`. Claim-side activity timing and failure/reconciliation records are Gate 5 conditional. The current checked capacity `4 + max_stake_calls_per_market + max_evidence + 3*A + 2*max_challenges + max_positions`, where `A` is the sum of both attempt caps, is valid only if Gate 5 proves the single-record claim projection; otherwise it MUST be recomputed after activity redesign.

## 7. Security invariants by domain

### Fund safety

- Exact conservation MUST hold under the Gate 5-selected outstanding/in-flight/paid categories; no fee or treasury category exists, and any forced-inbound surplus requires the already specified quarantine revision.
- Precomputed winner allocations never exceed or fall short of `T+B`; refund principal equals contributions; empty finalization creates no stake claim.
- Every accepted wei has exactly one current category and ultimate assigned disposition, including any Gate 5-required in-flight state.
- Gate 5 MUST prove one economic payment, no double claim, no lost liability, observable failure, deterministic retry/reconciliation, and reentrancy safety.

### State-transition safety

- One active request maximum; terminal phases are irreversible.
- Initial challenges permanently block initial finalization.
- Requested re-resolution cannot be bypassed by finalization.
- Deadline/cap/backstop predicates are exact and precedence is deterministic.

### Validator-input integrity

- The frozen `AIInvocationEnvelope` is complete, ordered, versioned, SHA-256 bound, and recomputed; every application-controlled prompt/task/criterion/response byte is committed.
- Strict UTF-8 and custom canonical JSON remove default-encoder ambiguity.
- Challenge evidence is present in every re-resolution; external content is absent.
- One-based attempt/evidence/challenge references and exact processed evidence/challenge strings are identical in storage, dedup objects, and canonical input; zero/null cannot be substituted.
- Malformed output is `FAILED`, never a substantive `INVALID` verdict.

### Accounting safety

- Participant array/mapping/position membership and all pool sums reconcile exactly.
- Full-precision quotient/remainder semantics prevent intermediate multiplication overflow; precomputed allocations sum exactly before claims open.
- Per-bond consumed state and aggregate totals reconcile exactly.
- Per-user refundable challenge/retry aggregates reconcile exactly to their per-bond records, making `ClaimableView` scan-free.
- `ADDED_TO_SETTLEMENT` and `CLAIMED` are mutually exclusive.
- Stored protocol phase/receipt/payment/liability aggregates reconcile exactly and make `ProtocolStatsView` scan-free.
- Leaderboard records only successful paid winnings and remains in exact stored rank order.

### Privilege safety

- Initial V4 has no owner, guardian, proxy, pause, mutable config, treasury, or emergency withdrawal.
- No role can change existing economics, extend time, choose results, block exits, seize balances, or revive terminal state.

### Frontend truthfulness

- Chain, contract address, ABI version, and V3/V4 label MUST be visible.
- Submitted, accepted, finalized-success, failed, provisional, market-final, and refundable states are distinct.
- The frontend MUST NOT claim URL retrieval/authentication or use derived UI phase for authorization.

## 8. Deployment-blocking safety evidence

All execution/storage-dependent values—`AI`, `C`, `G`, `AR`, `F`, `fund_unlock_delay`, both attempt caps, invocation/storage, participant/page/activity/leaderboard/stake-call caps, and every comparable hard cap—MUST be selected and proven during feasibility work. Every mandatory product dependency in the GenLayer feasibility catalogue in [architecture section 9](V4_ARCHITECTURE.md#9-mandatory-genlayer-feasibility-gates), including direct-value behavior and `uint64` time conversion, MUST pass before the affected production behavior is accepted. Gate 2's complete historical and natural-overlap proof is optional **Forensic Assurance Research** under the [V4 release policy](../experiments/v4-gate2/V4_RELEASE_POLICY.md); its `EVIDENCE_CAPABILITY_NOT_PROVED` status does not waive stale-write guards or their mandatory product tests and does not by itself block implementation. After implementation, every acceptance test MUST pass before test deployment. These are unresolved design risks, not proven implementation failures or platform capabilities.
