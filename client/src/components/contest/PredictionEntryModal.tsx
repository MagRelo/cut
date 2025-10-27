import React, { Fragment, useState } from "react";
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
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Find the entry data for the selected entry
  const selectedEntryInfo = entryData.find((e) => e.entryId === entryId);
  const lineup = contest.contestLineups?.find((l) => l.entryId === entryId);
  const userName = lineup?.user?.name || "Unknown";
  const lineupName = lineup?.tournamentLineup?.name || "Lineup";

  // Blockchain transaction hook
  const { execute, isProcessing, createAddPredictionCalls } = useAddPrediction({
    onSuccess: async () => {
      setAmount("");
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
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 text-white">
                  <DialogTitle as="h3" className="text-lg font-semibold font-display">
                    Place Prediction
                  </DialogTitle>
                  <p className="text-sm text-blue-100 mt-1">
                    {userName} - {lineupName}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Amount Input */}
                  <div>
                    <label
                      htmlFor="position-amount"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Position Amount (CUT)
                    </label>
                    <input
                      id="position-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isProcessing}
                      autoFocus
                    />
                  </div>

                  {/* Position Summary */}
                  {amount && parseFloat(amount) > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Your position:</span>
                        <span className="font-semibold text-gray-900">{amount} CUT</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Entry fee (15%):</span>
                        <span>-{(parseFloat(amount) * 0.15).toFixed(2)} CUT</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-gray-700 font-medium">Position value:</span>
                        <span className="font-bold text-gray-900">
                          {(parseFloat(amount) * 0.85).toFixed(2)} CUT
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Balance Warning */}
                  {amount && parseFloat(amount) > 0 && (
                    <div className="text-xs">
                      {platformTokenBalance && parseUnits(amount, 18) > platformTokenBalance ? (
                        paymentTokenBalance && parseUnits(amount, 6) <= paymentTokenBalance ? (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-blue-700">
                            ℹ️ Insufficient CUT tokens. Will automatically swap from USDC.
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700">
                            ⚠️ Insufficient balance. Please add funds.
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
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed font-display font-semibold transition-all"
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                          <LoadingSpinnerSmall />
                          Placing...
                        </span>
                      ) : (
                        "Place Position"
                      )}
                    </button>
                  </div>

                  {/* Info Note */}
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                    <p>
                      💡 If this entry wins, you share the prize pool with other winners
                      proportionally. You can withdraw for a 100% refund before settlement.
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
