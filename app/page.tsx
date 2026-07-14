import Link from "next/link";
import { Card, Section, StatCard, StatusPill,V3Warning } from "./components/chrome";
import { BRADBURY_CHAIN_ID, BRADBURY_EXPLORER, TRUTHMARKET_CONTRACT_ADDRESS, isContractConfigured } from "@/lib/config";

export default function Home() {
  const contractHref = isContractConfigured() ? `${BRADBURY_EXPLORER}/address/${TRUTHMARKET_CONTRACT_ADDRESS}` : BRADBURY_EXPLORER;

  return (
    <main>
      <Section className="grid min-h-[calc(100vh-73px)] content-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <StatusPill value="AI-adjudicated markets on Bradbury" tone="blue" />
          <h1 className="mt-6 max-w-4xl text-6xl font-semibold leading-[0.95] text-white md:text-8xl">
            TruthMarket
          </h1>
          <p className="mt-5 max-w-2xl text-2xl font-medium leading-9 text-white/84">
            Markets settled by evidence, not trust.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/62">
            Create claim markets, stake on YES, NO, or INVALID, and submit URL identifiers with notes and timestamps for GenLayer consensus.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-md bg-amber-300 px-5 py-3 text-center text-sm font-semibold text-black shadow-lg shadow-amber-300/10 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200/70" href="/markets">
              Explore Markets
            </Link>
            <Link className="rounded-md border border-white/16 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-white/25" href="/markets/create">
              Create Market
            </Link>
          </div>
        </div>
        <Card className="overflow-hidden p-6">
          <div className="border-b border-white/10 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">Consensus lifecycle</p>
            <h2 className="mt-2 text-2xl font-semibold">Evidence-first settlement</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {["Claim created", "Stake committed", "Evidence accepted", "Resolution after deadline"].map((item, index) => (
              <div key={item} className="flex items-center justify-between rounded-md border border-white/10 bg-black/24 p-4">
                <span className="text-sm text-white/78">{item}</span>
                <span className="font-mono text-xs text-amber-200">0{index + 1}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-white/56">
            The UI separates submitted, accepted, and finalized states so users can inspect where
            each market stands in Bradbury consensus.
          </p>
        </Card>
      </Section>
      <Section className="pt-0"><V3Warning /></Section>

      <Section className="pt-0">
        <div className="grid gap-4 md:grid-cols-4">
          {["Create", "Stake", "Submit Evidence", "Resolve"].map((step, index) => (
            <Card key={step} className="p-5">
              <p className="font-mono text-xs text-amber-100/70">0{index + 1}</p>
              <h2 className="mt-3 text-lg font-semibold">{step}</h2>
              <p className="mt-3 text-sm leading-6 text-white/56">
                {index === 0 && "Define the claim, deadline, and separate YES, NO, and INVALID criteria."}
                {index === 1 && "Commit GEN to the side that matches your read of the evidence."}
                {index === 2 && "Attach URL identifiers and unverified explanatory notes for validator evaluation."}
                {index === 3 && "After the deadline, request adjudication and wait for accepted/final state."}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="grid gap-5 pt-0 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <StatusPill value="Why GenLayer" tone="amber" />
          <h2 className="mt-4 text-3xl font-semibold">AI-native adjudication without a centralized oracle</h2>
          <div className="mt-6 grid gap-3">
            {["Validators reason only over submitted URL strings, notes, and timestamps.", "Submitted claims and risk flags remain visible for inspection.", "The contract does not fetch content, authenticate sources, or confirm publication dates."].map((item) => (
              <p key={item} className="rounded-md border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/64">
                {item}
              </p>
            ))}
          </div>
        </Card>
        <div className="grid gap-5 md:grid-cols-2">
          <StatCard label="Live deployment" value={isContractConfigured() ? `${TRUTHMARKET_CONTRACT_ADDRESS.slice(0, 6)}...${TRUTHMARKET_CONTRACT_ADDRESS.slice(-4)}` : "Not configured"} detail={<a className="text-amber-100 underline-offset-4 hover:underline" href={contractHref} target="_blank" rel="noreferrer">Open Bradbury explorer</a>} />
          <StatCard label="Network" value="Bradbury Testnet" detail={`Chain ID ${BRADBURY_CHAIN_ID}. Testnet funds and consensus semantics apply.`} />
          <Card className="p-5 md:col-span-2">
            <StatusPill value="Historical record — 2026-07-10" tone="neutral" />
            <h2 className="mt-4 text-xl font-semibold">Historical accepted-state smoke record: Market #3</h2>
            <p className="mt-3 text-sm leading-6 text-white/58">
              On 2026-07-10 a smoke run created Market #3, accepted a YES stake, accepted evidence,
              and read accepted state with evidence_count 1, yes_pool 0.001 GEN, and total_volume
              0.001 GEN. This historical accepted-state read is not current finality proof and the full lifecycle remains unverified.
            </p>
          </Card>
        </div>
      </Section>
    </main>
  );
}
