# TruthMarket V4 Gate 2 requirements stage

This directory freezes the requirements, machine-readable specifications, canonicalization vectors, deterministic local model, scheduler harness model, offline-verifier rules, and local Stage A probe for Gate 2 stale-write protection.

The probe is a bounded, nonproduction local implementation only; it retains at most three attempts, is not deployed, and does not include a deployment runner. Gate 1 remains the only completed feasibility gate. Production V4 remains blocked.

## Contents

- `GATE2_REQUIREMENTS.md`: normative scope, invariant, retry ancestry, evidence, and verdict rules.
- `BRADBURY_ABI_PREFLIGHT.md`: finalized structured-read ABI evidence and its explicit nonclaims.
- `EVIDENCE_CAPABILITY_PREFLIGHT.md`: current unproved ordering/overlap capability status and unfilled inspection template.
- `VERIFIER_SPEC.md`: future independent offline evidence-verifier contract.
- `contracts/truth_market_v4_gate2_probe.py`: bounded nonproduction Stage A probe implementing the frozen local state machine and intended read ABI.
- `fixtures/canonicalization-vectors.json`: frozen cross-language canonicalization vectors.
- `models/`: deterministic nonproduction state and scheduler models.
- `specs/`: scenario, reason-code, and future evidence schemas.
- `tests/`: independent Python/Node canonicalization tests, model tests, scheduler tests, verdict-rule conformance tests, local probe tests, and ABI source-conformance tests.

There is deliberately no runner, verifier executable, deployment helper, wallet helper, funding helper, or production application code.

## Local validation

No dependency installation is required.

```bash
PYTHONPYCACHEPREFIX=/tmp/truthmarket-gate2-stage-a-pycache \
python3 -m py_compile \
  experiments/v4-gate2/contracts/truth_market_v4_gate2_probe.py

PYTHONDONTWRITEBYTECODE=1 \
python3 -m unittest discover \
  -s experiments/v4-gate2/tests \
  -p 'test_*.py' \
  -v

node --test \
  experiments/v4-gate2/tests/gate2-canonicalization.test.mjs \
  experiments/v4-gate2/tests/gate2-verdict-rules.test.mjs
```

The Python and Node canonicalizers are independent implementations checked against frozen bytes and hashes. The local probe tests execute the actual probe source through a local GenLayer API stub and compare its deterministic transitions with the authoritative model. Local probe, model, and scheduler tests prove only their specified local behavior, never Bradbury execution or ordering semantics.

Current Stage A status is local implementation only. Exact Studio schema generation for the frozen ABI, `Optional[int] -> None` end-to-end behavior, authoritative evidence capability, and a practical overlap mechanism remain unproved. `EVIDENCE_CAPABILITY_NOT_PROVED` applies, so Stage B remains blocked.

The finalized ABI preflight proves only the exact deployed source's Studio schema generation, Bradbury deployment and finalized execution, demonstrated nested dataclass/list serialization, `Optional[int]` schema acceptance, and logical decoded `get_state` result recorded in `BRADBURY_ABI_PREFLIGHT.md`. The raw RPC envelope was not independently preserved in this documentation amendment. It does not prove that the larger Gate 2 dataclasses compiled or deployed.

Gate 2 freezes `Gate2StateView` and `Gate2AttemptView` as the intended bounded Stage A read ABI. Their exact definitions must pass Studio schema generation or another authorized compiler check before Stage A approval; failure stops Stage A for requirements review rather than allowing a silent ABI change. The Stage A Gate 2 probe SHALL retain an explicit `__init__` because every successful Studio schema experiment in the preflight used one while the tested minimal contract without it failed schema loading. This is a conservative requirement for this probe, not a universal GenLayer rule. The contract does not generate canonical JSON: a future runner preserves raw typed results and complete RPC envelopes, while the independent verifier maps them to frozen logical state, canonicalizes them, computes UTF-8 bytes and SHA-256, and compares mutations.

Verdict helpers in `tests/support/` validate structural contracts and compose internally marked verified test results only. They are not an evidence verifier: raw runner claims cannot produce `PASS` or `FAIL`, and serialization removes every requirements-stage verification marker. A future independently reviewed verifier must recompute ordering, snapshot integrity, mutation sets, assertions, and scenario results.

## Remaining authorization boundary

The following remain unauthorized: Bradbury runner, verifier executable, account setup, funding, wallet use, deployment, transaction submission, production V4 code, commit, push, or pull request. The local Stage A probe does not authorize any of them.

Authoritative ordering metadata or trace support may be unavailable or lack verified semantics. In that case the live-overlap trials and Gate 2 must remain `INCONCLUSIVE`; polling chronology cannot be substituted.

Stage A remains limited to the local probe, local/model/compiler/ABI tests, read-only evidence-capability inspection, and focused documentation. Stage B remains blocked until independently reviewed `EVIDENCE_CAPABILITY_PROVED` establishes both (1) a concrete reproducible authoritative path proving old-path entry, nonterminality through successor authority, successor-before-old-result ordering, and finalized no-mutation state, and (2) a permitted practical reproducible overlap mechanism. Artificial delays, busy loops, application-selected delay endpoints, added path markers/events, favorable retries, replacement trials, and discarded trials are prohibited. Missing either capability yields `EVIDENCE_CAPABILITY_NOT_PROVED` and keeps Stage B blocked.

If automated read-only inspection is unavailable, a documented manual read-only procedure may be used, but lack of access is not evidence. Raw evidence cannot authorize `PASS` or `FAIL`; only the future independent verifier produces verified trial and scenario results.

Any future deployment requires separate authorization and must be performed through GenLayer Studio at <https://studio.genlayer.com/contracts>, with the selected network explicitly verified as GenLayer Bradbury Testnet. No deployment script belongs in this requirements-stage directory.
