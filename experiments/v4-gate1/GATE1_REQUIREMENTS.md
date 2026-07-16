# TruthMarket V4 Gate 1 requirement matrix

Status: isolated feasibility work only. This is not TruthMarket V4 production-contract implementation.

Source commit: `625bbe5fb53d8cdafe55c8879bae987698711215`

## Scope

Gate 1 asks whether GenLayer can support deterministic request bookkeeping in one transaction followed by separate intelligent execution in a later transaction. It does not establish stale-write protection, cancellation over pending execution, malformed-output recovery, transfer safety, canonical-envelope capacity, participant accounting, or any other Gate 2–10 property.

## Normative requirement matrix

| ID | Requirement extracted from the approved specification | Primary specification source | Probe obligation | Evidence required for Gate 1 pass |
| --- | --- | --- | --- | --- |
| G1-01 | Request and intelligent execution are separate public writes. | `V4_ARCHITECTURE.md` §§3.1, 9; V4-D13 | `request_probe(payload)` contains no nondeterministic/AI call; `execute_probe(id)` contains the AI call. | Distinct finalized transaction hashes and source inspection. |
| G1-02 | The request write returns after durable bookkeeping and before any AI result exists. | `V4_ARCHITECTURE.md` §§2.2, 3.1; `V4_STATE_MACHINE.md` §2 | Store `REQUESTED`, empty result/executor/completion time, requester, request time, and exact payload in the request write. | Finalized-success request receipt followed by a finalized-state read showing those fields. |
| G1-03 | Request IDs are one-based, consecutive, and consumed only by a committed request write. Zero is invalid. | `V4_ARCHITECTURE.md` §§2, 2.2; `V4_STATE_MACHINE.md` §§1, 5 | Allocate `request_id=pre-write request_count+1`; reject ID zero and missing IDs. | State read showing first ID `1`; local rollback tests; live invalid-ID rejection. |
| G1-04 | The execution consumes the exact request data stored by the request transaction, not caller-supplied replacement data. | `V4_ARCHITECTURE.md` §§2.2, 6.2–6.3; V4-D19 | `execute_probe` accepts only the ID, loads the stored payload, and constructs the AI input from that stored value. | Exact source plus state snapshots before/after execution. |
| G1-05 | Stored invocation/request data is immutable or integrity-bound after request. | `V4_ARCHITECTURE.md` §§2.2, 6.2 | Expose no mutation method; preserve the exact payload before and after execution. | Finalized-state reads proving byte-for-byte identical payload before/after. |
| G1-06 | A later intelligent write may execute a still-requested record. | `V4_ARCHITECTURE.md` §3.1; `V4_STATE_MACHINE.md` §2 | `execute_probe(id)` invokes minimal AI consensus and stores a bounded classification. | Finalized-success execution receipt and completed state read. |
| G1-07 | Execution is permissionless; it has no requester-only guard. | `V4_ARCHITECTURE.md` §3.1; `V4_STATE_MACHINE.md` §2 | No caller restriction in `execute_probe`. | Live execution finalized from an address different from the stored requester. Source alone is insufficient. |
| G1-08 | Requester and executor remain independently observable. | `V4_ARCHITECTURE.md` §2.2 (`requester`, `executor`) | Store both addresses in the record. | State reads plus transaction sender fields. |
| G1-09 | Request and completion timestamps are independently observable. | `V4_ARCHITECTURE.md` §2.2 (`requested_at`, `completed_at`) | Store request time on request and completion time only on successful execution. | State reads showing nonempty ordered timestamps. This does not claim Gate 6/10 `uint64` feasibility. |
| G1-10 | Stored status distinguishes `REQUESTED` from successful completion. | `V4_ARCHITECTURE.md` §§2, 2.2; `V4_STATE_MACHINE.md` §1 | Closed probe states `REQUESTED` and `COMPLETED`; result remains empty until completion. | Before/after finalized-state snapshots. |
| G1-11 | Submission, acceptance, execution result, and finalized success are distinct. | `V4_ARCHITECTURE.md` §1; `V4_ECONOMICS_AND_SAFETY.md` §7; `V4_TEST_PLAN.md` §§1, 11 | Record the returned hash immediately; poll `getTransaction`; capture accepted and finalized receipts; require `FINALIZED` plus `FINISHED_WITH_RETURN`. | Machine-readable status timeline for both writes. |
| G1-12 | Accepted contract state and finalized contract state must not be conflated. | `V4_ARCHITECTURE.md` §1; `V4_MIGRATION_PLAN.md` §3.2 | Poll transaction status independently and probe SDK reads with `transactionHashVariant:"latest-nonfinal"` and `"latest-final"`. | Timestamped transaction observations showing `ACCEPTED`, `READY_TO_FINALIZE`, and `FINALIZED`; record whether read variants produce distinct snapshots rather than assuming they do. |
| G1-13 | Duplicate successful execution is impossible. | `V4_ARCHITECTURE.md` §3.1; `V4_STATE_MACHINE.md` §4 | Require stored state `REQUESTED` before invoking AI. | A second execution transaction finalizes with failure/no mutation, or submission is deterministically rejected with no state change. |
| G1-14 | Nonexistent requests reject deterministically and do not mutate state. | `V4_ARCHITECTURE.md` §3.2.4; `V4_STATE_MACHINE.md` §4 | Reject zero and IDs greater than the committed count before AI invocation. | Failed transaction/receipt and identical state/count before and after. |
| G1-15 | Transaction-level rollback must not fabricate completion; failed writes consume no record/activity ID. | `V4_ARCHITECTURE.md` §§2.2, 3.1; `V4_STATE_MACHINE.md` §§1–2 | Apply completion fields only in the execution transaction; local atomic model restores the pre-state on exceptions. | Live failed duplicate/invalid calls leave the completed record and request count unchanged. Broader malformed-AI rollback belongs to Gate 4. |
| G1-16 | Request and execution are independently observable without relying on event support. | `V4_ARCHITECTURE.md` §3.1 activity rule | Provide bounded keyed read plus request-count read; transaction hashes supplement contract storage. | Reproducible state reads at finalized status and transaction inspection JSON. |
| G1-17 | The prototype must use a distinct experimental deployment and must not mutate V3. | `V4_MIGRATION_PLAN.md` §§1, 4 Stage 1 | Contract class is `TruthMarketV4Gate1Probe`; deployment script requires explicit Gate 1 environment variables and records the new address. | New address, deployment hash, code hash, clean V3 diff. |
| G1-18 | Code inspection or current V3 prompt use alone cannot pass Gate 1. | `V4_ARCHITECTURE.md` §9; `V4_TEST_PLAN.md` §§1, 10 | Verdict remains `INCONCLUSIVE` until all live evidence, including a second signer, is captured. | Complete evidence bundle; otherwise an explicit limitation. |

## Gate 1 state mapping

| Application/transaction observation | Meaning in this probe | Must not be called |
| --- | --- | --- |
| Hash returned by SDK | Submitted | Accepted, finalized, or completed |
| GenLayer `ACCEPTED` | Consensus transaction accepted; finalization pending | Finalized success |
| GenLayer `FINALIZED` + `FINISHED_WITH_RETURN` | Transaction finalized successfully | Market finalization (the probe has no markets) |
| Stored `REQUESTED` | Request committed; no AI result stored | AI completion |
| Stored `COMPLETED` | Probe execution stored its result | TruthMarket V4 `FINALIZED` |

## Current V3 evidence baseline

| Repository evidence | What it proves | What it does not prove |
| --- | --- | --- |
| `contracts/truth_market.py::resolve_market` calls `gl.nondet.exec_prompt` inside `gl.eq_principle.prompt_non_comparative`. | The current source expresses an intelligent write using prompt consensus. | It does not separate request bookkeeping from AI execution; request/result/status changes occur in one `resolve_market` call. |
| `scripts/deploy-truthmarket.mjs` deploys source and waits for `ACCEPTED`. | The SDK can submit deployments and expose an accepted receipt shape. | It does not wait for or prove finalized-success deployment. |
| `scripts/smoke-truthmarket.mjs` submits create/stake/evidence writes, waits for accepted receipts, and polls accepted state. | Hash submission and accepted-state observation are implemented for deterministic V3 writes. | Preserved evidence explicitly does not prove finality, resolution, or two-step AI execution. |
| `scripts/inspect-tx.mjs` reads normalized status/result/execution fields. | A transaction can be inspected independently by hash. | Existing recorded artifacts do not show a Gate 1 request/execution pair. |
| `lib/activity.ts` distinguishes `ACCEPTED`, `READY_TO_FINALIZE`, and `FINALIZED`; success requires `FINISHED_WITH_RETURN`. | The repository has a tested lifecycle classifier. | Browser-local activity is not protocol evidence and is tied to the V3 frontend. |
| `docs/DEPLOYMENT.md` records V2 resolution timeouts and no preserved V3 resolution proof. | Intelligent execution can timeout and must not be inferred from source. | It provides no successful Gate 1 lifecycle evidence. |

## Verdict rule

Gate 1 passes only when every G1-01 through G1-18 live evidence obligation is satisfied on an explicitly recorded nonproduction network. Local tests can validate probe intent and rejection logic, but cannot substitute for finalized network receipts, accepted/finalized state observation, or a genuinely different executor address.
