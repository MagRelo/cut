import { useState, type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator } from "@storybook/react-vite";
import { registerAuthTokenHandlers } from "../src/lib/authToken";
import { StorybookAuthProvider } from "../src/contexts/AuthContext";

let storybookAuthRegistered = false;

function ensureStorybookAuth() {
  if (storybookAuthRegistered) return;
  registerAuthTokenHandlers(
    async () => "storybook-bearer-token",
    () => 84532,
  );
  storybookAuthRegistered = true;
}

function StorybookAppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/contest/contest-fixture-1"]}>
        <StorybookAuthProvider>{children}</StorybookAuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export const withAppProviders: Decorator = (Story) => {
  ensureStorybookAuth();

  return (
    <StorybookAppProviders>
      <Story />
    </StorybookAppProviders>
  );
};

export const withLobbyShell: Decorator = (Story) => (
  <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-900">
    <div className="mx-auto max-w-lg">
      <Story />
    </div>
  </div>
);

/** Lobby layout only — providers come from preview.tsx `withAppProviders`. */
export const lobbyDecorators = [withLobbyShell];
