// Requirements-stage structural and verdict-composition conformance helpers only.
// Raw runner evidence can never become a PASS or FAIL here. A future independently
// reviewed verifier must produce verified results from authoritative evidence.

export const OVERLAP_TRIAL_IDS = [
  "G2-OVERLAP-T1",
  "G2-OVERLAP-T2",
  "G2-OVERLAP-T3",
];

export const MANDATORY_SCENARIO_IDS = [
  "G2-S01-BASELINE-REQUEST",
  "G2-S02-CURRENT-EXECUTION",
  "G2-S03-DUPLICATE-EXECUTION",
  "G2-S04-EXPIRE-ATTEMPT",
  "G2-S05-RETRY-SUCCESSOR",
  "G2-S06-STALE-AFTER-SUCCESSOR-CREATION",
  "G2-S07-SUCCESSOR-AFTER-STALE-CALLS",
  "G2-S08-STALE-AFTER-SUCCESSOR-SUCCEEDED",
  "G2-S09-THREE-ATTEMPT-ORDERING",
  "G2-S10-CANCELLED-STATE-PRECEDENCE",
  "G2-S11-TERMINAL-STATE-PRECEDENCE",
  "G2-S12-ZERO-ID",
  "G2-S13-NEGATIVE-ID",
  "G2-S14-MISSING-OR-FUTURE-ID",
  "G2-S15-ALLOCATION-ROLLBACK",
  "G2-S16-COMPETING-RETRY",
  "G2-S17-DISTINCT-EXECUTOR",
  "G2-S18-LIVE-OVERLAP",
  "G2-S19-COMPLETE-EVIDENCE",
];

export const AUTHORITATIVE_ORDERING_EVIDENCE_TYPES = [
  "CONSENSUS_HEIGHT",
  "FINALIZATION_HEIGHT",
  "TRANSACTION_ORDER_INDEX",
  "HISTORICAL_STATUS",
  "REEXECUTION_TRACE",
  "CONFLICT_TRACE",
  "UNAVAILABLE",
];

export const MANDATORY_OVERLAP_ASSERTION_IDS = [
  "ORDERING_PROVED",
  "OLD_PATH_ENTERED",
  "NO_STALE_MUTATION",
  "SUCCESSOR_REMAINS_EXECUTABLE",
  "SUCCESSOR_STATE_UNCHANGED",
  "FINAL_STATE_STABLE",
];

const EVIDENCE_ASSERTIONS = new Set([
  "ORDERING_PROVED",
  "OLD_PATH_ENTERED",
  "FINAL_STATE_STABLE",
]);
const INVARIANT_ASSERTIONS = new Set([
  "NO_STALE_MUTATION",
  "SUCCESSOR_REMAINS_EXECUTABLE",
  "SUCCESSOR_STATE_UNCHANGED",
]);
const EXPECTED_TRIAL_INDEX = new Map(OVERLAP_TRIAL_IDS.map((id, index) => [id, index + 1]));
const SCENARIO_STATUSES = new Set(["PASS", "FAIL", "REQUEST_CHANGES", "INCONCLUSIVE", "NOT_RUN"]);
const TRIAL_STATUSES = new Set(["PASS", "FAIL", "INCONCLUSIVE", "NOT_RUN"]);
const VERIFIED_TRIAL = Symbol("requirements-stage-verified-trial-result");
const VERIFIED_SCENARIO = Symbol("requirements-stage-verified-scenario-result");
const VERIFIED_OVERLAP_AGGREGATE = Symbol("requirements-stage-verified-overlap-aggregate");
const SHA256 = /^[0-9a-f]{64}$/;

const RAW_TRIAL_FIELDS = [
  "trial_id",
  "predeclared_index",
  "old_execution_hash",
  "old_execution_path_entered",
  "authoritative_ordering_evidence_type",
  "authoritative_ordering_evidence",
  "ordering_achieved",
  "before_state",
  "successor_authoritative_state",
  "after_old_execution_state",
  "allowed_mutations",
  "observed_mutations",
  "mandatory_assertions",
  "declared_status",
  "declared_reason_code",
];

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownStringKeysExactly(value, expected) {
  if (!isPlainObject(value)) return false;
  const own = Reflect.ownKeys(value);
  if (own.some((key) => typeof key !== "string")) return false;
  const actual = [...own].sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function verifiedOwnKeysExactly(value, expected, marker) {
  if (!isPlainObject(value)) return false;
  const own = Reflect.ownKeys(value);
  const strings = own.filter((key) => typeof key === "string").sort();
  const symbols = own.filter((key) => typeof key === "symbol");
  const wanted = [...expected].sort();
  return strings.length === wanted.length
    && strings.every((key, index) => key === wanted[index])
    && symbols.length === 1
    && symbols[0] === marker;
}

export function isDensePlainArray(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) return false;
  }
  const expected = new Set(["length", ...value.map((_, index) => String(index))]);
  return Reflect.ownKeys(value).every((key) => typeof key === "string" && expected.has(key));
}

function multisetDifferences(actual, expected) {
  const actualCounts = new Map();
  const expectedCounts = new Map();
  for (const value of actual) actualCounts.set(value, (actualCounts.get(value) ?? 0) + 1);
  for (const value of expected) expectedCounts.set(value, (expectedCounts.get(value) ?? 0) + 1);
  return {
    missing: expected.filter((value) => (actualCounts.get(value) ?? 0) < (expectedCounts.get(value) ?? 0)),
    extra: actual.filter((value) => (actualCounts.get(value) ?? 0) > (expectedCounts.get(value) ?? 0)),
    duplicate: [...actualCounts.entries()].filter(([, count]) => count > 1).map(([value]) => value),
  };
}

function structural(status, reasonCode = null) {
  return { structural_status: status, reason_code: reasonCode };
}

function isSnapshotClaim(value) {
  return ownStringKeysExactly(value, ["canonical_json", "sha256", "state"])
    && typeof value.canonical_json === "string"
    && SHA256.test(value.sha256)
    && isPlainObject(value.state);
}

function isMutationClaim(value) {
  return ownStringKeysExactly(value, ["path", "before", "after"])
    && typeof value.path === "string"
    && value.path.length > 0;
}

function validateAssertionInventory(assertions) {
  if (!isDensePlainArray(assertions)) return false;
  if (!assertions.every((assertion) => ownStringKeysExactly(assertion, ["id", "passed"])
    && typeof assertion.id === "string"
    && typeof assertion.passed === "boolean")) return false;
  const differences = multisetDifferences(
    assertions.map(({ id }) => id),
    MANDATORY_OVERLAP_ASSERTION_IDS,
  );
  return differences.missing.length === 0
    && differences.extra.length === 0
    && differences.duplicate.length === 0;
}

function validateMutationClaimArrays(trial) {
  return isDensePlainArray(trial.allowed_mutations)
    && trial.allowed_mutations.every((path) => typeof path === "string" && path.length > 0)
    && new Set(trial.allowed_mutations).size === trial.allowed_mutations.length
    && isDensePlainArray(trial.observed_mutations)
    && trial.observed_mutations.every(isMutationClaim)
    && new Set(trial.observed_mutations.map(({ path }) => path)).size === trial.observed_mutations.length;
}

export function validateOverlapTrialStructure(trial, reasonCodeSpec) {
  if (!ownStringKeysExactly(trial, RAW_TRIAL_FIELDS)) {
    return structural("REQUEST_CHANGES", "REQUEST_CHANGES_SCHEMA_INVALID");
  }
  if (!EXPECTED_TRIAL_INDEX.has(trial.trial_id)
      || trial.predeclared_index !== EXPECTED_TRIAL_INDEX.get(trial.trial_id)) {
    return structural("REQUEST_CHANGES", "REQUEST_CHANGES_SCHEMA_INVALID");
  }
  if (!AUTHORITATIVE_ORDERING_EVIDENCE_TYPES.includes(trial.authoritative_ordering_evidence_type)
      || !isPlainObject(trial.authoritative_ordering_evidence)) {
    return structural("REQUEST_CHANGES", "REQUEST_CHANGES_ORDERING_EVIDENCE_INVALID");
  }
  for (const claim of [trial.before_state, trial.successor_authoritative_state, trial.after_old_execution_state]) {
    if (claim !== null && !isSnapshotClaim(claim)) {
      return structural("REQUEST_CHANGES", "REQUEST_CHANGES_SNAPSHOT_CLAIM_INVALID");
    }
  }
  if (!validateMutationClaimArrays(trial)) {
    return structural("REQUEST_CHANGES", "REQUEST_CHANGES_MUTATION_SET_MISMATCH");
  }
  if (!validateAssertionInventory(trial.mandatory_assertions)) {
    return structural("REQUEST_CHANGES", "REQUEST_CHANGES_ASSERTION_INVENTORY_INVALID");
  }
  if (!TRIAL_STATUSES.has(trial.declared_status)
      || !validateStatusReason(trial.declared_status, trial.declared_reason_code, reasonCodeSpec)) {
    return structural("REQUEST_CHANGES", "REQUEST_CHANGES_REASON_CODE_MISMATCH");
  }
  return structural("STRUCTURALLY_VALID");
}

function cloneJsonValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(cloneJsonValue);
  const result = {};
  for (const key of Object.keys(value).sort()) result[key] = cloneJsonValue(value[key]);
  return result;
}

function deepEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => deepEqual(item, right[index]));
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key, index) => key === rightKeys[index] && deepEqual(left[key], right[key]));
  }
  return false;
}

export function recomputeMutationsForConformance(before, after) {
  const mutations = [];
  function visit(left, right, path) {
    if (deepEqual(left, right)) return;
    if (Array.isArray(left) && Array.isArray(right) && left.length === right.length) {
      left.forEach((item, index) => visit(item, right[index], `${path}[${index}]`));
      return;
    }
    if (isPlainObject(left) && isPlainObject(right)) {
      const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
      for (const key of keys) visit(left[key], right[key], path ? `${path}.${key}` : key);
      return;
    }
    mutations.push({ path: path || "$", before: cloneJsonValue(left), after: cloneJsonValue(right) });
  }
  visit(before, after, "");
  return mutations;
}

function markVerifiedTrial(result) {
  Object.defineProperty(result, VERIFIED_TRIAL, { value: true });
  return Object.freeze(result);
}

export function createVerifiedTrialResultForConformance({
  trial_id,
  predeclared_index,
  assertions,
  successor_state = {},
  after_old_state = {},
  not_run_reason = null,
}) {
  if (!EXPECTED_TRIAL_INDEX.has(trial_id)
      || predeclared_index !== EXPECTED_TRIAL_INDEX.get(trial_id)
      || !validateAssertionInventory(assertions)) {
    throw new Error("REQUEST_CHANGES_ASSERTION_INVENTORY_INVALID");
  }
  let computedStatus;
  let computedReasonCode;
  if (not_run_reason !== null) {
    if (!String(not_run_reason).startsWith("NOT_RUN_")) throw new Error("REQUEST_CHANGES_REASON_CODE_MISMATCH");
    computedStatus = "NOT_RUN";
    computedReasonCode = not_run_reason;
  } else {
    const results = new Map(assertions.map(({ id, passed }) => [id, passed]));
    const recomputedMutations = recomputeMutationsForConformance(successor_state, after_old_state);
    if (!results.get("ORDERING_PROVED")) {
      computedStatus = "INCONCLUSIVE";
      computedReasonCode = "INCONCLUSIVE_ORDER_NOT_PROVED";
    } else if (!results.get("OLD_PATH_ENTERED")) {
      computedStatus = "INCONCLUSIVE";
      computedReasonCode = "INCONCLUSIVE_OLD_PATH_NOT_PROVED";
    } else if (!results.get("FINAL_STATE_STABLE")) {
      computedStatus = "INCONCLUSIVE";
      computedReasonCode = "INCONCLUSIVE_FINAL_STATE_UNSTABLE";
    } else if (!results.get("NO_STALE_MUTATION") || recomputedMutations.length > 0) {
      computedStatus = "FAIL";
      computedReasonCode = "FAIL_STALE_MUTATION";
    } else if (!results.get("SUCCESSOR_REMAINS_EXECUTABLE")) {
      computedStatus = "FAIL";
      computedReasonCode = "FAIL_SUCCESSOR_BLOCKED";
    } else if (!results.get("SUCCESSOR_STATE_UNCHANGED")) {
      computedStatus = "FAIL";
      computedReasonCode = "FAIL_SUCCESSOR_OVERWRITTEN";
    } else {
      computedStatus = "PASS";
      computedReasonCode = "PASS_OVERLAP_ORDER_PROVED_NO_MUTATION";
    }
  }
  return markVerifiedTrial({ trial_id, predeclared_index, computed_status: computedStatus, computed_reason_code: computedReasonCode });
}

function isVerifiedTrial(value) {
  return verifiedOwnKeysExactly(value, ["trial_id", "predeclared_index", "computed_status", "computed_reason_code"], VERIFIED_TRIAL)
    && value[VERIFIED_TRIAL] === true
    && EXPECTED_TRIAL_INDEX.get(value.trial_id) === value.predeclared_index
    && TRIAL_STATUSES.has(value.computed_status);
}

function markOverlapAggregate(result) {
  Object.defineProperty(result, VERIFIED_OVERLAP_AGGREGATE, { value: true });
  return Object.freeze(result);
}

export function aggregateOverlapTrials(trials, reasonCodeSpec, structuralDefects = []) {
  if (!isDensePlainArray(trials)) {
    return markOverlapAggregate({ status: "REQUEST_CHANGES", reason_code: "REQUEST_CHANGES_UNEXPECTED_ARRAY_PROPERTY" });
  }
  if (structuralDefects.length > 0 || trials.some((trial) => !isVerifiedTrial(trial))) {
    return markOverlapAggregate({ status: "REQUEST_CHANGES", reason_code: "REQUEST_CHANGES_UNVERIFIED_TRIAL" });
  }
  const ids = trials.map(({ trial_id }) => trial_id);
  const indices = trials.map(({ predeclared_index }) => predeclared_index);
  const differences = multisetDifferences(ids, OVERLAP_TRIAL_IDS);
  if (differences.duplicate.length || differences.missing.length || differences.extra.length
      || new Set(indices).size !== indices.length) {
    const reason = differences.duplicate.length ? "REQUEST_CHANGES_DUPLICATE_TRIAL"
      : differences.missing.length ? "REQUEST_CHANGES_MISSING_TRIAL"
        : differences.extra.length ? "REQUEST_CHANGES_EXTRA_TRIAL"
          : "REQUEST_CHANGES_SCHEMA_INVALID";
    return markOverlapAggregate({ status: "REQUEST_CHANGES", reason_code: reason });
  }
  if (trials.some((trial) => !validateStatusReason(trial.computed_status, trial.computed_reason_code, reasonCodeSpec))) {
    return markOverlapAggregate({ status: "REQUEST_CHANGES", reason_code: "REQUEST_CHANGES_REASON_CODE_MISMATCH" });
  }
  const verifiedFailure = trials.find(({ computed_status }) => computed_status === "FAIL");
  if (verifiedFailure) {
    return markOverlapAggregate({ status: "FAIL", reason_code: verifiedFailure.computed_reason_code });
  }
  if (trials.some(({ computed_status }) => computed_status === "NOT_RUN")) {
    return markOverlapAggregate({ status: "NOT_RUN", reason_code: "NOT_RUN_MANDATORY_ACTION_MISSING" });
  }
  if (trials.some(({ computed_status }) => computed_status === "PASS")) {
    return markOverlapAggregate({ status: "PASS", reason_code: "PASS_OVERLAP_ORDER_PROVED_NO_MUTATION" });
  }
  return markOverlapAggregate({ status: "INCONCLUSIVE", reason_code: "INCONCLUSIVE_ORDER_NOT_PROVED" });
}

function markVerifiedScenario(result) {
  Object.defineProperty(result, VERIFIED_SCENARIO, { value: true });
  return Object.freeze(result);
}

export function createVerifiedScenarioResultForConformance({
  scenario_id,
  computed_status,
  computed_reason_code,
  overlap_aggregate = undefined,
}, reasonCodeSpec) {
  if (!MANDATORY_SCENARIO_IDS.includes(scenario_id)
      || !SCENARIO_STATUSES.has(computed_status)
      || !validateStatusReason(computed_status, computed_reason_code, reasonCodeSpec)) {
    throw new Error("REQUEST_CHANGES_UNVERIFIED_SCENARIO");
  }
  if (scenario_id === "G2-S18-LIVE-OVERLAP") {
    if (!isPlainObject(overlap_aggregate)
        || overlap_aggregate[VERIFIED_OVERLAP_AGGREGATE] !== true
        || overlap_aggregate.status !== computed_status
        || overlap_aggregate.reason_code !== computed_reason_code) {
      throw new Error("REQUEST_CHANGES_UNVERIFIED_SCENARIO");
    }
    return markVerifiedScenario({ scenario_id, computed_status, computed_reason_code, overlap_aggregate });
  }
  if (overlap_aggregate !== undefined) throw new Error("REQUEST_CHANGES_UNVERIFIED_SCENARIO");
  return markVerifiedScenario({ scenario_id, computed_status, computed_reason_code });
}

function isVerifiedScenario(value, reasonCodeSpec) {
  if (!isPlainObject(value) || value[VERIFIED_SCENARIO] !== true) return false;
  const expectedKeys = value.scenario_id === "G2-S18-LIVE-OVERLAP"
    ? ["scenario_id", "computed_status", "computed_reason_code", "overlap_aggregate"]
    : ["scenario_id", "computed_status", "computed_reason_code"];
  return verifiedOwnKeysExactly(value, expectedKeys, VERIFIED_SCENARIO)
    && MANDATORY_SCENARIO_IDS.includes(value.scenario_id)
    && SCENARIO_STATUSES.has(value.computed_status)
    && validateStatusReason(value.computed_status, value.computed_reason_code, reasonCodeSpec)
    && (value.scenario_id !== "G2-S18-LIVE-OVERLAP"
      || (value.overlap_aggregate?.[VERIFIED_OVERLAP_AGGREGATE] === true
        && value.overlap_aggregate.status === value.computed_status
        && value.overlap_aggregate.reason_code === value.computed_reason_code));
}

export function validateMandatoryScenarioIds(records) {
  if (!isDensePlainArray(records)) return { valid: false, reason: "REQUEST_CHANGES_UNEXPECTED_ARRAY_PROPERTY" };
  const ids = records.map((record) => record?.scenario_id);
  const differences = multisetDifferences(ids, MANDATORY_SCENARIO_IDS);
  if (differences.duplicate.length) return { valid: false, reason: "REQUEST_CHANGES_DUPLICATE_SCENARIO" };
  if (differences.missing.length) return { valid: false, reason: "REQUEST_CHANGES_MISSING_SCENARIO" };
  if (differences.extra.length) return { valid: false, reason: "REQUEST_CHANGES_EXTRA_SCENARIO" };
  return { valid: true, reason: null };
}

export function computeOverallVerdict(
  scenarios,
  reasonCodeSpec,
  integrityDefects = [],
  declaredOverallVerdict = undefined,
) {
  if (!isDensePlainArray(scenarios)) return "REQUEST_CHANGES";
  if (integrityDefects.length > 0 || scenarios.some((scenario) => !isVerifiedScenario(scenario, reasonCodeSpec))) {
    return "REQUEST_CHANGES";
  }
  const identity = validateMandatoryScenarioIds(scenarios);
  if (!identity.valid) return "REQUEST_CHANGES";
  let computed;
  if (scenarios.some(({ computed_status }) => computed_status === "FAIL")) computed = "FAIL";
  else if (scenarios.some(({ computed_status }) => computed_status === "REQUEST_CHANGES")) computed = "REQUEST_CHANGES";
  else if (scenarios.some(({ computed_status }) => computed_status === "INCONCLUSIVE")) computed = "INCONCLUSIVE";
  else if (scenarios.some(({ computed_status }) => computed_status === "NOT_RUN")) computed = "NOT_RUN";
  else computed = "PASS";
  if (declaredOverallVerdict !== undefined && declaredOverallVerdict !== computed) return "REQUEST_CHANGES";
  return computed;
}

export function validateStatusReason(status, reasonCode, reasonCodeSpec) {
  const namespace = reasonCodeSpec?.codes?.[status];
  return Array.isArray(namespace) && namespace.includes(reasonCode);
}

export function requireDeclaredVerdict(computed, declared) {
  if (computed !== declared) throw new Error("REQUEST_CHANGES_VERDICT_MISMATCH");
  return declared;
}

export function verifyTrustAnchor({ actualCommit, expectedCommit, actualBundleSha256, expectedBundleSha256 }) {
  if (actualCommit !== expectedCommit || actualBundleSha256 !== expectedBundleSha256) {
    throw new Error("REQUEST_CHANGES_TRUST_ANCHOR_MISMATCH");
  }
  return true;
}

export const ASSERTION_CLASSIFICATION = Object.freeze({
  evidence: Object.freeze([...EVIDENCE_ASSERTIONS]),
  invariant: Object.freeze([...INVARIANT_ASSERTIONS]),
});
