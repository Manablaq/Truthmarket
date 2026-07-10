"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { EmptyState, Section, StatusPill } from "../../components/chrome";
import { isContractConfigured } from "@/lib/config";
import { describeTransactionStatus, writeTruthMarket } from "@/lib/genlayer";

export default function CreateMarketPage() {
  const { address, isConnected } = useAccount();
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setMessage(describeTransactionStatus("submitted"));
    try {
      if (!address || typeof window === "undefined" || !window.ethereum) throw new Error("Connect a wallet first.");
      const deadline = new Date(String(formData.get("deadline"))).toISOString();
      const hash = await writeTruthMarket({
        account: address,
        provider: window.ethereum,
        functionName: "create_market",
        args: [
          formData.get("title"),
          formData.get("description"),
          formData.get("yes_rules"),
          formData.get("no_rules"),
          formData.get("invalid_rules"),
          deadline,
        ],
        value: parseEther("0"),
      });
      setMessage(`${describeTransactionStatus("accepted")} after wallet submission. Hash: ${hash}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create transaction failed");
    }
  }

  return (
    <main>
      <Section>
        <StatusPill value="Create a claim market" />
        <h1 className="mt-4 text-4xl font-semibold">Create market</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
          Define separate YES, NO, and INVALID criteria so validators can reason from evidence
          instead of preference.
        </p>

        {!isContractConfigured() && (
          <div className="mt-8">
            <EmptyState title="Contract not deployed yet">Creation writes are disabled until a deployed contract address is configured.</EmptyState>
          </div>
        )}

        <form action={submit} className="mt-8 grid gap-4 border border-white/10 bg-white/[0.03] p-5">
          {[
            ["title", "Market title"],
            ["description", "Claim description"],
            ["yes_rules", "YES criteria"],
            ["no_rules", "NO criteria"],
            ["invalid_rules", "INVALID criteria"],
          ].map(([name, label]) => (
            <label key={name} className="grid gap-2 text-sm text-white/72">
              {label}
              <textarea name={name} required rows={name === "title" ? 2 : 4} className="border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-amber-300/60" />
            </label>
          ))}
          <label className="grid gap-2 text-sm text-white/72">
            Deadline
            <input name="deadline" required type="datetime-local" className="border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-amber-300/60" />
          </label>
          <button disabled={!isContractConfigured() || !isConnected} className="bg-amber-300 px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">
            Submit create transaction
          </button>
          {message && <p className="text-sm text-white/65">{message}</p>}
        </form>
      </Section>
    </main>
  );
}
