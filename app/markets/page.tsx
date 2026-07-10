"use client";

import Link from "next/link";
import { EmptyState, Section, StatusPill } from "../components/chrome";
import { formatGen, type Market, useContractRead } from "../components/contract-data";
import { isContractConfigured } from "@/lib/config";

export default function MarketsPage() {
  const { data, isLoading, error } = useContractRead<Market[]>("list_markets");
  const markets = data ?? [];

  return (
    <main>
      <Section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <StatusPill value="Live Bradbury reads when configured" />
            <h1 className="mt-4 text-4xl font-semibold">Markets</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
              Browse claim markets and inspect accepted state. Accepted data may still be pending
              finalization on Bradbury.
            </p>
          </div>
          <Link href="/markets/create" className="bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-black">
            Create market
          </Link>
        </div>

        <div className="mt-8">
          {!isContractConfigured() && (
            <EmptyState title="Contract not deployed yet">
              Set `NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS` after deploying the GenLayer contract.
              TruthMarket does not show fake markets while no contract is configured.
            </EmptyState>
          )}
          {isContractConfigured() && isLoading && <EmptyState title="Loading markets">Reading accepted contract state from Bradbury.</EmptyState>}
          {isContractConfigured() && error && <EmptyState title="Read failed">{error.message}</EmptyState>}
          {isContractConfigured() && !isLoading && !error && markets.length === 0 && (
            <EmptyState title="No markets found">The configured contract returned an empty market list.</EmptyState>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {markets.map((market) => (
              <Link key={String(market.market_id)} href={`/markets/${market.market_id}`} className="border border-white/10 bg-white/[0.035] p-5 hover:bg-white/[0.06]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{market.title}</h2>
                  <StatusPill value={market.status} />
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/62">{market.description}</p>
                <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-white/55">
                  <span>YES {formatGen(market.yes_pool)}</span>
                  <span>NO {formatGen(market.no_pool)}</span>
                  <span>INVALID {formatGen(market.invalid_pool)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
}
