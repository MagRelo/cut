import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@chromatic-com/storybook", "@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  viteFinal: async (config) => {
    config.resolve ??= {};
    config.resolve.alias = [
      ...(Array.isArray(config.resolve.alias) ? config.resolve.alias : []),
      {
        find: /^wagmi\/chains$/,
        replacement: path.resolve(dirname, "./mocks/wagmiChains.ts"),
      },
      {
        find: /^wagmi$/,
        replacement: path.resolve(dirname, "./mocks/wagmi.ts"),
      },
      {
        find: path.resolve(dirname, "../src/hooks/useContestPredictionData.ts"),
        replacement: path.resolve(dirname, "./mocks/useContestPredictionData.ts"),
      },
      {
        find: path.resolve(dirname, "../src/hooks/useLineupData.ts"),
        replacement: path.resolve(dirname, "./mocks/useLineupData.ts"),
      },
    ];
    return config;
  },
};

export default config;