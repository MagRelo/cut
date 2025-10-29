import React, { Fragment, useState, useEffect } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild, DialogTitle } from "@headlessui/react";
import { parseUnits } from "viem";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useAddPrediction } from "../../hooks/useSpectatorOperations";
import { type Contest } from "../../types/contest";

interface EntryData {
  entryId: string;
  price: bigint;
  priceFormatted: string;
  balance: bigint;
  balanceFormatted: string;
  totalSupply: bigint;
  totalSupplyFormatted: string;
  impliedWinnings: bigint;
  impliedWinningsFormatted: string;
  hasPosition: boolean;
}

interface PredictionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: Contest;
  entryId: string | null;
  entryData: EntryData[];
}

export const PredictionEntryModal: React.FC<PredictionEntryModalProps> = ({
  isOpen,
  onClose,
  contest,
  entryId,
  entryData,
}) => {
  const { platformTokenBalance, paymentTokenBalance } = usePortoAuth();
  const [amount, setAmount] = useState<string>("10");
  const [error, setError] = useState<string | null>(null);

  // Find the entry data for the selected entry
  const selectedEntryInfo = entryData.find((e) => e.entryId === entryId);
  const lineup = contest.contestLineups?.find((l) => l.entryId === entryId);
  const userName = lineup?.user?.name || "Unknown";
  const lineupName = lineup?.tournamentLineup?.name || "Lineup";

  // Calculate total prize pool from all entry supplies
  const totalPrizePool = entryData.reduce((sum, entry) => {
    return sum + parseFloat(entry.totalSupplyFormatted);
  }, 0);

  // Calculate opportunity metrics
  const calculateOpportunityMetrics = () => {
    if (!amount || parseFloat(amount) <= 0 || !selectedEntryInfo) {
      return { ownershipPercent: 0, potentialReturn: 0, tokensReceived: 0 };
    }

    const positionAmount = parseFloat(amount);
    const feePercentage = 0.15;
    const netPosition = positionAmount * (1 - feePercentage);

    const price = parseFloat(selectedEntryInfo.priceFormatted);
    const currentSupply = parseFloat(selectedEntryInfo.totalSupplyFormatted);

    // Tokens they'll receive
    const tokensReceived = price > 0 ? netPosition / price : 0;

    // New total supply after purchase
    const newSupply = currentSupply + tokensReceived;

    // % of supply owned
    const ownershipPercent = newSupply > 0 ? (tokensReceived / newSupply) * 100 : 0;

    // Prize pool after their position
    const newPrizePool = totalPrizePool + netPosition;

    // Potential return if this entry wins (winner-take-all)
    const potentialReturn = newSupply > 0 ? (tokensReceived / newSupply) * newPrizePool : 0;

    return { ownershipPercent, potentialReturn, tokensReceived };
  };

  const metrics = calculateOpportunityMetrics();

  // Reset form when modal opens with new entry
  useEffect(() => {
    if (isOpen && entryId) {
      setAmount("10");
      setError(null);
    }
  }, [isOpen, entryId]);

  // Blockchain transaction hook
  const { execute, isProcessing, createAddPredictionCalls } = useAddPrediction({
    onSuccess: async () => {
      setAmount("10");
      setError(null);
      onClose();
    },
    onError: (err) => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!entryId) {
      setError("No entry selected");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      const amountBigInt = parseUnits(amount, 18);
      const calls = createAddPredictionCalls(
        contest.address,
        parseInt(entryId),
        amountBigInt,
        platformTokenBalance || 0n,
        paymentTokenBalance || 0n
      );

      await execute(calls);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    }
  };

  if (!selectedEntryInfo) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-700 to-purple-800 px-6 py-4 text-white">
                  <DialogTitle as="h3" className="text-lg font-semibold font-display">
                    Buy Shares
                  </DialogTitle>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Position Summary - Always Visible */}
                  <div className="bg-purple-100/40 border border-purple-200 rounded-lg p-4 space-y-3 text-sm">
                    {/* Lineup Info */}
                    <div className="pb-3 border-b border-purple-300/60">
                      <div className="text-base font-semibold text-gray-700">{userName}</div>
                      <div className="text-sm text-gray-600 mt-0.5">{lineupName}</div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Purchase Amount</span>
                        <span className="font-semibold text-gray-700">${amount || "0"}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Outcome Share</span>
                        <span className="font-semibold text-gray-900">
                          {metrics.ownershipPercent > 0
                            ? `${metrics.ownershipPercent.toFixed(2)}%`
                            : "0%"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Value if Entry Wins</span>
                        <span className="font-semibold text-green-600">
                          ~$
                          {metrics.potentialReturn > 0
                            ? `${metrics.potentialReturn.toFixed(2)}`
                            : "0"}
                        </span>
                      </div>

                      {metrics.potentialReturn > 0 && parseFloat(amount) > 0 && (
                        <div className="flex justify-between items-center ">
                          <span className="text-gray-600">Return if Entry Wins</span>
                          <span className="font-semibold text-purple-700">
                            {((metrics.potentialReturn / parseFloat(amount) - 1) * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label
                      htmlFor="position-amount"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Purchase Amount (CUT)
                    </label>
                    <input
                      id="position-amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={isProcessing}
                      autoFocus
                    />
                  </div>

                  {/* Balance Warning */}
                  {amount && parseFloat(amount) > 0 && (
                    <div className="text-xs">
                      {platformTokenBalance && parseUnits(amount, 18) > platformTokenBalance ? (
                        paymentTokenBalance && parseUnits(amount, 6) <= paymentTokenBalance ? (
                          <div className="bg-purple-50 border border-purple-200 rounded p-2 text-purple-700">
                            Insufficient CUT tokens. Will automatically swap from USDC.
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700">
                            Insufficient balance. Please add funds to continue.
                          </div>
                        )
                      ) : null}
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-display font-semibold transition-colors"
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isProcessing ||
                        !amount ||
                        parseFloat(amount) <= 0 ||
                        Boolean(
                          platformTokenBalance &&
                            paymentTokenBalance &&
                            parseUnits(amount, 18) > platformTokenBalance &&
                            parseUnits(amount, 6) > paymentTokenBalance
                        )
                      }
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-display font-semibold transition-colors"
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                          <LoadingSpinnerSmall />
                          Placing...
                        </span>
                      ) : (
                        "Buy Shares"
                      )}
                    </button>
                  </div>

                  {/* Info Note */}
                  <div className="text-xs text-gray-500 pt-3 border-t border-gray-200">
                    <p>
                      <strong>Note:</strong> Payouts are calculated using live LMSR pricing. Actual
                      payout depends on contest settlement.
                    </p>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
