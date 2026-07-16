// Independent Node implementation of the frozen Gate 2 canonical JSON profile.

export const MIN_SAFE_INTEGER = -9007199254740991;
export const MAX_SAFE_INTEGER = 9007199254740991;

export class CanonicalizationError extends Error {
  constructor(reasonCode) {
    super(reasonCode);
    this.name = "CanonicalizationError";
    this.reasonCode = reasonCode;
  }
}

export function validateUnicodeScalars(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new CanonicalizationError("CANONICAL_UNPAIRED_SURROGATE");
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new CanonicalizationError("CANONICAL_UNPAIRED_SURROGATE");
    }
  }
}

function escapeString(value) {
  validateUnicodeScalars(value);
  const named = new Map([
    ['"', '\\"'],
    ["\\", "\\\\"],
    ["\b", "\\b"],
    ["\t", "\\t"],
    ["\n", "\\n"],
    ["\f", "\\f"],
    ["\r", "\\r"],
  ]);
  let output = '"';
  for (const scalar of value) {
    if (named.has(scalar)) {
      output += named.get(scalar);
    } else {
      const codePoint = scalar.codePointAt(0);
      output += codePoint <= 0x1f
        ? `\\u${codePoint.toString(16).padStart(4, "0")}`
        : scalar;
    }
  }
  return `${output}"`;
}

export function canonicalJson(value) {
  const active = new WeakSet();

  function encode(item) {
    if (item === null) return "null";
    if (item === true) return "true";
    if (item === false) return "false";
    if (typeof item === "number") {
      if (Object.is(item, -0)) {
        throw new CanonicalizationError("CANONICAL_NEGATIVE_ZERO");
      }
      if (!Number.isFinite(item)) {
        throw new CanonicalizationError("CANONICAL_NONFINITE");
      }
      if (!Number.isInteger(item)) {
        throw new CanonicalizationError("CANONICAL_FLOAT");
      }
      if (!Number.isSafeInteger(item)) {
        throw new CanonicalizationError("CANONICAL_INTEGER_OUT_OF_RANGE");
      }
      return String(item);
    }
    if (typeof item === "bigint") {
      throw new CanonicalizationError("CANONICAL_BIGINT");
    }
    if (typeof item === "string") return escapeString(item);
    if (Array.isArray(item)) {
      if (active.has(item)) throw new CanonicalizationError("CANONICAL_CYCLE");
      if (Object.getPrototypeOf(item) !== Array.prototype) {
        throw new CanonicalizationError("UNSUPPORTED_ARRAY_PROPERTY");
      }
      for (let index = 0; index < item.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(item, index)) {
          throw new CanonicalizationError("SPARSE_ARRAY");
        }
      }
      const allowedKeys = new Set(["length", ...item.map((_, index) => String(index))]);
      if (Reflect.ownKeys(item).some((key) => typeof key !== "string" || !allowedKeys.has(key))) {
        throw new CanonicalizationError("UNSUPPORTED_ARRAY_PROPERTY");
      }
      active.add(item);
      try {
        return `[${item.map(encode).join(",")}]`;
      } finally {
        active.delete(item);
      }
    }
    if (typeof item === "object") {
      if (active.has(item)) throw new CanonicalizationError("CANONICAL_CYCLE");
      const prototype = Object.getPrototypeOf(item);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new CanonicalizationError("CANONICAL_UNSUPPORTED_TYPE");
      }
      const keys = Object.keys(item);
      const ownKeys = Reflect.ownKeys(item);
      if (ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) {
        throw new CanonicalizationError("CANONICAL_UNSUPPORTED_OBJECT_PROPERTY");
      }
      for (const key in item) {
        if (!Object.prototype.hasOwnProperty.call(item, key)) {
          throw new CanonicalizationError("CANONICAL_UNSUPPORTED_OBJECT_PROPERTY");
        }
      }
      for (const key of keys) validateUnicodeScalars(key);
      keys.sort((left, right) => Buffer.compare(
        Buffer.from(left, "utf8"),
        Buffer.from(right, "utf8"),
      ));
      active.add(item);
      try {
        return `{${keys.map((key) => `${escapeString(key)}:${encode(item[key])}`).join(",")}}`;
      } finally {
        active.delete(item);
      }
    }
    throw new CanonicalizationError("CANONICAL_UNSUPPORTED_TYPE");
  }

  return encode(value);
}

export function canonicalBytes(value) {
  return Buffer.from(canonicalJson(value), "utf8");
}

export function validateAttemptId(value) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new CanonicalizationError("ATTEMPT_ID_NOT_INTEGER");
  }
  if (Object.is(value, -0) || value === 0) {
    throw new CanonicalizationError(Object.is(value, -0) ? "CANONICAL_NEGATIVE_ZERO" : "ATTEMPT_ID_ZERO");
  }
  if (value < 0) throw new CanonicalizationError("ATTEMPT_ID_NEGATIVE");
  if (!Number.isSafeInteger(value)) {
    throw new CanonicalizationError("CANONICAL_INTEGER_OUT_OF_RANGE");
  }
  return value;
}

export function validateSafeInteger(value) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new CanonicalizationError("CANONICAL_INTEGER_REQUIRED");
  }
  if (Object.is(value, -0)) throw new CanonicalizationError("CANONICAL_NEGATIVE_ZERO");
  if (!Number.isSafeInteger(value)) {
    throw new CanonicalizationError("CANONICAL_INTEGER_OUT_OF_RANGE");
  }
  return value;
}

export function validateDecimalMetadata(value, { allowNegative = false } = {}) {
  if (typeof value !== "string" || !/^-?(?:0|[1-9][0-9]*)$/.test(value)) {
    throw new CanonicalizationError("CANONICAL_DECIMAL_METADATA");
  }
  if (value.startsWith("-") && (!allowNegative || value === "-0")) {
    throw new CanonicalizationError("CANONICAL_DECIMAL_METADATA");
  }
  return value;
}
