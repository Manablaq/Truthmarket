"use client";

import { EmptyState, Section, StatusPill } from "../components/chrome";
import { formatGen, useContractRead } from "../components/contract-data";
import { isContractConfigured } from "@/lib/config";

type Leaderboard = Record<string, string | number>;

export default function LeaderboardPage() {
  const leaderboard = useContractRead<Leaderboard>("get_leaderboard");
  const rows = Object.entries(leaderboard.data ?? {});

  return (
    <main>
      <Section>
        <StatusPill value="Contract leaderboard" />
        <h1 className="mt-4 text-4xl font-semibold">Leaderboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
          Payout totals read from accepted contract state when a deployed address is configured.
        </p>
        <div className="mt-8">
          {!isContractConfigured() && <EmptyState title="Contract not deployed yet">Leaderboard data will appear only after deployment and real reads.</EmptyState>}
          {isContractConfigured() && rows.length === 0 && <EmptyState title="No leaderboard entries">The contract returned no payout entries.</EmptyState>}
          {rows.length > 0 && (
            <div className="border border-white/10 bg-white/[0.03]">
              {rows.map(([address, amount], index) => (
                <div key={address} className="grid grid-cols-[60px_1fr_auto] gap-4 border-b border-white/10 p-4 text-sm last:border-b-0">
                  <span className="font-mono text-amber-200">#{index + 1}</span>
                  <span className="font-mono text-white/72">{address}</span>
                  <span>{formatGen(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    </main>
  );
}
