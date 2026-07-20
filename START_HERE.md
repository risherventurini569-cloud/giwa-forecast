# GIWA Forecast — Start Here

This is the exact order to launch the project locally, deploy the contract to GIWA Sepolia, then publish it with Vercel and Render.

## 0. Prerequisites

Install:

- Node.js **22+**
- Python **3.11+**
- MetaMask or OKX Wallet
- Git

Your deployer wallet needs GIWA Sepolia test ETH. Claim it from the GIWA faucet, then open the GIWA Playground in the same wallet to complete:

```text
Issue Dojang → Claim VerifiedToken
```

The deployment wallet also needs enough VerifiedToken to seed demo markets.

## 1. Start the backend

Open CMD in the project root:

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Open this URL in a browser:

```text
http://localhost:8000/api/health
```

Before deployment, `contract_configured` should be `false`. This is correct.

## 2. Start the frontend

Open a second CMD window:

```cmd
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The page should show **Waking up GIWA API…** briefly and then **Deployment Pending**. This is correct until you deploy.

## 3. Compile and test contracts

Open a third CMD window:

```cmd
cd contracts
copy .env.example .env
npm install
npm run compile
npm test
```

## 4. Configure deployment wallet — screenshot required

Edit this file locally only:

```text
contracts/.env
```

Fill it like this:

```env
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
GIWA_RPC_URL=https://sepolia-rpc.giwa.io
VERIFIED_TOKEN_ADDRESS=0xBCdB22f56642DE57624CfC2fBb9eE398cF3CA268
FEE_RECIPIENT=0xYOUR_DEPLOYER_PUBLIC_ADDRESS
FEE_BPS=100
```

**Do not send a screenshot showing `PRIVATE_KEY`.**

Send a screenshot only of:

- GIWA Playground showing your wallet has test ETH and VerifiedToken, with the balance visible.
- Your terminal after `npm run compile` succeeds.

## 5. Deploy the Forecast Market contract

```cmd
cd contracts
npm run deploy:giwa
```

Expected output includes:

```text
GIWA Forecast Market deployed: 0x...
Wrote public config: contracts/deployments/giwa-sepolia.json
Synced backend config: backend/market-config.json
```

### After deployment — screenshot required

Send a screenshot of the terminal showing only:

```text
GIWA Forecast Market deployed: 0x...
```

Do not screenshot your `.env` or private key.

The script automatically places the live address into:

```text
contracts/deployments/giwa-sepolia.json
backend/market-config.json
```

Restart the FastAPI backend after deployment:

```cmd
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Then refresh `http://localhost:5173`. The status should change from **Deployment Pending** to **Testnet**.

## 6. Seed three demo markets

The deployer must first claim enough GIWA Playground VerifiedToken.

```cmd
cd contracts
npm run seed:giwa
```

This creates three public testnet demonstration markets. The market list on `/terminal` will then fetch them directly from the contract.

### After seeding — screenshot required

Send a screenshot of the terminal output confirming three market creation transaction hashes, or the browser `/terminal` showing live market cards.

## 7. Test a real wallet trade

Use a second wallet if possible:

1. Connect wallet on `http://localhost:5173`.
2. Switch to GIWA Sepolia.
3. Claim test ETH and GIWA Playground VerifiedToken.
4. Open a market.
5. Enter an amount.
6. Click **Approve VT** and confirm in wallet.
7. Click **Buy YES** or **Buy NO** and confirm in wallet.
8. Open `/portfolio` and confirm the position is present.

Screenshot the wallet confirmation result or transaction hash screen. Do not share recovery phrases or private key.

## 8. Push to GitHub

From project root:

```cmd
git init
git add .
git commit -m "feat: launch GIWA Forecast testnet prediction market"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/giwa-forecast.git
git push -u origin main
```

Before `git add .`, confirm these do not appear in the staged file list:

```text
contracts/.env
backend/.env
frontend/.env
node_modules
.venv
```

## 9. Deploy backend to Render

1. In Render click **New +** → **Blueprint** or **Web Service**.
2. Select the GitHub repository.
3. For Web Service: set **Root Directory** to `backend`.
4. Build command:

```text
pip install -r requirements.txt
```

5. Start command:

```text
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

6. Health Check Path:

```text
/api/health
```

7. Environment Variable:

```text
FRONTEND_ORIGIN=https://YOUR_VERCEL_DOMAIN.vercel.app
```

When it deploys, open:

```text
https://YOUR_RENDER_SERVICE.onrender.com/api/health
```

It should return `"contract_configured": true` after deployment.

## 10. Deploy frontend to Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Add environment variable:

```text
VITE_API_BASE=https://YOUR_RENDER_SERVICE.onrender.com
```

5. Deploy.

`frontend/vercel.json` includes the SPA rewrite required for direct access to `/terminal`, `/market/:id`, `/portfolio`, `/activity`, and `/create`.

## 11. Final online checks — screenshot required

Use your Vercel URL and verify:

```text
/                  Landing Page loads
/terminal          Market Board loads
/market/1          Market detail loads
/portfolio         Connected position reads from chain
/create            Market creation form appears
/status            API wake-up / retry state works
```

Then perform one real testnet approval + buy transaction and send the final transaction hash screenshot.
