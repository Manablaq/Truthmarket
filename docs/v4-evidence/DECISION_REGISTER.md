# TruthMarket V4 BF-0 decision register

Status: `DRAFT_PENDING_CANDIDATE_COMMIT_AND_EXTERNAL_REVIEW`

Every entry names an accountable role rather than silently assigning a
decision to implementation code. `OPEN_BLOCKING`, `NOT_AUTHORIZED`,
`SOURCE_ABSENT`, `NOT_READY`, and provenance-only states are deliberate.

| ID | Decision | Owner | Prerequisite | Alternatives | Evidence | Status | Review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `D-001` | Separate mandatory product readiness from optional forensic research | Release authority | Exact merged-policy provenance | Forensic proof required globally / separate tracks | PR #12 body SHA-256 `e693a9cca9360691d56da7d8a7ca424e5079619268a760141c84ddb4463f1da7`; source commit `541b37644f043edbf8126d99d07bf581eaf8fc40`; merge commit `cd242dc2499b676e111167b8b5c92e5b5334eedf` | `MERGED_POLICY_PROVENANCE_ONLY` | Policy bytes are merged; no retained independent-review artifact is claimed |
| `D-002` | Classify the current Stage A historical schema record | BF-0 evidence owner | Source, Git history, and immutable PR #11 locator | Fully reproducible / unresolved / reject claim | Stage A schema-derivation record and PR #11 body SHA-256 | `RECORDED_UNRESOLVED` | Pending external independent BF-0 review |
| `D-003` | Select the Gate 5 payout-delivery state machine, including dispatch, completion, failure, retry, callback, and reconciliation | BF-1 owner | Reproducible child-message and parent-state evidence | Atomic single-write / asynchronous / two-phase reconciliation / another measured model | Architecture, economics, state machine, test plan, and conceptual transition registers | `OPEN_BLOCKING` | No claim admission, payout dispatch, completion, failure, retry, callback, reconciliation, or related activity/accounting code is authorized |
| `D-004` | Select execution, timing, storage, pagination, and capacity values | BF-3 owners | Mandatory feasibility prototypes and benchmarks | Candidate hard values supported by measured margins | V4 architecture and bounded foundation plan | `OPEN_BLOCKING` | Not reviewed |
| `D-005` | Authorize a production V4 source scope | Independent release authority | BF-0 through BF-5 accepted | Authorize exact scope / retain prohibition | Bounded foundation plan | `NOT_AUTHORIZED` | BF-6 not reached |
| `D-006` | Freeze the public V4 ABI | BF-4 owner | Gate 5 and every ABI-affecting product gate closed | Single-write candidate / revised payout ABI | Architecture candidate ABI | `OPEN_DEPENDENCY` | Cannot freeze before Gate 5 |
| `D-007` | Derive and freeze a production V4 schema | Production source reviewer | Exact authorized and frozen production source | Read-only derivation with complete retained output | Compatibility baseline and PRR-03 | `SOURCE_ABSENT` | No production derivation exists |
| `D-008` | Begin frontend V4 integration | Frontend integration owner | Frozen source, ABI, schema, DTO and configuration manifest | Integrate / remain V3 | Readiness audit | `NOT_STARTED_NOT_AUTHORIZED` | BF-0 grants no integration authority |
| `D-009` | Accept BF-0 evidence normalization | Independent reviewer | Immutable candidate commit C1, external validation records bound to C1, external independent attestation bound to C1, and zero unresolved P0-P2 findings | Accept / request changes | C1 Git commit/tree plus external validation and review attestations | `PENDING_CANDIDATE_COMMIT_AND_EXTERNAL_REVIEW` | The candidate package cannot approve itself or be edited to manufacture its own approval |
| `D-010` | Represent TruthMarket as Builder Program ready | Release authority | PRR-01 through PRR-20 and retained claim evidence | Ready / not ready | V4 release policy | `NOT_READY` | No submission-readiness claim |

## Immutable candidate and external-attestation protocol

1. Candidate commit `C1` contains the complete BF-0 package with all
   statuses still pending.
2. Local and CI validation records are external artifacts. Each must
   identify the exact `C1` commit and tree, command, resolved environment,
   timestamps, exit code, and retained output digest or run URL.
3. Independent review is an external attestation that identifies `C1`,
   the reviewed artifact identities, reviewer, date, findings, and decision.
4. BF-0 acceptance, if granted, is the pair `C1 + external attestation`;
   it is not created by editing `C1`.
5. Any later bookkeeping commit must reference `C1` and the attestation,
   must not alter the historical bytes of `C1`, and must not claim that
   its own changed bytes were part of the original review.

## Change control

A decision changes only through a hash-bound reviewed record that states:

1. the exact new status;
2. the evidence and hashes supporting it;
3. the alternatives rejected;
4. the reviewer and findings;
5. every dependent document, ABI, test, or capacity change.

Silence, implementation progress, a successful preview build, or an
isolated test pass never changes a decision status.
