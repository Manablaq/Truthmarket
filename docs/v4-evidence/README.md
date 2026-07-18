# TruthMarket V4 BF-0 evidence normalization index

Status: `DRAFT_PENDING_CANDIDATE_COMMIT_AND_EXTERNAL_REVIEW`

## Baseline and authority

- Baseline commit: `eea21e1617c32c447ba43da658402435126d5272`
- Baseline tree: `c0991d4d0df247dfd41bf08977f5eff900a37873`
- Branch: `docs/v4-evidence-normalization`
- Workstream: `BF-0`
- Production V4 source: `NOT_STARTED`
- Production coding: `NOT_AUTHORIZED`
- Frontend integration: `NOT_STARTED_AND_NOT_AUTHORIZED`
- Deployment: `NOT_AUTHORIZED`
- Builder Program submission: `NOT_READY`
- Official PRR-01 through PRR-20 statuses: `NOT_EVALUATED`

This package normalizes evidence boundaries. It does not implement V4,
change the public ABI, derive a network schema, deploy a contract,
perform a wallet operation, or advance a release-policy status.

## Package

The package contains seven required BF-0 evidence/register deliverables
plus this index, for eight output documents total.

| Artifact | Purpose | Current state |
| --- | --- | --- |
| [Source and fixture hash manifest](SOURCE_AND_FIXTURE_HASH_MANIFEST.md) | Exact BF-0 input bytes, SHA-256 identities, provenance locators, and reproduction procedure | `DRAFT` |
| [Test-command manifest](TEST_COMMAND_MANIFEST.md) | Exact command specification, expected counts, ownership, and external-record requirements | `DRAFT_SPECIFICATION_ONLY` |
| [Stage A schema record](STAGE_A_SCHEMA_DERIVATION_RECORD.md) | Recoverable provenance and explicit unresolved historical data | `PARTIALLY_EVIDENCED` |
| [Product-gate register](PRODUCT_GATE_REGISTER.md) | Mandatory product requirements, owners, source/test traceability, and PRR relationships separated from optional forensics | `DRAFT` |
| [Decision register](DECISION_REGISTER.md) | Owner, prerequisite, alternatives, evidence, status, review, and immutable-candidate protocol | `DRAFT` |
| [Protected-mutation register](PROTECTED_MUTATION_REGISTER.md) | Candidate public writes, conceptual Gate 5 lifecycle transitions, and future PRR-07 checker contract | `MANIFEST_ONLY` |
| [Write atomicity register](WRITE_ATOMICITY_REGISTER.md) | Candidate-write and conceptual Gate 5 PRR-08 snapshot requirements | `MANIFEST_ONLY` |

## Evidence boundaries

### Current V3

`contracts/truth_market.py`, current frontend DTO consumers, and current
configuration remain V3. They are useful compatibility baselines but
are not V4 implementation or atomicity proof.

### Gate 1

Gate 1 is an isolated two-transaction feasibility probe with retained
historical Bradbury evidence. It is not the production market.

### Gate 2 Stage A

Stage A is an isolated bounded stale-write/state-machine probe. Its
source and local tests do not implement production market, evidence,
settlement, claims, refunds, activity, or complete accounting.

### Gate 2 models and specifications

Canonicalization vectors, verdict rules, models, scheduler harnesses,
and tests own their explicitly named local/specification behavior.
They are not a protocol evidence verifier.

### Current frontend

Current frontend schemas and network configuration are V3-shaped.
Frontend V4 integration remains `NOT_STARTED_AND_NOT_AUTHORIZED`.

### Future production work

No production V4 source, frozen production ABI artifact, production
schema artifact, V4 deployment address, or V4 end-to-end Bradbury
evidence exists.

## BF-0 completion state

- Seven required deliverables plus this index created: `YES`
- Source and fixture identities recorded: `YES`
- Historical Stage A gaps explicitly classified: `YES`
- Immutable candidate commit fixed: `NO`
- External local-validation record bound to candidate: `NO`
- External CI record bound to candidate: `NO`
- External independent review attestation bound to candidate: `NO`
- Zero unresolved P0-P2 findings established: `NO`
- BF-0 accepted: `NO`

## External review and acceptance protocol

No author may edit this package to fill an in-package approval field.

The next immutable candidate commit is named `C1`. Local validation,
CI, and independent-review records must remain external to `C1` and
must reference its exact commit SHA, Git tree, reviewed file identities,
timestamps, environment or run identifiers, findings, and decision.

BF-0 acceptance, if later granted, is the evidence object
`C1 + external independent attestation`. Any bookkeeping commit must
reference that object and must not imply that changed bookkeeping bytes
were reviewed as part of `C1`.
