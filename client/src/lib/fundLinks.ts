import { isAddress } from "viem";

export type FundPageTab = "send" | "deposit";

export function buildFundSendUrl(
  recipient: string,
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
): string {
  const normalized = recipient.trim().toLowerCase();
  const params = new URLSearchParams({ tab: "send", recipient: normalized });
  return `${origin}/account/funds?${params.toString()}`;
}

export function parseFundPageSearchParams(search: string): {
  tab: FundPageTab;
  recipient: string | null;
} {
  const params = new URLSearchParams(search);
  const tabRaw = params.get("tab")?.trim().toLowerCase();
  const tab: FundPageTab = tabRaw === "send" ? "send" : "deposit";

  const recipientRaw = params.get("recipient")?.trim();
  const recipient =
    recipientRaw && isAddress(recipientRaw) ? recipientRaw.toLowerCase() : null;

  return { tab, recipient };
}
