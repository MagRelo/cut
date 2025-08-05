import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { PageHeader } from "../components/util/PageHeader";
// import { TreasuryBalanceChart } from "../components/common/TreasuryBalanceChart";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { treasuryAddress, platformTokenAddress } from "../utils/contracts/sepolia.json";
import TreasuryContract from "../utils/contracts/Treasury.json";
import PlatformTokenContract from "../utils/contracts/PlatformToken.json";

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

  // getCompoundYield() from Treasury contract
  const { data: compoundYield, isLoading: compoundYieldLoading } = useReadContract({
    address: treasuryAddress as `0x${string}`,
    abi: TreasuryContract.abi,
    functionName: "getCompoundYield",
  });

  // Format compound yield for display
  const formattedCompoundYield = compoundYield
    ? Number(formatUnits(compoundYield as bigint, 6)).toFixed(6)
    : "0.000000";

  // Get total USDC balance (original deposits)
  const { data: totalUSDCBalance, isLoading: totalUSDCBalanceLoading } = useReadContract({
    address: treasuryAddress as `0x${string}`,
    abi: TreasuryContract.abi,
    functionName: "totalUSDCBalance",
  });

  // Format total USDC balance for display
  const formattedTotalUSDCBalance = totalUSDCBalance
    ? Number(formatUnits(totalUSDCBalance as bigint, 6)).toFixed(2)
    : "0.00";

  // Get platform token supply directly from PlatformToken contract
  const { data: platformTokenSupply, isLoading: platformTokenSupplyLoading } = useReadContract({
    address: platformTokenAddress as `0x${string}`,
    abi: PlatformTokenContract.abi,
    functionName: "totalSupply",
  });

  // Format platform token supply for display
  const formattedPlatformTokenSupply = platformTokenSupply
    ? Number(formatUnits(platformTokenSupply as bigint, 18)).toFixed(0)
    : "0.00";

  // Get exchange rate
  const { data: exchangeRate, isLoading: exchangeRateLoading } = useReadContract({
    address: treasuryAddress as `0x${string}`,
    abi: TreasuryContract.abi,
    functionName: "getExchangeRate",
  });

  // Format exchange rate for display (convert from 18 decimals)
  const formattedExchangeRate = exchangeRate
    ? Number(formatUnits(exchangeRate as bigint, 18)).toFixed(4)
    : "1.00";

  // Calculate yield percentage
  // const yieldPercentage =
  //   compoundYield &&
  //   totalUSDCBalance &&
  //   typeof totalUSDCBalance === "bigint" &&
  //   totalUSDCBalance > 0n
  //     ? (
  //         (Number(formatUnits(compoundYield as bigint, 6)) /
  //           Number(formatUnits(totalUSDCBalance, 6))) *
  //         100
  //       ).toFixed(4)
  //     : "0.0000";

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "Treasury" }]}
        className="mb-3"
      />
      <PageHeader title="Treasury" className="mb-3" />

      {/* Yield Information Card */}
      <div className="bg-green-50 border border-green-200 rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-green-800 font-display mb-2">
          Yield Information
        </div>
        <ul className="text-sm text-green-700 list-disc list-outside space-y-1 pl-4">
          <li>
            All deposits are continuously earning yield by providing liquidity to{" "}
            <a
              href="https://app.compound.finance/markets/usdc-basemainnet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Compound Finance
            </a>
            .
          </li>
          <li>Yield rates are dynamic and change based on market conditions.</li>
          <li>All yield is automatically compounded.</li>
          <li>When you withdraw, you receive your original deposit + accumulated yield.</li>
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 font-display mb-2">
          Platform Treasury
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Original Deposits */}
          <div className="font-medium">
            Deposits
            <span className="text-gray-400 ml-2 text-sm">(USDC)</span>
          </div>
          <div className="text-right">
            {totalUSDCBalanceLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : (
              `$${formattedTotalUSDCBalance}`
            )}
          </div>

          {/* Treasury Balance */}
          <div className="font-medium">
            Balance
            <span className="text-gray-400 ml-2 text-sm">(cUSDC)</span>
          </div>
          <div className="text-right">
            {treasuryBalanceLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : (
              `$${formattedTreasuryBalance}`
            )}
          </div>

          {/* Compound Yield */}
          <div className="font-medium">Yield Earned</div>
          <div className="text-right">
            {compoundYieldLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : (
              `$${formattedCompoundYield}`
            )}
          </div>

          {/* Yield Percentage */}
          {/* <div className="font-medium">Yield %</div>
          <div className="text-right text-green-600 font-semibold">
            {compoundYieldLoading || totalUSDCBalanceLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : (
              `${yieldPercentage}%`
            )}
          </div> */}

          {/* Platform Token Supply */}
          <div className="font-medium">CUT Supply</div>
          <div className="text-right">
            {platformTokenSupplyLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : (
              `${formattedPlatformTokenSupply} CUT`
            )}
          </div>

          {/* Exchange Rate */}
          <div className="font-medium">Exchange Rate</div>
          <div className="text-right">
            {exchangeRateLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : (
              `1 CUT = $${formattedExchangeRate}`
            )}
          </div>
        </div>
      </div>

      {/* <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 font-display mb-2">
          Historical Balance
        </div>
        <TreasuryBalanceChart className="mb-4" />
      </div> */}
    </div>
  );
}
