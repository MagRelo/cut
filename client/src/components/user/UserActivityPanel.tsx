import React from "react";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../common/LoadingSpinner";
import {
  useUserTransactions,
  type UserTransaction,
  type UserTxnType,
} from "../../hooks/useUserTransactions";
import { contestLobbyPath } from "../../utils/contestRoutes";
import { getTransactionUrl } from "../../utils/blockchainUtils";

const TYPE_LABELS: Record<UserTxnType, string> = {
  CONTEST_ENTRY: "Entry",
  PREDICTION_BUY: "Winner pool ticket",
  PAYOUT_PRIMARY: "Payout",
  PAYOUT_SECONDARY: "Winner pool payout",
  PAYOUT_REFERRAL: "Referral",
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatAmount = (txn: UserTransaction): { text: string; className: string } => {
  if (txn.amount == null) {
    return { text: "—", className: "text-gray-500" };
  }
  if (txn.type === "CONTEST_ENTRY" && txn.amount === 0) {
    return { text: "Free", className: "text-gray-700" };
  }
  if (txn.amount === 0) {
    return { text: "$0.00", className: "text-gray-700" };
  }
  const abs = Math.abs(txn.amount);
  const body = abs < 0.01 ? "<$0.01" : `$${abs.toFixed(2)}`;
  if (txn.amount > 0) {
    return { text: `+${body}`, className: "text-green-700" };
  }
  return { text: `−${body}`, className: "text-gray-900" };
};

const TxnDescription: React.FC<{ txn: UserTransaction }> = ({ txn }) => {
  const title = txn.contestAddress ? (
    <Link
      to={contestLobbyPath(txn.contestAddress ?? txn.contestId ?? "")}
      className="font-medium text-gray-900 hover:text-blue-700 hover:underline"
    >
      {txn.label}
    </Link>
  ) : (
    <span className="font-medium text-gray-900">{txn.label}</span>
  );

  const txUrl =
    txn.txHash && txn.chainId != null ? getTransactionUrl(txn.txHash, txn.chainId) : null;

  return (
    <div className="min-w-0">
      <div className="truncate">{title}</div>
      {txn.detail && <div className="mt-0.5 truncate text-xs text-gray-500">{txn.detail}</div>}
      {txUrl && (
        <a
          href={txUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-block text-xs text-blue-600 hover:underline"
        >
          View tx
        </a>
      )}
    </div>
  );
};

function ActivityRow({ txn }: { txn: UserTransaction }) {
  const amount = formatAmount(txn);
  return (
    <div className="flex items-start justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{TYPE_LABELS[txn.type]}</p>
        <p className="mt-0.5 text-xs tabular-nums text-gray-500">{formatDate(txn.createdAt)}</p>
        <div className="mt-1">
          <TxnDescription txn={txn} />
        </div>
      </div>
      <p className={`shrink-0 text-right text-sm font-semibold tabular-nums ${amount.className}`}>
        {amount.text}
      </p>
    </div>
  );
}

/** Activity / transaction list. */
export function UserActivityPanel() {
  const { data: transactions, isLoading, error } = useUserTransactions();

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center font-display text-red-500">
        {error instanceof Error ? error.message : "Failed to load activity"}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="py-8 text-center font-display">
        <p className="font-semibold text-gray-800">No activity yet</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Contest entries, winner pool tickets, and payouts will show up here.
        </p>
        <Link
          to="/account/funds"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add funds
        </Link>
        <p className="mt-3">
          <Link to="/contests" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
            Browse contests
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="font-display">
      <div className="divide-y divide-gray-100 sm:hidden">
        {transactions.map((txn) => (
          <ActivityRow key={txn.id} txn={txn} />
        ))}
      </div>

      <div className="hidden sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-3 font-semibold">Date</th>
              <th className="py-2 pr-3 font-semibold">Type</th>
              <th className="py-2 pr-3 font-semibold">Description</th>
              <th className="py-2 pl-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => {
              const amount = formatAmount(txn);
              return (
                <tr key={txn.id} className="border-b border-gray-100 align-top">
                  <td className="whitespace-nowrap py-3 pr-3 tabular-nums text-gray-600">
                    {formatDate(txn.createdAt)}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-3 text-gray-800">
                    {TYPE_LABELS[txn.type]}
                  </td>
                  <td className="py-3 pr-3">
                    <TxnDescription txn={txn} />
                  </td>
                  <td
                    className={`whitespace-nowrap py-3 pl-3 text-right font-semibold tabular-nums ${amount.className}`}
                  >
                    {amount.text}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
