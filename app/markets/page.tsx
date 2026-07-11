"use client";

import Link from "next/link";
import { EmptyState, MarketCard, Section, StatusPill } from "../components/chrome";
import { type Market, useContractRead } from "../components/contract-data";
import { BRADBURY_EXPLORER, TRUTHMARKET_CONTRACT_ADDRESS, isContractConfigured } from "@/lib/config";

export default function MarketsPage() {
  const { data, isLoading, error, refetch, isFetching } = useContractRead<Market[]>("list_markets");
  const markets = data ?? [];

  return (
    <main>
      <Section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <StatusPill value="Accepted Bradbury reads" tone="blue" />
            <h1 className="mt-4 text-5xl font-semibold">Markets</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
              Browse claim markets and inspect accepted state. Accepted reads may still be pending
              finalization, and this page does not claim resolution finality unless the contract does.
            </p>
            {isContractConfigured() && (
              <a
                href={`${BRADBURY_EXPLORER}/address/${TRUTHMARKET_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-xs text-amber-100/80 underline-offset-4 hover:underline"
              >
                Contract {TRUTHMARKET_CONTRACT_ADDRESS.slice(0, 6)}...{TRUTHMARKET_CONTRACT_ADDRESS.slice(-4)}
              </a>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {isContractConfigured() && (
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-md border border-white/16 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isFetching ? "Refreshing" : "Refresh accepted state"}
              </button>
            )}
            <Link href="/markets/create" className="rounded-md bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-black hover:bg-amber-200">
              Create market
            </Link>
          </div>
        </div>

        <div className="mt-8">
          {!isContractConfigured() && (
            <EmptyState title="Contract not deployed yet">
              Set `NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS` after deploying the GenLayer contract.
              TruthMarket does not show fake markets while no contract is configured.
            </EmptyState>
          )}
          {isContractConfigured() && isLoading && (
            <EmptyState title="Loading markets">Reading accepted contract state from Bradbury.</EmptyState>
          )}
          {isContractConfigured() && error && (
            <EmptyState title="Read failed">
              {error.message}
              <br />
              Confirm the Bradbury RPC is reachable and inspect the configured contract if this persists.
            </EmptyState>
          )}
          {isContractConfigured() && !isLoading && !error && markets.length === 0 && (
            <EmptyState title="No markets found">
              The configured contract returned an empty market list. Create the first market to populate this view.
            </EmptyState>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {markets.map((market) => <MarketCard key={String(market.market_id)} market={market} />)}
          </div>
        </div>
      </Section>
    </main>
  );
}
