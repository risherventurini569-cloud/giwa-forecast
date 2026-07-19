import { ZERO_ADDRESS } from "./utils";

export type ForecastConfig = {
  schemaVersion: string;
  deploymentStatus: "deployed" | "not_deployed" | string;
  updatedAt: string | null;
  network: {
    chainId: number;
    chainName: string;
    rpcUrl: string;
    explorerUrl: string;
  };
  contracts: {
    forecastMarket: `0x${string}`;
    verifiedToken: `0x${string}`;
    verifiedTokenFaucet?: `0x${string}`;
  };
  settlementAsset: {
    name: string;
    symbol: string;
    decimals: number;
    source: string;
    testnetOnly: boolean;
    noRealWorldValue: boolean;
  };
  market: {
    feeBps: number;
    feeRecipient: `0x${string}`;
    resolutionModel: string;
    experimental: boolean;
  };
};

export type ConfigFetchState = "idle" | "waking" | "ready" | "error" | "unconfigured";

export const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:8000").replace(/\/$/, "");

export const fallbackConfig: ForecastConfig = {
  schemaVersion: "1.0",
  deploymentStatus: "not_deployed",
  updatedAt: null,
  network: {
    chainId: 91342,
    chainName: "GIWA Sepolia",
    rpcUrl: "https://sepolia-rpc.giwa.io",
    explorerUrl: "https://sepolia-explorer.giwa.io"
  },
  contracts: {
    forecastMarket: ZERO_ADDRESS,
    verifiedToken: "0xBCdB22f56642DE57624CfC2fBb9eE398cF3CA268",
    verifiedTokenFaucet: "0xfe4b4F5f2f8843dC9Ca75E563f2f7eB0f44Ae83e"
  },
  settlementAsset: {
    name: "VerifiedToken",
    symbol: "VT",
    decimals: 18,
    source: "GIWA Playground",
    testnetOnly: true,
    noRealWorldValue: true
  },
  market: {
    feeBps: 100,
    feeRecipient: ZERO_ADDRESS,
    resolutionModel: "Authorized onchain resolver",
    experimental: true
  }
};

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cancel: () => window.clearTimeout(timer) };
}

export async function fetchPublicConfig(
  onAttempt?: (attempt: number) => void,
  attempts = 7,
  timeoutMs = 7000
): Promise<ForecastConfig> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    onAttempt?.(attempt);
    const { signal, cancel } = timeoutSignal(timeoutMs);
    try {
      const response = await fetch(`${API_BASE}/api/config`, { signal, headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw new Error(`GIWA API returned ${response.status}`);
      }
      const body = await response.json();
      if (!body?.ok || !body?.config) throw new Error("GIWA API returned an invalid configuration payload.");
      return body.config as ForecastConfig;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => window.setTimeout(resolve, Math.min(1200 * attempt, 5000)));
      }
    } finally {
      cancel();
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unable to reach the GIWA API.");
}

export function isDeploymentConfigured(config: ForecastConfig) {
  return config.deploymentStatus === "deployed" && config.contracts.forecastMarket !== ZERO_ADDRESS;
}
