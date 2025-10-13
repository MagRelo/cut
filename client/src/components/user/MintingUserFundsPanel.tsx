import { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { getContractAddress } from "../../utils/blockchainUtils";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { XMarkIcon } from "@heroicons/react/24/outline";

export function MintingUserFundsPanel() {
  const { user } = usePortoAuth();
  const { address, chainId } = useAccount();
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasFundsArrived, setHasFundsArrived] = useState(false);

  // Get payment token address
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");

  // Poll balance every 5 seconds
  const { data: paymentTokenBalance, refetch } = useBalance({
    address: address as `0x${string}`,
    token: paymentTokenAddress as `0x${string}`,
    chainId: chainId as 8453 | 84532 | undefined,
  });

  // Check if user should see the banner
  const shouldShowBanner = (): boolean => {
    if (!user || isDismissed) return false;

    // Only show on Base Sepolia testnet
    if (chainId !== 84532) return false;

    // Check if already dismissed in localStorage
    const dismissKey = `dismissed-mint-${user.id}-${user.createdAt}`;
    if (localStorage.getItem(dismissKey) === "true") {
      return false;
    }

    // Show if pendingTokenMint flag is set
    if (user.pendingTokenMint) return true;

    // Or if user was created less than 5 minutes ago
    if (user.createdAt) {
      const createdAt = new Date(user.createdAt);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (createdAt > fiveMinutesAgo) return true;
    }

    return false;
  };

  // Poll balance every 5 seconds until funds arrive
  useEffect(() => {
    if (!shouldShowBanner() || hasFundsArrived) return;

    const intervalId = setInterval(() => {
      refetch();
    }, 5000);

    // Stop polling after 60 seconds
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
    }, 60000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [shouldShowBanner(), hasFundsArrived, refetch]);

  // Check if funds have arrived
  useEffect(() => {
    if (paymentTokenBalance && paymentTokenBalance.value > 0n && !hasFundsArrived) {
      setHasFundsArrived(true);
    }
  }, [paymentTokenBalance, hasFundsArrived]);

  const handleDismiss = () => {
    if (user) {
      const dismissKey = `dismissed-mint-${user.id}-${user.createdAt}`;
      localStorage.setItem(dismissKey, "true");
    }
    setIsDismissed(true);
  };

  if (!shouldShowBanner()) {
    return null;
  }

  return (
    <div
      className={`rounded-lg p-4 mb-6 ${
        hasFundsArrived
          ? "bg-green-50 border border-green-200"
          : "bg-blue-50 border border-blue-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {!hasFundsArrived && (
            <div className="mt-0.5">
              <LoadingSpinnerSmall color="blue" />
            </div>
          )}
          <div>
            {hasFundsArrived ? (
              <>
                <h3 className="text-sm font-semibold text-green-800 mb-1">Funds Received! 🎉</h3>
                <p className="text-sm text-green-700">
                  You now have $1,000 USDC(x) and can participate in contests.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-blue-800 mb-1">
                  Minting Your Testnet Funds
                </h3>
                <p className="text-sm text-blue-700">
                  We're minting $1,000 USDC(x) testnet tokens to your account. This may take 30-60
                  seconds...
                </p>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
          aria-label="Dismiss"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
