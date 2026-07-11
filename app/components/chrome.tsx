"use client";

import Link from "next/link";
import { useConnect, useConnection, useDisconnect } from "wagmi";
import type { Market } from "./contract-data";
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
  const connection = useConnection();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const injected = connectors.find((connector) => connector.type === "injected") ?? connectors[0];

  if (connection.isConnected && connection.address) {
    const label = `${connection.address.slice(0, 6)}...${connection.address.slice(-4)}`;
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        className="border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-sm font-medium text-amber-100 hover:bg-amber-300/15"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!injected || isPending}
      onClick={() => injected && connect({ connector: injected })}
      className="border border-white/16 px-3 py-2 text-sm font-medium text-white hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {isPending ? "Connecting" : "Connect wallet"}
    </button>
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
    <div className={`rounded-lg border p-4 text-sm leading-6 ${tone}`}>
      {message}
      {kind === "error" && (
        <p className="mt-2 text-xs leading-5 text-white/58">
          Inspect the transaction in the Bradbury explorer or run the local inspect script with the tx hash when available.
        </p>
      )}
    </div>
  );
}

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
