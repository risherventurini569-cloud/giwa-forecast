import { network } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseUnits, type Address } from "viem";

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function validAddress(
  value: string | undefined,
): value is `0x${string}` {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

async function main() {
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  if (!deployer) {
    throw new Error(
      "No deployer configured. Add PRIVATE_KEY to the repository-root .env file.",
    );
  }

  const feeRecipient =
    process.env.FEE_RECIPIENT || deployer.account.address;
  const resolver =
    process.env.RESOLVER_ADDRESS || deployer.account.address;
  const feeBps = Number(process.env.FEE_BPS || "100");
  const seedText = process.env.DEMO_SEED_LIQUIDITY || "10";

  if (!validAddress(feeRecipient)) {
    throw new Error("FEE_RECIPIENT is not a valid address.");
  }

  if (!validAddress(resolver)) {
    throw new Error("RESOLVER_ADDRESS is not a valid address.");
  }

  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 500) {
    throw new Error("FEE_BPS must be an integer between 0 and 500.");
  }

  const seed = parseUnits(seedText, 18);
  const totalSeed = seed * 3n;

  console.log(`Deploying from: ${deployer.account.address}`);
  console.log("Deploying unrestricted GIWA Forecast Test Token...");

  const token = await viem.deployContract("GiwaForecastTestToken");
  const tokenAddress = token.address as Address;

  console.log(`GFT deployed: ${tokenAddress}`);
  console.log("Deploying GIWA Forecast Market with GFT collateral...");

  const market = await viem.deployContract("GiwaForecastMarket", [
    tokenAddress,
    feeRecipient,
    feeBps,
  ]);
  const marketAddress = market.address as Address;

  console.log(`Market deployed: ${marketAddress}`);

  console.log(`Approving ${seedText} GFT × 3 for initial liquidity...`);
  const approveHash = await deployer.writeContract({
    account: deployer.account,
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [marketAddress, totalSeed],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log(`Approval confirmed: ${approveHash}`);

  const marketContract = await viem.getContractAt(
    "GiwaForecastMarket",
    marketAddress,
  );

  const now = Math.floor(Date.now() / 1000);
  const demoMarkets = [
    {
      question:
        "Will GIWA Forecast publish its next documented testnet milestone within 14 days?",
      category: "GIWA",
      closeTime: now + 60 * 60 * 24 * 14,
    },
    {
      question:
        "Will the GIWA Sepolia ecosystem record a documented developer milestone within 21 days?",
      category: "Web3",
      closeTime: now + 60 * 60 * 24 * 21,
    },
    {
      question:
        "Will GIWA Forecast complete its next public product update within 30 days?",
      category: "Product",
      closeTime: now + 60 * 60 * 24 * 30,
    },
  ];

  for (const item of demoMarkets) {
    console.log(`Creating market: ${item.question}`);

    const hash = await marketContract.write.createMarket([
      item.question,
      item.category,
      BigInt(item.closeTime),
      resolver,
      seed,
    ]);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Market confirmed: ${receipt.transactionHash}`);
  }

  const deployment = {
    schemaVersion: "1.0",
    deploymentStatus: "deployed",
    updatedAt: new Date().toISOString(),
    network: {
      chainId: 91342,
      chainName: "GIWA Sepolia",
      rpcUrl: "https://sepolia-rpc.giwa.io",
      explorerUrl: "https://sepolia-explorer.giwa.io",
    },
    contracts: {
      forecastMarket: marketAddress,
      verifiedToken: tokenAddress,
      verifiedTokenFaucet: tokenAddress,
    },
    settlementAsset: {
      name: "GIWA Forecast Test Token",
      symbol: "GFT",
      decimals: 18,
      source: "GIWA Forecast test faucet: claim()",
      testnetOnly: true,
      noRealWorldValue: true,
    },
    market: {
      feeBps,
      feeRecipient,
      resolutionModel: "Authorized onchain resolver",
      experimental: true,
    },
    testToken: {
      address: tokenAddress,
      faucetFunction: "claim()",
      faucetAmount: "1000",
      faucetCooldownHours: 24,
      initialSupply: "1000000",
    },
    demoMarketsSeededAt: new Date().toISOString(),
    demoMarketSeedLiquidity: seedText,
  };

  const deploymentPath = join(
    process.cwd(),
    "deployments",
    "giwa-sepolia.json",
  );
  mkdirSync(dirname(deploymentPath), { recursive: true });

  const serialized = `${JSON.stringify(deployment, null, 2)}\n`;
  writeFileSync(deploymentPath, serialized);

  const backendConfigPath = join(
    process.cwd(),
    "..",
    "backend",
    "market-config.json",
  );
  mkdirSync(dirname(backendConfigPath), { recursive: true });
  writeFileSync(backendConfigPath, serialized);

  console.log("");
  console.log("Deployment completed.");
  console.log(`GFT token: ${tokenAddress}`);
  console.log(`Forecast market: ${marketAddress}`);
  console.log(`Updated: ${deploymentPath}`);
  console.log(`Updated: ${backendConfigPath}`);
  console.log("");
  console.log("Users can call claim() on the GFT contract once per 24 hours.");
  console.log("Restart the backend and frontend after deployment.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
