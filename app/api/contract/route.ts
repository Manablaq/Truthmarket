import { NextResponse } from "next/server";
import { VIEW_METHODS, readTruthMarket, type ContractViewMethod } from "@/lib/genlayer";
import { isContractConfigured } from "@/lib/config";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MARKET_ID_RE = /^[0-9]+$/;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function validateArgs(method: ContractViewMethod, args: unknown[]) {
  const marketIdMethods = [
    "get_market",
    "get_user_position",
    "list_evidence",
    "get_resolution",
    "list_challenges",
  ];

  if (marketIdMethods.includes(method)) {
    const marketId = args[0];
    if (
      (typeof marketId !== "number" || !Number.isInteger(marketId) || marketId < 0) &&
      (typeof marketId !== "string" || !MARKET_ID_RE.test(marketId))
    ) {
      return "market_id must be a non-negative numeric id";
    }
  }

  if (method === "get_user_position") {
    const address = args[1];
    if (typeof address !== "string" || !ADDRESS_RE.test(address)) {
      return "user address must be a 0x-prefixed 40-byte address";
    }
  }

  if (["list_markets", "get_stats", "get_leaderboard"].includes(method) && args.length > 0) {
    return `${method} does not accept arguments`;
  }

  return null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return jsonError("Request body must be an object");
  }

  const { method, args = [] } = body as { method?: unknown; args?: unknown };

  if (typeof method !== "string" || !VIEW_METHODS.includes(method as ContractViewMethod)) {
    return jsonError("Method is not allowlisted for contract reads", 403);
  }

  if (!Array.isArray(args)) {
    return jsonError("args must be an array");
  }

  const validationError = validateArgs(method as ContractViewMethod, args);
  if (validationError) {
    return jsonError(validationError);
  }

  if (!isContractConfigured()) {
    return jsonError("TruthMarket contract is not deployed or configured yet.", 503);
  }

  try {
    const result = await readTruthMarket(method as ContractViewMethod, args);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Contract read failed", 502);
  }
}
