import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionHashVariant, type CalldataEncodable, type GenLayerTransaction, type Hash } from "genlayer-js/types";
import type { Address } from "viem";
import { TRUTHMARKET_CONTRACT_ADDRESS, isContractConfigured } from "./config.ts";
import type { Eip1193Provider } from "./wallet.ts";

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

export function getWriteClient(account: Address, provider: Eip1193Provider) {
  return createClient({
    chain: testnetBradbury,
    account,
    provider,
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
    transactionHashVariant: TransactionHashVariant.LATEST_NONFINAL,
  });
}

export async function writeTruthMarket(options: {
  account: Address;
  provider: Eip1193Provider;
  functionName: (typeof WRITE_METHODS)[number];
  args?: unknown[];
  value?: bigint;
}) {
  if (!isContractConfigured()) {
    throw new Error("TruthMarket contract is not deployed or configured yet.");
  }

  return getWriteClient(options.account, options.provider).writeContract({
    address: TRUTHMARKET_CONTRACT_ADDRESS as Address,
    functionName: options.functionName,
    args: (options.args ?? []) as CalldataEncodable[],
    value: options.value ?? BigInt(0),
  });
}

export function toTransactionHash(value: string): Hash {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) throw new Error("Invalid transaction hash");
  return value as Hash;
}

export async function getTransactionState(hash: string): Promise<GenLayerTransaction> {
  return getReadClient().getTransaction({ hash: toTransactionHash(hash) });
}

export function describeTransactionStatus(
  status: "submitted" | "accepted" | "finalized" | "failed" | "txid",
) {
  if (status === "submitted") return "Submitted";
  if (status === "txid") return "Submitted to Bradbury consensus - acceptance pending";
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
