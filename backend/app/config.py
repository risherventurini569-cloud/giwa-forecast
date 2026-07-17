from __future__ import annotations

import json
from pathlib import Path
from typing import Any

CONFIG_PATH = Path(__file__).resolve().parents[1] / "market-config.json"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


def load_public_config() -> dict[str, Any]:
    """Load only public deployment metadata. No private key is ever read here."""
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"Missing public market config: {CONFIG_PATH}")
    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def is_contract_configured(config: dict[str, Any]) -> bool:
    address = str(config.get("contracts", {}).get("forecastMarket", "")).lower()
    return address.startswith("0x") and address != ZERO_ADDRESS
