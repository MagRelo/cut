import { PostHog } from "posthog-node";

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) {
    return client;
  }
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) {
    client = null;
    return null;
  }
  const host = process.env.POSTHOG_HOST;
  client = new PostHog(apiKey, {
    ...(host ? { host } : {}),
  });
  return client;
}

/**
 * Fired after contest settlement is persisted. distinctId must match `posthog.identify(user.id)` on the client.
 */
export function captureContestWinPayoutRecorded(args: {
  distinctId: string;
  contest_id: string;
  tournament_id: string;
  entry_id: string;
  user_id: string;
  chain_id: number;
  payout_amount_wei: string;
  settlement_tx_hash?: string;
}): void {
  try {
    const ph = getClient();
    if (!ph) return;
    const { distinctId, ...properties } = args;
    ph.capture({
      distinctId,
      event: "contest_win_payout_recorded",
      properties,
    });
  } catch (e) {
    console.warn("[PostHog] captureContestWinPayoutRecorded failed:", e);
  }
}
