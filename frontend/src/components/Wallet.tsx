import { useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, LoaderCircle, LogOut, Wallet, WifiOff } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { toast } from "sonner";
import { giwaSepolia } from "../lib/wagmi";
import { shortAddress, cn } from "../lib/utils";
import { Button, Card } from "./ui";

export function ConnectWallet() {
  const [open, setOpen] = useState(false);
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== giwaSepolia.id;

  async function connect(connector: (typeof connectors)[number]) {
    try {
      await connectAsync({ connector });
      setOpen(false);
      toast.success("Wallet connected", { description: "Use GIWA Sepolia for all onchain actions." });
    } catch (error) {
      toast.error("Wallet connection failed", { description: error instanceof Error ? error.message : "Please unlock your wallet and retry." });
    }
  }

  async function switchToGiwa() {
    try {
      await switchChainAsync({ chainId: giwaSepolia.id });
      toast.success("Switched to GIWA Sepolia");
    } catch (error) {
      toast.error("Network switch was not completed", { description: error instanceof Error ? error.message : "Add GIWA Sepolia in your wallet and retry." });
    }
  }

  if (!isConnected) {
    return (
      <div className="relative">
        <Button onClick={() => setOpen((value) => !value)}><Wallet size={16} /> Connect Wallet</Button>
        {open ? (
          <Card className="absolute right-0 z-50 mt-2 w-80 p-3 shadow-soft">
            <div className="mb-3 px-2 pt-1">
              <p className="text-sm font-bold text-ink">Connect a wallet</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">MetaMask and OKX Wallet appear here as browser-injected wallets.</p>
            </div>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => void connect(connector)}
                  disabled={isPending}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink"><Wallet size={16} className="text-indigo-600" /> {connector.name}</span>
                  {isPending ? <LoaderCircle size={15} className="animate-spin text-indigo-600" /> : <ChevronDown size={15} className="-rotate-90 text-slate-400" />}
                </button>
              ))}
              {connectors.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No injected wallet found. Install MetaMask or OKX Wallet and refresh.</p> : null}
            </div>
          </Card>
        ) : null}
      </div>
    );
  }

  if (wrongNetwork) {
    return <Button onClick={() => void switchToGiwa()} disabled={switching} variant="secondary">{switching ? <LoaderCircle size={15} className="animate-spin" /> : <WifiOff size={15} />} Switch to GIWA</Button>;
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> {shortAddress(address)} <ChevronDown size={15} />
      </button>
      {open ? (
        <Card className="absolute right-0 z-50 mt-2 w-72 p-3 shadow-soft">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Connected wallet</p>
            <p className="mt-1 font-mono text-sm font-bold text-ink">{shortAddress(address)}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700"><Check size={13} /> GIWA Sepolia</p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => { navigator.clipboard.writeText(address || ""); toast.success("Address copied"); }} className="inline-flex items-center justify-center gap-1 rounded-lg p-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"><Copy size={13} /> Copy</button>
            <a href={`${giwaSepolia.blockExplorers.default.url}/address/${address}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-lg p-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"><ExternalLink size={13} /> Explorer</a>
          </div>
          <button onClick={() => { disconnect(); setOpen(false); }} className={cn("mt-2 flex w-full items-center justify-center gap-1 rounded-lg p-2 text-xs font-semibold text-no-600 hover:bg-no-50")}><LogOut size={13} /> Disconnect</button>
        </Card>
      ) : null}
    </div>
  );
}
