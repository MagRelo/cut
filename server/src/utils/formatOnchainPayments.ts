import type { PaymentKind } from "@prisma/client";
import type { DetailedResult } from "../services/shared/types.js";

const DEFAULT_USER_COLOR = "#9CA3AF";

function isValidHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

function pickUserColor(settings: unknown): string {
  if (typeof settings !== "object" || settings === null) return DEFAULT_USER_COLOR;
  const maybeColor = (settings as { color?: unknown }).color;
  if (typeof maybeColor !== "string") return DEFAULT_USER_COLOR;
  const color = maybeColor.trim();
  return isValidHexColor(color) ? color : DEFAULT_USER_COLOR;
}

export type OnchainPaymentView = {
  kind: PaymentKind;
  amountWei: string;
  walletAddress: string;
  username: string;
  userColor: string;
  entryId?: string;
  shareBps?: number;
  position?: number;
  score?: number;
  playerLastNames?: string[];
  lineupName?: string;
  metadata?: Record<string, unknown>;
};

type PaymentRow = {
  kind: PaymentKind;
  amountWei: string;
  walletAddress: string;
  metadata: unknown;
  user: { name: string | null; settings: unknown } | null;
};

function parsePaymentMetadata(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function isOracleReferralPayment(
  kind: PaymentKind,
  walletAddress: string,
  meta: Record<string, unknown>,
  contestOracleAddress: string | undefined,
): boolean {
  if (kind !== "REFERRAL") return false;
  if (meta.path === "oracle") return true;
  if (!contestOracleAddress) return false;
  return walletAddress.toLowerCase() === contestOracleAddress.toLowerCase();
}

export function formatOnchainPaymentsForContest(
  payments: PaymentRow[],
  detailedResults: DetailedResult[] | undefined,
  contestOracleAddress?: string,
): OnchainPaymentView[] {
  const byEntryId = new Map<string, DetailedResult>();
  for (const r of detailedResults ?? []) {
    byEntryId.set(String(r.entryId), r);
  }

  return payments
    .filter((p) => {
      const meta = parsePaymentMetadata(p.metadata);
      return !isOracleReferralPayment(p.kind, p.walletAddress, meta, contestOracleAddress);
    })
    .map((p) => {
      const meta = parsePaymentMetadata(p.metadata);
      const entryId = typeof meta.entryId === "string" ? meta.entryId : undefined;
      const detail = entryId ? byEntryId.get(entryId) : undefined;
      const shareBps =
        typeof meta.shareBps === "number"
          ? meta.shareBps
          : typeof meta.shareBps === "string"
            ? Number(meta.shareBps)
            : undefined;

      const view: OnchainPaymentView = {
        kind: p.kind,
        amountWei: p.amountWei,
        walletAddress: p.walletAddress,
        username: p.user?.name ?? "Unknown",
        userColor: pickUserColor(p.user?.settings),
        metadata: meta,
      };
      if (entryId) view.entryId = entryId;
      if (Number.isFinite(shareBps)) view.shareBps = shareBps as number;
      if (detail?.position !== undefined) view.position = detail.position;
      if (detail?.score !== undefined) view.score = detail.score;
      if (detail?.playerLastNames) view.playerLastNames = detail.playerLastNames;
      if (detail?.lineupName) view.lineupName = detail.lineupName;
      return view;
    });
}
