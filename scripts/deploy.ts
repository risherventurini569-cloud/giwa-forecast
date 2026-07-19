import { network } from "hardhat";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const VERIFIED_TOKEN_DEFAULT = "0xBCdB22f56642DE57624CfC2fBb9eE398cF3CA268";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function validAddress(value: string | undefined): value is `0x${string}` {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

async function main() {
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();

  if (!deployer) {
    throw new Error("No deployer configured. Add PRIVATE_KEY to contracts/.env before deployment.");
  }

  const verifiedToken = process.env.VERIFIED_TOKEN_ADDRESS || VERIFIED_TOKEN_DEFAULT;
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.account.address;
  const feeBps = Number(process.env.FEE_BPS || "100");

  if (!validAddress(verifiedToken)) throw new Error("VERIFIED_TOKEN_ADDRESS is not a valid address.");
  if (!validAddress(feeRecipient)) throw new Error("FEE_RECIPIENT is not a valid address.");
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 500) {
    throw new Error("FEE_BPS must be an integer between 0 and 500.");
  }

  console.log(`Deploying from ${deployer.account.address}`);
  console.log(`Settlement token: ${verifiedToken}`);
  console.log(`Fee recipient: ${feeRecipient}`);
  console.log(`Fee: ${feeBps} bps`);

  const market = await viem.deployContract("GiwaForecastMarket", [verifiedToken, feeRecipient, feeBps]);
  const address = market.address;
  console.log(`GIWA Forecast Market deployed: ${address}`);

  const deployment = {
    schemaVersion: "1.0",
    deploymentStatus: "deployed",
    updatedAt: new Date().toISOString(),
    network: {
      chainId: 91342,
      chainName: "GIWA Sepolia",
      rpcUrl: "https://sepolia-rpc.giwa.io",
      explorerUrl: "https://sepolia-explorer.giwa.io"
    },
    contracts: {
      forecastMarket: address,
      verifiedToken,
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
      feeBps,
      feeRecipient,
      resolutionModel: "Authorized onchain resolver",
      experimental: true
    }
  };

  const contractsDeploymentPath = join(process.cwd(), "deployments", "giwa-sepolia.json");
  mkdirSync(dirname(contractsDeploymentPath), { recursive: true });
  writeFileSync(contractsDeploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);

  const backendConfigPath = join(process.cwd(), "..", "backend", "market-config.json");
  writeFileSync(backendConfigPath, `${JSON.stringify(deployment, null, 2)}\n`);

  console.log(`Wrote public config: ${contractsDeploymentPath}`);
  console.log(`Synced backend config: ${backendConfigPath}`);
  console.log("Next: run npm run seed:giwa to create demonstration markets.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
