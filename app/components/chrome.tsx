"use client";
/* eslint-disable @next/next/no-img-element -- EIP-6963 icons are extension-provided data URLs. */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "./wallet-provider";
import type { Market } from "@/lib/schemas";
import { BRADBURY_CHAIN_ID, BRADBURY_EXPLORER } from "@/lib/config";
import { copyPublicAddress, disclosureIsOpen, providerPresentationName, safeProviderIcon, shortenAddress, walletExplorerUrl, walletNetworkStatusLabel, walletTriggerLabel } from "@/lib/wallet";
import { formatDeadline, formatGen, getTotalPool, isDeadlinePassed } from "./contract-data";

type StatusTone = "amber" | "blue" | "green" | "red" | "neutral";

const nav = [
  ["Markets", "/markets"],
  ["Create", "/markets/create"],
  ["Dashboard", "/dashboard"],
  ["Leaderboard", "/leaderboard"],
  ["Docs", "/docs"],
];

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07080d]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-sm border border-amber-300/40 bg-amber-300/10 font-mono text-sm text-amber-200">
            TM
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-[0.22em] text-white">TRUTHMARKET</span>
            <span className="block text-xs text-white/45">Bradbury testnet</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-sm px-3 py-2 text-sm text-white/68 hover:bg-white/8 hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}

function WalletButton() {
  const {account,connect,disconnect,switchWallet,selected,connectionPending,sessionError,sessionStatus,networkState,balance,discoveryState}=useWallet();
  const [disclosure,setDisclosure]=useState<{owner?:string;open:boolean}>({owner:account,open:false}),[copyFeedback,setCopyFeedback]=useState<{owner?:string;status:""|"copied"|"unavailable"}>({owner:account,status:""});
  const containerRef=useRef<HTMLDivElement>(null),triggerRef=useRef<HTMLButtonElement>(null),connectRef=useRef<HTMLButtonElement>(null),copyTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),previousAccount=useRef(account),currentAccount=useRef(account),switching=useRef(false);
  const open=disclosureIsOpen(disclosure.owner,account,disclosure.open),copyStatus=copyFeedback.owner===account?copyFeedback.status:"";

  const closeMenu=useCallback((restore=true)=>{setDisclosure({owner:account,open:false});if(restore)requestAnimationFrame(()=>triggerRef.current?.focus())},[account]);
  useEffect(()=>()=>{if(copyTimer.current)clearTimeout(copyTimer.current)},[]);
  useEffect(()=>{if(!open)return;const pointer=(event:PointerEvent)=>{if(!containerRef.current?.contains(event.target as Node))closeMenu(false)};const key=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();closeMenu()}};document.addEventListener("pointerdown",pointer);document.addEventListener("keydown",key);return()=>{document.removeEventListener("pointerdown",pointer);document.removeEventListener("keydown",key)}},[open,closeMenu]);
  useEffect(()=>{currentAccount.current=account;if(previousAccount.current!==account){if(copyTimer.current)clearTimeout(copyTimer.current);queueMicrotask(()=>{setDisclosure({owner:account,open:false});setCopyFeedback({owner:account,status:""})});if(previousAccount.current&&!account){if(switching.current)switching.current=false;else requestAnimationFrame(()=>connectRef.current?.focus())}}previousAccount.current=account},[account]);

  const copyAddress=async()=>{if(!account)return;const owner=account,write=navigator.clipboard?.writeText?.bind(navigator.clipboard),status=await copyPublicAddress(owner,write);if(currentAccount.current!==owner)return;setCopyFeedback({owner,status});if(copyTimer.current)clearTimeout(copyTimer.current);copyTimer.current=setTimeout(()=>setCopyFeedback({owner,status:""}),2400)};

  if (account) {
    const providerName=providerPresentationName(selected?.info.name),providerIcon=safeProviderIcon(selected?.info.icon),short=shortenAddress(account),onBradbury=networkState==="connected",networkChanged=networkState==="changed";
    return <div ref={containerRef} className="relative min-w-0">
      <button ref={triggerRef} type="button" aria-expanded={open} aria-controls="connected-wallet-popup" aria-label={walletTriggerLabel(account,providerName,networkState)} onClick={()=>setDisclosure({owner:account,open:!open})} onKeyDown={event=>{if(event.key==="ArrowDown"){event.preventDefault();setDisclosure({owner:account,open:true});requestAnimationFrame(()=>containerRef.current?.querySelector<HTMLElement>("[data-wallet-action]")?.focus())}}} className="group flex min-h-11 w-full max-w-[15rem] items-center gap-2 rounded-md border border-amber-300/30 bg-[#11130f] px-2.5 py-1.5 text-left shadow-lg shadow-black/25 outline-none transition hover:border-amber-300/55 hover:bg-amber-300/[0.08] focus-visible:ring-2 focus-visible:ring-amber-300/50">
        {providerIcon?<img src={providerIcon} alt="" className="size-7 shrink-0 rounded-md"/>:<span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-md bg-amber-300/12 text-xs font-semibold text-amber-100">W</span>}
        <span className="min-w-0"><span className="block truncate text-xs font-semibold text-white">{providerName}</span><span className="block font-mono text-[11px] text-white/55">{short}</span></span>
        <span className={`hidden items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold sm:flex ${onBradbury?"border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100":"border-amber-300/30 bg-amber-300/10 text-amber-100"}`}><span className={`size-1.5 rounded-full ${onBradbury?"bg-emerald-300":"bg-amber-300"}`}/>{onBradbury?"Bradbury":networkChanged?"Changed":"Unavailable"}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-4 shrink-0 text-white/45 transition-transform ${open?"rotate-180":""}`}><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
      </button>
      {open&&<div id="connected-wallet-popup" className="absolute right-0 z-40 mt-2 max-h-[min(32rem,calc(100vh-6rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-amber-300/20 bg-[#0d1016] shadow-2xl shadow-black/60">
        <div className="border-b border-white/10 p-4">
          <div className="flex min-w-0 items-center gap-3">{providerIcon?<img src={providerIcon} alt="" className="size-10 shrink-0 rounded-lg"/>:<span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-300/10 font-semibold text-amber-100">W</span>}<div className="min-w-0"><p className="truncate font-semibold text-white" title={providerName}>{providerName}</p><p className="truncate font-mono text-xs text-white/48" title={account}>{account}</p></div></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-white/8 bg-black/20 p-3 text-xs"><div><dt className="text-white/40">Required network</dt><dd className="mt-1 text-white/80">GenLayer Bradbury</dd></div><div><dt className="text-white/40">Required chain ID</dt><dd className="mt-1 font-mono text-white/80">{BRADBURY_CHAIN_ID}</dd></div><div><dt className="text-white/40">Status</dt><dd className={`mt-1 ${onBradbury?"text-emerald-200":"text-amber-200"}`}>{walletNetworkStatusLabel(networkState)}</dd></div><div><dt className="text-white/40">Balance</dt><dd className="mt-1 text-white/80">{balance.status==="loading"?"Loading…":balance.status==="available"?balance.value:"Unavailable"}</dd></div></dl>
          {sessionError&&<p role="status" className="mt-3 rounded border border-amber-300/20 bg-amber-300/[0.07] p-2 text-xs leading-5 text-amber-50/80">{sessionError}</p>}
        </div>
        <div className="p-2">
          <button data-wallet-action type="button" onClick={()=>{void copyAddress()}} className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm text-white/78 outline-none hover:bg-white/[0.07] focus-visible:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-amber-300/40">{copyStatus==="copied"?"Copied":copyStatus==="unavailable"?"Copy unavailable — select and copy the address manually":"Copy address"}</button>
          <a href={walletExplorerUrl(BRADBURY_EXPLORER,account)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-md px-3 text-sm text-white/78 outline-none hover:bg-white/[0.07] focus-visible:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-amber-300/40">View on Bradbury explorer <span aria-hidden="true" className="ml-auto">↗</span></a>
          <button type="button" onClick={()=>{switching.current=true;closeMenu(false);switchWallet()}} className="flex min-h-11 w-full items-center rounded-md px-3 text-sm text-white/78 outline-none hover:bg-white/[0.07] focus-visible:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-amber-300/40">Switch wallet</button>
          <div className="my-1 border-t border-white/10"/>
          <button type="button" onClick={()=>{closeMenu(false);disconnect()}} className="flex min-h-11 w-full items-center rounded-md px-3 text-sm font-medium text-red-200 outline-none hover:bg-red-400/10 focus-visible:bg-red-400/10 focus-visible:ring-2 focus-visible:ring-red-300/40">Disconnect</button>
        </div>
      </div>}
      <span role="status" aria-live="polite" className="sr-only">{copyStatus==="copied"?"Address copied.":copyStatus==="unavailable"?"Copy unavailable. Select and copy the address manually.":sessionStatus}</span>
    </div>;
  }

  return (
    <div>
      <button
        ref={connectRef}
        type="button"
        disabled={connectionPending||discoveryState==="DISCOVERING"}
        onClick={()=>{void connect()}}
        className="min-h-11 rounded-md border border-white/16 px-3 py-2 text-sm font-medium text-white outline-none hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-amber-300/50 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {discoveryState==="DISCOVERING"?"Discovering injected wallets…":connectionPending ? "Connecting" : "Connect wallet"}
      </button>
      <span role="status" aria-live="polite" className="sr-only">{discoveryState==="DISCOVERING"?"Discovering injected wallets…":connectionPending?"Wallet connection request pending.":"Wallet discovery complete."}</span>
      {sessionStatus==="Wallet disconnected. Extension permissions were not changed."&&<p role="status" className="absolute right-5 mt-2 max-w-xs rounded border border-white/10 bg-[#111827] p-2 text-xs text-white/65">{sessionStatus}</p>}
      {sessionError&&<p role="alert" className="absolute right-5 mt-2 max-w-xs rounded bg-red-950 p-2 text-xs text-red-100">{sessionError}</p>}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#06070b] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(245,197,66,0.14),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(47,179,255,0.12),transparent_30%),linear-gradient(135deg,#06070b_0%,#111827_46%,#07080d_100%)]" />
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      <Header />
      {children}
    </div>
  );
}

export function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-7xl px-5 py-12 sm:py-16 ${className}`}>{children}</section>;
}

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.04] p-8 shadow-2xl shadow-black/20 backdrop-blur">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-3 max-w-2xl text-sm leading-6 text-white/62">{children}</div>
    </div>
  );
}

export function StatusPill({ value, tone = "amber" }: { value: string; tone?: StatusTone }) {
  const tones = {
    amber: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    blue: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    green: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    red: "border-red-300/30 bg-red-300/10 text-red-100",
    neutral: "border-white/15 bg-white/[0.06] text-white/72",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${tones[tone]}`}>
      {value}
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/42">{label}</p>
      <div className="mt-2 font-mono text-lg text-white">{value}</div>
      {detail && <div className="mt-2 text-xs leading-5 text-white/50">{detail}</div>}
    </Card>
  );
}

export function Panel({ title, eyebrow, children, className = "" }: { title: string; eyebrow?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`p-5 ${className}`}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/80">{eyebrow}</p>}
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function Field({ children, label, helper }: { children: React.ReactNode; label: string; helper?: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-white/78">
      {label}
      {children}
      {helper && <span className="text-xs font-normal leading-5 text-white/45">{helper}</span>}
    </label>
  );
}

export const inputClass =
  "rounded-md border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15";

export function TxStatus({ message, kind = "info" }: { message: string; kind?: "info" | "success" | "error" }) {
  if (!message) return null;
  const tone = kind === "error" ? "border-red-300/25 bg-red-300/10 text-red-100" : kind === "success" ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-sky-300/25 bg-sky-300/10 text-sky-100";
  return (
    <div role={kind==="error"?"alert":"status"} aria-live="polite" className={`rounded-lg border p-4 text-sm leading-6 ${tone}`}>
      {message}
      {message.match(/0x[a-fA-F0-9]{64}/)?.[0]&&<a className="ml-2 underline" href={`${BRADBURY_EXPLORER}/tx/${message.match(/0x[a-fA-F0-9]{64}/)?.[0]}`} target="_blank" rel="noreferrer">Open transaction</a>}
      {kind === "error" && (
        <p className="mt-2 text-xs leading-5 text-white/58">
          Inspect the transaction in the Bradbury explorer or run the local inspect script with the tx hash when available.
        </p>
      )}
    </div>
  );
}
export function V3Warning({action=false}:{action?:boolean}){return <div className="rounded-lg border border-amber-300/25 bg-amber-300/8 p-4 text-xs leading-5 text-amber-50/80"><strong>V3 limitation:</strong> TruthMarket applies GenLayer AI consensus to user-submitted URL identifiers, explanatory notes, and timestamps. The contract does not fetch or authenticate webpage contents. URLs and notes are unverified claims; accepted is not finalized. {action&&"Challenge evidence is stored but is not included in V3 re-resolution. There is no challenge waiting period."} Funds can remain locked in unresolved edge cases. Bradbury is a testnet, and V3 is not end-to-end verified.</div>}

export function marketBadges(market: Market) {
  const status = String(market.status || "unknown").toUpperCase();
  const statusTone: StatusTone = status.includes("RESOLVED") || status.includes("FINAL") ? "green" : status.includes("OPEN") ? "blue" : "neutral";
  const badges: { label: string; tone: StatusTone }[] = [{ label: status, tone: statusTone }];
  if (isDeadlinePassed(market.deadline)) badges.push({ label: "DEADLINE PASSED", tone: "amber" });
  if (BigInt(market.evidence_count ?? 0) > BigInt(0)) badges.push({ label: "EVIDENCE SUBMITTED", tone: "green" });
  return badges;
}

export function MarketCard({ market }: { market: Market }) {
  const totalPool = getTotalPool(market);
  return (
    <Link
      href={`/markets/${market.market_id}`}
      className="group block rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-amber-300/35 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-amber-300/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-white/38">MARKET #{String(market.market_id)}</p>
          <h2 className="mt-2 line-clamp-2 text-xl font-semibold leading-7 text-white">{market.title}</h2>
        </div>
        <span className="text-sm font-semibold text-amber-100 opacity-80 transition group-hover:opacity-100">Open</span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/58">{market.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {marketBadges(market).map((badge) => (
          <StatusPill key={badge.label} value={badge.label} tone={badge.tone} />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <MiniStat label="YES" value={formatGen(market.yes_pool)} />
        <MiniStat label="NO" value={formatGen(market.no_pool)} />
        <MiniStat label="INVALID" value={formatGen(market.invalid_pool)} />
        <MiniStat label="TOTAL" value={formatGen(totalPool)} />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/48">
        <span>Deadline: {formatDeadline(market.deadline)}</span>
        <span>Evidence: {String(market.evidence_count ?? 0)}</span>
      </div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 break-words font-mono text-xs text-white/78">{value}</p>
    </div>
  );
}
