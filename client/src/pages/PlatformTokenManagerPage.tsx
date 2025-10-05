import { useReadContract, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { PageHeader } from "../components/util/PageHeader";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import DepositManagerContract from "../utils/contracts/DepositManager.json";
import PlatformTokenContract from "../utils/contracts/PlatformToken.json";
import cUSDCContract from "../utils/contracts/cUSDC.json";
import {
  createExplorerLinkJSX,
  useTokenSymbol,
  getContractAddress,
} from "../utils/blockchainUtils.tsx";

export function TokenManagerPage() {
  const chainId = useChainId();

  // Get contract addresses dynamically
  const depositManagerAddress = getContractAddress(chainId ?? 0, "depositManagerAddress");
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");

  // Get total USDC balance (contract + Compound)
  const { data: totalAvailableBalance, isLoading: totalAvailableBalanceLoading } = useReadContract({
    address: depositManagerAddress as `0x${string}`,
    abi: DepositManagerContract.abi,
    functionName: "getTotalAvailableBalance",
    query: {
      enabled: !!depositManagerAddress,
    },
  });

  // Format total available balance for display
  const formattedTotalAvailableBalance = totalAvailableBalance
    ? Number(formatUnits(totalAvailableBalance as bigint, 6)).toFixed(2)
    : "0.00";

  // Get USDC balance in contract
  const { data: contractUSDCBalance, isLoading: contractUSDCBalanceLoading } = useReadContract({
    address: depositManagerAddress as `0x${string}`,
    abi: DepositManagerContract.abi,
    functionName: "getTokenManagerUSDCBalance",
    query: {
      enabled: !!depositManagerAddress,
    },
  });

  // Format contract USDC balance for display
  const formattedContractUSDCBalance = contractUSDCBalance
    ? Number(formatUnits(contractUSDCBalance as bigint, 6)).toFixed(2)
    : "0.00";

  // Get USDC balance in Compound
  const { data: compoundUSDCBalance, isLoading: compoundUSDCBalanceLoading } = useReadContract({
    address: depositManagerAddress as `0x${string}`,
    abi: DepositManagerContract.abi,
    functionName: "getCompoundUSDCBalance",
    query: {
      enabled: !!depositManagerAddress,
    },
  });

  // Format compound USDC balance for display
  const formattedCompoundUSDCBalance = compoundUSDCBalance
    ? Number(formatUnits(compoundUSDCBalance as bigint, 6)).toFixed(2)
    : "0.00";

  // Get platform token supply directly from PlatformToken contract
  const { data: platformTokenSupply, isLoading: platformTokenSupplyLoading } = useReadContract({
    address: platformTokenAddress as `0x${string}`,
    abi: PlatformTokenContract.abi,
    functionName: "totalSupply",
    query: {
      enabled: !!platformTokenAddress,
    },
  });

  // Format platform token supply for display
  const formattedPlatformTokenSupply = platformTokenSupply
    ? Number(formatUnits(platformTokenSupply as bigint, 18)).toFixed(0)
    : "0";

  // Get Compound supply pause status
  const { data: isCompoundSupplyPaused, isLoading: isCompoundSupplyPausedLoading } =
    useReadContract({
      address: depositManagerAddress as `0x${string}`,
      abi: DepositManagerContract.abi,
      functionName: "isCompoundSupplyPaused",
      query: {
        enabled: !!depositManagerAddress,
      },
    });

  // Get payment token symbol
  const { data: paymentTokenSymbol } = useTokenSymbol(paymentTokenAddress as string);

  const {
    data: platformTokenAddressFromContract,
    isLoading: platformTokenAddressFromContractLoading,
  } = useReadContract({
    address: depositManagerAddress as `0x${string}`,
    abi: DepositManagerContract.abi,
    functionName: "platformToken",
    query: {
      enabled: !!depositManagerAddress,
    },
  });

  const { data: cUSDCAddress, isLoading: cUSDCAddressLoading } = useReadContract({
    address: depositManagerAddress as `0x${string}`,
    abi: DepositManagerContract.abi,
    functionName: "cUSDC",
    query: {
      enabled: !!depositManagerAddress,
    },
  });

  // Get cUSDC utilization rate
  const { data: cUSDCUtilization } = useReadContract({
    address: cUSDCAddress as `0x${string}`,
    abi: cUSDCContract.abi,
    functionName: "getUtilization",
    query: {
      enabled: !!cUSDCAddress,
    },
  });

  // Debug logging (remove when confirmed working)
  // console.log("🔍 Debug Info:");
  // console.log("depositManagerAddress:", depositManagerAddress);
  // console.log("cUSDCAddress:", cUSDCAddress);
  // console.log("cUSDCUtilization:", cUSDCUtilization);
  // console.log(
  //   "cUSDCContract ABI functions:",
  //   cUSDCContract.abi.map((f) => f.name)
  // );

  // Get cUSDC supply rate using utilization
  const { data: cUSDCSupplyRate, isLoading: cUSDCSupplyRateLoading } = useReadContract({
    address: cUSDCAddress as `0x${string}`,
    abi: cUSDCContract.abi,
    functionName: "getSupplyRate",
    args: cUSDCUtilization ? [cUSDCUtilization] : undefined,
    query: {
      enabled: !!cUSDCAddress && !!cUSDCUtilization,
    },
  });

  // console.log("cUSDCSupplyRate:", cUSDCSupplyRate);

  // Calculate APR from rates (following the example calculation)
  const secondsPerYear = 31536000n;
  const weiPerEther = 1000000000000000000n; // 10^18

  const calculateAPR = (ratePerSecond: bigint | undefined): number => {
    if (!ratePerSecond) return 0;

    // APR = (ratePerSecond * secondsPerYear) / 10^18
    // Convert to number first to avoid precision issues with bigint division
    const ratePerSecondNum = Number(ratePerSecond);
    const secondsPerYearNum = Number(secondsPerYear);
    const weiPerEtherNum = Number(weiPerEther);

    const apr = (ratePerSecondNum * secondsPerYearNum) / weiPerEtherNum;
    return apr * 100; // Convert decimal to percentage (0.0315 -> 3.15%)
  };

  const formattedSupplyAPR = calculateAPR(cUSDCSupplyRate as bigint | undefined);

  // Calculate utilization percentage
  const calculateUtilizationPercentage = (utilization: bigint | undefined): number => {
    if (!utilization) return 0;

    // Utilization is typically returned as a fraction with 18 decimals
    // Convert to percentage: (utilization / 10^18) * 100
    const utilizationNum = Number(utilization);
    const weiPerEtherNum = Number(weiPerEther);
    return (utilizationNum / weiPerEtherNum) * 100;
  };

  const formattedUtilization = calculateUtilizationPercentage(
    cUSDCUtilization as bigint | undefined
  );

  // Debug logging (remove when confirmed working)
  // console.log("📊 APR Calculations:");
  // console.log("formattedSupplyAPR:", formattedSupplyAPR);
  // console.log("Raw supply rate:", cUSDCSupplyRate);

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Token Manager" }]}
        className="mb-3"
      />
      <PageHeader title="CUT Token" className="mb-3" />

      {/* CUT Token Hero Card */}
      <div className="relative bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl shadow-lg border border-emerald-200 overflow-hidden mb-6">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20"></div>
        </div>

        <div className="relative p-6">
          {/* Header with Logo and Title */}
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center">
              <img
                src="/logo-transparent.png"
                alt="CUT Token Logo"
                className="w-12 h-12 object-contain"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 font-display mb-1">CUT</h1>
              <p className="text-sm text-emerald-700 font-medium">the Cut Platform Token</p>
            </div>
          </div>

          {/* Token Description */}
          <div className="p-2 mb-4">
            <p className="text-emerald-900 leading-relaxed font-medium">
              CUT Token is a ERC-20 token powering the Bet the Cut platform. The CUT token is
              integrated with Compound V3 Comet to generate yield on USDC deposits.
            </p>
          </div>

          {/* Token Stats */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-900">
                {platformTokenSupplyLoading ? "..." : formattedPlatformTokenSupply}
              </div>
              <div className="text-xs text-gray-600">Total Supply</div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-900">
                ${formattedTotalAvailableBalance}
              </div>
              <div className="text-xs text-gray-600">Total Value Locked</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-600">
                {isCompoundSupplyPaused ? "Paused" : "Active"}
              </div>
              <div className="text-xs text-gray-600">Compound Status</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-600">
                {formattedSupplyAPR.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-600">Supply APY</div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Token Manager Overview */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 font-display mb-2">
          Token Manager Overview
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Exchange Rate */}
          <div className="font-medium">
            Deposits
            <span className="text-gray-400 ml-2 text-sm">(USDC)</span>
          </div>
          <div className="text-right">${formattedTotalAvailableBalance}</div>

          {/* Current CUT Supply */}
          <div className="font-medium">
            CUT Minted
            <span className="text-gray-400 ml-2 text-sm">(CUT)</span>
          </div>
          <div className="text-right">
            {platformTokenSupplyLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : (
              `${formattedPlatformTokenSupply}`
            )}
          </div>

          {/* Total Available Balance */}
          <div className="font-medium">
            Available Balance
            {/* <span className="text-gray-400 ml-2 text-sm">(cUSDC)</span> */}
          </div>
          <div className="text-right">
            {totalAvailableBalanceLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : (
              `$${formattedTotalAvailableBalance}`
            )}
          </div>

          {/* Compound USDC Balance */}
          <div className="font-medium text-sm text-gray-600 ml-4">
            c{paymentTokenSymbol || "USDC"} Balance
            <span className="text-gray-400 ml-2 text-xs">(c{paymentTokenSymbol || "USDC"})</span>
          </div>
          <div className="text-right text-sm text-gray-600">
            {compoundUSDCBalanceLoading ? (
              <span className="text-gray-400 text-xs">Loading...</span>
            ) : (
              `$${formattedCompoundUSDCBalance}`
            )}
          </div>

          {/* Contract USDC Balance */}
          <div className="font-medium text-sm text-gray-600 ml-4">
            {paymentTokenSymbol || "USDC"} Balance
            <span className="text-gray-400 ml-2 text-xs">({paymentTokenSymbol || "USDC"})</span>
          </div>
          <div className="text-right text-sm text-gray-600">
            {contractUSDCBalanceLoading ? (
              <span className="text-gray-400 text-xs">Loading...</span>
            ) : (
              `$${formattedContractUSDCBalance}`
            )}
          </div>

          {/* Exchange Rate */}
          {/* <div className="font-medium">Exchange Rate</div> */}
          {/* <div className="text-right">1 CUT = 1 {paymentTokenSymbol || "USDC"}</div> */}
        </div>
      </div>

      {/* Compound Integration Status */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
        <div className="text-lg font-semibold text-blue-600 font-display mb-2">
          Compound V3 Integration
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Compound Supply Status */}
          <div className="font-medium text-slate-700">Supply Status</div>
          <div className="text-right">
            {isCompoundSupplyPausedLoading ? (
              <span className="text-slate-400 text-sm">Loading...</span>
            ) : isCompoundSupplyPaused ? (
              <span className="text-amber-600 font-medium">Paused</span>
            ) : (
              <span className="text-emerald-600 font-medium">Active</span>
            )}
          </div>

          {/* Current Utilization rate for market */}
          <div className="font-medium text-slate-700">Utilization Rate</div>
          <div className="text-right">
            {cUSDCUtilization === undefined ? (
              <span className="text-slate-400 text-sm">Loading...</span>
            ) : (
              <span className="text-slate-600 font-medium">{`${formattedUtilization.toFixed(
                2
              )}%`}</span>
            )}
          </div>

          {/* Current Supply rate for market */}
          <div className="font-medium text-slate-700">Supply APY</div>
          <div className="text-right">
            {isCompoundSupplyPausedLoading || cUSDCSupplyRateLoading ? (
              <span className="text-slate-400 text-sm">Loading...</span>
            ) : isCompoundSupplyPaused ? (
              <span className="text-amber-600 font-medium">N/A</span>
            ) : (
              <span className="text-slate-600 font-medium">{`${formattedSupplyAPR.toFixed(
                2
              )}%`}</span>
            )}
          </div>
        </div>
      </div>

      {/* Contract Addresses */}
      <div className="bg-white border border-gray-200 rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 font-display mb-2">
          Contract Addresses
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm">
          {/* Platform Token Address */}
          <div className="flex justify-between">
            <span className="font-medium">CUT Token:</span>
            <span className="font-mono">
              {platformTokenAddressFromContractLoading ? (
                <span className="text-gray-400">Loading...</span>
              ) : chainId && platformTokenAddressFromContract ? (
                createExplorerLinkJSX(
                  platformTokenAddressFromContract as string,
                  chainId,
                  `${(platformTokenAddressFromContract as string)?.slice(0, 6)}...${(
                    platformTokenAddressFromContract as string
                  )?.slice(-4)}`,
                  "text-blue-600 hover:text-blue-800 underline"
                )
              ) : (
                `${(platformTokenAddressFromContract as string)?.slice(0, 6)}...${(
                  platformTokenAddressFromContract as string
                )?.slice(-4)}`
              )}
            </span>
          </div>

          {/* Deposit Manager Address */}
          <div className="flex justify-between">
            <span className="font-medium">CUT Token Manager:</span>
            <span className="font-mono">
              {chainId && depositManagerAddress ? (
                createExplorerLinkJSX(
                  depositManagerAddress as string,
                  chainId,
                  `${(depositManagerAddress as string)?.slice(0, 6)}...${(
                    depositManagerAddress as string
                  )?.slice(-4)}`,
                  "text-blue-600 hover:text-blue-800 underline"
                )
              ) : (
                <span className="text-gray-400">Loading...</span>
              )}
            </span>
          </div>

          {/* cUSDC Address */}
          <div className="flex justify-between">
            <span className="font-medium">Compound c{paymentTokenSymbol || "USDC"}:</span>
            <span className="font-mono">
              {cUSDCAddressLoading ? (
                <span className="text-gray-400">Loading...</span>
              ) : chainId && cUSDCAddress ? (
                createExplorerLinkJSX(
                  cUSDCAddress as string,
                  chainId,
                  `${(cUSDCAddress as string)?.slice(0, 6)}...${(cUSDCAddress as string)?.slice(
                    -4
                  )}`,
                  "text-blue-600 hover:text-blue-800 underline"
                )
              ) : (
                `${(cUSDCAddress as string)?.slice(0, 6)}...${(cUSDCAddress as string)?.slice(-4)}`
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
