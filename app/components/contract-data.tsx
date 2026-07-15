"use client";

import { useQuery } from "@tanstack/react-query";
import { isContractConfigured } from "@/lib/config";
import type { ContractViewMethod } from "@/lib/genlayer";
import { parseAndGuard,type Market } from "@/lib/schemas";
export type {Market} from "@/lib/schemas";

export function formatGen(value: number | string | bigint | undefined) {
  if (value == null) return "0 GEN";
  const bigintValue = BigInt(value);
  const whole = bigintValue / BigInt(10 ** 18);
  const fraction = (bigintValue % BigInt(10 ** 18)).toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fraction} GEN`;
}

export function getDeadlineDate(deadline: Market["deadline"]) {
  if (/^\d+$/.test(deadline)) {
    const numeric = Number(deadline);
    return new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000);
  }

  return new Date(deadline);
}

export function formatDeadline(deadline: Market["deadline"]) {
  const date = getDeadlineDate(deadline);
  if (Number.isNaN(date.getTime())) return "Unknown deadline";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function isDeadlinePassed(deadline: Market["deadline"]) {
  const date = getDeadlineDate(deadline);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}

export function getTotalPool(market: Pick<Market, "yes_pool" | "no_pool" | "invalid_pool" | "total_pool">) {
  const totalPool = BigInt(market.total_pool ?? 0);
  if (totalPool > BigInt(0)) return totalPool;
  return BigInt(market.yes_pool ?? 0) + BigInt(market.no_pool ?? 0) + BigInt(market.invalid_pool ?? 0);
}

export async function callContract<T>(method: ContractViewMethod, args: unknown[] = []): Promise<T> {
  const response = await fetch("/api/contract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, args }),
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "Contract read failed");
  return parseAndGuard(method,body.result) as T;
}

export function useContractRead<T>(method: ContractViewMethod, args: unknown[] = []) {
  return useQuery({
    queryKey: ["contract", method, args],
    queryFn: () => callContract<T>(method, args),
    enabled: isContractConfigured(),
    retry: false,
  });
}
