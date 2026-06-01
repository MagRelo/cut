import { useParams, Link } from "react-router-dom";
import { useChainId } from "wagmi";
import { getContractAddress } from "../../utils/blockchainUtils";
import { WalletTokenBalancesCard } from "../../components/admin/WalletTokenBalancesCard";
import { Send } from "../../components/user/Send";
import { PageHeader } from "../../components/common/PageHeader";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { useAdminUserDetailQuery } from "../../hooks/useAdminUserQueries";
import { useAuth } from "../../contexts/AuthContext";
import { PAYMENT_TOKEN_DECIMALS } from "../../lib/paymentTokenSpend";

export function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const chainId = useChainId();
  const { paymentTokenSymbol, paymentTokenDecimals } = useAuth();
  const { data, isLoading, error } = useAdminUserDetailQuery(userId);

  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress") ?? "";

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;
  const recipient = data?.walletAddress?.trim() ?? "";
  const showSend = Boolean(recipient && paymentTokenAddress);

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title={data?.name ?? "User"} />
        <Link to="/admin/users" className="text-sm text-blue-600 hover:text-blue-800 font-medium self-start sm:self-center">
          Back to list
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorMessage message={errorMessage || "Failed to load user"} />
      ) : !data ? (
        <p className="text-gray-600">User not found.</p>
      ) : (
        <>
          <div className="bg-white rounded-sm shadow border border-gray-200 p-4 text-sm space-y-1">
            <div>
              <span className="text-gray-500">Id:</span>{" "}
              <span className="font-mono text-gray-900">{data.id}</span>
            </div>
            <div>
              <span className="text-gray-500">Type:</span> {data.userType}
            </div>
            <div>
              <span className="text-gray-500">Email:</span> {data.email ?? "—"}
            </div>
            <div>
              <span className="text-gray-500">Phone:</span> {data.phone ?? "—"}
            </div>
            <div>
              <span className="text-gray-500">Verified:</span> {data.isVerified ? "Yes" : "No"}
            </div>
          </div>

          <WalletTokenBalancesCard
            title="On-chain balances (this user)"
            address={data.walletAddress ?? ""}
            chainId={chainId ?? 0}
            paymentTokenAddress={paymentTokenAddress}
            paymentTokenSymbol={paymentTokenSymbol ?? "xUSDC"}
            paymentTokenDecimals={paymentTokenDecimals ?? PAYMENT_TOKEN_DECIMALS}
            addressMissingMessage="No wallet on file for the current network (X-Cut-Chain-Id). The user may need to connect on this chain first."
          />

          {showSend && (
            <div className="bg-white rounded-sm shadow border border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-800 mb-2">Send from your wallet</h3>
              <p className="text-sm text-gray-600 mb-4">
                Uses your connected account to transfer to this user&rsquo;s address above.
              </p>
              <Send initialRecipientAddress={recipient} lockRecipient />
            </div>
          )}
        </>
      )}
    </div>
  );
}
