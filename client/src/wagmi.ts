import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

const baseRpcUrl = import.meta.env.VITE_BASE_RPC_URL?.trim();
const baseSepoliaRpcUrl = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL?.trim();

export const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: baseRpcUrl ? http(baseRpcUrl) : http(),
    [baseSepolia.id]: baseSepoliaRpcUrl ? http(baseSepoliaRpcUrl) : http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
