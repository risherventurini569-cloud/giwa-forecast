import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatUnits } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddress(address?: string) {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatToken(value?: bigint, decimals = 18, digits = 2) {
  if (value === undefined) return "—";
  const numeric = Number(formatUnits(value, decimals));
  if (!Number.isFinite(numeric)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(numeric);
}

export function formatProbability(price?: bigint) {
  if (price === undefined) return "—";
  return `${(Number(price) / 1e16).toFixed(0)}%`;
}

export function formatRelativeTime(timestamp: bigint | number) {
  const target = Number(timestamp) * 1000;
  const delta = target - Date.now();
  const abs = Math.abs(delta);
  const units: Array<[string, number]> = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000]
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) {
      const value = Math.max(1, Math.round(abs / ms));
      return delta >= 0 ? `${value} ${unit}${value === 1 ? "" : "s"} left` : `${value} ${unit}${value === 1 ? "" : "s"} ago`;
    }
  }
  return delta >= 0 ? "closing soon" : "closed";
}

export function formatDate(timestamp: bigint | number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(Number(timestamp) * 1000));
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
