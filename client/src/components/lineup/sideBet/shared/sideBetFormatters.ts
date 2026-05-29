import type { SideBetMarketSelectionDto, SideBetMarketTicketDto } from "../../../../types/sideBet";
import type { SideBetCol, SideBetRow } from "./sideBetConstants";

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function hitsRequiredToRowLabel(h: number): string {
  if (h === 2) return "2 of 4";
  if (h === 3) return "3 of 4";
  return "4 of 4";
}

export function topNToColLabel(n: number): string {
  if (n === 5) return "Top 5";
  if (n === 10) return "Top 10";
  return "Top 20";
}

export function sideBetStatusBadgeClass(status: string): string {
  switch (status) {
    case "WON":
      return "bg-emerald-100 text-emerald-800";
    case "LOST":
      return "bg-red-50 text-red-800";
    case "VOID":
      return "bg-gray-100 text-gray-600";
    case "REFUND_PENDING":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-blue-50 text-blue-800";
  }
}

export function selectionForCell(
  selections: SideBetMarketSelectionDto[],
  row: SideBetRow,
  col: SideBetCol,
): SideBetMarketSelectionDto | undefined {
  return selections.find((s) => s.rowLabel === row && s.colLabel === col);
}

export function formatUsd(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatStakeDisplay(stake: number): string {
  if (!Number.isFinite(stake) || stake <= 0) return "0.00";
  if (stake < 0.01) return "< 0.01";
  return stake.toFixed(2);
}

export function formatStakeInputLine(stakeInput: string): string {
  const trimmed = stakeInput.trim();
  if (!trimmed) return "—";
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const stakeDisplay = n < 0.01 ? "< 0.01" : n.toFixed(2);
  return `$${stakeDisplay}`;
}

export function sideBetReturnDisplay(ticket: SideBetMarketTicketDto): {
  amount: string;
  amountClass: string;
} {
  const stake = ticket.stakeAmount;
  const implied = stake * ticket.decimalOddsAtPlacement;
  if (ticket.status === "LOST") {
    return { amount: "$0.00", amountClass: "text-gray-500" };
  }
  if (ticket.status === "VOID" || ticket.status === "REFUND_PENDING") {
    return { amount: "—", amountClass: "text-gray-400" };
  }
  const n = implied;
  const amount = !Number.isFinite(n) || n < 0 ? "$0.00" : n < 0.01 ? "< $0.01" : formatUsd(n);
  return { amount, amountClass: "text-emerald-700" };
}

export function formatPlayerRosterLine(
  players: { firstName: string | null; lastName: string | null }[],
): string {
  if (players.length === 0) return "—";
  return players.map((p) => p.lastName || p.firstName || "—").join(", ");
}
