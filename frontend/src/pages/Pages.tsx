import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  ExternalLink,
  FlaskConical,
  Info,
  LineChart,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  TriangleAlert,
  Users,
  Wallet,
  Waves,
  Zap,
} from "lucide-react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { parseUnits, type Address } from "viem";
import { toast } from "sonner";

import { useAppRuntime } from "../components/AppRuntime";
import { Badge, Button, Card, Input, Label, SectionTitle } from "../components/ui";
import { erc20Abi, forecastMarketAbi } from "../lib/contracts";
import { useMarkets, yesPriceE18, type ForecastMarket } from "../lib/markets";
import {
  cn,
  formatDate,
  formatProbability,
  formatRelativeTime,
  formatToken,
  shortAddress,
} from "../lib/utils";

const GIWA_CHAIN_ID = 91342;
function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  return (error as Error & { shortMessage?: string }).shortMessage || error.message || fallback;
}

function ExplorerLink({
  path,
  children,
  className,
}: {
  path: string;
  children: ReactNode;
  className?: string;
}) {
  const { config } = useAppRuntime();
  return (
    <a
      className={className}
      target="_blank"
      rel="noreferrer"
      href={`${config.network.explorerUrl}${path}`}
    >
      {children}
    </a>
  );
}

function DeploymentNotice({ compact = false }: { compact?: boolean }) {
  const { state, attempt, error, retry, isConfigured } = useAppRuntime();
  if (isConfigured && state === "ready") return null;

  const isWake = state === "waking" || state === "idle";
  const title = isWake
    ? "Waking up GIWA API…"
    : state === "error"
      ? "GIWA API is not reachable yet"
      : "Onchain deployment is pending";

  const detail = isWake
    ? `Automatic retry is enabled${attempt ? ` · attempt ${attempt} of 7` : ""}. Render free services may require a few moments to start.`
    : state === "error"
      ? `${error || "The public API did not respond after its retry window."} This is not treated as a contract failure.`
      : "The API responded normally, but no Forecast Market contract address has been published yet.";

  return (
    <Card
      className={cn(
        "border-indigo-100 bg-gradient-to-br from-white to-indigo-50/70",
        compact ? "p-3" : "p-5",
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={cn(
            "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            isWake
              ? "bg-indigo-100 text-indigo-600"
              : state === "error"
                ? "bg-no-100 text-no-600"
                : "bg-amber-100 text-amber-700",
          )}
        >
          {isWake ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : state === "error" ? (
            <TriangleAlert size={18} />
          ) : (
            <Info size={18} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
          {!compact ? (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Due to server initialization and network conditions, the application may require a
              few moments to load during your first visit.
            </p>
          ) : null}
        </div>

        <Button variant="outline" size="sm" onClick={retry}>
          <RefreshCw size={14} /> Retry Now
        </Button>
      </div>
    </Card>
  );
}

function TestnetDisclosure() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
      <Badge className="border-indigo-100 bg-indigo-50 text-indigo-700">
        <FlaskConical size={12} /> Testnet Demo
      </Badge>
      <Badge>
        <ShieldCheck size={12} /> Experimental Market
      </Badge>
      <Badge>
        <CircleDollarSign size={12} /> No Real-World Value
      </Badge>
    </div>
  );
}

function OutcomePill({
  outcome,
  price,
  active,
  onClick,
}: {
  outcome: "YES" | "NO";
  price: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const yes = outcome === "YES";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition",
        yes
          ? "border-yes-100 bg-yes-50 hover:border-yes-400"
          : "border-no-100 bg-no-50 hover:border-no-400",
        active && (yes ? "ring-2 ring-yes-500" : "ring-2 ring-no-500"),
      )}
    >
      <p className={cn("text-xs font-bold", yes ? "text-yes-600" : "text-no-600")}>
        {outcome}
      </p>
      <p className="mt-1 text-xl font-black text-ink">{price}</p>
    </button>
  );
}

function MarketCard({
  market,
  tokenSymbol = "VT",
  featured = false,
}: {
  market: ForecastMarket;
  tokenSymbol?: string;
  featured?: boolean;
}) {
  const price = yesPriceE18(market);
  const yes = Number(price) / 1e18;
  const no = Math.max(0, 1 - yes);

  return (
    <Card
      className={cn(
        "group overflow-hidden p-4 transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-soft",
        featured && "p-5",
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="bg-indigo-50 text-indigo-700">{market.category || "General"}</Badge>
            {market.resolved ? (
              <Badge className="border-slate-200 bg-slate-100 text-slate-600">
                Resolved {market.resolvedOutcome === 0 ? "YES" : "NO"}
              </Badge>
            ) : (
              <Badge className="border-amber-100 bg-amber-50 text-amber-700">
                <Clock3 size={12} /> {formatRelativeTime(market.closeTime)}
              </Badge>
            )}
          </div>
          <h3 className={cn("font-bold leading-snug text-ink", featured ? "text-2xl" : "text-base")}>
            {market.question}
          </h3>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600">
          <Waves size={19} />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-yes-100 bg-yes-50/80 p-3">
          <p className="text-xs font-bold text-yes-600">YES</p>
          <p className="mt-1 text-2xl font-black text-ink">{(yes * 100).toFixed(0)}¢</p>
          <p className="mt-0.5 text-xs font-semibold text-yes-600">{formatProbability(price)}</p>
        </div>
        <div className="rounded-xl border border-no-100 bg-no-50/80 p-3">
          <p className="text-xs font-bold text-no-600">NO</p>
          <p className="mt-1 text-2xl font-black text-ink">{(no * 100).toFixed(0)}¢</p>
          <p className="mt-0.5 text-xs font-semibold text-no-600">{(no * 100).toFixed(0)}%</p>
        </div>
      </div>

      <div className="my-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-xs">
        <div>
          <p className="text-slate-400">VerifiedToken pool</p>
          <p className="mt-1 font-bold text-ink">
            {formatToken(market.collateralPool)} {tokenSymbol}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Closes</p>
          <p className="mt-1 font-bold text-ink">{formatDate(market.closeTime)}</p>
        </div>
      </div>

      <Link to={`/market/${market.id.toString()}`}>
        <Button className="w-full">
          {market.resolved ? "View Settlement" : "Trade Market"} <ArrowRight size={15} />
        </Button>
      </Link>
    </Card>
  );
}

function HeroPreview() {
  return (
    <Card className="p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={16} className="text-indigo-600" />
        <p className="text-sm font-bold text-ink">Featured Market Preview</p>
      </div>
      <h2 className="text-2xl font-black leading-tight text-ink">
        Will GIWA Forecast complete its public testnet launch this month?
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <OutcomePill outcome="YES" price="62¢" />
        <OutcomePill outcome="NO" price="38¢" />
      </div>
      <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        <p className="font-bold text-ink">Waiting for deployment</p>
        <p className="mt-1">Once the contract is published, the hero becomes a live onchain market.</p>
      </div>
    </Card>
  );
}

function EmptyMarkets() {
  return (
    <Card className="border-dashed p-8 text-center">
      <Rocket className="mx-auto text-indigo-500" size={28} />
      <h3 className="mt-3 font-bold text-ink">No onchain markets available yet</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        Deploy the Forecast Market contract, run the demo seed script, and the terminal will
        automatically render live markets from chain state.
      </p>
      <Link to="/create" className="mt-4 inline-flex">
        <Button variant="outline">
          Open create flow <Plus size={15} />
        </Button>
      </Link>
    </Card>
  );
}

function TerminalLayout({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f7f8ff] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
              GIWA Forecast Terminal
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
          </div>
          {right}
        </div>
        {children}
      </div>
    </main>
  );
}

function LoadingCards() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="h-56 animate-pulse bg-slate-100" />
      ))}
    </>
  );
}

function ApiMiniStatus() {
  const { state, retry } = useAppRuntime();
  const ready = state === "ready";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              ready ? "bg-emerald-500" : "animate-pulse bg-amber-500",
            )}
          />
          <p className="text-sm font-bold text-ink">
            {ready ? "GIWA API ready" : "Waking up GIWA API…"}
          </p>
        </div>
        <button
          type="button"
          onClick={retry}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        A sleeping API does not affect the deployed contract.
      </p>
    </Card>
  );
}

function WalletSummary({ markets }: { markets: ForecastMarket[] }) {
  const { address } = useAccount();
  const { config, isConfigured } = useAppRuntime();
  const balance = useReadContract({
    address: config.contracts.verifiedToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && isConfigured),
      refetchInterval: 12_000,
    },
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="font-bold text-ink">My Wallet</p>
        {address ? (
          <>
            <p className="mt-4 text-2xl font-black text-ink">
              {formatToken(balance.data as bigint | undefined, config.settlementAsset.decimals)}{" "}
              {config.settlementAsset.symbol}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-600">● GIWA Sepolia connected</p>
            <Link to="/portfolio" className="mt-4 inline-flex">
              <Button variant="outline" size="sm">
                View Portfolio
              </Button>
            </Link>
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Connect your wallet to read your real VerifiedToken balance and onchain positions.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <p className="font-bold text-ink">Market snapshots</p>
        <div className="mt-4 space-y-3 text-sm">
          {[
            ["Published markets", String(markets.length)],
            ["Settlement asset", config.settlementAsset.symbol],
            ["Network", "GIWA Sepolia"],
            ["Market fee", `${(config.market.feeBps / 100).toFixed(2)}%`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-slate-500">{label}</span>
              <b className="text-ink">{value}</b>
            </div>
          ))}
        </div>
      </Card>

      <ApiMiniStatus />
    </div>
  );
}

export function LandingPage() {
  const { config, isConfigured } = useAppRuntime();
  const { markets } = useMarkets(config.contracts.forecastMarket, isConfigured);
  const featured = markets[0];

  const featureCards = [
    [
      ShieldCheck,
      "VerifiedToken Settlement",
      "All collateral is GIWA Playground VerifiedToken. Testnet only and no real-world value.",
    ],
    [
      Wallet,
      "Real Wallet Trading",
      "Approve and trade directly from your browser wallet. The backend never signs for you.",
    ],
    [
      BadgeCheck,
      "Transparent Resolution",
      "Every market discloses an authorized resolver wallet and stores its final outcome onchain.",
    ],
    [
      LineChart,
      "Portfolio Tracking",
      "Review open outcome shares, settlement status, and public explorer transactions.",
    ],
  ] as const;

  return (
    <main>
      <section className="bg-gradient-to-b from-indigo-50/60 to-white px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <Badge className="border-indigo-100 bg-white text-indigo-700">GIWA Sepolia Testnet</Badge>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-ink sm:text-6xl">
              Forecast what <span className="text-indigo-600">happens next.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Trade transparent binary outcome shares on GIWA Sepolia using VerifiedToken and
              settle results publicly onchain.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/terminal">
                <Button size="lg">
                  Explore Markets <ArrowRight size={16} />
                </Button>
              </Link>
              <Link to="/status">
                <Button variant="outline" size="lg">
                  Open Terminal
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <TestnetDisclosure />
            </div>
          </div>
          {featured ? (
            <MarketCard market={featured} tokenSymbol={config.settlementAsset.symbol} featured />
          ) : (
            <HeroPreview />
          )}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map(([Icon, title, detail]) => (
              <Card key={title} className="p-5">
                <Icon size={20} className="text-indigo-600" />
                <h3 className="mt-4 font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            eyebrow="Live markets"
            title="Public GIWA Forecast markets"
            description="Only public onchain state is displayed. No fabricated activity or trading metrics are shown."
            action={
              <Link to="/terminal">
                <Button variant="outline">
                  All markets <ArrowRight size={15} />
                </Button>
              </Link>
            }
          />
          {markets.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {markets.slice(0, 3).map((market) => (
                <MarketCard
                  key={market.id.toString()}
                  market={market}
                  tokenSymbol={config.settlementAsset.symbol}
                />
              ))}
            </div>
          ) : (
            <EmptyMarkets />
          )}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-indigo-100 bg-indigo-50/50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            eyebrow="How it works"
            title="Three clear onchain steps"
            description="Every state change requires your own wallet confirmation. The API only provides public configuration."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [
                "01",
                "Prepare your test wallet",
                "Connect a browser wallet, switch to GIWA Sepolia, claim test ETH, then claim VerifiedToken in the GIWA Playground.",
              ],
              [
                "02",
                "Trade an outcome",
                "Approve only the amount you choose, then buy or sell YES / NO outcome shares before market close.",
              ],
              [
                "03",
                "Settle transparently",
                "A disclosed resolver wallet resolves the market onchain. Winning holders independently claim their payout.",
              ],
            ].map(([index, title, text]) => (
              <Card key={index} className="p-6">
                <p className="text-3xl font-black text-indigo-200">{index}</p>
                <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function TerminalPage() {
  const { config, isConfigured } = useAppRuntime();
  const { markets, isLoading } = useMarkets(config.contracts.forecastMarket, isConfigured);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const categories = [
    "All",
    ...Array.from(new Set(markets.map((market) => market.category || "General"))),
  ];

  const visible = markets.filter(
    (market) =>
      (filter === "All" || market.category === filter) &&
      market.question.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <TerminalLayout
      title="Market Board"
      description="Binary outcome markets secured by public GIWA Sepolia contract state."
      right={
        <Link to="/create">
          <Button>
            <Plus size={15} /> Create Market
          </Button>
        </Link>
      }
    >
      <DeploymentNotice compact />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_280px]">
        <div>
          <Card className="p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category}
                    onClick={() => setFilter(category)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-bold transition",
                      filter === category
                        ? "bg-indigo-600 text-white"
                        : "text-slate-500 hover:bg-slate-100",
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full pl-9 lg:w-60"
                  placeholder="Search markets"
                />
              </div>
            </div>
          </Card>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {isLoading ? (
              <LoadingCards />
            ) : visible.length ? (
              visible.map((market) => (
                <MarketCard
                  key={market.id.toString()}
                  market={market}
                  tokenSymbol={config.settlementAsset.symbol}
                />
              ))
            ) : (
              <EmptyMarkets />
            )}
          </div>
        </div>
        <WalletSummary markets={markets} />
      </div>
    </TerminalLayout>
  );
}

export function MarketDetailPage() {
  const params = useParams();
  const marketId = useMemo(() => {
    try {
      const value = BigInt(params.id ?? "0");
      return value > 0n ? value : 0n;
    } catch {
      return 0n;
    }
  }, [params.id]);

  const { config, isConfigured } = useAppRuntime();
  const { markets, isLoading, error, refetch } = useMarkets(
    config.contracts.forecastMarket,
    isConfigured,
  );
  const market = useMemo(
    () => markets.find((item) => item.id === marketId),
    [markets, marketId],
  );

  if (!isConfigured) {
    return (
      <TerminalLayout
        title="Market Detail"
        description="Live market detail becomes available after deployment."
      >
        <DeploymentNotice />
        <div className="mt-5">
          <EmptyMarkets />
        </div>
      </TerminalLayout>
    );
  }

  if (isLoading) {
    return (
      <TerminalLayout title="Loading market" description="Reading the current contract state.">
        <div className="grid gap-4 md:grid-cols-2">
          <LoadingCards />
        </div>
      </TerminalLayout>
    );
  }

  if (!market || error) {
    return (
      <TerminalLayout
        title="Market unavailable"
        description="This market ID may not exist, or the public contract call failed."
      >
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto text-no-500" />
          <p className="mt-3 font-bold text-ink">Unable to load this market</p>
          <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </Card>
      </TerminalLayout>
    );
  }

  return <MarketDetail market={market} />;
}

function MarketDetail({ market }: { market: ForecastMarket }) {
  const { config } = useAppRuntime();
  const price = yesPriceE18(market);
  const yes = Number(price) / 1e18;
  const { address } = useAccount();

  const position = useReadContract({
    address: config.contracts.forecastMarket,
    abi: forecastMarketAbi,
    functionName: "getPosition",
    args: address ? [market.id, address] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 8_000 },
  });

  const rawPosition = position.data as readonly [bigint, bigint, boolean] | undefined;
  const isResolver = address?.toLowerCase() === market.resolver.toLowerCase();

  return (
    <TerminalLayout
      title="Market Detail"
      description="Read the market rule, inspect public resolution authority, and trade with your connected wallet."
      right={
        <ExplorerLink path={`/address/${config.contracts.forecastMarket}`} className="inline-flex">
          <Button variant="outline">
            Contract <ExternalLink size={14} />
          </Button>
        </ExplorerLink>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Card className="p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-indigo-50 text-indigo-700">{market.category || "General"}</Badge>
              {market.resolved ? (
                <Badge className="bg-slate-100 text-slate-600">
                  Resolved {market.resolvedOutcome === 0 ? "YES" : "NO"}
                </Badge>
              ) : (
                <Badge className="border-amber-100 bg-amber-50 text-amber-700">
                  <Clock3 size={12} /> {formatRelativeTime(market.closeTime)}
                </Badge>
              )}
            </div>

            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
              {market.question}
            </h1>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-yes-100 bg-yes-50 p-5">
                <p className="text-sm font-bold text-yes-600">YES probability</p>
                <p className="mt-2 text-5xl font-black text-ink">{(yes * 100).toFixed(0)}¢</p>
                <p className="mt-1 text-sm font-semibold text-yes-600">
                  {formatProbability(price)} implied
                </p>
              </div>
              <div className="rounded-2xl border border-no-100 bg-no-50 p-5">
                <p className="text-sm font-bold text-no-600">NO probability</p>
                <p className="mt-2 text-5xl font-black text-ink">
                  {((1 - yes) * 100).toFixed(0)}¢
                </p>
                <p className="mt-1 text-sm font-semibold text-no-600">
                  {((1 - yes) * 100).toFixed(0)}% implied
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
              {[
                [CalendarClock, "Market close", formatDate(market.closeTime)],
                [
                  CircleDollarSign,
                  "Collateral pool",
                  `${formatToken(market.collateralPool, config.settlementAsset.decimals)} ${config.settlementAsset.symbol}`,
                ],
                [Users, "Resolution authority", shortAddress(market.resolver)],
              ].map(([Icon, label, value]) => {
                const Lucide = Icon as typeof CalendarClock;
                return (
                  <div key={String(label)} className="flex gap-2">
                    <span className="mt-0.5 text-indigo-600">
                      <Lucide size={17} />
                    </span>
                    <div>
                      <p className="text-xs text-slate-400">{String(label)}</p>
                      <p className="mt-1 text-sm font-bold text-ink">{String(value)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink">Resolution rules</h2>
              <Badge>
                <LockKeyhole size={12} /> Onchain
              </Badge>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Authorized resolver
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-sm font-bold text-ink">{shortAddress(market.resolver)}</code>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(market.resolver);
                      toast.success("Resolver address copied");
                    }}
                  >
                    <Copy size={14} className="text-slate-400" />
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  This address alone can call resolveMarket() after the close time.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Settlement asset
                </p>
                <p className="mt-2 text-sm font-bold text-ink">
                  GIWA Playground {config.settlementAsset.name} ({config.settlementAsset.symbol})
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Testnet Demo / Experimental Asset / No Real-World Value.
                </p>
              </div>
            </div>
          </Card>

          {isResolver && !market.resolved ? <ResolverPanel market={market} /> : null}
        </div>

        <div className="space-y-4">
          <TradePanel market={market} />
          <Card className="p-5">
            <p className="font-bold text-ink">Your position</p>
            {address ? (
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">YES shares</span>
                  <b className="text-yes-600">
                    {formatToken(rawPosition?.[0], config.settlementAsset.decimals, 4)}
                  </b>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">NO shares</span>
                  <b className="text-no-600">
                    {formatToken(rawPosition?.[1], config.settlementAsset.decimals, 4)}
                  </b>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Claim status</span>
                  <b className="text-ink">
                    {rawPosition?.[2]
                      ? "Claimed"
                      : market.resolved
                        ? "Available if winning"
                        : "Open"}
                  </b>
                </div>
                {market.resolved && !rawPosition?.[2] ? <ClaimButton market={market} /> : null}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Connect your wallet to read your actual shares from the contract.
              </p>
            )}
          </Card>
        </div>
      </div>
    </TerminalLayout>
  );
}

function TradePanel({ market }: { market: ForecastMarket }) {
  const { config, isConfigured } = useAppRuntime();
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [side, setSide] = useState<0 | 1>(0);
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}`>();

  const tokenDecimals = config.settlementAsset.decimals;
  const parsedAmount = useMemo(() => {
    try {
      return parseUnits(amount || "0", tokenDecimals);
    } catch {
      return 0n;
    }
  }, [amount, tokenDecimals]);

  const allowance = useReadContract({
    address: config.contracts.verifiedToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, config.contracts.forecastMarket] : undefined,
    query: {
      enabled: Boolean(address && isConfigured && mode === "buy"),
      refetchInterval: 7_000,
    },
  });

  const quote = useReadContract({
    address: config.contracts.forecastMarket,
    abi: forecastMarketAbi,
    functionName: mode === "buy" ? "quoteBuy" : "quoteSell",
    args: parsedAmount > 0n ? [market.id, side, parsedAmount] : undefined,
    query: {
      enabled: isConfigured && parsedAmount > 0n,
      refetchInterval: 5_000,
    },
  });

  const quoteData = quote.data as readonly [bigint, bigint, bigint] | undefined;
  const needsApproval =
    mode === "buy" &&
    parsedAmount > 0n &&
    (allowance.data === undefined || (allowance.data as bigint) < parsedAmount);
  const marketClosed =
    market.resolved || Number(market.closeTime) <= Math.floor(Date.now() / 1_000);

  async function submit() {
    if (!address) {
      toast.error("Connect your wallet first");
      return;
    }
    if (chainId !== GIWA_CHAIN_ID) {
      toast.error("Switch to GIWA Sepolia before trading");
      return;
    }
    if (!isConfigured) {
      toast.error("Onchain contract is not configured yet");
      return;
    }
    if (parsedAmount <= 0n) {
      toast.error("Enter a valid amount");
      return;
    }

    setTxHash(undefined);
    setSubmitting(true);

    try {
      if (needsApproval) {
        const hash = await writeContractAsync({
          address: config.contracts.verifiedToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [config.contracts.forecastMarket, parsedAmount],
        });

        setTxHash(hash);
        toast.message("Approval submitted", {
          description: "Confirming allowance on GIWA Sepolia…",
        });

        if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
        await allowance.refetch();

        toast.success("VerifiedToken approved", {
          description: "Click the trade button once more to submit the market transaction.",
        });
        return;
      }

      const hash = await writeContractAsync({
        address: config.contracts.forecastMarket,
        abi: forecastMarketAbi,
        functionName: mode,
        args: [market.id, side, parsedAmount],
      });

      setTxHash(hash);
      toast.message(`${mode === "buy" ? "Trade" : "Sell"} submitted`, {
        description: "Waiting for GIWA confirmation…",
      });

      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([quote.refetch(), allowance.refetch()]);

      toast.success(mode === "buy" ? "Outcome shares added" : "Position reduced", {
        description: "The latest position is now available onchain.",
      });
    } catch (error) {
      toast.error("Transaction was not completed", {
        description: errorMessage(error, "Wallet rejected or transaction reverted."),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const actionText = marketClosed
    ? market.resolved
      ? "Market Resolved"
      : "Market Closed"
    : needsApproval
      ? `Approve ${config.settlementAsset.symbol}`
      : `${mode === "buy" ? "Buy" : "Sell"} ${side === 0 ? "YES" : "NO"}`;

  const yesPrice = Number(yesPriceE18(market)) / 1e16;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center justify-between">
          <p className="font-bold text-ink">Trade Market</p>
          <Badge className="bg-indigo-50 text-indigo-700">
            {config.settlementAsset.symbol} settlement
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("buy")}
            className={cn(
              "rounded-lg py-2 text-sm font-bold",
              mode === "buy" ? "bg-ink text-white" : "bg-slate-100 text-slate-500",
            )}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setMode("sell")}
            className={cn(
              "rounded-lg py-2 text-sm font-bold",
              mode === "sell" ? "bg-ink text-white" : "bg-slate-100 text-slate-500",
            )}
          >
            Sell
          </button>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <Label>Outcome</Label>
          <div className="grid grid-cols-2 gap-2">
            <OutcomePill
              outcome="YES"
              price={`${yesPrice.toFixed(0)}¢`}
              active={side === 0}
              onClick={() => setSide(0)}
            />
            <OutcomePill
              outcome="NO"
              price={`${(100 - yesPrice).toFixed(0)}¢`}
              active={side === 1}
              onClick={() => setSide(1)}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label>
              {mode === "buy" ? `Amount (${config.settlementAsset.symbol})` : "Shares to sell"}
            </Label>
            <span className="text-xs font-semibold text-slate-400">Testnet only</span>
          </div>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {["10", "25", "50", "100"].map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setAmount(value)}
                className="rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-500 hover:border-indigo-200 hover:bg-indigo-50"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              {mode === "buy" ? "Est. shares" : "Est. return"}
            </span>
            <b className={side === 0 ? "text-yes-600" : "text-no-600"}>
              {formatToken(quoteData?.[0], tokenDecimals, 4)}{" "}
              {mode === "buy"
                ? side === 0
                  ? "YES"
                  : "NO"
                : config.settlementAsset.symbol}
            </b>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-slate-400">Protocol fee</span>
            <span className="font-semibold text-slate-600">
              {formatToken(quoteData?.[1], tokenDecimals, 4)} {config.settlementAsset.symbol}
            </span>
          </div>
        </div>

        <Button
          disabled={submitting || marketClosed || !isConfigured}
          variant={mode === "buy" ? (side === 0 ? "yes" : "no") : "secondary"}
          className="w-full"
          onClick={() => void submit()}
        >
          {submitting ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : needsApproval ? (
            <ShieldCheck size={16} />
          ) : (
            <Zap size={16} />
          )}
          {actionText}
        </Button>

        {txHash ? (
          <ExplorerLink
            path={`/tx/${txHash}`}
            className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs font-semibold text-indigo-700"
          >
            Transaction submitted
            <span className="inline-flex items-center gap-1">
              {shortAddress(txHash)} <ExternalLink size={13} />
            </span>
          </ExplorerLink>
        ) : null}

        <p className="text-center text-[11px] leading-5 text-slate-400">
          All wallet signatures are made by you. GIWA Forecast does not store private keys or
          submit transactions on your behalf.
        </p>
      </div>
    </Card>
  );
}

function ResolverPanel({ market }: { market: ForecastMarket }) {
  const { config } = useAppRuntime();
  const { chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [pending, setPending] = useState(false);

  async function resolve(outcome: 0 | 1) {
    if (chainId !== GIWA_CHAIN_ID) {
      toast.error("Switch to GIWA Sepolia first");
      return;
    }

    setPending(true);
    try {
      const hash = await writeContractAsync({
        address: config.contracts.forecastMarket,
        abi: forecastMarketAbi,
        functionName: "resolveMarket",
        args: [market.id, outcome],
      });
      toast.message("Resolution submitted", { description: "Waiting for chain confirmation…" });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success(`Market resolved ${outcome === 0 ? "YES" : "NO"}`);
    } catch (error) {
      toast.error("Resolution was not completed", {
        description: errorMessage(error, "Wallet rejected or the market has not closed."),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50/40 p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-amber-100 p-2 text-amber-700">
          <LockKeyhole size={18} />
        </span>
        <div>
          <p className="font-bold text-ink">Resolver controls</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Your connected wallet matches the public resolver address. Resolution is available
            only after market close.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="yes" disabled={pending} onClick={() => void resolve(0)}>
              Resolve YES
            </Button>
            <Button variant="no" disabled={pending} onClick={() => void resolve(1)}>
              Resolve NO
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ClaimButton({ market }: { market: ForecastMarket }) {
  const { config } = useAppRuntime();
  const { chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [pending, setPending] = useState(false);

  async function claim() {
    if (chainId !== GIWA_CHAIN_ID) {
      toast.error("Switch to GIWA Sepolia first");
      return;
    }

    setPending(true);
    try {
      const hash = await writeContractAsync({
        address: config.contracts.forecastMarket,
        abi: forecastMarketAbi,
        functionName: "claimPayout",
        args: [market.id],
      });
      toast.message("Claim submitted", { description: "Waiting for GIWA confirmation…" });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success("Payout claimed");
    } catch (error) {
      toast.error("Claim could not be completed", {
        description: errorMessage(error, "You may not hold winning shares."),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button className="mt-3 w-full" onClick={() => void claim()} disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" size={15} /> : <TicketCheck size={15} />}
      Claim payout
    </Button>
  );
}

export function PortfolioPage() {
  const { address } = useAccount();
  const { config, isConfigured } = useAppRuntime();
  const { markets, isLoading } = useMarkets(config.contracts.forecastMarket, isConfigured);

  type PositionTuple = readonly [bigint, bigint, boolean];
  type PositionReadResult =
    | { status: "success"; result: PositionTuple }
    | { status: "failure"; result?: undefined; error?: unknown };

  const positionReads = useReadContracts({
    contracts: (address
      ? markets.map((market: ForecastMarket) => ({
          address: config.contracts.forecastMarket,
          abi: forecastMarketAbi,
          functionName: "getPosition",
          args: [market.id, address],
        }))
      : []) as never,
    query: {
      enabled: Boolean(address && markets.length),
      refetchInterval: 9_000,
    },
  }) as unknown as { data?: readonly PositionReadResult[] };

  const positions = useMemo<
    Array<{ market: ForecastMarket; raw: PositionTuple }>
  >(() => {
    return markets.flatMap((market: ForecastMarket, index: number) => {
      const read = positionReads.data?.[index];

      if (!read || read.status !== "success") {
        return [];
      }

      const raw: PositionTuple = read.result;

      if (raw[0] === 0n && raw[1] === 0n) {
        return [];
      }

      return [{ market, raw }];
    });
  }, [markets, positionReads.data]);

  return (
    <TerminalLayout
      title="Portfolio"
      description="Your position list is read from the GIWA Forecast contract and remains under your wallet control."
    >
      <DeploymentNotice compact />
      <div className="mt-6">
        {!address ? (
          <Card className="p-8 text-center">
            <Wallet className="mx-auto text-indigo-500" />
            <h3 className="mt-3 font-bold text-ink">Connect your wallet to view positions</h3>
            <p className="mt-2 text-sm text-slate-500">No server-side account or portfolio is created.</p>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <LoadingCards />
          </div>
        ) : positions.length ? (
          <div className="grid gap-4">
            {positions.map(({ market, raw }) => (
              <Card key={market.id.toString()} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 flex gap-2">
                      <Badge className="bg-indigo-50 text-indigo-700">{market.category}</Badge>
                      {market.resolved ? (
                        <Badge>Resolved</Badge>
                      ) : (
                        <Badge className="border-amber-100 bg-amber-50 text-amber-700">
                          {formatRelativeTime(market.closeTime)}
                        </Badge>
                      )}
                    </div>
                    <Link
                      to={`/market/${market.id.toString()}`}
                      className="font-bold text-ink hover:text-indigo-600"
                    >
                      {market.question}
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-5 text-sm">
                    <div>
                      <p className="text-slate-400">YES shares</p>
                      <p className="mt-1 font-bold text-yes-600">
                        {formatToken(raw?.[0], config.settlementAsset.decimals, 4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">NO shares</p>
                      <p className="mt-1 font-bold text-no-600">
                        {formatToken(raw?.[1], config.settlementAsset.decimals, 4)}
                      </p>
                    </div>
                  </div>
                  <Link to={`/market/${market.id.toString()}`}>
                    <Button variant="outline">
                      Manage <ArrowRight size={14} />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyMarkets />
        )}
      </div>
    </TerminalLayout>
  );
}

export function ActivityPage() {
  const { config, isConfigured } = useAppRuntime();
  const { markets } = useMarkets(config.contracts.forecastMarket, isConfigured);

  return (
    <TerminalLayout
      title="Activity & Settlement"
      description="A transparent market index. For exact transaction history, open the public GIWA Sepolia explorer."
    >
      <DeploymentNotice compact />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_310px]">
        <div className="space-y-3">
          {markets.length ? (
            markets.map((market) => (
              <Card key={market.id.toString()} className="p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "rounded-xl p-2.5",
                      market.resolved
                        ? "bg-slate-100 text-slate-600"
                        : "bg-indigo-50 text-indigo-600",
                    )}
                  >
                    <Activity size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ink">
                        {market.resolved
                          ? `Market resolved ${market.resolvedOutcome === 0 ? "YES" : "NO"}`
                          : "Market open"}
                      </p>
                      <Badge className="bg-indigo-50 text-indigo-700">
                        #{market.id.toString()}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">{market.question}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span>
                        Pool:{" "}
                        <b className="text-ink">
                          {formatToken(market.collateralPool, config.settlementAsset.decimals)}{" "}
                          {config.settlementAsset.symbol}
                        </b>
                      </span>
                      <span>
                        Resolver: <b className="text-ink">{shortAddress(market.resolver)}</b>
                      </span>
                      <span>
                        {market.resolved
                          ? "Settlement claim enabled"
                          : `Closes ${formatRelativeTime(market.closeTime)}`}
                      </span>
                    </div>
                  </div>
                  <Link to={`/market/${market.id.toString()}`} className="text-indigo-600">
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </Card>
            ))
          ) : (
            <EmptyMarkets />
          )}
        </div>

        <Card className="h-fit p-5">
          <p className="font-bold text-ink">Explorer-first transparency</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            This MVP does not fabricate an offchain activity feed. Contract calls, trades,
            resolutions, and claims are independently verifiable on the GIWA Sepolia explorer.
          </p>
          <ExplorerLink
            path={`/address/${config.contracts.forecastMarket}`}
            className="mt-4 inline-flex"
          >
            <Button variant="outline">
              Open contract explorer <ExternalLink size={14} />
            </Button>
          </ExplorerLink>
        </Card>
      </div>
    </TerminalLayout>
  );
}

export function CreateMarketPage() {
  const { config, isConfigured } = useAppRuntime();
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("GIWA");
  const [closeTime, setCloseTime] = useState("");
  const [resolver, setResolver] = useState("");
  const [seed, setSeed] = useState("100");
  const [submitting, setSubmitting] = useState(false);

  const seedRaw = useMemo(() => {
    try {
      return parseUnits(seed || "0", config.settlementAsset.decimals);
    } catch {
      return 0n;
    }
  }, [seed, config.settlementAsset.decimals]);

  const allowance = useReadContract({
    address: config.contracts.verifiedToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, config.contracts.forecastMarket] : undefined,
    query: { enabled: Boolean(address && isConfigured), refetchInterval: 7_000 },
  });

  const needsApproval =
    seedRaw > 0n &&
    (allowance.data === undefined || (allowance.data as bigint) < seedRaw);

  async function submit() {
    if (!address) {
      toast.error("Connect your wallet first");
      return;
    }
    if (chainId !== GIWA_CHAIN_ID) {
      toast.error("Switch to GIWA Sepolia first");
      return;
    }
    if (!isConfigured) {
      toast.error("Deploy and publish the contract first");
      return;
    }
    if (!question.trim() || seedRaw <= 0n || !resolver || !closeTime) {
      toast.error("Complete all market fields");
      return;
    }

    const unix = Math.floor(new Date(closeTime).getTime() / 1_000);
    if (!Number.isFinite(unix) || unix <= Math.floor(Date.now() / 1_000)) {
      toast.error("Close time must be in the future");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(resolver)) {
      toast.error("Resolver must be a valid EVM address");
      return;
    }

    setSubmitting(true);
    try {
      if (needsApproval) {
        const hash = await writeContractAsync({
          address: config.contracts.verifiedToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [config.contracts.forecastMarket, seedRaw],
        });
        toast.message("Seed approval submitted", { description: "Confirming allowance…" });
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
        await allowance.refetch();
        toast.success("Seed liquidity approved", {
          description: "Click Publish Market once more.",
        });
        return;
      }

      const hash = await writeContractAsync({
        address: config.contracts.forecastMarket,
        abi: forecastMarketAbi,
        functionName: "createMarket",
        args: [
          question.trim(),
          category.trim() || "General",
          BigInt(unix),
          resolver as Address,
          seedRaw,
        ],
      });
      toast.message("Market creation submitted", {
        description: "Waiting for GIWA confirmation…",
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success("Market published onchain");
      setQuestion("");
      setSeed("100");
    } catch (error) {
      toast.error("Market was not published", {
        description: errorMessage(error, "Wallet rejected or contract reverted."),
      });
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (address && !resolver) setResolver(address);
  }, [address, resolver]);

  return (
    <TerminalLayout
      title="Create Testnet Market"
      description="Publish a binary, testnet-only market. You seed liquidity and disclose a resolver wallet that can settle the result after close time."
    >
      <DeploymentNotice compact />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="p-6">
          <div className="grid gap-5">
            <div>
              <Label>Binary market question</Label>
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Will GIWA Forecast complete a documented milestone before…?"
                maxLength={240}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Write an unambiguous question with a public resolution source.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="GIWA, Crypto, Web3…"
                />
              </div>
              <div>
                <Label>Close time (local)</Label>
                <Input
                  type="datetime-local"
                  value={closeTime}
                  onChange={(event) => setCloseTime(event.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Authorized resolver wallet</Label>
              <Input
                value={resolver}
                onChange={(event) => setResolver(event.target.value)}
                placeholder="0x…"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                This public address may call resolveMarket() only after close time.
              </p>
            </div>

            <div>
              <Label>Initial liquidity ({config.settlementAsset.symbol})</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Seed liquidity initializes the reserves and is a testnet-only commitment.
              </p>
            </div>

            <Button onClick={() => void submit()} disabled={submitting || !isConfigured}>
              {submitting ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : needsApproval ? (
                <ShieldCheck size={16} />
              ) : (
                <Rocket size={16} />
              )}
              {needsApproval ? `Approve ${config.settlementAsset.symbol}` : "Publish Market Onchain"}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="font-bold text-ink">Creation checklist</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {[
                "Use GIWA Sepolia and Testnet VerifiedToken only.",
                "Make the settlement question objectively resolvable.",
                "Publish a public resolver wallet.",
                "Do not present testnet positions as investments or real assets.",
              ].map((item) => (
                <div key={item} className="flex gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="font-bold text-ink">Public config</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              The backend exposes public chain and contract addresses only. It never has access to
              the resolver or creator private key.
            </p>
          </Card>
        </div>
      </div>
    </TerminalLayout>
  );
}

export function StatusPage() {
  const { config, state, attempt, error, retry, isConfigured } = useAppRuntime();
  const rows = [
    [
      "Backend reachability",
      state === "ready" || state === "unconfigured"
        ? "Connected"
        : state === "waking"
          ? `Waking · ${attempt}/7`
          : "Unavailable",
    ],
    ["Onchain configuration", isConfigured ? "Published" : "Not deployed"],
    ["Network", `${config.network.chainName} · ${config.network.chainId}`],
    ["Settlement asset", `${config.settlementAsset.name} (${config.settlementAsset.symbol})`],
    ["Private key handling", "Not stored by backend"],
  ];

  return (
    <TerminalLayout
      title="System Status"
      description="A clear distinction between backend cold starts, published configuration, and actual onchain deployment."
    >
      <DeploymentNotice />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-lg font-black text-ink">{value}</p>
          </Card>
        ))}
      </div>
      {error ? (
        <Card className="mt-4 border-no-100 bg-no-50/40 p-5">
          <p className="font-bold text-no-600">Last API error</p>
          <p className="mt-1 text-sm text-slate-600">{error}</p>
          <Button className="mt-4" variant="outline" onClick={retry}>
            <RefreshCw size={14} /> Retry Now
          </Button>
        </Card>
      ) : null}
    </TerminalLayout>
  );
}
