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
  SIDE_BET: "Side bet",
  SIDE_BET_PAYOUT: "Side bet win",
  SIDE_BET_REFUND: "Side bet refund",
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
      {txn.detail && <div className="truncate text-xs text-gray-500 mt-0.5">{txn.detail}</div>}
      {txUrl && (
        <a
          href={txUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline mt-0.5 inline-block"
        >
          View tx
        </a>
      )}
    </div>
  );
};

/** Activity / transaction table for Manage Funds. */
export function UserActivityPanel() {
  const { data: transactions, isLoading, error } = useUserTransactions();

  if (isLoading) {
    return (
      <div className="text-center min-h-[200px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 font-display py-8">
        {error instanceof Error ? error.message : "Failed to load activity"}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center my-8">
        <p className="text-gray-400 font-semibold font-display mb-2">No activity yet</p>
        <p className="text-sm text-gray-500">
          Contest entries, winner pool tickets, side bets, and payouts will show up here.{" "}
          <Link to="/contests" className="text-blue-600 hover:text-blue-800 underline">
            Browse contests
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1 py-2">
      <table className="w-full min-w-[36rem] text-left text-sm font-display">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-3 font-semibold">Date</th>
            <th className="py-2 pr-3 font-semibold">Type</th>
            <th className="py-2 pr-3 font-semibold">Description</th>
            <th className="py-2 pl-3 font-semibold text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => {
            const amount = formatAmount(txn);
            return (
              <tr key={txn.id} className="border-b border-gray-100 align-top">
                <td className="py-3 pr-3 whitespace-nowrap text-gray-600 tabular-nums">
                  {formatDate(txn.createdAt)}
                </td>
                <td className="py-3 pr-3 whitespace-nowrap text-gray-800">
                  {TYPE_LABELS[txn.type]}
                </td>
                <td className="py-3 pr-3">
                  <TxnDescription txn={txn} />
                </td>
                <td
                  className={`py-3 pl-3 text-right whitespace-nowrap tabular-nums font-semibold ${amount.className}`}
                >
                  {amount.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
