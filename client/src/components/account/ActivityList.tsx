import {
  ArrowDownLeftIcon,
  ArrowDownTrayIcon,
  ArrowUpRightIcon,
  CurrencyDollarIcon,
  ReceiptRefundIcon,
  TicketIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { Link } from "react-router-dom";
import { Button } from "../common/Button";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinner } from "../common/LoadingSpinner";
import {
  useUserTransactions,
  type UserTransaction,
  type UserTxnType,
} from "../../hooks/useUserTransactions";
import { accountPanelClassName } from "./AccountPanel";
import { contestLobbyPath } from "../../utils/contestRoutes";
import { getTransactionUrl } from "../../utils/blockchainUtils";

type OutlineIcon = ComponentType<SVGProps<SVGSVGElement>>;
type MoneyDirection = "in" | "out";

type ActivityKind =
  | "entry"
  | "pool_ticket"
  | "payout"
  | "pool_payout"
  | "referral"
  | "send"
  | "receive"
  | "withdrawal"
  | "refund";

type ActivityTone = "indigo" | "violet" | "sky" | "emerald" | "teal" | "amber";

type ActivityType = {
  label: string;
  dir: MoneyDirection;
  icon: OutlineIcon;
  tone: ActivityTone;
  /** A zero amount on this type is a free entry, not $0.00. */
  freeWhenZero?: boolean;
};

const TONES: Record<ActivityTone, { tile: string; text: string; bar: string }> = {
  indigo: { tile: "bg-indigo-600 text-white", text: "text-indigo-900", bar: "bg-indigo-500" },
  violet: { tile: "bg-violet-600 text-white", text: "text-violet-900", bar: "bg-violet-500" },
  sky: { tile: "bg-sky-600 text-white", text: "text-sky-900", bar: "bg-sky-500" },
  emerald: { tile: "bg-emerald-600 text-white", text: "text-emerald-900", bar: "bg-emerald-500" },
  teal: { tile: "bg-teal-600 text-white", text: "text-teal-900", bar: "bg-teal-500" },
  amber: { tile: "bg-amber-600 text-white", text: "text-amber-900", bar: "bg-amber-500" },
};

const TYPES: Record<ActivityKind, ActivityType> = {
  entry: { label: "Entry", dir: "out", icon: UserPlusIcon, tone: "indigo", freeWhenZero: true },
  pool_ticket: { label: "Winner pool ticket", dir: "out", icon: TicketIcon, tone: "violet" },
  payout: { label: "Payout", dir: "in", icon: CurrencyDollarIcon, tone: "emerald" },
  pool_payout: { label: "Winner pool payout", dir: "in", icon: CurrencyDollarIcon, tone: "emerald" },
  referral: { label: "Referral", dir: "in", icon: CurrencyDollarIcon, tone: "teal" },
  send: { label: "Send", dir: "out", icon: ArrowUpRightIcon, tone: "sky" },
  receive: { label: "Receive", dir: "in", icon: ArrowDownLeftIcon, tone: "sky" },
  withdrawal: { label: "Withdrawal", dir: "in", icon: ArrowDownTrayIcon, tone: "teal" },
  refund: { label: "Refund", dir: "in", icon: ReceiptRefundIcon, tone: "amber" },
};

const KIND_BY_TYPE: Record<UserTxnType, ActivityKind> = {
  CONTEST_ENTRY: "entry",
  PREDICTION_BUY: "pool_ticket",
  PAYOUT_PRIMARY: "payout",
  PAYOUT_SECONDARY: "pool_payout",
  PAYOUT_REFERRAL: "referral",
  SEND: "send",
  WITHDRAW: "withdrawal",
  REFUND: "refund",
};

/** Server details that only rename the type. They never become a row. */
const DETAIL_RESTATEMENTS = new Set([
  "contest entry",
  "winner pool ticket",
  "contest payout",
  "winner pool payout",
  "referral payout",
  "sent",
  "received",
  "winner pool withdrawal",
  "contest refund",
]);

type ActivityRowModel = {
  id: string;
  kind: ActivityKind;
  amount: number | null;
  contest?: { name: string; to: string };
  entry?: string;
  to?: string;
  from?: string;
  note?: string;
  date: string;
  txHref?: string;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function middleTruncate(value: string): string {
  if (!value.startsWith("0x") || value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function AddressValue({ value }: { value: string }) {
  const shown = middleTruncate(value);
  if (shown === value) return value;
  return (
    <span className="whitespace-nowrap" title={value}>
      {shown}
    </span>
  );
}

function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  if (abs === 0) return "$0.00";
  if (abs < 0.01) return "<$0.01";
  return `$${abs.toFixed(2)}`;
}

function isIncomingSend(txn: UserTransaction): boolean {
  if (txn.type !== "SEND") return false;
  if (txn.amount != null && txn.amount > 0) return true;
  return txn.detail?.startsWith("From ") === true;
}

function activityKind(txn: UserTransaction): ActivityKind {
  if (isIncomingSend(txn)) return "receive";
  return KIND_BY_TYPE[txn.type];
}

function detailAddsInformation(detail: string, typeLabel: string): boolean {
  const normalized = detail.trim().toLowerCase();
  if (normalized === typeLabel.trim().toLowerCase()) return false;
  return !DETAIL_RESTATEMENTS.has(normalized);
}

function parseDetail(
  detail: string | null,
  typeLabel: string,
): Pick<ActivityRowModel, "to" | "from" | "entry" | "note"> {
  const text = detail?.trim() ?? "";
  if (!text) return {};
  if (text.startsWith("To ")) return { to: text.slice(3) };
  if (text.startsWith("From ")) return { from: text.slice(5) };

  const marker = "· entry ";
  const index = text.indexOf(marker);
  if (index !== -1) {
    const entry = text.slice(index + marker.length).trim();
    return entry ? { entry } : {};
  }

  if (!detailAddsInformation(text, typeLabel)) return {};
  return { note: text };
}

function toActivityRow(txn: UserTransaction): ActivityRowModel {
  const kind = activityKind(txn);
  const contestKey = txn.contestAddress ?? txn.contestId;
  const txHref =
    txn.txHash && txn.chainId != null ? getTransactionUrl(txn.txHash, txn.chainId) : undefined;

  return {
    id: txn.id,
    kind,
    amount: txn.amount,
    ...(contestKey ? { contest: { name: txn.label, to: contestLobbyPath(contestKey) } } : {}),
    ...parseDetail(txn.detail, TYPES[kind].label),
    date: txn.createdAt,
    ...(txHref ? { txHref } : {}),
  };
}

function detailPair(
  label: string,
  value: ReactNode | false | null | undefined,
): [string, ReactNode] | null {
  if (!value) return null;
  return [label, value];
}

function ActivityRow({ item }: { item: ActivityRowModel }) {
  const t = TYPES[item.kind];
  const tone = TONES[t.tone];
  const Icon = t.icon;
  const isIn = t.dir === "in";
  const free = Boolean(t.freeWhenZero && item.amount === 0);
  const amount =
    item.amount == null ? "—" : free ? "Free" : isIn ? `+${formatMoney(item.amount)}` : formatMoney(item.amount);
  const amountClass = item.amount == null ? "text-slate-500" : isIn ? "text-emerald-600" : "text-slate-900";

  const details = [
    detailPair(
      "Contest",
      item.contest && (
        <Link to={item.contest.to} className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
          {item.contest.name}
        </Link>
      ),
    ),
    detailPair("Entry", item.entry),
    detailPair("To", item.to && <AddressValue value={item.to} />),
    detailPair("From", item.from && <AddressValue value={item.from} />),
    detailPair("Detail", item.note),
    detailPair(
      "Date",
      item.date && <time dateTime={item.date}>{formatDate(item.date)}</time>,
    ),
    detailPair(
      "Transaction",
      item.txHref && (
        <a
          href={item.txHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          View tx
        </a>
      ),
    ),
  ].filter((row): row is [string, ReactNode] => row != null);

  return (
    <li className={`${accountPanelClassName} relative list-none overflow-hidden`}>
      <span className={`absolute inset-y-0 left-0 w-[3px] ${tone.bar}`} aria-hidden />
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2.5">
          <span className={`grid size-8 place-items-center rounded-lg ${tone.tile}`}>
            <Icon className="size-4" aria-hidden />
          </span>
          <span className={`text-sm font-semibold tracking-tight ${tone.text}`}>{t.label}</span>
        </span>
        <span className={`shrink-0 text-base font-semibold tabular-nums ${amountClass}`}>{amount}</span>
      </div>

      {details.length > 0 ? (
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-slate-200 pt-3 text-sm">
          {details.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-slate-900">{label}</dt>
              <dd className="min-w-0 break-all text-right text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}

/** Activity / transaction list. */
export function ActivityList() {
  const { data: transactions, isLoading, error } = useUserTransactions();

  if (isLoading) {
    return (
      <div className={`${accountPanelClassName} flex min-h-[200px] items-center justify-center text-center`}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={accountPanelClassName}>
        <ErrorMessage
          className="py-8 text-center"
          message={error instanceof Error ? error.message : "Failed to load activity"}
        />
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className={`${accountPanelClassName} text-center`}>
        <p className="font-semibold text-gray-800">No activity yet</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Contest entries, winner pool tickets, and payouts will show up here.
        </p>
        <Button to="/account/funds" className="mt-6">
          Add funds
        </Button>
        <p className="mt-3">
          <Link to="/contests" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
            Browse contests
          </Link>
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {transactions.map((txn) => (
        <ActivityRow key={txn.id} item={toActivityRow(txn)} />
      ))}
    </ul>
  );
}
