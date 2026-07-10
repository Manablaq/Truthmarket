"use client";

import Link from "next/link";
import { useConnect, useConnection, useDisconnect } from "wagmi";

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
    <div className="min-h-screen bg-[#07080d] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(245,197,66,0.14),transparent_30%),linear-gradient(135deg,#07080d_0%,#12141d_42%,#08090f_100%)]" />
      <Header />
      {children}
    </div>
  );
}

export function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-7xl px-5 py-10 ${className}`}>{children}</section>;
}

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-white/15 bg-white/[0.03] p-8">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-3 max-w-2xl text-sm leading-6 text-white/62">{children}</div>
    </div>
  );
}

export function StatusPill({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs font-medium text-amber-100">
      {value}
    </span>
  );
}
