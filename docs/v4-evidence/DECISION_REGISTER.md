# TruthMarket V4 BF-0 decision register

Status: `CANDIDATE_PACKAGE_NO_IN_PACKAGE_APPROVAL`

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
| `D-009` | Accept BF-0 evidence normalization | Independent reviewer | Immutable candidate object containing this package, external candidate-identity record, local and CI validation records bound to that same object, external independent attestation bound to that same object, and zero unresolved P0/P1/P2/P3 findings | Accept / request changes | Exact candidate Git commit/tree plus the complete hash-bound external identity, validation, CI, and independent-review evidence set | `NO_IN_PACKAGE_ACCEPTANCE_DECISION` | The candidate package cannot approve itself or be edited to manufacture its own approval; only an external record may decide this row |
| `D-010` | Represent TruthMarket as Builder Program ready | Release authority | PRR-01 through PRR-20 and retained claim evidence | Ready / not ready | V4 release policy | `NOT_READY` | No submission-readiness claim |

## Immutable candidate and external-attestation protocol

1. The candidate object is the immutable Git commit containing the complete
   BF-0 package bytes under review. Its own commit and tree identities cannot
   be embedded in those same bytes without changing the object.
2. An external candidate-identity record created after commit formation must
   capture the exact repository, commit, tree, parent, eight output paths,
   and output-file identities.
3. Local and CI validation records are external artifacts. Each must bind to
   that same candidate object and identify the command, resolved environment,
   timestamps, exit code, and retained output digest or run URL. A TC-10-
   eligible pull-request run must check out the exact candidate head SHA, read
   exactly one `BF0-Candidate-Commit` and `BF0-Candidate-Tree` marker from the
   external PR body, fail unless `HEAD` and `HEAD^{tree}` equal those markers,
   and retain the asserted and resolved identities as a downloadable artifact.
4. Independent review is an external attestation that binds to the same
   candidate object and reviewed artifact identities, and records reviewer,
   date, all P0/P1/P2/P3 findings, and decision. Its review input must include
   a read-only Git bundle or equivalent complete canonical object set that
   permits offline commit, parent, root-tree, subtree, blob, and diff checks.
5. BF-0 acceptance, if granted externally, is the exact candidate object plus
   the complete hash-bound evidence set satisfying `D-009`; it is never
   created by editing the candidate object.
6. Any later bookkeeping commit must reference that exact candidate object
   and external evidence set, must not alter the historical candidate bytes,
   and must not claim that its own changed bytes were part of the review.

## Change control

A decision changes only through a hash-bound reviewed record that states:

1. the exact new status;
2. the evidence and hashes supporting it;
3. the alternatives rejected;
4. the reviewer and findings;
5. every dependent document, ABI, test, or capacity change.

Silence, implementation progress, a successful preview build, or an
isolated test pass never changes a decision status.

## C3 independent-review correction boundary

The independent C3 review record with SHA-256
`dd42c357685fed8a9f4f419885413dcd599d0c0a622b03194f44d13764eaa4c2`
returned `REQUEST_CHANGES` for F-004 through F-007. The successor candidate
under review contains corrections intended to normalize every cited
P0/P1/P2/P3 threshold, close direct command-input traceability for TC-02 through
TC-04, enforce exact-candidate CI identity, and state the five claim `ZERO_ONLY`
rules. Only external validation and independent review may determine whether
those findings are resolved; this section does not change `D-009`, any PRR
status, or BF-0 acceptance.
