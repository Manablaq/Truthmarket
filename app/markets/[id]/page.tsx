"use client";

import { use, useState } from "react";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { EmptyState, Section, StatusPill } from "../../components/chrome";
import { formatGen, type Market, useContractRead } from "../../components/contract-data";
import { isContractConfigured } from "@/lib/config";
import { describeTransactionStatus, writeTruthMarket } from "@/lib/genlayer";

type Evidence = { evidence_id: number | string; url: string; note: string; submitter: string; submitted_at: number };
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
  const market = useContractRead<Market>("get_market", [id]);
  const evidence = useContractRead<Evidence[]>("list_evidence", [id]);
  const resolution = useContractRead<Resolution>("get_resolution", [id]);
  const challenges = useContractRead<Challenge[]>("list_challenges", [id]);

  async function send(functionName: Parameters<typeof writeTruthMarket>[0]["functionName"], args: unknown[], value = "0") {
    setMessage(describeTransactionStatus("submitted"));
    try {
      if (!address || typeof window === "undefined" || !window.ethereum) throw new Error("Connect a wallet first.");
      const hash = await writeTruthMarket({ account: address, provider: window.ethereum, functionName, args, value: parseEther(value) });
      setMessage(`${describeTransactionStatus("accepted")} after wallet submission. Hash: ${hash}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transaction failed");
    }
  }

  async function stake(formData: FormData) {
    await send("stake", [id, formData.get("side")], String(formData.get("amount") || "0"));
  }

  async function submitEvidence(formData: FormData) {
    await send("submit_evidence", [id, formData.get("url"), formData.get("note")]);
  }

  async function challenge(formData: FormData) {
    await send("challenge_resolution", [id, formData.get("url"), formData.get("reason")]);
  }

  if (!isContractConfigured()) {
    return (
      <Section>
        <EmptyState title="Contract not deployed yet">Market detail reads and writes are unavailable until deployment.</EmptyState>
      </Section>
    );
  }

  return (
    <main>
      <Section>
        {market.error && <EmptyState title="Market read failed">{market.error.message}</EmptyState>}
        {market.data && (
          <>
            <StatusPill value={market.data.status} />
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold">{market.data.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">{market.data.description}</p>
            <div className="mt-8 grid gap-3 md:grid-cols-4">
              <Pool label="YES" value={market.data.yes_pool} />
              <Pool label="NO" value={market.data.no_pool} />
              <Pool label="INVALID" value={market.data.invalid_pool} />
              <Pool label="TOTAL" value={market.data.total_pool} />
            </div>
          </>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-5">
            <Panel title="Evidence">
              {(evidence.data ?? []).length === 0 && <p className="text-sm text-white/55">No evidence returned by the contract.</p>}
              {(evidence.data ?? []).map((item) => (
                <a key={String(item.evidence_id)} href={item.url} target="_blank" rel="noreferrer" className="block border border-white/10 p-3 text-sm text-white/72 hover:bg-white/5">
                  {item.url}
                  <span className="mt-1 block text-white/45">{item.note}</span>
                </a>
              ))}
            </Panel>
            <Panel title="Resolution">
              {resolution.data ? (
                <div className="space-y-3 text-sm text-white/65">
                  <p>{resolution.data.verdict} / {resolution.data.confidence}</p>
                  <p>{resolution.data.reasoning}</p>
                  <p>Accepted sources: {resolution.data.accepted_sources?.join(", ") || "None"}</p>
                  <p>Risk flags: {resolution.data.risk_flags?.join(", ") || "None"}</p>
                </div>
              ) : (
                <p className="text-sm text-white/55">No accepted resolution returned yet.</p>
              )}
            </Panel>
            <Panel title="Challenges">
              {(challenges.data ?? []).map((item) => (
                <p key={String(item.challenge_id)} className="border border-white/10 p-3 text-sm text-white/65">{item.reason}</p>
              ))}
            </Panel>
          </div>
          <div className="grid gap-5">
            <Panel title="Stake">
              <form action={stake} className="grid gap-3">
                <select name="side" className="border border-white/10 bg-black/30 p-3 text-white"><option>YES</option><option>NO</option><option>INVALID</option></select>
                <input name="amount" placeholder="Amount in GEN" className="border border-white/10 bg-black/30 p-3 text-white" />
                <button className="bg-amber-300 px-4 py-3 text-sm font-semibold text-black">Submit stake</button>
              </form>
            </Panel>
            <Panel title="Submit evidence">
              <form action={submitEvidence} className="grid gap-3">
                <input name="url" required placeholder="https://source.example/article" className="border border-white/10 bg-black/30 p-3 text-white" />
                <textarea name="note" placeholder="Why this source matters" className="border border-white/10 bg-black/30 p-3 text-white" />
                <button className="border border-white/16 px-4 py-3 text-sm font-semibold text-white">Submit evidence</button>
              </form>
            </Panel>
            <Panel title="Resolution actions">
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => send("resolve_market", [id])} className="border border-white/16 px-3 py-2 text-xs">Resolve</button>
                <button onClick={() => send("finalize_market", [id])} className="border border-white/16 px-3 py-2 text-xs">Finalize</button>
                <button onClick={() => send("claim_winnings", [id])} className="border border-white/16 px-3 py-2 text-xs">Claim</button>
              </div>
              <form action={challenge} className="mt-3 grid gap-3">
                <input name="url" required placeholder="https://challenge-source.example" className="border border-white/10 bg-black/30 p-3 text-white" />
                <textarea name="reason" required placeholder="Challenge reason" className="border border-white/10 bg-black/30 p-3 text-white" />
                <button className="border border-amber-300/40 px-4 py-3 text-sm font-semibold text-amber-100">Challenge accepted resolution</button>
              </form>
            </Panel>
            {message && <p className="text-sm text-white/65">{message}</p>}
          </div>
        </div>
      </Section>
    </main>
  );
}

function Pool({ label, value }: { label: string; value: string | number }) {
  return <div className="border border-white/10 bg-white/[0.035] p-4"><p className="text-xs text-white/45">{label}</p><p className="mt-2 font-mono text-lg">{formatGen(value)}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border border-white/10 bg-white/[0.03] p-5"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>;
}
