"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { Card, EmptyState, Field, Panel, Section, StatusPill, TxStatus, inputClass } from "../../components/chrome";
import { BRADBURY_EXPLORER, TRUTHMARKET_CONTRACT_ADDRESS, isContractConfigured } from "@/lib/config";
import { describeTransactionStatus, writeTruthMarket } from "@/lib/genlayer";

const MIN_DEADLINE_LEAD_MS = 60 * 60 * 1000;
const PREFERRED_DEADLINE_LEAD_MS = 2 * 60 * 60 * 1000;
const UTC_ISO_SECONDS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export default function CreateMarketPage() {
  const { address, isConnected } = useAccount();
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "success" | "error">("info");
  const [suggestedDeadline] = useState(() => new Date(Date.now() + PREFERRED_DEADLINE_LEAD_MS).toISOString().replace(/\.\d{3}Z$/, "Z"));

  async function submit(formData: FormData) {
    setMessageKind("info");
    setMessage(describeTransactionStatus("submitted"));
    try {
      if (!address || typeof window === "undefined" || !window.ethereum) throw new Error("Connect a wallet first.");
      const rawDeadline = String(formData.get("deadline") || "").trim();
      const title = String(formData.get("title") || "").trim();
      const description = String(formData.get("description") || "").trim();
      const yesRules = String(formData.get("yes_rules") || "").trim();
      const noRules = String(formData.get("no_rules") || "").trim();
      const invalidRules = String(formData.get("invalid_rules") || "").trim();
      if (!title || !description || !yesRules || !noRules || !invalidRules) {
        throw new Error("Complete the title, description, and all outcome criteria before submitting.");
      }
      if (!UTC_ISO_SECONDS_RE.test(rawDeadline)) {
        throw new Error("Deadline must use second-precision UTC ISO format, for example 2026-07-11T14:30:00Z.");
      }
      const deadlineDate = new Date(rawDeadline);
      if (!rawDeadline || Number.isNaN(deadlineDate.getTime())) {
        throw new Error("Choose a valid UTC deadline.");
      }
      if (deadlineDate.getTime() < Date.now() + MIN_DEADLINE_LEAD_MS) {
        throw new Error("Deadline must be at least 1 hour from now so Bradbury has time to accept the create transaction.");
      }
      if (deadlineDate.getTime() < Date.now() + PREFERRED_DEADLINE_LEAD_MS) {
        throw new Error("Use a deadline at least 2 hours in the future for smoke tests and safer Bradbury acceptance timing.");
      }
      const deadline = deadlineDate.toISOString().replace(/\.\d{3}Z$/, "Z");
      const hash = await writeTruthMarket({
        account: address,
        provider: window.ethereum,
        functionName: "create_market",
        args: [
          title,
          description,
          yesRules,
          noRules,
          invalidRules,
          deadline,
        ],
        value: parseEther("0"),
      });
      setMessageKind("success");
      setMessage(`${describeTransactionStatus("txid")}. Hash: ${hash}`);
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "Create transaction failed");
    }
  }

  return (
    <main>
      <Section>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <StatusPill value="Create a claim market" tone="blue" />
            <h1 className="mt-4 text-5xl font-semibold">Create market</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
              Define separate YES, NO, and INVALID criteria so validators can reason from evidence
              instead of preference. Creation submits to Bradbury first; accepted state may lag the
              wallet transaction hash.
            </p>
            <div className="mt-6 grid gap-3">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/42">Rules guidance</p>
                <p className="mt-3 text-sm leading-6 text-white/58">
                  YES should describe what makes the claim true. NO should describe what makes it
                  false. INVALID should cover ambiguous wording, unavailable evidence, duplicate
                  markets, or conditions that make the claim unresolvable.
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/42">Deadline format</p>
                <p className="mt-3 font-mono text-sm text-amber-100">{suggestedDeadline}</p>
                <p className="mt-2 text-xs leading-5 text-white/48">
                  Use second-precision UTC ISO ending in Z. Minimum is 1 hour in the future; 2+
                  hours is preferred for smoke tests.
                </p>
              </Card>
            </div>
          </div>

          <div>
            {!isContractConfigured() && (
              <div className="mb-6">
                <EmptyState title="Contract not deployed yet">Creation writes are disabled until a deployed contract address is configured.</EmptyState>
              </div>
            )}

            <Panel title="Market parameters" eyebrow="Bradbury write">
              <form action={submit} className="grid gap-4">
                <Field label="Market title" helper="Use a neutral, falsifiable claim.">
                  <textarea name="title" required rows={2} minLength={8} className={inputClass} />
                </Field>
                <Field label="Claim description" helper="Include context, scope, and what evidence should be considered.">
                  <textarea name="description" required rows={4} minLength={20} className={inputClass} />
                </Field>
                <Field label="YES criteria" helper="The evidence conditions that should settle the market YES.">
                  <textarea name="yes_rules" required rows={4} minLength={10} className={inputClass} />
                </Field>
                <Field label="NO criteria" helper="The evidence conditions that should settle the market NO.">
                  <textarea name="no_rules" required rows={4} minLength={10} className={inputClass} />
                </Field>
                <Field label="INVALID criteria" helper="Ambiguity, bad sources, changed premise, duplicates, or insufficient evidence.">
                  <textarea name="invalid_rules" required rows={4} minLength={10} className={inputClass} />
                </Field>
                <Field label="Deadline" helper="Second-precision UTC ISO. Example: 2026-07-11T14:30:00Z">
                  <input name="deadline" required type="text" inputMode="text" placeholder={suggestedDeadline} pattern="\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z" className={inputClass} />
                </Field>
                <button disabled={!isContractConfigured() || !isConnected} className="rounded-md bg-amber-300 px-4 py-3 text-sm font-semibold text-black hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40">
                  Submit create transaction
                </button>
                {!isConnected && <p className="text-xs text-white/45">Connect a wallet before submitting.</p>}
                {isContractConfigured() && (
                  <a className="text-xs text-amber-100/80 underline-offset-4 hover:underline" href={`${BRADBURY_EXPLORER}/address/${TRUTHMARKET_CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
                    Writing to {TRUTHMARKET_CONTRACT_ADDRESS.slice(0, 6)}...{TRUTHMARKET_CONTRACT_ADDRESS.slice(-4)} on Bradbury
                  </a>
                )}
                <TxStatus message={message} kind={messageKind} />
              </form>
            </Panel>
          </div>
        </div>
      </Section>
    </main>
  );
}
