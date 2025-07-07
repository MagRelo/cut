import { porto } from "porto/wagmi";
import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";

const portoConnector = porto({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
  merchantRpcUrl: import.meta.env.VITE_API_URL + import.meta.env.VITE_MERCHANT_RPC_PATH,
});

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [portoConnector],
  transports: {
    [baseSepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
