import { network } from "hardhat";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseUnits, type Address } from "viem";

const deploymentPath = join(process.cwd(), "deployments", "giwa-sepolia.json");

const erc20Abi = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

async function main() {
  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));

  const { viem } = await network.connect();
  const [walletClient] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  if (!walletClient) {
    throw new Error("No deployer wallet is configured.");
  }

  const marketAddress = deployment.contracts.forecastMarket as Address;
  const tokenAddress = deployment.contracts.verifiedToken as Address;
  const deployerAddress = walletClient.account.address;

  const decimals = Number(
    await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "decimals"
    })
  );

  const seedText = process.env.DEMO_SEED_LIQUIDITY || "10";
  const seed = parseUnits(seedText, decimals);
  const totalRequired = seed * 3n;

  const resolver = (
    process.env.RESOLVER_ADDRESS || deployerAddress
  ) as Address;

  const verifiedTokenBalance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [deployerAddress]
  });

  console.log(`Deployer: ${deployerAddress}`);
  console.log(`VerifiedToken balance: ${verifiedTokenBalance.toString()}`);
  console.log(`Required for 3 demo markets: ${totalRequired.toString()}`);

  if (verifiedTokenBalance < totalRequired) {
    throw new Error(
      `Insufficient VerifiedToken balance. Claim more VerifiedToken first, then run this command again.`
    );
  }

  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [deployerAddress, marketAddress]
  });

  if (allowance < totalRequired) {
    console.log("Approving VerifiedToken for demo market seeding...");

    const approveHash = await walletClient.writeContract({
      account: walletClient.account,
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [marketAddress, totalRequired]
    });

    console.log(`Approve submitted: ${approveHash}`);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log("Approve confirmed.");
  }

  const market = await viem.getContractAt(
    "GiwaForecastMarket",
    marketAddress
  );

  const now = Math.floor(Date.now() / 1000);

  const markets = [
    {
      question:
        "Will GIWA Forecast complete its public testnet launch before July 31, 2026?",
      category: "GIWA",
      closeTime: now + 60 * 60 * 24 * 14
    },
    {
      question:
        "Will ETH reference price close above $3,000 at the documented settlement time?",
      category: "Crypto",
      closeTime: now + 60 * 60 * 24 * 21
    },
    {
      question:
        "Will the GIWA Sepolia Playground complete a documented ecosystem milestone before August 15, 2026?",
      category: "Web3",
      closeTime: now + 60 * 60 * 24 * 30
    }
  ];

  for (const item of markets) {
    console.log(`Creating market: ${item.question}`);

    const hash = await market.write.createMarket([
      item.question,
      item.category,
      BigInt(item.closeTime),
      resolver,
      seed
    ]);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log(`Confirmed: ${receipt.transactionHash}`);
  }

  deployment.demoMarketsSeededAt = new Date().toISOString();
  deployment.demoMarketSeedLiquidity = seedText;

  const serialized = `${JSON.stringify(deployment, null, 2)}\n`;

  writeFileSync(deploymentPath, serialized);
  writeFileSync(
    join(process.cwd(), "..", "backend", "market-config.json"),
    serialized
  );

  console.log("Demo markets seeded successfully.");
  console.log("Backend public config synced.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});