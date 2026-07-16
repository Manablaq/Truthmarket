import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { createAccount, createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const EXPECTED_SOURCE_COMMIT = "625bbe5fb53d8cdafe55c8879bae987698711215";
const EXPECTED_CHAIN_ID = 4221;
const EXPECTED_SUCCESS = "FINISHED_WITH_RETURN";
const PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 240;

function json(value) {
  return JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item, 2);
}

function requireKey(name) {
  const value = process.env[name];
  if (!value || !PRIVATE_KEY_PATTERN.test(value)) {
    throw new Error(`${name} must be set to a private key; it will never be printed or written.`);
  }
  return value;
}

function contractAddressFrom(receipt) {
  const candidates = [];
  const visit = (value, key = "") => {
    if (typeof value === "string" && ADDRESS_PATTERN.test(value)) {
      if (value.toLowerCase() !== ZERO_ADDRESS && /(?:recipient|contract|address)$/i.test(key)) {
        candidates.push(value);
      }
      return;
    }
    if (value && typeof value === "object") {
      for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
    }
  };
  if (typeof receipt?.recipient === "string" && ADDRESS_PATTERN.test(receipt.recipient)) {
    return receipt.recipient;
  }
  visit(receipt);
  return candidates[0];
}

function transactionSnapshot(tx) {
  return {
    observedAt: new Date().toISOString(),
    status: tx?.status ?? null,
    statusName: tx?.statusName ?? null,
    resultName: tx?.resultName ?? null,
    txExecutionResultName: tx?.txExecutionResultName ?? null,
    sender: tx?.sender ?? tx?.from ?? null,
    recipient: tx?.recipient ?? tx?.to ?? null,
  };
}

async function monitorToFinalized(client, hash, onAccepted, finalizerClient) {
  const timeline = [];
  let lastFingerprint = "";
  let acceptedObserved = false;
  let finalizationEvmHash = null;
  for (let poll = 0; poll < MAX_POLLS; poll += 1) {
    try {
      const tx = await client.getTransaction({ hash });
      const snapshot = transactionSnapshot(tx);
      const fingerprint = JSON.stringify([
        snapshot.statusName,
        snapshot.resultName,
        snapshot.txExecutionResultName,
      ]);
      if (fingerprint !== lastFingerprint) {
        timeline.push(snapshot);
        lastFingerprint = fingerprint;
      }
      if (snapshot.statusName === "ACCEPTED" && !acceptedObserved) {
        acceptedObserved = true;
        if (onAccepted) await onAccepted(snapshot);
      }
      if (snapshot.statusName === "READY_TO_FINALIZE" && !finalizationEvmHash) {
        if (!finalizerClient) throw new Error(`No finalizer client available for ${hash}.`);
        finalizationEvmHash = await finalizerClient.finalizeTransaction({ txId: hash });
      }
      if (["FINALIZED", "CANCELED", "UNDETERMINED", "VALIDATORS_TIMEOUT", "LEADER_TIMEOUT"].includes(snapshot.statusName)) {
        const receipt = await client.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.FINALIZED,
          retries: 0,
          fullTransaction: true,
        }).catch(() => tx);
        return { timeline, acceptedObserved, finalizationEvmHash, receipt };
      }
    } catch (error) {
      if (poll === MAX_POLLS - 1) throw error;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out monitoring ${hash}; do not resubmit blindly.`);
}

function finalizedSuccess(observation) {
  return observation.receipt?.statusName === "FINALIZED" &&
    observation.receipt?.txExecutionResultName === EXPECTED_SUCCESS;
}

async function readProbe(client, address, requestId, transactionHashVariant) {
  const raw = await client.readContract({
    address,
    functionName: "get_probe",
    args: [String(requestId)],
    transactionHashVariant,
  });
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function submitAndObserve({ client, finalizerClient, label, write, onAccepted }) {
  const submittedAt = new Date().toISOString();
  const hash = await write();
  console.log(`${label} submitted: ${hash}`);
  const observation = await monitorToFinalized(client, hash, onAccepted, finalizerClient);
  return { label, hash, submittedAt, ...observation };
}

if (process.env.GATE1_NETWORK !== "bradbury") {
  throw new Error("Set GATE1_NETWORK=bradbury to acknowledge the selected nonproduction network.");
}
if (testnetBradbury.id !== EXPECTED_CHAIN_ID) {
  throw new Error(`SDK Bradbury chain mismatch: ${testnetBradbury.id}`);
}

const requester = createAccount(requireKey("GENLAYER_GATE1_REQUESTER_PK"));
const executor = createAccount(requireKey("GENLAYER_GATE1_EXECUTOR_PK"));
if (requester.address.toLowerCase() === executor.address.toLowerCase()) {
  throw new Error("Requester and executor addresses must differ; permissionless execution cannot be simulated.");
}

const requesterClient = createClient({ chain: testnetBradbury, account: requester });
const executorClient = createClient({ chain: testnetBradbury, account: executor });
const readClient = createClient({ chain: testnetBradbury });
const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const contractPath = resolve(root, "contracts/truth_market_v4_gate1_probe.py");
const evidencePath = resolve(root, "fixtures/gate1-evidence.json");
const source = await readFile(contractPath, "utf8");
const sourceCodeSha256 = createHash("sha256").update(source).digest("hex");

const evidence = {
  verdict: "GATE 1 INCONCLUSIVE",
  sourceCommit: EXPECTED_SOURCE_COMMIT,
  network: {
    name: testnetBradbury.name,
    chainId: testnetBradbury.id,
    rpc: testnetBradbury.rpcUrls.default.http[0],
  },
  sourceCodeSha256,
  requester: requester.address,
  executor: executor.address,
  startedAt: new Date().toISOString(),
  deployment: null,
  request: null,
  execution: null,
  duplicateExecution: null,
  invalidRequest: null,
  limitations: [],
};

try {
  const deployment = await submitAndObserve({
    client: readClient,
    finalizerClient: requesterClient,
    label: "deploy",
    write: () => requesterClient.deployContract({ account: requester, code: source }),
  });
  if (!finalizedSuccess(deployment)) throw new Error("Probe deployment did not finalize successfully.");
  const address = contractAddressFrom(deployment.receipt);
  if (!address) throw new Error("Could not derive the experimental contract address from the finalized deployment receipt.");
  evidence.deployment = { ...deployment, contractAddress: address };

  let requestAcceptedState = null;
  const request = await submitAndObserve({
    client: readClient,
    finalizerClient: requesterClient,
    label: "request_probe",
    write: () => requesterClient.writeContract({
      account: requester,
      address,
      functionName: "request_probe",
      args: ["gate-one-alpha"],
      value: 0n,
    }),
    onAccepted: async () => {
      requestAcceptedState = await readProbe(readClient, address, "1", "latest-nonfinal");
    },
  });
  if (!finalizedSuccess(request)) throw new Error("Request transaction did not finalize successfully.");
  const requestFinalizedState = await readProbe(readClient, address, "1", "latest-final");
  evidence.request = { ...request, acceptedState: requestAcceptedState, finalizedState: requestFinalizedState };

  let executionAcceptedState = null;
  const execution = await submitAndObserve({
    client: readClient,
    finalizerClient: requesterClient,
    label: "execute_probe",
    write: () => executorClient.writeContract({
      account: executor,
      address,
      functionName: "execute_probe",
      args: ["1"],
      value: 0n,
    }),
    onAccepted: async () => {
      executionAcceptedState = await readProbe(readClient, address, "1", "latest-nonfinal");
    },
  });
  if (!finalizedSuccess(execution)) throw new Error("Execution transaction did not finalize successfully.");
  const executionFinalizedState = await readProbe(readClient, address, "1", "latest-final");
  evidence.execution = { ...execution, acceptedState: executionAcceptedState, finalizedState: executionFinalizedState };

  const duplicateBefore = await readProbe(readClient, address, "1", "latest-final");
  const duplicateExecution = await submitAndObserve({
    client: readClient,
    finalizerClient: requesterClient,
    label: "duplicate execute_probe",
    write: () => executorClient.writeContract({
      account: executor,
      address,
      functionName: "execute_probe",
      args: ["1"],
      value: 0n,
    }),
  });
  const duplicateAfter = await readProbe(readClient, address, "1", "latest-final");
  evidence.duplicateExecution = { ...duplicateExecution, before: duplicateBefore, after: duplicateAfter };

  const invalidCountBefore = await readClient.readContract({
    address,
    functionName: "get_request_count",
    args: [],
    transactionHashVariant: "latest-final",
  });
  const invalidRequest = await submitAndObserve({
    client: readClient,
    finalizerClient: requesterClient,
    label: "invalid execute_probe",
    write: () => executorClient.writeContract({
      account: executor,
      address,
      functionName: "execute_probe",
      args: ["999999"],
      value: 0n,
    }),
  });
  const invalidCountAfter = await readClient.readContract({
    address,
    functionName: "get_request_count",
    args: [],
    transactionHashVariant: "latest-final",
  });
  evidence.invalidRequest = { ...invalidRequest, countBefore: invalidCountBefore, countAfter: invalidCountAfter };

  const duplicateRejected = !finalizedSuccess(duplicateExecution) && JSON.stringify(duplicateBefore) === JSON.stringify(duplicateAfter);
  const invalidRejected = !finalizedSuccess(invalidRequest) && String(invalidCountBefore) === String(invalidCountAfter);
  const acceptedObserved = request.acceptedObserved && execution.acceptedObserved;
  const permissionless = requestFinalizedState.requester.toLowerCase() !== executionFinalizedState.executor.toLowerCase();
  const immutablePayload = requestFinalizedState.payload === executionFinalizedState.payload;
  evidence.verdict = duplicateRejected && invalidRejected && acceptedObserved && permissionless && immutablePayload
    ? "GATE 1 PASSED"
    : "GATE 1 INCONCLUSIVE";
  if (!acceptedObserved) evidence.limitations.push("ACCEPTED was not directly observed for both lifecycle transactions before FINALIZED.");
  if (!duplicateRejected) evidence.limitations.push("Duplicate execution rejection was not proven by finalized failure plus unchanged state.");
  if (!invalidRejected) evidence.limitations.push("Invalid request rejection was not proven by finalized failure plus unchanged count.");
  if (!permissionless) evidence.limitations.push("Execution from a genuinely different address was not proven.");
  if (!immutablePayload) evidence.limitations.push("Stored payload equality before and after execution was not proven.");
} catch (error) {
  evidence.limitations.push(error instanceof Error ? error.message : String(error));
  throw error;
} finally {
  evidence.finishedAt = new Date().toISOString();
  await writeFile(evidencePath, `${json(evidence)}\n`, { mode: 0o600 });
  console.log(`Evidence written without secrets: ${evidencePath}`);
  console.log(json({ verdict: evidence.verdict, deployment: evidence.deployment?.contractAddress ?? null }));
}
