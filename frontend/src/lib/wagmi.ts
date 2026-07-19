import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

export const giwaSepolia = defineChain({
  id: 91342,
  name: "GIWA Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia-rpc.giwa.io"] },
    public: { http: ["https://sepolia-rpc.giwa.io"] }
  },
  blockExplorers: {
    default: { name: "GIWA Sepolia Explorer", url: "https://sepolia-explorer.giwa.io" }
  },
  testnet: true
});

export const wagmiConfig = createConfig({
  chains: [giwaSepolia],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [giwaSepolia.id]: http("https://sepolia-rpc.giwa.io")
  },
  ssr: false
});
