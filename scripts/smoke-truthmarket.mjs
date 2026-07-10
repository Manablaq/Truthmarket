import { setTimeout as sleep } from "node:timers/promises";
import { createAccount, createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { parseEther } from "viem";

const PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const TX_HASH_PATTERN = /0x[0-9a-fA-F]{64}/g;
const EVM_WRAPPER_HASH_PATTERN = /EVM tx (0x[0-9a-fA-F]{64})/i;
const BACKPRESSURE_DELAYS_MS = [15_000, 30_000, 60_000, 120_000];
const MARKET_POLL_INTERVAL_MS = 15_000;
const MARKET_POLL_TIMEOUT_MS = 10 * 60_000;
const MIN_DEADLINE_LEAD_MS = 2 * 60 * 60 * 1000;
const EXPECTED_EXECUTION_RESULT_NAME = "FINISHED_WITH_RETURN";
const TRUTHMARKET_APP_URL = "https://truthmarket-beta.vercel.app";
const TRUTHMARKET_REPO_URL = "https://github.com/Manablaq/Truthmarket";

function stringifyBigInt(value) {
  return JSON.stringify(
    value,
    (_key, currentValue) =>
      typeof currentValue === "bigint" ? currentValue.toString() : currentValue,
    2,
  );
}

function parseJsonReturn(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function compactIso(date) {
  return date.toISOString().replace(".000Z", "Z");
}

function errorText(error) {
  if (!error || typeof error !== "object") return String(error);
  return [
    error.shortMessage,
    error.details,
    error.message,
    stringifyBigInt(error),
    String(error),
  ]
    .filter(Boolean)
    .join("\n");
}

function isBackpressureError(error) {
  const text = errorText(error).toLowerCase();
  return (
    text.includes("node is not currently accepting transactions") ||
    text.includes("pipeline backpressure") ||
    text.includes("l1_sender_commit")
  );
}

function extractHashes(error) {
  return [...new Set(errorText(error).match(TX_HASH_PATTERN) ?? [])];
}

function extractEvmWrapperHash(error) {
  return errorText(error).match(EVM_WRAPPER_HASH_PATTERN)?.[1] ?? null;
}

function printJson(label, value) {
  console.log(`${label}:`);
  console.log(stringifyBigInt(value));
}

function fail(message, details) {
  console.error(`Failed: ${message}`);
  if (details) console.error(details);
  process.exit(1);
}

function requireEnv() {
  const contractAddress = process.env.NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS;
  const privateKey = process.env.GENLAYER_DEPLOYER_PK;

  if (!contractAddress) {
    fail("NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS is required.");
  }
  if (!ADDRESS_PATTERN.test(contractAddress)) {
    fail("NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS must match /^0x[0-9a-fA-F]{40}$/.");
  }
  if (!privateKey) {
    fail("GENLAYER_DEPLOYER_PK is required.");
  }
  if (!PRIVATE_KEY_PATTERN.test(privateKey)) {
    fail("GENLAYER_DEPLOYER_PK must match /^0x[0-9a-fA-F]{64}$/. The key was not printed.");
  }

  return { contractAddress, privateKey };
}

async function readMarkets(client, contractAddress) {
  const raw = await client.readContract({
    address: contractAddress,
    functionName: "list_markets",
    args: [],
    stateStatus: "accepted",
  });
  const parsed = parseJsonReturn(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`list_markets returned non-array data: ${stringifyBigInt(parsed)}`);
  }
  return parsed;
}

async function submitWithBackpressureRetries(label, operation) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      console.log(`Submitted: ${label}`);
      const hash = await operation();
      console.log(`Submitted: ${label} consensus tx ${hash}`);
      return hash;
    } catch (error) {
      const evmWrapperHash = extractEvmWrapperHash(error);
      if (evmWrapperHash) {
        fail(
          `${label} produced an EVM wrapper tx hash and should not be retried blindly.`,
          `EVM wrapper tx: ${evmWrapperHash}\nRun: npm run inspect:evm-wrapper -- ${evmWrapperHash}`,
        );
      }

      const hashes = extractHashes(error);
      if (hashes.length > 0) {
        fail(
          `${label} error contains transaction hash data and should not be retried blindly.`,
          `Hash: ${hashes[0]}\nRun: npm run inspect:tx -- ${hashes[0]}`,
        );
      }

      if (isBackpressureError(error) && attempt < BACKPRESSURE_DELAYS_MS.length) {
        const delayMs = BACKPRESSURE_DELAYS_MS[attempt];
        console.log(
          `Backpressure retrying: ${label} after ${Math.round(delayMs / 1000)}s (${attempt + 1}/${BACKPRESSURE_DELAYS_MS.length})`,
        );
        await sleep(delayMs);
        continue;
      }

      fail(`${label} submission failed.`, errorText(error));
    }
  }
}

async function waitForAccepted(client, label, hash) {
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.ACCEPTED,
      interval: 5_000,
      retries: 120,
    });
    console.log(`Accepted - finalization pending: ${label} ${hash}`);
    if (receipt.txExecutionResultName !== EXPECTED_EXECUTION_RESULT_NAME) {
      fail(
        `${label} consensus tx did not execute successfully.`,
        `Run: npm run inspect:tx -- ${hash}\nreceipt:\n${stringifyBigInt(receipt)}`,
      );
    }
    return receipt;
  } catch (error) {
    fail(
      `${label} consensus tx did not reach ACCEPTED.`,
      `Run: npm run inspect:tx -- ${hash}\n${errorText(error)}`,
    );
  }
}

async function pollForCreatedMarket(client, contractAddress, expected, existingIds) {
  const deadlineAt = Date.now() + MARKET_POLL_TIMEOUT_MS;
  while (Date.now() < deadlineAt) {
    const markets = await readMarkets(client, contractAddress);
    const matches = markets.filter((market) => {
      const id = String(market.market_id ?? "");
      return (
        !existingIds.has(id) &&
        market.title === expected.title &&
        market.deadline === expected.deadline &&
        typeof market.created_at === "string" &&
        market.created_at >= expected.createdAtFloor &&
        market.status === "OPEN"
      );
    });

    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      fail("More than one new market matched the smoke-test identity.", stringifyBigInt(matches));
    }

    console.log("Submitted: waiting for accepted list_markets state to include the new market.");
    await sleep(MARKET_POLL_INTERVAL_MS);
  }

  fail(
    "Timed out waiting for the new market to appear in accepted list_markets state.",
    stringifyBigInt(expected),
  );
}

function printResolveInstructions(marketId, deadline) {
  console.log("resolveInstructions:");
  console.log(`1. Wait until after ${deadline}.`);
  console.log(`2. Inspect stake/evidence first with: npm run inspect:tx -- <stake-or-evidence-tx>`);
  console.log(`3. Resolve manually with a dedicated resolver command or UI action for market ${marketId}.`);
  console.log("4. Do not resolve before the deadline; the contract will reject it.");
}

const { contractAddress, privateKey } = requireEnv();
const account = createAccount(privateKey);
const client = createClient({
  chain: testnetBradbury,
  account,
});

const startedAt = new Date();
const deadline = compactIso(new Date(Date.now() + MIN_DEADLINE_LEAD_MS + 5 * 60_000));
const runId = compactIso(startedAt).replace(/[-:]/g, "").replace("Z", "Z");
const stakeGen = process.env.SMOKE_STAKE_GEN ?? "0.001";
const title = `TruthMarket smoke test ${runId}`;
const description =
  "Professional smoke test market for the deployed TruthMarket contract. This market verifies create, stake, and evidence submission behavior on Bradbury without resolving automatically.";
const yesRules =
  "YES if the smoke script created this exact market, staked YES, and submitted the matching evidence note before the deadline.";
const noRules =
  "NO if the smoke script failed to complete the create, stake, or evidence submission steps before the deadline.";
const invalidRules =
  "INVALID if the market identity cannot be matched by title, created_at, and deadline or if the evidence note is unrelated to this smoke test.";
const evidenceUrl = TRUTHMARKET_APP_URL;
const evidenceNote =
  `Smoke-test evidence for ${title}. TruthMarket live app: ${TRUTHMARKET_APP_URL}. TruthMarket GitHub repo: ${TRUTHMARKET_REPO_URL}. Contract: ${contractAddress}. Smoke market title: ${title}. The script confirmed the market through accepted list_markets before staking, then staked YES and submitted this note.`;

console.log("TruthMarket Bradbury smoke test");
console.log(`contract: ${contractAddress}`);
console.log(`deadline: ${deadline}`);

const existingMarkets = await readMarkets(client, contractAddress);
const existingIds = new Set(existingMarkets.map((market) => String(market.market_id ?? "")));

const createTx = await submitWithBackpressureRetries("create_market", () =>
  client.writeContract({
    account,
    address: contractAddress,
    functionName: "create_market",
    args: [title, description, yesRules, noRules, invalidRules, deadline],
    value: 0n,
  }),
);
await waitForAccepted(client, "create_market", createTx);

const market = await pollForCreatedMarket(
  client,
  contractAddress,
  { title, deadline, createdAtFloor: compactIso(startedAt) },
  existingIds,
);
const marketId = String(market.market_id);
console.log(`Accepted - finalization pending: confirmed market ${marketId}`);

const stakeTx = await submitWithBackpressureRetries("stake YES", () =>
  client.writeContract({
    account,
    address: contractAddress,
    functionName: "stake",
    args: [marketId, "YES"],
    value: parseEther(stakeGen),
  }),
);
await waitForAccepted(client, "stake YES", stakeTx);

const evidenceTx = await submitWithBackpressureRetries("submit_evidence", () =>
  client.writeContract({
    account,
    address: contractAddress,
    functionName: "submit_evidence",
    args: [marketId, evidenceUrl, evidenceNote],
    value: 0n,
  }),
);
await waitForAccepted(client, "submit_evidence", evidenceTx);

printJson("smokeResult", {
  marketId,
  createTx,
  stakeTx,
  evidenceTx,
  deadline,
  stakeGen,
  title,
  market,
});
printResolveInstructions(marketId, deadline);
console.log("Accepted - finalization pending: smoke test stopped after stake/evidence.");
