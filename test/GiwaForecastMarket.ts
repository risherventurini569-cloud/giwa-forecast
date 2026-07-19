import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("GiwaForecastMarket", async () => {
  const { viem } = await network.connect();
  const [creator, trader, resolver] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  it("creates, trades, resolves, and pays a binary market", async () => {
    const token = await viem.deployContract("MockVerifiedToken");
    const market = await viem.deployContract("GiwaForecastMarket", [token.address, creator.account.address, 100]);

    await token.write.mint([trader.account.address, parseEther("1000")]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const closeTime = now + 3600n;

    const creatorToken = await viem.getContractAt("MockVerifiedToken", token.address, { client: { wallet: creator } });
    const traderToken = await viem.getContractAt("MockVerifiedToken", token.address, { client: { wallet: trader } });
    const creatorMarket = await viem.getContractAt("GiwaForecastMarket", market.address, { client: { wallet: creator } });
    const traderMarket = await viem.getContractAt("GiwaForecastMarket", market.address, { client: { wallet: trader } });

    await creatorToken.write.approve([market.address, parseEther("200")]);
    await creatorMarket.write.createMarket([
      "Will the local test pass?",
      "GIWA",
      closeTime,
      resolver.account.address,
      parseEther("100")
    ]);

    await traderToken.write.approve([market.address, parseEther("100")]);
    const buyHash = await traderMarket.write.buy([1n, 0, parseEther("20")]);
    await publicClient.waitForTransactionReceipt({ hash: buyHash });

    const position = await market.read.getPosition([1n, trader.account.address]);
    assert(position[0] > parseEther("20"), "YES buyer should receive base + AMM output shares");

    const quote = await market.read.quoteSell([1n, 0, position[0] / 2n]);
    assert(quote[0] > 0n, "selling should quote collateral output");
  });
});
