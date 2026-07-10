import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus, type CalldataEncodable, type Hash } from "genlayer-js/types";
import type { Address } from "viem";
import { TRUTHMARKET_CONTRACT_ADDRESS, isContractConfigured } from "./config";

export type ContractViewMethod =
  | "get_market"
  | "list_markets"
  | "get_user_position"
  | "list_evidence"
  | "get_resolution"
  | "list_challenges"
  | "get_stats"
  | "get_leaderboard";

export const VIEW_METHODS: readonly ContractViewMethod[] = [
  "get_market",
  "list_markets",
  "get_user_position",
  "list_evidence",
  "get_resolution",
  "list_challenges",
  "get_stats",
  "get_leaderboard",
];

export const WRITE_METHODS = [
  "create_market",
  "stake",
  "submit_evidence",
  "resolve_market",
  "challenge_resolution",
  "finalize_market",
  "claim_winnings",
] as const;

export function getReadClient() {
  return createClient({ chain: testnetBradbury });
}

export function getWriteClient(account: Address, provider: unknown) {
  return createClient({
    chain: testnetBradbury,
    account,
    provider: provider as never,
  });
}

export async function readTruthMarket(
  functionName: ContractViewMethod,
  args: unknown[] = [],
) {
  if (!isContractConfigured()) {
    throw new Error("TruthMarket contract is not deployed or configured yet.");
  }

  return getReadClient().readContract({
    address: TRUTHMARKET_CONTRACT_ADDRESS as Address,
    functionName,
    args: args as CalldataEncodable[],
    stateStatus: "accepted",
  } as never);
}

export async function writeTruthMarket(options: {
  account: Address;
  provider: unknown;
  functionName: (typeof WRITE_METHODS)[number];
  args?: unknown[];
  value?: bigint;
}) {
  if (!isContractConfigured()) {
    throw new Error("TruthMarket contract is not deployed or configured yet.");
  }

  const client = getWriteClient(options.account, options.provider);
  await client.connect("testnetBradbury");

  return client.writeContract({
    address: TRUTHMARKET_CONTRACT_ADDRESS as Address,
    functionName: options.functionName,
    args: (options.args ?? []) as CalldataEncodable[],
    value: options.value ?? BigInt(0),
  });
}

export async function waitForAccepted(hash: Hash) {
  return getReadClient().waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
  });
}

export async function waitForFinalized(hash: Hash) {
  return getReadClient().waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
  });
}

export function describeTransactionStatus(
  status: "submitted" | "accepted" | "finalized" | "failed",
) {
  if (status === "submitted") return "Submitted";
  if (status === "accepted") return "Accepted - finalization pending";
  if (status === "finalized") return "Finalized";
  return "Failed";
}

export function parseResult<T = unknown>(result: unknown): T | null {
  if (result == null) return null;
  if (typeof result === "string") {
    try {
      return JSON.parse(result) as T;
    } catch {
      return result as T;
    }
  }
  return result as T;
}

export function wasExecutionSuccessful(receipt: { txExecutionResultName?: string }) {
  return receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN;
}
