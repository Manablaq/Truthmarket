import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAccount, createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const EXPECTED_CHAIN_ID = 4221;
const EXPECTED_RPC_URL = "https://rpc-bradbury.genlayer.com";
const EXPECTED_EXECUTION_RESULT = "FINISHED_WITH_RETURN";
const PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_SAFE_ERROR_LENGTH = 400;
const MAX_SAFE_ERROR_INPUT_LENGTH = 4096;
const MAX_SCHEMA_DEPTH = 64;
const PARAM_SCHEMA_TOKENS = new Set([
  "null",
  "bool",
  "int",
  "address",
  "string",
  "bytes",
  "any",
  "array",
  "dict",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stringifyBigInt(value) {
  return JSON.stringify(
    value,
    (_key, currentValue) =>
      typeof currentValue === "bigint" ? currentValue.toString() : currentValue,
    2,
  );
}

function ownDataValue(value, key) {
  try {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      return undefined;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

function isSafeRecordContainer(value) {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function recordKeys(value) {
  try {
    if (!isSafeRecordContainer(value)) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) return null;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
    }
    return keys;
  } catch {
    return null;
  }
}

function redactMnemonicSequences(value) {
  try {
    const bounded = value.slice(0, MAX_SAFE_ERROR_INPUT_LENGTH);
    const words = [...bounded.matchAll(/[A-Za-z]+/g)];
    const spans = [];
    let runStart = 0;

    const addRun = (start, end) => {
      if (end - start < 12) return;
      spans.push([words[start].index, words[end - 1].index + words[end - 1][0].length]);
    };

    for (let index = 1; index <= words.length; index += 1) {
      const atEnd = index === words.length;
      const previousEnd = words[index - 1].index + words[index - 1][0].length;
      const separator = atEnd ? "" : bounded.slice(previousEnd, words[index].index);
      if (atEnd || /[0-9]/.test(separator)) {
        addRun(runStart, index);
        runStart = index;
      }
    }

    let output = bounded;
    for (const [start, end] of spans.reverse()) {
      output = `${output.slice(0, start)}[REDACTED_MNEMONIC]${output.slice(end)}`;
    }
    return output;
  } catch {
    return "Unknown deployment error";
  }
}

function redactCookieHeaders(value) {
  try {
    const bounded = value.slice(0, MAX_SAFE_ERROR_INPUT_LENGTH);
    return bounded.replace(
      /(["']?\b(?:cookie|set-cookie)\b["']?\s*[:=]\s*)(?:"[^"\r\n]*(?:"|$)|'[^'\r\n]*(?:'|$)|[^\r\n]*)/gi,
      "$1[REDACTED_SECRET]",
    );
  } catch {
    return "Unknown deployment error";
  }
}

function arrayValues(value) {
  try {
    if (!Array.isArray(value)) return null;
    const values = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      values.push(descriptor.value);
    }
    const expectedKeys = new Set(["length", ...values.map((_item, index) => String(index))]);
    if (Reflect.ownKeys(value).some((key) => !expectedKeys.has(key))) return null;
    return values;
  } catch {
    return null;
  }
}

export function isContractParamSchema(value, depth = 0, seen = new Set()) {
  if (depth > MAX_SCHEMA_DEPTH) return false;
  if (typeof value === "string") return PARAM_SCHEMA_TOKENS.has(value);
  if (value === null || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  try {
    const items = arrayValues(value);
    if (items) {
      return items.every((item) => {
        const pairKeys = recordKeys(item);
        if (pairKeys && pairKeys.length === 1 && pairKeys[0] === "$rep") {
          return isContractParamSchema(ownDataValue(item, "$rep"), depth + 1, seen);
        }
        return isContractParamSchema(item, depth + 1, seen);
      });
    }
    const keys = recordKeys(value);
    if (!keys) return false;
    if (keys.length === 0) return true;
    if (keys.length === 1 && keys[0] === "$or") {
      const choices = arrayValues(ownDataValue(value, "$or"));
      return Boolean(
        choices && choices.every((choice) => isContractParamSchema(choice, depth + 1, seen)),
      );
    }
    if (keys.length === 1 && keys[0] === "$dict") {
      return isContractParamSchema(ownDataValue(value, "$dict"), depth + 1, seen);
    }
    return keys.every((key) =>
      isContractParamSchema(ownDataValue(value, key), depth + 1, seen),
    );
  } finally {
    seen.delete(value);
  }
}

function isParamsArray(value) {
  const params = arrayValues(value);
  return Boolean(
    params &&
      params.every((entry) => {
        const pair = arrayValues(entry);
        return (
          pair?.length === 2 &&
          typeof pair[0] === "string" &&
          isContractParamSchema(pair[1])
        );
      }),
  );
}

function isKwparamsRecord(value) {
  const keys = recordKeys(value);
  return Boolean(keys && keys.every((key) => isContractParamSchema(ownDataValue(value, key))));
}

function hasExactKeys(value, required, optional = []) {
  const keys = recordKeys(value);
  if (!keys) return false;
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => keys.includes(key)) && keys.every((key) => allowed.has(key));
}

function isMethodBase(value) {
  return (
    hasExactKeys(value, ["params", "kwparams"]) &&
    isParamsArray(ownDataValue(value, "params")) &&
    isKwparamsRecord(ownDataValue(value, "kwparams"))
  );
}

function isContractMethod(value) {
  if (!hasExactKeys(value, ["params", "kwparams", "ret", "readonly"], ["payable"])) {
    return false;
  }
  const keys = recordKeys(value);
  const payable = ownDataValue(value, "payable");
  return (
    Boolean(keys) &&
    isParamsArray(ownDataValue(value, "params")) &&
    isKwparamsRecord(ownDataValue(value, "kwparams")) &&
    isContractParamSchema(ownDataValue(value, "ret")) &&
    typeof ownDataValue(value, "readonly") === "boolean" &&
    (!keys.includes("payable") || typeof payable === "boolean")
  );
}

export function validateContractSchema(schema) {
  try {
    if (!hasExactKeys(schema, ["ctor", "methods"])) return false;
    const ctor = ownDataValue(schema, "ctor");
    const methods = ownDataValue(schema, "methods");
    const methodNames = recordKeys(methods);
    return Boolean(
      isMethodBase(ctor) &&
        methodNames &&
        methodNames.every((name) => isContractMethod(ownDataValue(methods, name))),
    );
  } catch {
    return false;
  }
}

function canonicalJsonValue(value, depth = 0, seen = new Set()) {
  if (depth > MAX_SCHEMA_DEPTH) throw new Error("Schema exceeds structural comparison depth.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || typeof value !== "object" || seen.has(value)) {
    throw new Error("Schema contains a non-JSON or cyclic value.");
  }
  seen.add(value);
  try {
    const items = arrayValues(value);
    if (items) return items.map((item) => canonicalJsonValue(item, depth + 1, seen));
    const keys = recordKeys(value);
    if (!keys) throw new Error("Schema contains an unsafe object shape.");
    const output = Object.create(null);
    for (const key of [...keys].sort()) {
      output[key] = canonicalJsonValue(ownDataValue(value, key), depth + 1, seen);
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

export function contractSchemasEqual(left, right) {
  try {
    if (!validateContractSchema(left) || !validateContractSchema(right)) return false;
    return JSON.stringify(canonicalJsonValue(left)) === JSON.stringify(canonicalJsonValue(right));
  } catch {
    return false;
  }
}

export function formatCliError(error) {
  try {
    const rawMessage = ownDataValue(error, "message");
    const rawReason = ownDataValue(error, "reason");
    let message =
      typeof rawMessage === "string"
        ? rawMessage
        : typeof rawReason === "string"
          ? rawReason
          : typeof error === "string"
            ? error
            : "Unknown deployment error";
    message = redactCookieHeaders(redactMnemonicSequences(message))
      .replace(/GENLAYER_DEPLOYER_PK/gi, "[REDACTED_SECRET_NAME]")
      .replace(/\b(?:0x)?[a-fA-F0-9]{64}\b/g, "[REDACTED_KEY]")
      .replace(
        /\bauthorization\b["']?\s*[:=]\s*(?:bearer\s+)?(?:"[^"\n]*"|'[^'\n]*'|[^,;\n]+)/gi,
        "[REDACTED_SECRET]",
      )
      .replace(
        /\bbearer\s+(?:"[^"\n]*"|'[^'\n]*'|[^,;\n]+)/gi,
        "[REDACTED_SECRET]",
      )
      .replace(
        /\b(?:private[_ -]?key|seed[_ -]?phrase|mnemonic(?:[_ -]?phrase)?|password|access[_ -]?token|cookie|set-cookie)\b["']?\s*[:=]\s*(?:"[^"\n]*"|'[^'\n]*'|[^,;\n]+)/gi,
        "[REDACTED_SECRET]",
      )
      .replace(
        /\b(?:seed[_ -]?phrase|mnemonic)\b\s+(?:[a-z]+\s+){11,23}[a-z]+\b/gi,
        "[REDACTED_MNEMONIC]",
      )
      .replace(
        /\b(?:private[_ -]?key|access[_ -]?token)\b\s+[A-Za-z0-9_./+\-=]{24,}/gi,
        "[REDACTED_SECRET]",
      );
    if (!message.trim()) return "Unknown deployment error";
    return message.length > MAX_SAFE_ERROR_LENGTH
      ? `${message.slice(0, MAX_SAFE_ERROR_LENGTH)}…`
      : message;
  } catch {
    return "Unknown deployment error";
  }
}

export async function requireBradbury(client) {
  const configuredRpc = testnetBradbury.rpcUrls.default.http[0];
  if (
    testnetBradbury.id !== EXPECTED_CHAIN_ID ||
    client.chain?.id !== EXPECTED_CHAIN_ID ||
    configuredRpc !== EXPECTED_RPC_URL
  ) {
    throw new Error("Deployment client is not configured for the pinned Bradbury chain and RPC.");
  }
  const actualChainId = await client.getChainId();
  if (actualChainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Bradbury RPC returned unexpected chain ID ${actualChainId}.`);
  }
  return actualChainId;
}

export function finalizedDeploymentAddress(transaction) {
  const decoded = transaction?.txDataDecoded;
  const address = decoded?.type === "deploy" ? decoded.contractAddress : undefined;
  if (
    typeof address !== "string" ||
    !ADDRESS_PATTERN.test(address) ||
    address.toLowerCase() === ZERO_ADDRESS
  ) {
    throw new Error(
      "Finalized deployment transaction did not expose the typed txDataDecoded.contractAddress field.",
    );
  }
  return address;
}

export async function compileExpectedSchema(client, source) {
  const schema = await client.getContractSchemaForCode(source);
  if (!validateContractSchema(schema)) {
    throw new Error("Locally compiled contract schema does not match the installed ContractSchema shape.");
  }
  return schema;
}

export async function verifyFinalizedDeployment({ client, hash, source, expectedSchema }) {
  await requireBradbury(client);
  if (!validateContractSchema(expectedSchema)) {
    throw new Error("Expected local contract schema is missing or invalid.");
  }
  await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
  });
  const transaction = await client.getTransaction({ hash });
  if (transaction?.statusName !== TransactionStatus.FINALIZED) {
    throw new Error(
      `Deployment returned actual state ${transaction?.statusName ?? "MISSING"}, not FINALIZED.`,
    );
  }
  if (transaction.txExecutionResultName !== EXPECTED_EXECUTION_RESULT) {
    throw new Error(
      `Finalized deployment execution result was ${transaction.txExecutionResultName ?? "MISSING"}, not ${EXPECTED_EXECUTION_RESULT}.`,
    );
  }

  const address = finalizedDeploymentAddress(transaction);
  const deployedSource = await client.getContractCode(address);
  if (typeof deployedSource !== "string" || deployedSource !== source) {
    throw new Error(
      `Deployed source mismatch: local=${sha256(source)} remote=${typeof deployedSource === "string" ? sha256(deployedSource) : "MISSING"}.`,
    );
  }

  const schema = await client.getContractSchema(address);
  if (!validateContractSchema(schema)) {
    throw new Error("Deployed contract schema is missing the installed SDK's ctor/methods shape.");
  }
  if (!contractSchemasEqual(expectedSchema, schema)) {
    throw new Error("Deployed contract schema does not equal the schema compiled from local source.");
  }

  return {
    address,
    transaction,
    schema,
    sourceSha256: sha256(source),
  };
}

async function main() {
  const privateKey = process.env.GENLAYER_DEPLOYER_PK;
  if (!privateKey) throw new Error("A deployment private key is required.");
  if (!PRIVATE_KEY_PATTERN.test(privateKey)) {
    throw new Error("The deployment private key must be a 32-byte hexadecimal value.");
  }

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const source = await readFile(resolve(scriptDir, "../contracts/truth_market.py"), "utf8");
  const account = createAccount(privateKey);
  const client = createClient({ chain: testnetBradbury, account });

  await requireBradbury(client);
  const expectedSchema = await compileExpectedSchema(client, source);
  const deployTransactionHash = await client.deployContract({ account, code: source });
  console.log(`deployTransactionHash: ${deployTransactionHash}`);

  const verified = await verifyFinalizedDeployment({
    client,
    hash: deployTransactionHash,
    source,
    expectedSchema,
  });
  console.log("finalizedVerifiedDeployment:");
  console.log(
    stringifyBigInt({
      contractAddress: verified.address,
      sourceSha256: verified.sourceSha256,
      statusName: verified.transaction.statusName,
      txExecutionResultName: verified.transaction.txExecutionResultName,
      schemaMethodCount: Object.keys(verified.schema.methods).length,
      chainId: EXPECTED_CHAIN_ID,
      rpc: EXPECTED_RPC_URL,
    }),
  );
}

const directScriptPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (directScriptPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(formatCliError(error));
    process.exitCode = 1;
  });
}
