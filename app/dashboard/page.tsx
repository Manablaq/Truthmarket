"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { EmptyState, Section, StatusPill } from "../components/chrome";
import { type Market, useContractRead } from "../components/contract-data";
import { isContractConfigured } from "@/lib/config";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const markets = useContractRead<Market[]>("list_markets");

  return (
    <main>
      <Section>
        <StatusPill value="Wallet positions" />
        <h1 className="mt-4 text-4xl font-semibold">Dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
          Position reads are available after a contract is deployed and a wallet is connected.
        </p>

        <div className="mt-8">
          {!isContractConfigured() && <EmptyState title="Contract not deployed yet">No dashboard data is fabricated before deployment.</EmptyState>}
          {isContractConfigured() && !isConnected && <EmptyState title="Connect wallet">Connect a wallet to inspect your TruthMarket positions.</EmptyState>}
          {isContractConfigured() && isConnected && (
            <div className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-white/62">Connected wallet: <span className="font-mono text-white">{address}</span></p>
              <div className="mt-5 grid gap-3">
                {(markets.data ?? []).map((market) => (
                  <Link key={String(market.market_id)} href={`/markets/${market.market_id}`} className="border border-white/10 p-4 text-sm text-white/72 hover:bg-white/5">
                    {market.title}
                    <span className="ml-2 text-white/40">Position lookup available on market detail after contract reads are wired to user-specific views.</span>
                  </Link>
                ))}
                {markets.data?.length === 0 && <p className="text-sm text-white/55">No markets returned by the configured contract.</p>}
              </div>
            </div>
          )}
        </div>
      </Section>
    </main>
  );
}
