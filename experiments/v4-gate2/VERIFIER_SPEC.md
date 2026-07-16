# Gate 2 offline evidence-verifier specification

Status: specification only. No verifier executable or Bradbury runner is implemented in this requirements stage.

## 1. Purpose

The future offline verifier independently determines whether a Gate 2 evidence bundle is structurally complete, cryptographically bound to reviewed artifacts, canonically encoded, internally consistent, and entitled to its mechanically computed verdict.

It must not trust runner-authored status, reason-code, mutation, ordering, digest, or verdict fields without recomputation.

Requirements-stage conformance helpers are not this verifier. They may validate raw record structure and compose already verified test results, but raw runner evidence cannot acquire their nonserializable verified-result markers or authorize `PASS`/`FAIL`. Serialized evidence always requires this verifier to recompute a new verified trial or scenario result.

## 2. Planned invocation

```bash
node experiments/v4-gate2/scripts/verify-gate2-evidence.mjs \
  --expected-commit <reviewed_commit_sha> \
  --expected-bundle-sha256 <reviewed_bundle_sha256> \
  --evidence experiments/v4-gate2/fixtures/gate2-evidence.json
```

This command is documentation only. No `scripts/` directory or verifier implementation is authorized now.

## 3. External trust anchor

The sole normative trust anchor is:

```text
reviewed Git commit SHA + independently recorded bundle SHA-256
```

The verifier must receive both values from command-line inputs or equivalently trusted review parameters. It must not obtain either trusted expected value solely from the evidence bundle.

The evidence process is:

1. generate the complete bundle;
2. compute `SHA256(canonical_json(bundle with top-level bundle_sha256 omitted))`;
3. commit the bundle and every referenced artifact in one immutable Git commit;
4. independently review that exact commit;
5. record `evidence_commit_sha` and `expected_bundle_sha256` outside the bundle in the review report;
6. invoke the verifier with those values; and
7. repeat independent review after any bundle, artifact, digest, or commit change.

A self-contained digest detects accidental alteration but is not authenticity. The external commit-plus-digest pair prevents coordinated payload-and-self-digest replacement from retaining approval.

## 4. Repository preconditions

The verifier must reject:

- a dirty working tree or index;
- a checkout whose `HEAD` differs from `--expected-commit`;
- a missing or untracked referenced artifact;
- an evidence declaration that differs from the external expected values;
- an artifact hash that differs from the file at the reviewed commit; or
- a bundle digest that differs from `--expected-bundle-sha256`.

## 5. Schema and identity validation

The verifier validates `specs/gate2-evidence.schema.json` and then independently requires:

- exactly one record for each mandatory `G2-S01` through `G2-S19` scenario ID;
- exactly `G2-OVERLAP-T1`, `G2-OVERLAP-T2`, and `G2-OVERLAP-T3` with indices 1, 2, and 3;
- no missing, duplicate, extra, substituted, discarded, or undeclared scenario/trial;
- all deployment and transaction hashes required by each executed scenario;
- status/reason-code namespace agreement with `specs/gate2-reason-codes.json`; and
- rejection of unknown scenario IDs, trial IDs, statuses, reason codes, or ordering-evidence types.

Duplicate JSON object member names must be rejected during parsing. The stored evidence file must equal its canonical serialization except for the documented top-level digest calculation rule.

Schema validation is necessary but insufficient. The schema closes fixed IDs, fixed trial indices, status/reason namespaces, numeric ranges, and local conditional structure. The verifier independently enforces cross-record uniqueness, exact scenario-family coverage, transaction-to-scenario completeness, authoritative ordering semantics, path-based mutation meaning, and every mechanically derived verdict. No schema-valid runner declaration is trusted by itself.

The verifier requires exactly eleven deployment-attempt records, one for each frozen family. `DEPLOYED`, `FAILED_BEFORE_HASH`, `FAILED_AFTER_HASH`, and `NOT_RUN` records are all retained; no failed family may be replaced. Transaction attempts similarly retain `NOT_SUBMITTED`, `SUBMISSION_FAILED`, `SUBMITTED_NONTERMINAL`, and `AUTHORITATIVE_TERMINAL` outcomes. The verifier rejects fabricated hashes, addresses, terminal fields, or snapshots in branches where the schema requires null.

Full Draft 2020-12 runtime schema validation remains a future verifier implementation obligation. Requirements-stage tests inspect the frozen schema structurally and must not silently downgrade it to an older installed validator dialect.

## 6. Canonical state and digests

For every snapshot, the verifier independently:

1. validates safe integers, Unicode scalars, object shape, request order, and complete attempt records;
2. canonicalizes under `GATE2_REQUIREMENTS.md` section 13;
3. compares the recomputed canonical text to the stored raw text;
4. recomputes UTF-8 bytes and SHA-256;
5. compares the digest to the stored digest; and
6. rejects any contradiction.

It recomputes full path-based mutation sets between before and after snapshots. The runner's `observed_mutations` is untrusted. Rejection scenarios require byte-identical snapshots and an empty recomputed mutation set. Success scenarios require exact equality with their frozen allowed mutation set.

The stored records are snapshot claims until all six checks above pass. Their nested state must conform to safe JSON and must be scanned for prohibited secret-bearing names or values. A schema-valid redacted payload is not proof that a provider response was safely redacted.

## 7. Ordering verification

The verifier recomputes `ordering_achieved` from raw authoritative evidence. It rejects runner log order, wall-clock order, first-observation order, `ACCEPTED`, polling gaps, account nonces alone, or `LATEST_NONFINAL` as sufficient proof.

An ordering-evidence type may be used only when the reviewed requirements revision freezes its Bradbury source fields and semantics. `UNAVAILABLE` yields `INCONCLUSIVE` for an executed trial; absence of the required old-execution hash yields `NOT_RUN` before ordering classification. The verifier must prove old-path entry, authoritative nonterminality through invalidation, successor authority, later old terminal/conflict/invalidation/re-execution, no stale mutation, and successor executability.

## 8. Mechanical status and verdict computation

For every trial and scenario the verifier recomputes:

```text
ordering_achieved
expected_transaction_category
observed_transaction_category
allowed_mutations
observed_mutations
mandatory_assertions
status
reason_code
```

It aggregates exactly three overlap trials using the normative precedence in `GATE2_REQUIREMENTS.md`. It then computes the overall verdict with precedence `FAIL`, `REQUEST_CHANGES`, `INCONCLUSIVE`, `NOT_RUN`, `PASS`.

The assertion inventory is exact. Verified false `ORDERING_PROVED`, `OLD_PATH_ENTERED`, or `FINAL_STATE_STABLE` yields `INCONCLUSIVE`; verified false `NO_STALE_MUTATION`, `SUCCESSOR_REMAINS_EXECUTABLE`, or `SUCCESSOR_STATE_UNCHANGED` yields `FAIL`. Missing, duplicate, extra, unknown, inherited, or malformed assertions yield `REQUEST_CHANGES`.

Any runner-declared trial, scenario, or overall verdict that differs from recomputation is rejected with `REQUEST_CHANGES_VERDICT_MISMATCH`. A genuine stale mutation remains `FAIL` even when another structural defect exists.

## 9. Artifact integrity

The verifier checks hashes for:

- `GATE2_REQUIREMENTS.md`;
- probe source;
- runner source;
- offline verifier source;
- local model tests;
- scheduler tests;
- canonicalization vectors;
- the reviewed source commit; and
- every additional artifact declared by the evidence schema.

Absent future probe/runner/verifier artifacts cannot be represented as completed evidence. Requirements-stage tests may use explicit placeholders only in schema examples, never in a passing live bundle.

## 10. Required independent tests

Verifier tests must deliberately alter each of the following and require rejection:

- runner-computed trial, scenario, and overall verdicts;
- reason codes;
- snapshot text, digest, or mutation list;
- ordering evidence or `ordering_achieved`;
- a scenario/trial ID by omission, duplication, replacement, or addition;
- artifact hashes;
- bundle digest;
- expected commit;
- the external expected digest; and
- canonicalization bytes, including numeric and Unicode edge cases.

The runner and verifier may share frozen schemas, enums, and golden vectors. They must not depend solely on one opaque verdict-producing function. Independent mutation and verdict tests are mandatory.
