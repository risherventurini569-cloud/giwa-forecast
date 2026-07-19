# GIWA Forecast

**GIWA Forecast** is a light-theme, non-custodial **testnet prediction market** for GIWA Sepolia. Users connect a browser wallet, approve the official GIWA Playground **VerifiedToken**, trade internal YES / NO outcome shares, and claim settlement payouts after an authorized resolver records the result onchain.

> **Testnet Demo / Experimental Market / No Real-World Value**  
> This repository is for GIWA Sepolia testing only. It must not be represented as a real-money prediction market, investment product, stablecoin product, or cash-redemption service.

## Architecture

```text
frontend/   React + TypeScript + Vite + Tailwind CSS + wagmi/viem
backend/    FastAPI public configuration service
contracts/  Solidity + Hardhat 3 + OpenZeppelin
```

## Onchain model

- Settlement token: official GIWA Playground **VerifiedToken**.
- Official GIWA Sepolia VerifiedToken: `0xBCdB22f56642DE57624CfC2fBb9eE398cF3CA268`
- Chain: GIWA Sepolia (`91342`)
- RPC: `https://sepolia-rpc.giwa.io`
- Explorer: `https://sepolia-explorer.giwa.io`
- Users sign every approval, trade, sell, resolution, creation, and claim transaction with their own wallet.
- The FastAPI service reads only `backend/market-config.json`. It never stores or uses a user private key.

## Main user journey

```text
Connect Wallet
→ Switch to GIWA Sepolia
→ Claim test ETH
→ Open GIWA Playground
→ Issue Dojang
→ Claim VerifiedToken
→ Return to GIWA Forecast
→ Approve VerifiedToken
→ Buy / Sell YES or NO shares
→ Wait for resolver settlement
→ Claim winning payout
```

## Local development

Read [START_HERE.md](./START_HERE.md) and complete the commands in order.

## Public deployment configuration

The only public deployment configuration is:

```text
contracts/deployments/giwa-sepolia.json
backend/market-config.json
```

The contract deployment script updates both files automatically. Do not place any private key, mnemonic, seed phrase, or `.env` inside Git.

## Security notes

- This is an experimental MVP, not an audited protocol.
- The resolver is an explicitly disclosed trusted role for each market.
- The official GIWA RPC is rate-limited and intended for testing. Use a suitable production-grade provider only after GIWA Mainnet and a compliant production strategy are available.
