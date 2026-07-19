export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
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
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }]
  }
] as const;

const marketTuple = {
  type: "tuple",
  name: "",
  components: [
    { name: "question", type: "string" },
    { name: "category", type: "string" },
    { name: "closeTime", type: "uint64" },
    { name: "resolver", type: "address" },
    { name: "creator", type: "address" },
    { name: "yesReserve", type: "uint256" },
    { name: "noReserve", type: "uint256" },
    { name: "collateralPool", type: "uint256" },
    { name: "yesUserShares", type: "uint256" },
    { name: "noUserShares", type: "uint256" },
    { name: "winningUserShares", type: "uint256" },
    { name: "resolved", type: "bool" },
    { name: "resolvedOutcome", type: "uint8" },
    { name: "residualClaimed", type: "bool" }
  ]
} as const;

export const forecastMarketAbi = [
  {
    type: "function",
    name: "marketCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getMarket",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [marketTuple]
  },
  {
    type: "function",
    name: "getPosition",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user", type: "address" }
    ],
    outputs: [
      { name: "yesShares", type: "uint256" },
      { name: "noShares", type: "uint256" },
      { name: "hasClaimed", type: "bool" }
    ]
  },
  {
    type: "function",
    name: "getYesPriceE18",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "quoteBuy",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "collateralIn", type: "uint256" }
    ],
    outputs: [
      { name: "sharesOut", type: "uint256" },
      { name: "fee", type: "uint256" },
      { name: "yesPriceE18", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "quoteSell",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "sharesIn", type: "uint256" }
    ],
    outputs: [
      { name: "netCollateralOut", type: "uint256" },
      { name: "fee", type: "uint256" },
      { name: "yesPriceE18", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "createMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "question", type: "string" },
      { name: "category", type: "string" },
      { name: "closeTime", type: "uint64" },
      { name: "resolver", type: "address" },
      { name: "seedLiquidity", type: "uint256" }
    ],
    outputs: [{ name: "marketId", type: "uint256" }]
  },
  {
    type: "function",
    name: "buy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "collateralIn", type: "uint256" }
    ],
    outputs: [{ name: "sharesOut", type: "uint256" }]
  },
  {
    type: "function",
    name: "sell",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "sharesIn", type: "uint256" }
    ],
    outputs: [{ name: "netCollateralOut", type: "uint256" }]
  },
  {
    type: "function",
    name: "resolveMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "claimPayout",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "payout", type: "uint256" }]
  },
  {
    type: "function",
    name: "claimCreatorResidual",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "payout", type: "uint256" }]
  }
] as const;
