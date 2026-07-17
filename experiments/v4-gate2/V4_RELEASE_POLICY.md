# TruthMarket V4 release policy

## Decision

TruthMarket V4 product completion and GenLayer Builder Program submission may proceed without complete Gate 2 forensic-evidence capability. Product work is governed by the mandatory **Product Release Readiness** checklist below; the optional research work is governed by **Forensic Assurance Research**.

This decision does not change `EVIDENCE_CAPABILITY_NOT_PROVED`. It does not claim that the optional controlled experiment ran or succeeded, that the natural-overlap race was forensically proved, or that complete protocol-level history is available from Bradbury public interfaces.

## Reasoning

- The candidate contract design contains stale-write guards, and the Stage A probe implements the corresponding bounded guards.
- Local behavioral tests exercise stale-write rejection and successor preservation, while source-AST tests verify that the repeated post-intelligence guards precede protected mutation.
- The exact committed Stage A contract source derives a valid Bradbury schema through the read-only schema interface. This establishes schema compatibility for that source; it is not a deployment or end-to-end execution result.
- The unresolved questions concern protocol-level historical observability: reconstructing prior typed states, internal intelligent-operation phases, recomputation history, and authoritative ordering from public interfaces.
- Incomplete public forensic observability is not equivalent to a demonstrated application defect. It narrows what can truthfully be proved and claimed.
- Holding the entire product behind an unavailable forensic proof would not be proportionate to the product risk that proof addresses.
- TruthMarket must still satisfy strict contract, product, UX, security, and Bradbury end-to-end validation before release. This reclassification removes one disproportional dependency; it does not lower the release standard or establish readiness.

## Planning records

- The [V4 implementation-readiness audit](../../docs/V4_IMPLEMENTATION_READINESS_AUDIT.md) is an analytical evidence record for PRR-01 through PRR-08.
- The [V4 bounded foundation plan](../../docs/V4_BOUNDED_FOUNDATION_PLAN.md) governs pre-implementation evidence production and decision closure.

PRR-01 through PRR-08 remain officially `NOT_EVALUATED`; analytical audit statuses do not modify official statuses. Product V4 implementation remains `AUTHORIZED_TO_PLAN`, which is not authorization to code. Neither planning record authorizes deployment, release, or Builder Program submission.

## Track A — Product Release Readiness

**Product Release Readiness** is mandatory for completing, deploying, validating, and submitting TruthMarket V4. It covers:

- production V4 contract implementation;
- preservation of stale-write guards;
- contract-schema compatibility;
- deterministic contract invariants;
- complete local automated testing;
- frontend integration;
- wallet and Bradbury network handling;
- normal Bradbury deployment;
- normal user-flow transactions;
- end-to-end market-lifecycle testing;
- transaction-state synchronization;
- error and recovery handling;
- claim and refund correctness;
- evidence display;
- responsive and accessible UX;
- production documentation;
- Builder Program demo readiness; and
- truthful claims.

Product Release Readiness may proceed while **Forensic Assurance Research** remains unresolved. Proceeding means planning and implementing against the checklist; it does not bypass any checklist item or grant deployment, wallet, funding, transaction, release, or submission authorization.

## Track B — Forensic Assurance Research

**Forensic Assurance Research** is optional, separately authorized, and non-release-blocking. It covers:

- historical status reconstruction;
- exact historical typed-state reconstruction;
- exhaustive lifecycle-event guarantees;
- primitive-level intelligent-path attribution;
- recomputation history and prior-round retention;
- GenLayer-to-EVM finality mapping;
- natural-overlap forensic proof; and
- the previously proposed funded controlled experiment.

Its formal status remains `EVIDENCE_CAPABILITY_NOT_PROVED`.

Forensic Assurance Research blocks only:

- claims that the natural-overlap race was forensically proved;
- claims that every internal GenLayer execution phase was reconstructed;
- claims of formal protocol-level proof; and
- execution of the optional controlled forensic experiment without separate authorization.

It does not block product implementation, production-quality frontend work, ordinary Bradbury deployment, ordinary end-to-end testing, normal intelligent-transaction usage, or Builder Program preparation and submission once their own checklist and authorization requirements are satisfied.

## Mandatory product-release gate

This checklist is closed for this policy revision. Every item begins at `NOT_EVALUATED`; no item is evidence of completed work until a later authorized review records reproducible results.

| ID | Mandatory requirement | Status |
| --- | --- | --- |
| PRR-01 | Production V4 contract source is frozen and reviewed. | `NOT_EVALUATED` |
| PRR-02 | Public ABI is frozen and frontend-compatible. | `NOT_EVALUATED` |
| PRR-03 | Contract schema derives successfully. | `NOT_EVALUATED` |
| PRR-04 | Python contract tests pass. | `NOT_EVALUATED` |
| PRR-05 | Node canonicalization and verdict tests pass. | `NOT_EVALUATED` |
| PRR-06 | Stale-write behavioral regression passes. | `NOT_EVALUATED` |
| PRR-07 | Post-intelligence guard ordering passes. | `NOT_EVALUATED` |
| PRR-08 | No rejected transaction consumes state or identifiers. | `NOT_EVALUATED` |
| PRR-09 | Market lifecycle works end to end. | `NOT_EVALUATED` |
| PRR-10 | YES, NO, and INVALID flows work. | `NOT_EVALUATED` |
| PRR-11 | Evidence submission and presentation work. | `NOT_EVALUATED` |
| PRR-12 | Intelligent resolution works on Bradbury. | `NOT_EVALUATED` |
| PRR-13 | Claim and refund flows work. | `NOT_EVALUATED` |
| PRR-14 | Frontend state updates without manual refresh. | `NOT_EVALUATED` |
| PRR-15 | Wallet and network-mismatch handling work. | `NOT_EVALUATED` |
| PRR-16 | Loading, empty, rejected, failed, and recovery states work. | `NOT_EVALUATED` |
| PRR-17 | Mobile and desktop layouts are reviewed. | `NOT_EVALUATED` |
| PRR-18 | Security and dependency checks pass. | `NOT_EVALUATED` |
| PRR-19 | Deployment addresses and network configuration are documented. | `NOT_EVALUATED` |
| PRR-20 | Submission claims are supported by reproducible evidence. | `NOT_EVALUATED` |

All twenty items must be evaluated and pass before product release or a readiness claim. A later revision may change an item status only with its supporting evidence and review record; it must not silently add, omit, or reinterpret a requirement.

## Non-release-blocking forensic track

The following Gate 2 platform-observability questions remain unresolved:

- whether public interfaces retain authoritative historical status for every relevant transition;
- whether exact historical typed contract state can be reconstructed and correlated to a transaction version;
- whether lifecycle events are complete, authoritative, and historically retained;
- whether entry into the intended intelligent primitive can be independently attributed;
- whether recomputation, conflict, invalidation, and prior-round history are retained with stable semantics;
- how GenLayer consensus finality and ordering map to the EVM wrapper and its observable transaction lifecycle;
- whether a natural overlap can be reproduced without artificial delay or favorable retry; and
- whether the frozen controlled-experiment evidence requirements can be satisfied using currently public Bradbury interfaces.

These are open Forensic Assurance Research items. They must not be represented as solved, inferred from polling chronology, or substituted with application-level test results. Their unresolved status does not waive any Product Release Readiness requirement.

## Permitted claims

The following claims are permitted only when their stated evidence condition is actually satisfied:

- “TruthMarket is deployed on GenLayer Bradbury Testnet” after deployment is completed and independently verified.
- “Markets are resolved through GenLayer intelligent transactions” after verified end-to-end testing.
- “The contract includes stale-write protection” when the reviewed production source contains the guards.
- “The stale-write guards are covered by local automated tests” when those tests pass against the reviewed source.
- “Core market lifecycle flows were tested end to end” after those flows are actually tested and the evidence is retained.

Claims must name their evidence boundary. Application tests, schema derivation, deployment, finalized transactions, and protocol-forensic proof are distinct forms of evidence and must not be conflated.

## Prohibited claims

The following claims are prohibited unless a later independently reviewed record actually proves them:

- all possible recomputation races are formally proved;
- complete historical transaction state can be reconstructed;
- every validator or intelligent primitive invocation is independently proven;
- the optional natural-overlap experiment succeeded;
- Gate 2 passed or completed;
- TruthMarket V4 is approved or production ready before every mandatory release-checklist item passes; and
- the application is safe under all races.

## Authorization boundaries

The following still require separate authorization:

- Bradbury contract deployment;
- wallet use;
- funding;
- transaction signing or submission;
- the controlled forensic experiment;
- production release; and
- Builder Program submission.

Ordinary V4 planning and implementation work does not require Forensic Assurance Research proof. This policy authorizes planning only in the current repository state; it records no authorization to deploy, use a wallet, fund an account, sign or submit a transaction, release production, or submit to the Builder Program.

## Status summary

- Product V4 implementation: `AUTHORIZED_TO_PLAN`
- Product V4 integration: `NOT_STARTED`
- Bradbury deployment: `NOT_AUTHORIZED`
- End-to-end Bradbury validation: `NOT_STARTED`
- Builder Program submission: `NOT_READY`
- Forensic evidence capability: `EVIDENCE_CAPABILITY_NOT_PROVED`
- Controlled forensic experiment: `BLOCKED_PENDING_SEPARATE_AUTHORIZATION`
