import { unstable_porto } from "porto/wagmi";
import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";

const portoConnector = unstable_porto({
  merchantRpcUrl: import.meta.env.VITE_API_URL + import.meta.env.VITE_MERCHANT_RPC_PATH,
});

export const config = createConfig({
  chains: [base],
  connectors: [portoConnector],
  transports: {
    [base.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
