import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ASSERTION_CLASSIFICATION,
  MANDATORY_OVERLAP_ASSERTION_IDS,
  MANDATORY_SCENARIO_IDS,
  OVERLAP_TRIAL_IDS,
  aggregateOverlapTrials,
  computeOverallVerdict,
  createVerifiedScenarioResultForConformance,
  createVerifiedTrialResultForConformance,
  isDensePlainArray,
  recomputeMutationsForConformance,
  requireDeclaredVerdict,
  validateMandatoryScenarioIds,
  validateOverlapTrialStructure,
  validateStatusReason,
  verifyTrustAnchor,
} from "./support/verdict-rules.mjs";

const specRoot = new URL("../specs/", import.meta.url);
const reasonCodes = JSON.parse(await readFile(new URL("gate2-reason-codes.json", specRoot), "utf8"));
const scenariosSpec = JSON.parse(await readFile(new URL("gate2-scenarios.json", specRoot), "utf8"));
const evidenceSchema = JSON.parse(await readFile(new URL("gate2-evidence.schema.json", specRoot), "utf8"));
const canonicalVectors = JSON.parse(await readFile(new URL("../fixtures/canonicalization-vectors.json", import.meta.url), "utf8"));

const hash = (digit) => `0x${digit.repeat(64)}`;
const digest = (digit) => digit.repeat(64);
const snapshotClaim = (value = 0) => ({
  canonical_json: `{"value":${value}}`,
  sha256: digest(String(value % 10)),
  state: { value },
});

function assertions(overrides = {}) {
  return MANDATORY_OVERLAP_ASSERTION_IDS.map((id) => ({ id, passed: overrides[id] ?? true }));
}

function rawTrial(index, status = "PASS") {
  const trial = {
    trial_id: OVERLAP_TRIAL_IDS[index - 1],
    predeclared_index: index,
    old_execution_hash: hash(String(index)),
    old_execution_path_entered: true,
    authoritative_ordering_evidence_type: "CONSENSUS_HEIGHT",
    authoritative_ordering_evidence: { unverified_height_claim: "11" },
    ordering_achieved: true,
    before_state: snapshotClaim(index),
    successor_authoritative_state: snapshotClaim(index + 1),
    after_old_execution_state: snapshotClaim(index + 1),
    allowed_mutations: [],
    observed_mutations: [],
    mandatory_assertions: assertions(),
    declared_status: status,
    declared_reason_code: "PASS_OVERLAP_ORDER_PROVED_NO_MUTATION",
  };
  if (status === "INCONCLUSIVE") {
    trial.authoritative_ordering_evidence_type = "UNAVAILABLE";
    trial.authoritative_ordering_evidence = {};
    trial.ordering_achieved = false;
    trial.declared_reason_code = "INCONCLUSIVE_TRACE_UNAVAILABLE";
  } else if (status === "NOT_RUN") {
    trial.old_execution_hash = null;
    trial.old_execution_path_entered = false;
    trial.authoritative_ordering_evidence_type = "UNAVAILABLE";
    trial.authoritative_ordering_evidence = {};
    trial.ordering_achieved = false;
    trial.before_state = null;
    trial.successor_authoritative_state = null;
    trial.after_old_execution_state = null;
    trial.declared_reason_code = "NOT_RUN_SUBMISSION_FAILED";
  } else if (status === "FAIL") {
    trial.observed_mutations = [{ path: "current_value", before: 22, after: 11 }];
    trial.declared_reason_code = "FAIL_STALE_MUTATION";
  }
  return trial;
}

function verifiedTrial(index, assertionOverrides = {}, options = {}) {
  return createVerifiedTrialResultForConformance({
    trial_id: OVERLAP_TRIAL_IDS[index - 1],
    predeclared_index: index,
    assertions: assertions(assertionOverrides),
    successor_state: options.successorState ?? { value: 22, execution_count: 0 },
    after_old_state: options.afterOldState ?? { value: 22, execution_count: 0 },
    not_run_reason: options.notRunReason ?? null,
  });
}

function verifiedScenario(scenarioId, status, reason, overlapAggregate = undefined) {
  return createVerifiedScenarioResultForConformance({
    scenario_id: scenarioId,
    computed_status: status,
    computed_reason_code: reason,
    overlap_aggregate: overlapAggregate,
  }, reasonCodes);
}

function completeVerifiedScenarios(overlapAggregate, overrides = {}) {
  return MANDATORY_SCENARIO_IDS.map((scenarioId) => {
    if (scenarioId === "G2-S18-LIVE-OVERLAP") {
      return verifiedScenario(scenarioId, overlapAggregate.status, overlapAggregate.reason_code, overlapAggregate);
    }
    const status = overrides[scenarioId] ?? "PASS";
    const reason = status === "PASS" ? "PASS_SERIAL_GUARD"
      : status === "FAIL" ? "FAIL_STALE_MUTATION"
        : status === "INCONCLUSIVE" ? "INCONCLUSIVE_PLATFORM_RESULT_UNKNOWN"
          : status === "NOT_RUN" ? "NOT_RUN_MANDATORY_ACTION_MISSING"
            : "REQUEST_CHANGES_SCHEMA_INVALID";
    return verifiedScenario(scenarioId, status, reason);
  });
}

test("raw trial structural validation never authorizes PASS or FAIL", () => {
  assert.deepEqual(validateOverlapTrialStructure(rawTrial(1), reasonCodes), {
    structural_status: "STRUCTURALLY_VALID", reason_code: null,
  });
  assert.equal(aggregateOverlapTrials([rawTrial(1), rawTrial(2), rawTrial(3)], reasonCodes).status, "REQUEST_CHANGES");

  const fakeSnapshots = rawTrial(1);
  fakeSnapshots.before_state = { canonical_json: "not-json", sha256: digest("f"), state: { value: 999 } };
  assert.equal(validateOverlapTrialStructure(fakeSnapshots, reasonCodes).structural_status, "STRUCTURALLY_VALID");
  assert.equal(aggregateOverlapTrials([fakeSnapshots, rawTrial(2), rawTrial(3)], reasonCodes).status, "REQUEST_CHANGES");

  const fakeMutation = rawTrial(1, "FAIL");
  assert.equal(aggregateOverlapTrials([fakeMutation, rawTrial(2), rawTrial(3)], reasonCodes).status, "REQUEST_CHANGES");
});

test("assertion taxonomy separates evidence and invariant failures", () => {
  assert.deepEqual(ASSERTION_CLASSIFICATION.evidence, ["ORDERING_PROVED", "OLD_PATH_ENTERED", "FINAL_STATE_STABLE"]);
  assert.deepEqual(ASSERTION_CLASSIFICATION.invariant, ["NO_STALE_MUTATION", "SUCCESSOR_REMAINS_EXECUTABLE", "SUCCESSOR_STATE_UNCHANGED"]);
  assert.equal(verifiedTrial(1, { ORDERING_PROVED: false }).computed_status, "INCONCLUSIVE");
  assert.equal(verifiedTrial(1, { OLD_PATH_ENTERED: false }).computed_status, "INCONCLUSIVE");
  assert.equal(verifiedTrial(1, { FINAL_STATE_STABLE: false }).computed_status, "INCONCLUSIVE");
  assert.equal(verifiedTrial(1, { NO_STALE_MUTATION: false }).computed_status, "FAIL");
  assert.equal(verifiedTrial(1, { SUCCESSOR_REMAINS_EXECUTABLE: false }).computed_status, "FAIL");
  assert.equal(verifiedTrial(1, { SUCCESSOR_STATE_UNCHANGED: false }).computed_status, "FAIL");
  assert.equal(verifiedTrial(1, { ORDERING_PROVED: false, NO_STALE_MUTATION: false }).computed_status, "INCONCLUSIVE");
});

test("assertion inventory rejects missing, duplicate, unknown, sparse, inherited, and decorated arrays", () => {
  const variants = [];
  variants.push(assertions().slice(1));
  const duplicate = assertions(); duplicate[5] = { ...duplicate[4] }; variants.push(duplicate);
  const unknown = assertions(); unknown[5] = { id: "IRRELEVANT", passed: true }; variants.push(unknown);
  const sparse = assertions(); delete sparse[2]; variants.push(sparse);
  const decorated = assertions(); decorated.extra = true; variants.push(decorated);
  const inheritedAssertion = Object.create({ passed: true }); inheritedAssertion.id = "ORDERING_PROVED";
  const inherited = assertions(); inherited[0] = inheritedAssertion; variants.push(inherited);
  for (const inventory of variants) {
    assert.throws(() => createVerifiedTrialResultForConformance({
      trial_id: OVERLAP_TRIAL_IDS[0], predeclared_index: 1, assertions: inventory,
    }), /REQUEST_CHANGES_ASSERTION_INVENTORY_INVALID/);
  }
});

test("test-only mutation recomputation is deep, deterministic, and value-bound", () => {
  assert.deepEqual(
    recomputeMutationsForConformance(
      { a: 1, nested: { b: 2 }, rows: [1, 2] },
      { a: 1, nested: { b: 3 }, rows: [1, 4] },
    ),
    [
      { path: "nested.b", before: 2, after: 3 },
      { path: "rows[1]", before: 2, after: 4 },
    ],
  );
  const result = verifiedTrial(1, {}, { afterOldState: { value: 11, execution_count: 1 } });
  assert.equal(result.computed_status, "FAIL");
  assert.equal(result.computed_reason_code, "FAIL_STALE_MUTATION");
});

test("aggregate accepts only exact internally verified trial results", () => {
  const pass = verifiedTrial(1);
  const inconclusive2 = verifiedTrial(2, { ORDERING_PROVED: false });
  const inconclusive3 = verifiedTrial(3, { FINAL_STATE_STABLE: false });
  assert.deepEqual(aggregateOverlapTrials([pass, inconclusive2, inconclusive3], reasonCodes), {
    status: "PASS", reason_code: "PASS_OVERLAP_ORDER_PROVED_NO_MUTATION",
  });
  assert.deepEqual(
    aggregateOverlapTrials([
      verifiedTrial(1, { ORDERING_PROVED: false }),
      inconclusive2,
      inconclusive3,
    ], reasonCodes),
    { status: "INCONCLUSIVE", reason_code: "INCONCLUSIVE_ORDER_NOT_PROVED" },
  );
  assert.equal(aggregateOverlapTrials([pass, verifiedTrial(2, {}, { notRunReason: "NOT_RUN_SUBMISSION_FAILED" }), inconclusive3], reasonCodes).status, "NOT_RUN");
  assert.equal(aggregateOverlapTrials([verifiedTrial(1, { NO_STALE_MUTATION: false }), rawTrial(2), rawTrial(3)], reasonCodes).status, "REQUEST_CHANGES");
  const decoratedWithVerifiedFailure = [verifiedTrial(1, { NO_STALE_MUTATION: false }), rawTrial(2), rawTrial(3)];
  decoratedWithVerifiedFailure.extra = true;
  assert.equal(aggregateOverlapTrials(decoratedWithVerifiedFailure, reasonCodes).status, "REQUEST_CHANGES");
  assert.equal(aggregateOverlapTrials([
    verifiedTrial(1, { NO_STALE_MUTATION: false }),
    verifiedTrial(2),
    verifiedTrial(3),
  ], reasonCodes).status, "FAIL");
});

test("trial identity, index, marker, serialization, and array shape fail closed", () => {
  const valid = [verifiedTrial(1), verifiedTrial(2, { ORDERING_PROVED: false }), verifiedTrial(3, { ORDERING_PROVED: false })];
  assert.equal(aggregateOverlapTrials(valid.slice(0, 2), reasonCodes).status, "REQUEST_CHANGES");
  assert.equal(aggregateOverlapTrials([valid[0], valid[1], valid[1]], reasonCodes).status, "REQUEST_CHANGES");
  assert.equal(aggregateOverlapTrials(valid.map((item) => JSON.parse(JSON.stringify(item))), reasonCodes).status, "REQUEST_CHANGES");
  const sparse = [...valid]; delete sparse[1];
  assert.equal(aggregateOverlapTrials(sparse, reasonCodes).reason_code, "REQUEST_CHANGES_UNEXPECTED_ARRAY_PROPERTY");
  const decorated = [...valid]; decorated.extra = true;
  assert.equal(aggregateOverlapTrials(decorated, reasonCodes).reason_code, "REQUEST_CHANGES_UNEXPECTED_ARRAY_PROPERTY");
  class TrialArray extends Array {}
  const subclass = new TrialArray(...valid);
  assert.equal(aggregateOverlapTrials(subclass, reasonCodes).reason_code, "REQUEST_CHANGES_UNEXPECTED_ARRAY_PROPERTY");
  const symbolic = [...valid]; symbolic[Symbol("extra")] = true;
  assert.equal(aggregateOverlapTrials(symbolic, reasonCodes).reason_code, "REQUEST_CHANGES_UNEXPECTED_ARRAY_PROPERTY");
  assert.equal(isDensePlainArray(valid), true);
});

test("raw serial declarations cannot produce overall PASS or FAIL", () => {
  const rawPass = MANDATORY_SCENARIO_IDS.map((scenario_id) => ({ scenario_id, scenario_status: "PASS" }));
  const rawFail = [{ scenario_id: MANDATORY_SCENARIO_IDS[0], scenario_status: "FAIL" }];
  assert.equal(computeOverallVerdict(rawPass, reasonCodes), "REQUEST_CHANGES");
  assert.equal(computeOverallVerdict(rawFail, reasonCodes), "REQUEST_CHANGES");
  assert.equal(computeOverallVerdict([{ scenario_id: "UNKNOWN", invariant_violation: true }], reasonCodes), "REQUEST_CHANGES");
});

test("exact verified scenarios follow overall precedence", () => {
  const overlap = aggregateOverlapTrials([verifiedTrial(1), verifiedTrial(2, { ORDERING_PROVED: false }), verifiedTrial(3, { FINAL_STATE_STABLE: false })], reasonCodes);
  assert.equal(computeOverallVerdict(completeVerifiedScenarios(overlap), reasonCodes, [], "PASS"), "PASS");
  assert.equal(computeOverallVerdict(completeVerifiedScenarios(overlap, { [MANDATORY_SCENARIO_IDS[0]]: "FAIL" }), reasonCodes), "FAIL");
  assert.equal(computeOverallVerdict(completeVerifiedScenarios(overlap, { [MANDATORY_SCENARIO_IDS[0]]: "INCONCLUSIVE" }), reasonCodes), "INCONCLUSIVE");
  assert.equal(computeOverallVerdict(completeVerifiedScenarios(overlap, { [MANDATORY_SCENARIO_IDS[0]]: "NOT_RUN" }), reasonCodes), "NOT_RUN");
  assert.equal(computeOverallVerdict(completeVerifiedScenarios(overlap), reasonCodes, [], "FAIL"), "REQUEST_CHANGES");
});

test("overall input rejects incomplete, unknown, duplicate, serialized, sparse, and decorated records", () => {
  const overlap = aggregateOverlapTrials([verifiedTrial(1), verifiedTrial(2), verifiedTrial(3)], reasonCodes);
  const valid = completeVerifiedScenarios(overlap);
  assert.equal(computeOverallVerdict([], reasonCodes), "REQUEST_CHANGES");
  assert.equal(computeOverallVerdict(valid.slice(0, 1), reasonCodes), "REQUEST_CHANGES");
  assert.equal(computeOverallVerdict([
    verifiedScenario(MANDATORY_SCENARIO_IDS[0], "FAIL", "FAIL_STALE_MUTATION"),
  ], reasonCodes), "REQUEST_CHANGES");
  assert.equal(computeOverallVerdict([...valid, valid[0]], reasonCodes), "REQUEST_CHANGES");
  assert.equal(computeOverallVerdict(valid.map((item) => JSON.parse(JSON.stringify(item))), reasonCodes), "REQUEST_CHANGES");
  const sparse = [...valid]; delete sparse[2];
  assert.equal(computeOverallVerdict(sparse, reasonCodes), "REQUEST_CHANGES");
  const decorated = [...valid]; decorated.extra = true;
  assert.equal(computeOverallVerdict(decorated, reasonCodes), "REQUEST_CHANGES");
  const identityOnly = MANDATORY_SCENARIO_IDS.map((scenario_id) => ({ scenario_id, scenario_status: "PASS" }));
  identityOnly[0].scenario_id = "UNKNOWN";
  assert.equal(computeOverallVerdict(identityOnly, reasonCodes), "REQUEST_CHANGES");
});

test("mandatory scenario identity validation is exact", () => {
  const valid = MANDATORY_SCENARIO_IDS.map((scenario_id) => ({ scenario_id }));
  assert.equal(validateMandatoryScenarioIds(valid).valid, true);
  assert.equal(validateMandatoryScenarioIds(valid.slice(1)).reason, "REQUEST_CHANGES_MISSING_SCENARIO");
  assert.equal(validateMandatoryScenarioIds([...valid, valid[0]]).reason, "REQUEST_CHANGES_DUPLICATE_SCENARIO");
});

test("status and reason namespaces and trust anchor remain closed", () => {
  for (const [status, codes] of Object.entries(reasonCodes.codes)) {
    for (const code of codes) assert.equal(validateStatusReason(status, code, reasonCodes), true);
  }
  assert.equal(validateStatusReason("FAIL", "PASS_SERIAL_GUARD", reasonCodes), false);
  assert.throws(() => requireDeclaredVerdict("FAIL", "PASS"), /REQUEST_CHANGES_VERDICT_MISMATCH/);
  const exact = { actualCommit: "a".repeat(40), expectedCommit: "a".repeat(40), actualBundleSha256: "b".repeat(64), expectedBundleSha256: "b".repeat(64) };
  assert.equal(verifyTrustAnchor(exact), true);
  assert.throws(() => verifyTrustAnchor({ ...exact, expectedCommit: "c".repeat(40) }), /REQUEST_CHANGES_TRUST_ANCHOR_MISMATCH/);
});

test("scenario, assertion, reason-code, and schema enums remain synchronized", () => {
  assert.deepEqual(scenariosSpec.scenarios.map(({ id }) => id), MANDATORY_SCENARIO_IDS);
  assert.deepEqual(scenariosSpec.mandatory_overlap_assertions.map(({ id }) => id), MANDATORY_OVERLAP_ASSERTION_IDS);
  assert.deepEqual(evidenceSchema.$defs.passReason.enum, reasonCodes.codes.PASS);
  assert.deepEqual(evidenceSchema.$defs.failReason.enum, reasonCodes.codes.FAIL);
  assert.deepEqual(evidenceSchema.$defs.requestChangesReason.enum, reasonCodes.codes.REQUEST_CHANGES);
  assert.deepEqual(evidenceSchema.$defs.inconclusiveReason.enum, reasonCodes.codes.INCONCLUSIVE);
  assert.deepEqual(evidenceSchema.$defs.notRunReason.enum, reasonCodes.codes.NOT_RUN);
  assert.deepEqual(evidenceSchema.$defs.scenarioId.enum, MANDATORY_SCENARIO_IDS);
});

test("schema freezes deployment-attempt and transaction-attempt unions", () => {
  assert.equal(evidenceSchema.properties.deployments.minItems, 11);
  assert.equal(evidenceSchema.properties.deployments.maxItems, 11);
  assert.equal(evidenceSchema.properties.deployments.items.$ref, "#/$defs/deploymentAttempt");
  assert.deepEqual(evidenceSchema.$defs.deploymentAttempt.properties.deployment_status.enum, ["DEPLOYED", "FAILED_BEFORE_HASH", "FAILED_AFTER_HASH", "NOT_RUN"]);
  assert.deepEqual(evidenceSchema.$defs.transactionAttempt.properties.submission_status.enum, ["NOT_SUBMITTED", "SUBMISSION_FAILED", "SUBMITTED_NONTERMINAL", "AUTHORITATIVE_TERMINAL"]);
  assert.equal(evidenceSchema.properties.transactions.items.$ref, "#/$defs/transactionAttempt");
  assert.deepEqual(
    evidenceSchema.$defs.deploymentAttempt.allOf.map((rule) => rule.if.properties.deployment_status.const),
    ["DEPLOYED", "FAILED_BEFORE_HASH", "FAILED_AFTER_HASH", "NOT_RUN"],
  );
  assert.deepEqual(
    evidenceSchema.$defs.transactionAttempt.allOf.map((rule) => rule.if.properties.submission_status.const),
    ["NOT_SUBMITTED", "SUBMISSION_FAILED", "SUBMITTED_NONTERMINAL", "AUTHORITATIVE_TERMINAL"],
  );
  assert.equal(evidenceSchema.$defs.deploymentAttempt.allOf[1].then.properties.deployment_transaction_hash.type, "null");
  assert.equal(evidenceSchema.$defs.deploymentAttempt.allOf[0].then.properties.address.$ref, "#/$defs/address");
  assert.equal(evidenceSchema.$defs.transactionAttempt.allOf[0].then.properties.hash.type, "null");
  assert.equal(evidenceSchema.$defs.transactionAttempt.allOf[3].then.properties.hash.$ref, "#/$defs/transactionHash");
});

test("schema freezes conditional snapshots, exact trial assertions, and S08 construction", () => {
  const scenarioRules = evidenceSchema.$defs.scenarioResult.allOf;
  const passRule = scenarioRules.find((rule) => rule.if?.properties?.scenario_status?.const === "PASS");
  const notRunRule = scenarioRules.find((rule) => rule.if?.properties?.scenario_status?.const === "NOT_RUN");
  assert.equal(passRule.then.properties.before_snapshot.$ref, "#/$defs/snapshot");
  assert.equal(notRunRule.then.properties.before_snapshot.type, "null");
  assert.deepEqual(
    evidenceSchema.$defs.overlapTrial.properties.mandatory_assertions.prefixItems.map((item) => item.allOf[1].properties.id.const),
    MANDATORY_OVERLAP_ASSERTION_IDS,
  );
  const s08 = scenariosSpec.scenarios.find(({ id }) => id === "G2-S08-STALE-AFTER-SUCCESSOR-SUCCEEDED");
  assert.deepEqual(s08.operations.map(({ step }) => step), [
    "CREATE_PREDECESSOR_N", "EXPIRE_N", "CREATE_SUCCESSOR_N_PLUS_1", "VERIFY_SUCCESSOR_UNIQUELY_ACTIVE",
    "EXECUTE_SUCCESSOR", "VERIFY_SUCCESSOR_SUCCEEDED", "FREEZE_SUCCESSFUL_SUCCESSOR",
    "EXECUTE_STALE_PREDECESSOR", "FREEZE_AFTER_STALE", "VERIFY_COMPLETE_EQUALITY",
  ]);
});

test("schema safe JSON recursively prohibits secret-named properties", () => {
  const pattern = evidenceSchema.$defs.safeJsonValue.anyOf.find((item) => item.type === "object").propertyNames.pattern;
  const expression = new RegExp(pattern);
  for (const forbidden of ["private_key", "privateKey", "mnemonic", "seed", "secret", "raw_signed_transaction", "authorization"]) {
    assert.equal(expression.test(forbidden), false, forbidden);
  }
  assert.equal(expression.test("current_value"), true);
});

test("machine-readable specifications contain no unsafe JSON numeric literal", () => {
  const unsafe = [];
  const visit = (value, path = "$") => {
    if (typeof value === "number" && (!Number.isSafeInteger(value) || Object.is(value, -0))) unsafe.push(path);
    if (Array.isArray(value)) value.forEach((child, index) => visit(child, `${path}[${index}]`));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, child]) => visit(child, `${path}.${key}`));
  };
  for (const value of [scenariosSpec, evidenceSchema, reasonCodes, canonicalVectors]) visit(value);
  assert.deepEqual(unsafe, []);
});
