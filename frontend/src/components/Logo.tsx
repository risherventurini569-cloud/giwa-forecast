import { Hexagon } from "lucide-react";
import { Link } from "react-router-dom";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-ink" aria-label="GIWA Forecast home">
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 text-white shadow-[0_10px_20px_rgba(91,76,245,.28)]">
        <Hexagon size={20} strokeWidth={2.7} />
        <span className="absolute text-[10px] font-black">G</span>
      </span>
      {!compact ? <span className="text-lg font-black tracking-tight">GIWA Forecast</span> : null}
    </Link>
  );
}
