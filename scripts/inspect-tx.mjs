import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

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

const acceptedReceipt = await client.waitForTransactionReceipt({
  hash: txHash,
  status: TransactionStatus.ACCEPTED,
});

console.log("acceptedReceipt:");
console.log(stringifyBigInt(acceptedReceipt));

if (typeof acceptedReceipt.recipient === "string" && ADDRESS_PATTERN.test(acceptedReceipt.recipient)) {
  console.log(`recipient: ${acceptedReceipt.recipient}`);
}

const addressCandidates = [...collectAddressCandidates(acceptedReceipt)];
if (addressCandidates.length > 0) {
  console.log("addressCandidates:");
  console.log(stringifyBigInt(addressCandidates));
}
