import { isAddress } from "viem";

export type FundPageTab = "send" | "deposit" | "activity";

const TAB_INDEX: Record<Exclude<FundPageTab, "activity">, number> = {
  deposit: 0,
  send: 1,
};

const TAB_BY_INDEX: Array<Exclude<FundPageTab, "activity">> = ["deposit", "send"];

export function fundPageTabIndex(tab: FundPageTab): number {
  if (tab === "activity") return 0;
  return TAB_INDEX[tab];
}

export function fundPageTabFromIndex(index: number): FundPageTab {
  return TAB_BY_INDEX[index] ?? "deposit";
}

export function buildFundSendUrl(
  recipient: string,
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
): string {
  const normalized = recipient.trim().toLowerCase();
  const params = new URLSearchParams({ tab: "send", recipient: normalized });
  return `${origin}/account/funds?${params.toString()}`;
}

export function buildFundActivityUrl(
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
): string {
  return `${origin}/account/activity`;
}

export function parseFundPageSearchParams(search: string): {
  tab: FundPageTab;
  recipient: string | null;
} {
  const params = new URLSearchParams(search);
  const tabRaw = params.get("tab")?.trim().toLowerCase();
  const tab: FundPageTab =
    tabRaw === "send" ? "send" : tabRaw === "activity" ? "activity" : "deposit";

  const recipientRaw = params.get("recipient")?.trim();
  const recipient =
    recipientRaw && isAddress(recipientRaw) ? recipientRaw.toLowerCase() : null;

  return { tab, recipient };
}
