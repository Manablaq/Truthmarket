"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { useWallet } from "../components/wallet-provider";
import { EmptyState, Section, StatusPill } from "../components/chrome";
import { type Market, useContractRead } from "../components/contract-data";
import { isContractConfigured } from "@/lib/config";
import { BRADBURY_EXPLORER } from "@/lib/config";
import type { Activity } from "@/lib/transactions";
import { loadActivities,monitorActivity,subscribeActivities } from "@/lib/activity";

export default function DashboardPage() {
  const { account } = useWallet();
  const markets = useContractRead<Market[]>("list_markets");
  const [activity,setActivity]=useState<Activity[]>([]);
  useEffect(()=>{const timer=setTimeout(()=>setActivity(account?loadActivities(window.localStorage,account):[]),0);const unsubscribe=account?subscribeActivities(account,setActivity):()=>{};return()=>{clearTimeout(timer);unsubscribe()}},[account]);
  function retryPolling(item:Activity){void monitorActivity(item,{storage:window.localStorage})}

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
          {isContractConfigured() && !account && <EmptyState title="Connect wallet">Connect a wallet to inspect your TruthMarket positions.</EmptyState>}
          {isContractConfigured() && account && (
            <div className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-white/62">Connected wallet: <span className="font-mono text-white">{account}</span></p>
              <div className="mt-5 grid gap-3">
                {(markets.data ?? []).map((market) => (
                  <Link key={String(market.market_id)} href={`/markets/${market.market_id}`} className="border border-white/10 p-4 text-sm text-white/72 hover:bg-white/5">
                    {market.title}
                    <span className="ml-2 text-white/40">Position lookup available on market detail after contract reads are wired to user-specific views.</span>
                  </Link>
                ))}
                {markets.data?.length === 0 && <p className="text-sm text-white/55">No markets returned by the configured contract.</p>}
              </div>
              <h2 className="mt-8 text-lg font-semibold">Browser-local Activity</h2>
              <p className="mt-2 text-xs text-white/45">Activity is local convenience data, not finality proof.</p>
              <div className="mt-3 grid gap-2">{activity.map(item=><div key={item.transactionHash} className="border border-white/10 p-3 text-xs text-white/65"><a href={`${BRADBURY_EXPLORER}/tx/${item.transactionHash}`} target="_blank" rel="noreferrer" className="block"><span className="font-semibold text-white">{item.action}</span><span className="block">Protocol phase: {item.currentPhase}</span><span className="block">Local polling: {item.pollingState}{item.pollingStoppedAt?` since ${item.pollingStoppedAt}`:""}</span><span className="block break-all font-mono text-white/40">{item.transactionHash}</span></a>{item.safeError?.stage==="POLLING"&&<p role="status" className="mt-2 text-amber-100/80">{item.safeError.message}</p>}{!item.terminal&&<button type="button" onClick={()=>retryPolling(item)} className="mt-2 rounded border border-white/15 px-2 py-1 text-white/70">Retry polling only</button>}</div>)}{activity.length===0&&<p className="text-sm text-white/45">No valid-hash Activity is stored for this wallet.</p>}</div>
            </div>
          )}
        </div>
      </Section>
    </main>
  );
}
