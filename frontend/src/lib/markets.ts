import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import type { Address } from "viem";
import { forecastMarketAbi } from "./contracts";
import { ZERO_ADDRESS } from "./utils";

export type ForecastMarket = {
  id: bigint;
  question: string;
  category: string;
  closeTime: bigint;
  resolver: Address;
  creator: Address;
  yesReserve: bigint;
  noReserve: bigint;
  collateralPool: bigint;
  yesUserShares: bigint;
  noUserShares: bigint;
  winningUserShares: bigint;
  resolved: boolean;
  resolvedOutcome: number;
  residualClaimed: boolean;
};

const emptyMarketAddress = ZERO_ADDRESS as Address;
const E18 = 10n ** 18n;

/**
 * viem returns Solidity structs as either tuple arrays or named objects,
 * depending on the provider/transport. This parser supports both forms and
 * normalizes every numeric field to bigint before the UI performs arithmetic.
 */
function tupleValue(raw: unknown, index: number, key: string): unknown {
  if (Array.isArray(raw)) return raw[index];
  if (raw && typeof raw === "object") return (raw as Record<string, unknown>)[key];
  return undefined;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return 0n;
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toAddress(value: unknown): Address {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)
    ? (value as Address)
    : (ZERO_ADDRESS as Address);
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
}

export function normalizeMarket(id: bigint, raw: unknown): ForecastMarket | undefined {
  if (!raw) return undefined;

  const question = toStringValue(tupleValue(raw, 0, "question"));
  if (!question) return undefined;

  return {
    id,
    question,
    category: toStringValue(tupleValue(raw, 1, "category"), "General"),
    closeTime: toBigInt(tupleValue(raw, 2, "closeTime")),
    resolver: toAddress(tupleValue(raw, 3, "resolver")),
    creator: toAddress(tupleValue(raw, 4, "creator")),
    yesReserve: toBigInt(tupleValue(raw, 5, "yesReserve")),
    noReserve: toBigInt(tupleValue(raw, 6, "noReserve")),
    collateralPool: toBigInt(tupleValue(raw, 7, "collateralPool")),
    yesUserShares: toBigInt(tupleValue(raw, 8, "yesUserShares")),
    noUserShares: toBigInt(tupleValue(raw, 9, "noUserShares")),
    winningUserShares: toBigInt(tupleValue(raw, 10, "winningUserShares")),
    resolved: toBoolean(tupleValue(raw, 11, "resolved")),
    resolvedOutcome: toNumber(tupleValue(raw, 12, "resolvedOutcome")),
    residualClaimed: toBoolean(tupleValue(raw, 13, "residualClaimed"))
  };
}

export function useMarketCount(address?: Address, enabled = true) {
  return useReadContract({
    address: address || emptyMarketAddress,
    abi: forecastMarketAbi,
    functionName: "marketCount",
    query: {
      enabled: Boolean(address && address !== ZERO_ADDRESS && enabled),
      refetchInterval: 12_000
    }
  });
}

export function useMarkets(address?: Address, enabled = true) {
  const countQuery = useMarketCount(address, enabled);
  const count = Number(countQuery.data || 0n);

  const ids = useMemo(
    () => Array.from({ length: Math.min(count, 36) }, (_, index) => BigInt(index + 1)),
    [count]
  );

  const reads = useReadContracts({
    contracts: ids.map((id) => ({
      address: address || emptyMarketAddress,
      abi: forecastMarketAbi,
      functionName: "getMarket",
      args: [id]
    })) as never,
    query: {
      enabled: Boolean(address && address !== ZERO_ADDRESS && ids.length > 0 && enabled),
      refetchInterval: 12_000
    }
  });

  const markets = useMemo(() => {
    if (!reads.data) return [];

    return reads.data
      .map((item, index) => {
        if (item.status !== "success") return undefined;
        return normalizeMarket(ids[index], item.result);
      })
      .filter((item): item is ForecastMarket => Boolean(item))
      .reverse();
  }, [ids, reads.data]);

  return {
    markets,
    count,
    isLoading: countQuery.isLoading || reads.isLoading,
    error: countQuery.error || reads.error,
    refetch: reads.refetch
  };
}

export function yesPriceE18(market: ForecastMarket): bigint {
  // Defensive normalization prevents runtime errors if a provider serializes
  // a uint field unexpectedly. All math in this function is bigint-only.
  const yesReserve = toBigInt(market.yesReserve);
  const noReserve = toBigInt(market.noReserve);
  const total = yesReserve + noReserve;

  if (total === 0n) return 0n;
  return (noReserve * E18) / total;
}
