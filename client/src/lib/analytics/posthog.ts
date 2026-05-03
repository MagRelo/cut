import type { PostHog } from "posthog-js";

/** Events for PRODUCT_GROWTH_FUNNEL — capture only when PostHog client exists (prod `PostHogProvider`). */
export type AnalyticsEvents = {
  auth_session_synced: {
    user_id: string;
    wallet_address: string;
  };
  lineup_created: {
    user_id: string;
    tournament_id: string;
    lineup_id: string;
    player_count: number;
    is_first_lineup: boolean;
  };
  lineup_updated: {
    user_id: string;
    lineup_id: string;
    tournament_id: string;
  };
  account_first_funded: {
    user_id: string;
    chain_id: number;
    platform_balance_wei?: string;
    payment_balance_wei?: string;
  };
  contest_entry_recorded: {
    user_id: string;
    contest_id: string;
    entry_id: string;
    chain_id: number;
    transaction_hash?: string;
  };
  winner_pool_position_recorded: {
    user_id: string;
    contest_id: string;
    entry_id: string;
    chain_id: number;
    amount_wei?: string;
  };
};

function capture<E extends keyof AnalyticsEvents>(
  client: PostHog | null | undefined,
  event: E,
  properties: AnalyticsEvents[E],
): void {
  if (!client) return;
  try {
    client.capture(event, properties as Record<string, unknown>);
  } catch {
    /* analytics must never break UX */
  }
}

export function captureAuthSessionSynced(
  client: PostHog | null | undefined,
  properties: AnalyticsEvents["auth_session_synced"],
): void {
  capture(client, "auth_session_synced", properties);
}

export function captureLineupCreated(
  client: PostHog | null | undefined,
  properties: AnalyticsEvents["lineup_created"],
): void {
  capture(client, "lineup_created", properties);
}

export function captureLineupUpdated(
  client: PostHog | null | undefined,
  properties: AnalyticsEvents["lineup_updated"],
): void {
  capture(client, "lineup_updated", properties);
}

export function captureAccountFirstFunded(
  client: PostHog | null | undefined,
  properties: AnalyticsEvents["account_first_funded"],
): void {
  capture(client, "account_first_funded", properties);
}

export function captureContestEntryRecorded(
  client: PostHog | null | undefined,
  properties: AnalyticsEvents["contest_entry_recorded"],
): void {
  capture(client, "contest_entry_recorded", properties);
}

export function captureWinnerPoolPositionRecorded(
  client: PostHog | null | undefined,
  properties: AnalyticsEvents["winner_pool_position_recorded"],
): void {
  capture(client, "winner_pool_position_recorded", properties);
}
