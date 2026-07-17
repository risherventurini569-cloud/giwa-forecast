from __future__ import annotations

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .config import is_contract_configured, load_public_config

APP_NAME = "GIWA Forecast Public API"
APP_VERSION = "1.0.0"


def allowed_origins() -> list[str]:
    raw = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI(title=APP_NAME, version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    try:
        config = load_public_config()
        return {
            "ok": True,
            "service": "giwa-forecast-api",
            "network": config.get("network", {}).get("chainName", "GIWA Sepolia"),
            "chain_id": config.get("network", {}).get("chainId", 91342),
            "contract_configured": is_contract_configured(config),
            "verified_token_configured": bool(config.get("contracts", {}).get("verifiedToken")),
            "private_keys_stored": False,
        }
    except Exception as exc:  # Deliberately surface a clear service status without leaking secrets.
        return {
            "ok": False,
            "service": "giwa-forecast-api",
            "contract_configured": False,
            "verified_token_configured": False,
            "detail": f"Public configuration unavailable: {type(exc).__name__}",
        }


@app.get("/api/config")
def config() -> dict:
    try:
        public_config = load_public_config()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail="Public onchain configuration is not available yet.") from exc

    return {
        "ok": True,
        "config": public_config,
        "contract_configured": is_contract_configured(public_config),
        "notice": (
            "Testnet Demo / Experimental Market. VerifiedToken and all market positions have no real-world value. "
            "The API exposes only public configuration and never stores user private keys."
        ),
    }
