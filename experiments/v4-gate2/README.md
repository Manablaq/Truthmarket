# TruthMarket V4 Gate 2 requirements stage

This directory freezes the requirements, machine-readable specifications, canonicalization vectors, deterministic local model, scheduler harness model, and offline-verifier rules for Gate 2 stale-write protection.

It is not a Gate 2 probe implementation and contains no contract or deployment runner. Gate 1 remains the only completed feasibility gate. Production V4 remains blocked.

## Contents

- `GATE2_REQUIREMENTS.md`: normative scope, invariant, retry ancestry, evidence, and verdict rules.
- `VERIFIER_SPEC.md`: future independent offline evidence-verifier contract.
- `fixtures/canonicalization-vectors.json`: frozen cross-language canonicalization vectors.
- `models/`: deterministic nonproduction state and scheduler models.
- `specs/`: scenario, reason-code, and future evidence schemas.
- `tests/`: independent Python/Node canonicalization tests, model tests, scheduler tests, and verdict-rule conformance tests.

There is deliberately no `contracts/` directory, runner, deployment helper, wallet helper, funding helper, or production application code.

## Local validation

No dependency installation is required.

```bash
PYTHONDONTWRITEBYTECODE=1 \
python3 -m unittest discover \
  -s experiments/v4-gate2/tests \
  -p 'test_*.py' \
  -v

node --test \
  experiments/v4-gate2/tests/gate2-canonicalization.test.mjs \
  experiments/v4-gate2/tests/gate2-verdict-rules.test.mjs
```

The Python and Node canonicalizers are independent implementations checked against frozen bytes and hashes. Local and scheduler models prove only the specified model/harness behavior, never Bradbury execution semantics.

Verdict helpers in `tests/support/` validate structural contracts and compose internally marked verified test results only. They are not an evidence verifier: raw runner claims cannot produce `PASS` or `FAIL`, and serialization removes every requirements-stage verification marker. A future independently reviewed verifier must recompute ordering, snapshot integrity, mutation sets, assertions, and scenario results.

## Remaining authorization boundary

The following remain unauthorized: a probe contract, Bradbury runner, account setup, funding, wallet use, deployment, transaction submission, production V4 code, commit, push, or pull request.

Authoritative ordering metadata or trace support may be unavailable or lack verified semantics. In that case the live-overlap trials and Gate 2 must remain `INCONCLUSIVE`; polling chronology cannot be substituted.

Any future deployment requires separate authorization and must be performed through GenLayer Studio at <https://studio.genlayer.com/contracts>, with the selected network explicitly verified as GenLayer Bradbury Testnet. No deployment script belongs in this requirements-stage directory.
