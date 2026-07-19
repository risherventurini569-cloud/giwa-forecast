import { Menu, Network, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAccount } from "wagmi";
import { useAppRuntime } from "./AppRuntime";
import { Logo } from "./Logo";
import { ConnectWallet } from "./Wallet";
import { cn } from "../lib/utils";

const links = [
  ["Markets", "/terminal"],
  ["Portfolio", "/portfolio"],
  ["Activity", "/activity"],
  ["How It Works", "/#how-it-works"]
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state } = useAppRuntime();
  const { chainId, isConnected } = useAccount();
  const networkOk = isConnected && chainId === 91342;

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_10px_30px_rgba(32,45,96,.10)] backdrop-blur-xl sm:px-5">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map(([label, to]) => (
            <NavLink key={label} to={to} className={({ isActive }) => cn("rounded-lg px-3 py-2 text-sm font-semibold transition", isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-ink")}>{label}</NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold", state === "ready" ? "bg-emerald-50 text-emerald-700" : state === "error" ? "bg-no-50 text-no-600" : "bg-amber-50 text-amber-700")}>
            <span className={cn("h-2 w-2 rounded-full", state === "ready" ? "bg-emerald-500" : state === "error" ? "bg-no-500" : "animate-pulse bg-amber-500")} />
            {state === "ready" ? "Testnet" : state === "unconfigured" ? "Deployment Pending" : state === "error" ? "API Offline" : "Connecting"}
          </span>
          {networkOk ? <span className="hidden text-xs font-semibold text-slate-500 xl:inline">GIWA Sepolia</span> : <Network size={16} className="text-slate-400" />}
          <ConnectWallet />
        </div>
        <button onClick={() => setMobileOpen((open) => !open)} className="rounded-lg p-2 text-slate-600 sm:hidden">{mobileOpen ? <X /> : <Menu />}</button>
      </div>
      {mobileOpen ? (
        <div className="mx-auto mt-2 max-w-7xl rounded-2xl border border-slate-200 bg-white p-3 shadow-soft sm:hidden">
          <nav className="grid gap-1">
            {links.map(([label, to]) => <NavLink key={label} to={to} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700">{label}</NavLink>)}
          </nav>
          <div className="mt-3 border-t border-slate-100 pt-3"><ConnectWallet /></div>
        </div>
      ) : null}
    </header>
  );
}
