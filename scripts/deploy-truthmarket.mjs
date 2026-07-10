import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAccount, createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/;
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
      if (normalized !== ZERO_ADDRESS) {
        const keyLooksRelevant = /(?:recipient|contract|address)$/i.test(key);
        if (keyLooksRelevant) {
          candidates.add(currentValue);
        }
      }
    } else if (currentValue && typeof currentValue === "object") {
      collectAddressCandidates(currentValue, candidates);
    }
  }

  return candidates;
}

function likelyContractAddress(receipt) {
  if (
    receipt &&
    typeof receipt.recipient === "string" &&
    ADDRESS_PATTERN.test(receipt.recipient) &&
    receipt.recipient.toLowerCase() !== ZERO_ADDRESS
  ) {
    return receipt.recipient;
  }

  const [candidate] = collectAddressCandidates(receipt);
  return candidate;
}

const privateKey = process.env.GENLAYER_DEPLOYER_PK;

if (!privateKey) {
  console.error("GENLAYER_DEPLOYER_PK is required.");
  process.exit(1);
}

if (!PRIVATE_KEY_PATTERN.test(privateKey)) {
  console.error("GENLAYER_DEPLOYER_PK must match /^0x[0-9a-fA-F]{64}$/.");
  process.exit(1);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const contractPath = resolve(scriptDir, "../contracts/truth_market.py");
const source = await readFile(contractPath, "utf8");

const account = createAccount(privateKey);
const client = createClient({
  chain: testnetBradbury,
  account,
});

const deployTransactionHash = await client.deployContract({
  account,
  code: source,
});

console.log(`deployTransactionHash: ${deployTransactionHash}`);

const acceptedReceipt = await client.waitForTransactionReceipt({
  hash: deployTransactionHash,
  status: TransactionStatus.ACCEPTED,
});

console.log("acceptedReceipt:");
console.log(stringifyBigInt(acceptedReceipt));

const contractAddress = likelyContractAddress(acceptedReceipt);
if (contractAddress) {
  console.log(`likelyContractAddress: ${contractAddress}`);
}
