import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CanonicalizationError,
  canonicalBytes,
  canonicalJson,
  validateAttemptId,
  validateDecimalMetadata,
  validateSafeInteger,
} from "./support/canonical-json.mjs";

const vectorsUrl = new URL("../fixtures/canonicalization-vectors.json", import.meta.url);
const vectors = JSON.parse(await readFile(vectorsUrl, "utf8"));

test("frozen accepted vectors match exact independent Node bytes and hashes", () => {
  for (const vector of vectors.accepted) {
    const bytes = canonicalBytes(vector.logical_input);
    assert.equal(bytes.toString("utf8"), vector.canonical_json, vector.id);
    assert.equal(bytes.toString("hex"), vector.utf8_hex, vector.id);
    assert.equal(bytes.length, vector.byte_length, vector.id);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), vector.sha256, vector.id);
  }
});

const rejectedInputs = {
  BELOW_MIN_SAFE_INTEGER: () => canonicalJson({ value: -9007199254740992 }),
  ABOVE_MAX_SAFE_INTEGER: () => canonicalJson({ value: 9007199254740992 }),
  NEGATIVE_ZERO: () => canonicalJson({ value: -0 }),
  ZERO_ATTEMPT_ID: () => validateAttemptId(0),
  NEGATIVE_ATTEMPT_ID: () => validateAttemptId(-1),
  UNPAIRED_HIGH_SURROGATE: () => canonicalJson({ value: "\ud800" }),
  UNPAIRED_LOW_SURROGATE: () => canonicalJson({ value: "\udc00" }),
  FLOAT: () => canonicalJson({ value: 1.5 }),
  NONFINITE: () => canonicalJson({ value: Infinity }),
};

test("frozen rejected vectors emit no payload and exact reason codes", () => {
  for (const vector of vectors.rejected) {
    assert.equal(vector.must_emit_payload, false, vector.id);
    assert.throws(
      rejectedInputs[vector.id],
      (error) => error instanceof CanonicalizationError && error.reasonCode === vector.reason_code,
      vector.id,
    );
  }
});

test("valid surrogate pair is one scalar while unpaired surrogates reject", () => {
  assert.equal(canonicalJson({ value: "\ud83d\ude00" }), '{"value":"😀"}');
  assert.throws(() => canonicalJson("\ud83d"), /CANONICAL_UNPAIRED_SURROGATE/);
  assert.throws(() => canonicalJson("\ude00"), /CANONICAL_UNPAIRED_SURROGATE/);
});

test("metadata decimal strings are canonical and never implicit JSON numbers", () => {
  for (const value of ["0", "1", "9007199254740992", "999999999999999999999999"]) {
    assert.equal(validateDecimalMetadata(value), value);
  }
  assert.equal(validateDecimalMetadata("-9007199254740992", { allowNegative: true }), "-9007199254740992");
  for (const value of ["+1", "01", "-0", "1e3", "1.0", "١"]) {
    assert.throws(() => validateDecimalMetadata(value, { allowNegative: true }), /CANONICAL_DECIMAL_METADATA/);
  }
});

test("object keys use strict UTF-8 byte order without normalization", () => {
  assert.equal(
    canonicalJson({ "é": "precomposed", "e\u0301": "decomposed" }),
    '{"é":"decomposed","é":"precomposed"}',
  );
  assert.notEqual(canonicalBytes("é").toString("hex"), canonicalBytes("e\u0301").toString("hex"));
});

test("sparse arrays and unexpected array properties reject deterministically", () => {
  const leading = []; leading.length = 2; leading[1] = 1;
  const middle = [1, 2, 3]; delete middle[1];
  const trailing = [1, 2]; trailing.length = 3;
  const emptySparse = []; emptySparse.length = 2;
  for (const value of [leading, middle, trailing, emptySparse]) {
    assert.throws(
      () => canonicalJson(value),
      (error) => error instanceof CanonicalizationError && error.reasonCode === "SPARSE_ARRAY",
    );
  }

  const custom = [1]; custom.extra = 2;
  assert.throws(() => canonicalJson(custom), /UNSUPPORTED_ARRAY_PROPERTY/);
  const symbolic = [1]; symbolic[Symbol("extra")] = 2;
  assert.throws(() => canonicalJson(symbolic), /UNSUPPORTED_ARRAY_PROPERTY/);
  const nonenumerable = [1]; Object.defineProperty(nonenumerable, "extra", { value: 2 });
  assert.throws(() => canonicalJson(nonenumerable), /UNSUPPORTED_ARRAY_PROPERTY/);
  class ExtendedArray extends Array {}
  const subclass = new ExtendedArray(); subclass.push(1);
  assert.throws(() => canonicalJson(subclass), /UNSUPPORTED_ARRAY_PROPERTY/);
});

test("canonical objects reject hidden, inherited, symbolic, and exotic structure", () => {
  const nonenumerable = { visible: 1 };
  Object.defineProperty(nonenumerable, "hidden", { value: 2 });
  assert.throws(() => canonicalJson(nonenumerable), /CANONICAL_UNSUPPORTED_OBJECT_PROPERTY/);

  const symbolic = { visible: 1 };
  symbolic[Symbol("hidden")] = 2;
  assert.throws(() => canonicalJson(symbolic), /CANONICAL_UNSUPPORTED_OBJECT_PROPERTY/);

  const inherited = Object.create({ inherited: 1 });
  inherited.visible = 2;
  assert.throws(() => canonicalJson(inherited), /CANONICAL_UNSUPPORTED_TYPE|CANONICAL_UNSUPPORTED_OBJECT_PROPERTY/);

  const nullPrototype = Object.create(null);
  nullPrototype.value = 1;
  assert.equal(canonicalJson(nullPrototype), '{"value":1}');

  class Record { constructor() { this.value = 1; } }
  for (const value of [new Record(), new Date(0), new Map(), new Set(), new Uint8Array([1])]) {
    assert.throws(() => canonicalJson(value), /CANONICAL_UNSUPPORTED_TYPE/);
  }
  assert.throws(() => canonicalJson(() => 1), /CANONICAL_UNSUPPORTED_TYPE/);
  assert.throws(() => canonicalJson(Symbol("value")), /CANONICAL_UNSUPPORTED_TYPE/);
});

test("booleans remain JSON booleans and reject in integer-only fields", () => {
  assert.equal(canonicalJson(true), "true");
  assert.equal(canonicalJson(false), "false");
  for (const value of [true, false]) {
    assert.throws(() => validateAttemptId(value), /ATTEMPT_ID_NOT_INTEGER/);
    assert.throws(() => validateSafeInteger(value), /CANONICAL_INTEGER_REQUIRED/);
  }
});
