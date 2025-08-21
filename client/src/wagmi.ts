import { Mode } from "porto";
import type { ThemeFragment } from "porto/theme";
import { porto } from "porto/wagmi";
import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";

export const theme: ThemeFragment = {
  colorScheme: "light",
  primaryBackground: "#3b82f6", // Tailwind blue-500

  primaryContent: "#ffffff", // White text
  // primaryContent: "#000000", // Black text

  // baseContent: "#1f2937", // Tailwind gray-800
  baseContent: "#000000", // Tailwind gray-800
  baseContentSecondary: "#000000", // Tailwind blue-100
  baseContentTertiary: "#000000", // Tailwind blue-100

  secondaryContent: "#3b82f6", // Tailwind blue-500

  badgeInfoContent: "#3b82f6", // Tailwind blue-500
  badgeInfoBackground: "#dbeafe", // Tailwind blue-100
  frameRadius: 8, // Tailwind rounded-lg
  strongContent: "#1f2937", // Tailwind gray-800
};

const portoConnector = porto({
  merchantRpcUrl: import.meta.env.VITE_API_URL + "/porto/rpc",
  authUrl: {
    nonce: import.meta.env.VITE_API_URL + "/auth/siwe/nonce",
    verify: import.meta.env.VITE_API_URL + "/auth/siwe",
    logout: import.meta.env.VITE_API_URL + "/auth/siwe/logout",
  },
  mode: Mode.dialog({
    theme,
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
