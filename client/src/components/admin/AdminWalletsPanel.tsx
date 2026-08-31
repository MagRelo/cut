import React from "react";
import { useChainId } from "wagmi";
import { WalletTokenBalancesCard } from "./WalletTokenBalancesCard";
import { getContractConfig, getNetworkLabel } from "../../utils/blockchainUtils";
import { useAuth } from "../../contexts/AuthContext";

const OPERATOR_ADDRESS = import.meta.env.VITE_OPERATOR_ADDRESS as string | undefined;
const DEPLOYER_ADDRESS = "0x853C54FB2e9d674A9a158B7F6e8F323d023f03c8";

export const AdminWalletsPanel: React.FC = () => {
  const chainId = useChainId();
  const { paymentTokenAddress, paymentTokenSymbol, paymentTokenDecimals } = useAuth();
  const contractConfig = getContractConfig(chainId);

  const referralPlatformRootAddress = contractConfig?.referralPlatformRootAddress ?? "";
  const networkLabel = getNetworkLabel(chainId);

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Platform Wallets</h2>
        <p className="text-sm text-gray-600 mt-1">
          Monitor balances for key platform addresses on {networkLabel} (Chain {chainId}).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <WalletTokenBalancesCard
          title="Operator (Oracle)"
          address={OPERATOR_ADDRESS ?? ""}
          chainId={chainId}
          paymentTokenAddress={paymentTokenAddress}
          paymentTokenSymbol={paymentTokenSymbol}
          paymentTokenDecimals={paymentTokenDecimals}
          addressMissingMessage="VITE_OPERATOR_ADDRESS is not configured. Set it in client/.env to monitor the operator wallet."
        />

        <WalletTokenBalancesCard
          title="Deployer"
          address={DEPLOYER_ADDRESS}
          chainId={chainId}
          paymentTokenAddress={paymentTokenAddress}
          paymentTokenSymbol={paymentTokenSymbol}
          paymentTokenDecimals={paymentTokenDecimals}
        />

        <WalletTokenBalancesCard
          title="Referral Platform Root"
          address={referralPlatformRootAddress}
          chainId={chainId}
          paymentTokenAddress={paymentTokenAddress}
          paymentTokenSymbol={paymentTokenSymbol}
          paymentTokenDecimals={paymentTokenDecimals}
          addressMissingMessage="Referral platform root address is not configured in chain contracts."
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Wallet Roles</h3>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-gray-900">Operator (Oracle)</dt>
            <dd className="text-gray-600 mt-0.5">
              Hot EOA for contest lifecycle operations (activate, lock, settle, cancel, push) and
              ReferralGraph registrations. Needs ETH for gas. Does not receive referral fees.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900">Deployer</dt>
            <dd className="text-gray-600 mt-0.5">
              One-time contract deployment key. Owns ReferralGraph (can authorize oracles).
              Should be kept cold after initial deploy.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900">Referral Platform Root</dt>
            <dd className="text-gray-600 mt-0.5">
              Cold wallet that receives the platform's share of referral network fees.
              Organic parent under REFERRAL_ROOT in the referral tree.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};
