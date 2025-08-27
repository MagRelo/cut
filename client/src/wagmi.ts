import { Mode } from "porto";
import type { ThemeFragment } from "porto/theme";
import { porto } from "porto/wagmi";
import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";

// Current theme overrides (you can modify these values)
export const themeOverrides: ThemeFragment = {
  colorScheme: "light dark",
  primaryBackground: ["#3b82f6", "#3b82f6"], // Tailwind blue-500
  primaryContent: ["#ffffff", "#ffffff"], // Tailwind blue-500
  secondaryContent: ["#3b82f6", "#3b82f6"], // Tailwind blue-500
  badgeInfoContent: ["#3b82f6", "#3b82f6"], // Tailwind blue-500
  badgeInfoBackground: ["#dbeafe", "#dbeafe"], // Tailwind blue-100
  frameRadius: 8, // Tailwind rounded-lg
  strongContent: ["#1f2937", "#1f2937"], // Tailwind gray-800
};

const portoConnector = porto({
  merchantRpcUrl: import.meta.env.VITE_API_URL + "/porto/rpc",
  authUrl: {
    nonce: import.meta.env.VITE_API_URL + "/auth/siwe/nonce",
    verify: import.meta.env.VITE_API_URL + "/auth/siwe",
    logout: import.meta.env.VITE_API_URL + "/auth/siwe/logout",
  },
  mode: Mode.dialog({
    theme: themeOverrides,
  }),
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
