import { useLayoutEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Decorator } from "@storybook/react-vite";
import {
  resetStorybookSideBetMocks,
  type StorybookSideBetMarketMode,
  type StorybookSideBetTicketsMode,
} from "../../src/test/fixtures/sideBetStorybook";
import { queryKeys } from "../../src/utils/queryKeys";

export type SideBetStoryMockOptions = {
  market?: StorybookSideBetMarketMode;
  tickets?: StorybookSideBetTicketsMode;
};

type ResolvedSideBetStoryMocks = {
  market: StorybookSideBetMarketMode;
  tickets: StorybookSideBetTicketsMode;
};

function resolveSideBetStoryMocks(
  defaultOptions: SideBetStoryMockOptions,
  storyOptions: SideBetStoryMockOptions,
): ResolvedSideBetStoryMocks {
  return {
    market: storyOptions.market ?? defaultOptions.market ?? "bettable",
    tickets: storyOptions.tickets ?? defaultOptions.tickets ?? "withTickets",
  };
}

function SideBetStoryMockGate({
  resolved,
  children,
}: {
  resolved: ResolvedSideBetStoryMocks;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    resetStorybookSideBetMocks(resolved);
    queryClient.removeQueries({ queryKey: queryKeys.sideBet.all });
    setReady(true);

    return () => {
      setReady(false);
    };
  }, [queryClient, resolved.market, resolved.tickets]);

  if (!ready) return null;

  return children;
}

export function withSideBetStoryMocks(defaultOptions: SideBetStoryMockOptions = {}): Decorator {
  return (Story, context) => {
    const storyOptions =
      (context.parameters.sideBetMocks as SideBetStoryMockOptions | undefined) ?? {};
    const resolved = resolveSideBetStoryMocks(defaultOptions, storyOptions);

    // Keep fetch mock aligned before the story's first query runs.
    resetStorybookSideBetMocks(resolved);

    return (
      <SideBetStoryMockGate resolved={resolved}>
        <Story />
      </SideBetStoryMockGate>
    );
  };
}
