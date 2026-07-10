import Link from "next/link";
import { Section, StatusPill } from "./components/chrome";

export default function Home() {
  return (
    <main>
      <Section className="grid min-h-[calc(100vh-73px)] content-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <StatusPill value="AI-adjudicated prediction and accountability markets" />
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] text-white md:text-7xl">
            TruthMarket
          </h1>
          <p className="mt-5 max-w-2xl text-xl leading-8 text-white/72">
            Markets settled by evidence, not trust. Create real-world claim markets, stake on
            YES, NO, or INVALID, and let Bradbury validators evaluate web evidence with structured
            reasoning.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="bg-amber-300 px-5 py-3 text-center text-sm font-semibold text-black hover:bg-amber-200" href="/markets">
              Browse markets
            </Link>
            <Link className="border border-white/16 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-white/8" href="/docs">
              Read lifecycle
            </Link>
          </div>
        </div>
        <div className="border border-white/10 bg-black/28 p-6 shadow-2xl shadow-black/30">
          <div className="grid gap-3">
            {["Claim created", "Evidence submitted", "Accepted - finalization pending", "Finalized for claiming"].map((item, index) => (
              <div key={item} className="flex items-center justify-between border border-white/10 bg-white/[0.035] p-4">
                <span className="text-sm text-white/78">{item}</span>
                <span className="font-mono text-xs text-amber-200">0{index + 1}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-white/10 pt-6">
            <p className="text-sm leading-6 text-white/62">
              TruthMarket is a Bradbury testnet app. It does not assert legal truth or guaranteed
              fairness; it exposes validator reasoning, evidence sources, risk flags, and market
              status so users can inspect the settlement path.
            </p>
          </div>
        </div>
      </Section>
    </main>
  );
}
