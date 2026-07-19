import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchPublicConfig, fallbackConfig, isDeploymentConfigured, type ConfigFetchState, type ForecastConfig } from "../lib/config";

type RuntimeValue = {
  config: ForecastConfig;
  state: ConfigFetchState;
  attempt: number;
  error?: string;
  retry: () => void;
  isConfigured: boolean;
};

const RuntimeContext = createContext<RuntimeValue | undefined>(undefined);

export function AppRuntimeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ForecastConfig>(fallbackConfig);
  const [state, setState] = useState<ConfigFetchState>("idle");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string>();
  const [nonce, setNonce] = useState(0);

  const retry = useCallback(() => setNonce((current) => current + 1), []);

  useEffect(() => {
    let alive = true;
    setState("waking");
    setError(undefined);
    fetchPublicConfig((nextAttempt) => alive && setAttempt(nextAttempt))
      .then((nextConfig) => {
        if (!alive) return;
        setConfig(nextConfig);
        setState(isDeploymentConfigured(nextConfig) ? "ready" : "unconfigured");
      })
      .catch((reason: Error) => {
        if (!alive) return;
        setState("error");
        setError(reason.message || "Unable to reach the GIWA API.");
      });
    return () => {
      alive = false;
    };
  }, [nonce]);

  const value = useMemo(
    () => ({ config, state, attempt, error, retry, isConfigured: isDeploymentConfigured(config) }),
    [config, state, attempt, error, retry]
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useAppRuntime() {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("useAppRuntime must be used inside AppRuntimeProvider.");
  return runtime;
}
