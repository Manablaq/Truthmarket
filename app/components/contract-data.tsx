"use client";

import { useQuery } from "@tanstack/react-query";
import { isContractConfigured } from "@/lib/config";
import type { ContractViewMethod } from "@/lib/genlayer";

export type Market = {
  market_id: number | string;
  title: string;
  description: string;
  deadline: number;
  status: string;
  yes_pool: number | string;
  no_pool: number | string;
  invalid_pool: number | string;
  total_pool: number | string;
  evidence_count: number | string;
  resolution_id: number | string;
};

export function formatGen(value: number | string | bigint | undefined) {
  if (value == null) return "0 GEN";
  const bigintValue = BigInt(value);
  const whole = bigintValue / BigInt(10 ** 18);
  const fraction = (bigintValue % BigInt(10 ** 18)).toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fraction} GEN`;
}

export async function callContract<T>(method: ContractViewMethod, args: unknown[] = []): Promise<T> {
  const response = await fetch("/api/contract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, args }),
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "Contract read failed");
  if (typeof body.result === "string") {
    try {
      return JSON.parse(body.result) as T;
    } catch {
      return body.result as T;
    }
  }
  return body.result as T;
}

export function useContractRead<T>(method: ContractViewMethod, args: unknown[] = []) {
  return useQuery({
    queryKey: ["contract", method, args],
    queryFn: () => callContract<T>(method, args),
    enabled: isContractConfigured(),
    retry: false,
  });
}
