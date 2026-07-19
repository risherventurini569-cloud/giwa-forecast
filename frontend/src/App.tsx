import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Github, Heart, ShieldCheck } from "lucide-react";
import { AppRuntimeProvider } from "./components/AppRuntime";
import { Header } from "./components/Header";
import { ActivityPage, CreateMarketPage, LandingPage, MarketDetailPage, PortfolioPage, StatusPage, TerminalPage } from "./pages/Pages";

function Footer() {
  return <footer className="border-t border-slate-200/80 bg-white/70 px-4 py-8 sm:px-6"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center"><div className="flex flex-wrap gap-x-5 gap-y-2"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Built for GIWA Sepolia Testnet</span><span>Experimental · No real funds at risk</span><span>Public configuration only</span></div><div className="flex items-center gap-2"><a href="https://github.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-indigo-600"><Github size={14} /> Open source</a><span className="text-slate-300">·</span><span className="inline-flex items-center gap-1">Built with <Heart size={13} className="text-no-500" /> for GIWA</span></div></div></footer>;
}

export function App() {
  return <AppRuntimeProvider><BrowserRouter><div className="min-h-screen bg-[#f7f8ff]"><Header /><Routes><Route path="/" element={<LandingPage />} /><Route path="/terminal" element={<TerminalPage />} /><Route path="/market/:id" element={<MarketDetailPage />} /><Route path="/portfolio" element={<PortfolioPage />} /><Route path="/activity" element={<ActivityPage />} /><Route path="/create" element={<CreateMarketPage />} /><Route path="/status" element={<StatusPage />} /><Route path="*" element={<LandingPage />} /></Routes><Footer /></div></BrowserRouter></AppRuntimeProvider>;
}
