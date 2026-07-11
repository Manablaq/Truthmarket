"use client";

import { use, useState } from "react";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { EmptyState, Field, Panel, Section, StatCard, StatusPill, TxStatus, inputClass, marketBadges } from "../../components/chrome";
import { formatDeadline, formatGen, getTotalPool, isDeadlinePassed, type Market, useContractRead } from "../../components/contract-data";
import { BRADBURY_EXPLORER, TRUTHMARKET_CONTRACT_ADDRESS, isContractConfigured } from "@/lib/config";
import { describeTransactionStatus, waitForAccepted, writeTruthMarket } from "@/lib/genlayer";

type Evidence = { evidence_id: number | string; url: string; note: string; submitter: string; submitted_at: number | string };
type Resolution = {
  verdict: string;
  confidence: string;
  reasoning: string;
  accepted_sources: string[];
  rejected_sources: { url: string; reason: string }[];
  risk_flags: string[];
};
type Challenge = { challenge_id: number | string; evidence_url: string; reason: string; challenger: string };

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { address } = useAccount();
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "success" | "error">("info");
  const market = useContractRead<Market>("get_market", [id]);
  const evidence = useContractRead<Evidence[]>("list_evidence", [id]);
  const resolution = useContractRead<Resolution>("get_resolution", [id]);
  const challenges = useContractRead<Challenge[]>("list_challenges", [id]);

  async function send(functionName: Parameters<typeof writeTruthMarket>[0]["functionName"], args: unknown[], value = "0") {
    setMessageKind("info");
    setMessage(describeTransactionStatus("submitted"));
    try {
      if (!address || typeof window === "undefined" || !window.ethereum) throw new Error("Connect a wallet first.");
      const hash = await writeTruthMarket({ account: address, provider: window.ethereum, functionName, args, value: parseEther(value) });
      setMessage(`${describeTransactionStatus("txid")}. Hash: ${hash}`);
      try {
        await Promise.race([
          waitForAccepted(hash as Parameters<typeof waitForAccepted>[0]),
          new Promise((_, reject) => setTimeout(() => reject(new Error("acceptance-timeout")), 45_000)),
        ]);
        setMessageKind("success");
        setMessage(`${describeTransactionStatus("accepted")}. Hash: ${hash}`);
        await Promise.all([market.refetch(), evidence.refetch(), resolution.refetch(), challenges.refetch()]);
      } catch (acceptedError) {
        if (acceptedError instanceof Error && acceptedError.message === "acceptance-timeout") return;
        throw acceptedError;
      }
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "Transaction failed");
    }
  }

  async function stake(formData: FormData) {
    const amount = String(formData.get("amount") || "").trim();
    if (!amount || Number(amount) <= 0) {
      setMessageKind("error");
      setMessage("Enter a positive GEN stake amount.");
      return;
    }
    await send("stake", [id, formData.get("side")], amount);
  }

  async function submitEvidence(formData: FormData) {
    const url = String(formData.get("url") || "").trim();
    const note = String(formData.get("note") || "").trim();
    if (!url || !note) {
      setMessageKind("error");
      setMessage("Evidence requires both a source URL and a note.");
      return;
    }
    await send("submit_evidence", [id, url, note]);
  }

  async function challenge(formData: FormData) {
    await send("challenge_resolution", [id, String(formData.get("url") || "").trim(), String(formData.get("reason") || "").trim()]);
  }

  if (!isContractConfigured()) {
    return (
      <Section>
        <EmptyState title="Contract not deployed yet">Market detail reads and writes are unavailable until deployment.</EmptyState>
      </Section>
    );
  }

  const currentMarket = market.data;
  const deadlinePassed = currentMarket ? isDeadlinePassed(currentMarket.deadline) : false;

  return (
    <main>
      <Section>
        {market.isLoading && <EmptyState title="Loading market">Reading accepted market state from Bradbury.</EmptyState>}
        {market.error && (
          <EmptyState title="Market read failed">
            {market.error.message}
            <br />
            Check the market id, RPC availability, and configured contract address.
          </EmptyState>
        )}
        {currentMarket && (
          <>
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div>
                <div className="flex flex-wrap gap-2">
                  {marketBadges(currentMarket).map((badge) => (
                    <StatusPill key={badge.label} value={badge.label} tone={badge.tone} />
                  ))}
                </div>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-5xl">{currentMarket.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">{currentMarket.description}</p>
                <a
                  href={`${BRADBURY_EXPLORER}/address/${TRUTHMARKET_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-xs text-amber-100/80 underline-offset-4 hover:underline"
                >
                  Bradbury contract {TRUTHMARKET_CONTRACT_ADDRESS.slice(0, 6)}...{TRUTHMARKET_CONTRACT_ADDRESS.slice(-4)}
                </a>
              </div>
              <button
                type="button"
                onClick={() => Promise.all([market.refetch(), evidence.refetch(), resolution.refetch(), challenges.refetch()])}
                className="rounded-md border border-white/16 px-4 py-3 text-sm font-semibold text-white hover:bg-white/8"
              >
                Refresh accepted state
              </button>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-5">
              <StatCard label="YES pool" value={formatGen(currentMarket.yes_pool)} />
              <StatCard label="NO pool" value={formatGen(currentMarket.no_pool)} />
              <StatCard label="INVALID pool" value={formatGen(currentMarket.invalid_pool)} />
              <StatCard label="Total pool" value={formatGen(getTotalPool(currentMarket))} />
              <StatCard label="Deadline" value={formatDeadline(currentMarket.deadline)} detail={deadlinePassed ? "Resolve action is now available." : "Resolution is disabled before this time."} />
            </div>
          </>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-5">
            <Panel title="Evidence timeline" eyebrow="Accepted reads">
              {evidence.isLoading && <p className="text-sm text-white/55">Loading evidence.</p>}
              {evidence.error && <p className="text-sm text-red-100">Evidence read failed: {evidence.error.message}</p>}
              {!evidence.isLoading && !evidence.error && (evidence.data ?? []).length === 0 && <p className="text-sm text-white/55">No evidence returned by the contract.</p>}
              {(evidence.data ?? []).map((item) => (
                <a key={String(item.evidence_id)} href={item.url} target="_blank" rel="noreferrer" className="block rounded-md border border-white/10 bg-black/20 p-4 text-sm text-white/72 hover:bg-white/5">
                  <span className="font-mono text-xs text-white/40">Evidence #{String(item.evidence_id)}</span>
                  <span className="mt-2 block break-words text-amber-100">{item.url}</span>
                  <span className="mt-2 block leading-6 text-white/55">{item.note}</span>
                  <span className="mt-2 block text-xs text-white/38">Submitted by {shortAddress(item.submitter)}</span>
                </a>
              ))}
            </Panel>
            <Panel title="Resolution" eyebrow="No finality claim before contract finality">
              {resolution.data ? (
                <div className="space-y-3 text-sm text-white/65">
                  <p className="text-lg font-semibold text-white">{resolution.data.verdict} / {resolution.data.confidence}</p>
                  <p className="leading-6">{resolution.data.reasoning}</p>
                  <p>Accepted sources: {resolution.data.accepted_sources?.join(", ") || "None returned"}</p>
                  <p>Rejected sources: {resolution.data.rejected_sources?.map((source) => `${source.url} (${source.reason})`).join(", ") || "None returned"}</p>
                  <p>Risk flags: {resolution.data.risk_flags?.join(", ") || "None returned"}</p>
                </div>
              ) : (
                <p className="text-sm leading-6 text-white/55">
                  No accepted resolution returned yet. A submitted resolve transaction is not treated
                  as final until accepted/finalized state is visible.
                </p>
              )}
            </Panel>
            <Panel title="Challenges">
              {challenges.isLoading && <p className="text-sm text-white/55">Loading challenges.</p>}
              {!challenges.isLoading && (challenges.data ?? []).length === 0 && <p className="text-sm text-white/55">No challenges returned by the contract.</p>}
              <div className="grid gap-3">
                {(challenges.data ?? []).map((item) => (
                  <p key={String(item.challenge_id)} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/65">
                    <span className="block font-mono text-xs text-white/38">Challenge #{String(item.challenge_id)} by {shortAddress(item.challenger)}</span>
                    {item.reason}
                  </p>
                ))}
              </div>
            </Panel>
          </div>
          <div className="grid gap-5">
            <Panel title="Stake" eyebrow="YES / NO / INVALID">
              <form action={stake} className="grid gap-3">
                <Field label="Side">
                  <select name="side" className={inputClass}><option>YES</option><option>NO</option><option>INVALID</option></select>
                </Field>
                <Field label="Amount" helper="Amount is paid in GEN and sent with the stake transaction.">
                  <input name="amount" inputMode="decimal" placeholder="0.001" className={inputClass} />
                </Field>
                <button className="rounded-md bg-amber-300 px-4 py-3 text-sm font-semibold text-black hover:bg-amber-200">Submit stake</button>
              </form>
            </Panel>
            <Panel title="Submit evidence" eyebrow="Source-backed updates">
              <form action={submitEvidence} className="grid gap-3">
                <Field label="Source URL">
                  <input name="url" required type="url" placeholder="https://source.example/article" className={inputClass} />
                </Field>
                <Field label="Evidence note" helper="Explain what the source proves or disproves.">
                  <textarea name="note" required rows={4} placeholder="Why this source matters" className={inputClass} />
                </Field>
                <button className="rounded-md border border-white/16 px-4 py-3 text-sm font-semibold text-white hover:bg-white/8">Submit evidence</button>
              </form>
            </Panel>
            <Panel title="Resolution actions" eyebrow="Deadline gated">
              {!deadlinePassed && (
                <p className="mb-3 rounded-md border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/56">
                  Resolve is disabled until the market deadline passes.
                </p>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button disabled={!deadlinePassed} onClick={() => send("resolve_market", [id])} className="rounded-md border border-amber-300/35 px-3 py-3 text-xs font-semibold text-amber-100 hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:opacity-40">Resolve</button>
                <button onClick={() => send("finalize_market", [id])} className="rounded-md border border-white/16 px-3 py-3 text-xs font-semibold text-white hover:bg-white/8">Finalize</button>
                <button onClick={() => send("claim_winnings", [id])} className="rounded-md border border-white/16 px-3 py-3 text-xs font-semibold text-white hover:bg-white/8">Claim</button>
              </div>
              <form action={challenge} className="mt-3 grid gap-3">
                <Field label="Challenge source">
                  <input name="url" required type="url" placeholder="https://challenge-source.example" className={inputClass} />
                </Field>
                <Field label="Challenge reason">
                  <textarea name="reason" required rows={3} placeholder="Challenge reason" className={inputClass} />
                </Field>
                <button className="rounded-md border border-amber-300/40 px-4 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/10">Challenge accepted resolution</button>
              </form>
            </Panel>
            <TxStatus message={message} kind={messageKind} />
          </div>
        </div>
      </Section>
    </main>
  );
}

function shortAddress(value: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return value || "unknown";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
