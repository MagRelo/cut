import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { PageHeader } from "../components/util/PageHeader";
import { TreasuryBalanceChart } from "../components/common/TreasuryBalanceChart";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { treasuryAddress } from "../utils/contracts/sepolia.json";
import TreasuryContract from "../utils/contracts/Treasury.json";

export function TreasuryPage() {
  // Get treasury balance from contract
  const { data: treasuryBalance, isLoading: treasuryBalanceLoading } = useReadContract({
    address: treasuryAddress as `0x${string}`,
    abi: TreasuryContract.abi,
    functionName: "getTreasuryBalance",
  });

  // Format treasury balance for display
  const formattedTreasuryBalance = treasuryBalance
    ? Number(formatUnits(treasuryBalance as bigint, 6)).toFixed(2)
    : "0.00";

  // Calculate estimated earnings (balance * interest rate)
  const balance = treasuryBalance ? Number(formatUnits(treasuryBalance as bigint, 6)) : 0;
  const interestRate = 6.08; // 6.08% APY
  const estimatedEarnings = ((balance * interestRate) / 100).toFixed(2);

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "Treasury" }]}
        className="mb-3"
      />
      <PageHeader title="Treasury" className="mb-3" />

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 font-display mb-2">
          Platform Treasury
        </div>

        <TreasuryBalanceChart className="mb-4" />
        <div className="grid grid-cols-[100px_1fr] gap-2">
          {/* Treasury Balance */}
          <div className="font-medium">Balance</div>
          <div className="text-right">
            {treasuryBalanceLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : (
              `$${formattedTreasuryBalance}`
            )}
          </div>

          {/* Treasury Interest Rate */}
          <div className="font-medium">Interest Rate</div>
          <div className="text-right">6.08% APY</div>

          {/* Earnings */}
          <div className="font-medium">Est. Earnings</div>
          <div className="text-right">
            {treasuryBalanceLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : (
              `$${estimatedEarnings}`
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
