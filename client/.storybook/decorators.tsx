import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator } from "@storybook/react-vite";
import { StorybookAuthProvider } from "../src/contexts/AuthContext";

export const withAppProviders: Decorator = (Story) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/contest/contest-fixture-1"]}>
        <StorybookAuthProvider>
          <Story />
        </StorybookAuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
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
