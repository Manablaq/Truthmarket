import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import {
  DECIDED_STATES,
  TransactionStatus,
  transactionsStatusNumberToName,
} from "genlayer-js/types";

const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function stringifyBigInt(value) {
  return JSON.stringify(
    value,
    (_key, currentValue) =>
      typeof currentValue === "bigint" ? currentValue.toString() : currentValue,
    2,
  );
}

function collectAddressCandidates(value, candidates = new Set()) {
  if (!value || typeof value !== "object") {
    return candidates;
  }

  for (const [key, currentValue] of Object.entries(value)) {
    if (typeof currentValue === "string" && ADDRESS_PATTERN.test(currentValue)) {
      const normalized = currentValue.toLowerCase();
      if (normalized !== ZERO_ADDRESS && /(?:recipient|contract|address)$/i.test(key)) {
        candidates.add(currentValue);
      }
    } else if (currentValue && typeof currentValue === "object") {
      collectAddressCandidates(currentValue, candidates);
    }
  }

  return candidates;
}

function statusNameFor(transaction) {
  if (typeof transaction?.statusName === "string") {
    return transaction.statusName;
  }
  if (transaction?.status !== undefined && transaction?.status !== null) {
    return transactionsStatusNumberToName[String(transaction.status)] ?? String(transaction.status);
  }
  return "UNKNOWN";
}

function printJson(label, value) {
  console.log(`${label}:`);
  console.log(stringifyBigInt(value));
}

function printDiagnosticSummary(transaction, queuePosition) {
  const statusName = statusNameFor(transaction);
  const statusCode = transaction?.status ?? null;

  printJson("summary", {
    hash: txHash,
    statusCode,
    statusName,
    txExecutionResult: transaction?.txExecutionResult ?? null,
    txExecutionResultName: transaction?.txExecutionResultName ?? null,
    result: transaction?.result ?? null,
    resultName: transaction?.resultName ?? null,
    queuePosition,
    note: DECIDED_STATES.includes(statusName)
      ? "Transaction is in a decided state. Only ACCEPTED or FINALIZED transactions change accepted/finalized contract state."
      : "Transaction is not accepted yet. No accepted state change exists for this transaction yet.",
  });
}

const txHash = process.argv[2];

if (!txHash) {
  console.error("Usage: npm run inspect:tx -- <0x transaction hash>");
  process.exit(1);
}

if (!TX_HASH_PATTERN.test(txHash)) {
  console.error("Transaction hash must match /^0x[0-9a-fA-F]{64}$/.");
  process.exit(1);
}

const client = createClient({
  chain: testnetBradbury,
});

let transaction;
try {
  transaction = await client.getTransaction({ hash: txHash });
} catch (error) {
  console.error("getTransaction failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

let queuePosition = null;
try {
  queuePosition = await client.getTransactionQueuePosition({ hash: txHash });
} catch (error) {
  queuePosition = {
    unavailable: true,
    error: error instanceof Error ? error.message : String(error),
  };
}

printDiagnosticSummary(transaction, queuePosition);
printJson("transaction", transaction);

const transactionStatusName = statusNameFor(transaction);
if (!DECIDED_STATES.includes(transactionStatusName)) {
  console.log("acceptedReceipt: unavailable");
  console.log("No accepted receipt was fetched because the transaction is not in a decided state.");
  process.exit(0);
}

let decidedReceipt;
try {
  decidedReceipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED,
    retries: 0,
  });
} catch (error) {
  console.log("acceptedReceipt: unavailable");
  console.log(error instanceof Error ? error.message : String(error));
  process.exit(0);
}

printJson(
  transactionStatusName === TransactionStatus.ACCEPTED || transactionStatusName === TransactionStatus.FINALIZED
    ? "acceptedReceipt"
    : "decidedReceipt",
  decidedReceipt,
);

if (typeof decidedReceipt.recipient === "string" && ADDRESS_PATTERN.test(decidedReceipt.recipient)) {
  console.log(`recipient: ${decidedReceipt.recipient}`);
}

const addressCandidates = [...collectAddressCandidates(decidedReceipt)];
if (addressCandidates.length > 0) {
  printJson("addressCandidates", addressCandidates);
}
