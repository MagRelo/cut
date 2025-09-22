import { useReadContract, useAccount, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { PageHeader } from "../components/util/PageHeader";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import DepositManagerContract from "../utils/contracts/DepositManager.json";
import PlatformTokenContract from "../utils/contracts/PlatformToken.json";
import {
  createExplorerLinkJSX,
  useTokenSymbol,
  getContractAddress,
} from "../utils/blockchainUtils.tsx";

export function TokenManagerPage() {
  const { address } = useAccount();
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

  // Get Compound withdraw pause status
  const { data: isCompoundWithdrawPaused, isLoading: isCompoundWithdrawPausedLoading } =
    useReadContract({
      address: depositManagerAddress as `0x${string}`,
      abi: DepositManagerContract.abi,
      functionName: "isCompoundWithdrawPaused",
      query: {
        enabled: !!depositManagerAddress,
      },
    });

  // Get user's platform token balance (if address is available)
  const { data: userPlatformTokenBalance, isLoading: userPlatformTokenBalanceLoading } =
    useReadContract({
      address: platformTokenAddress as `0x${string}`,
      abi: PlatformTokenContract.abi,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
      query: {
        enabled: !!platformTokenAddress && !!address,
      },
    });

  // Format user's platform token balance for display
  const formattedUserPlatformTokenBalance = userPlatformTokenBalance
    ? Number(formatUnits(userPlatformTokenBalance as bigint, 18)).toFixed(2)
    : "0.00";

  // Calculate user's current value in USDC (1:1 ratio)
  const userCurrentValue = formattedUserPlatformTokenBalance;

  // Get contract addresses
  const { data: usdcTokenAddress, isLoading: usdcTokenAddressLoading } = useReadContract({
    address: depositManagerAddress as `0x${string}`,
    abi: DepositManagerContract.abi,
    functionName: "usdcToken",
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

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Deposit Manager" }]}
        className="mb-3"
      />
      <PageHeader title="Deposit Manager" className="mb-3" />

      {/* Platform Token Manager Overview */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 font-display mb-2">
          Deposit Manager Overview
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Current CUT Supply */}
          <div className="font-medium">
            CUT Supply
            <span className="text-gray-400 ml-2 text-sm">(CUT)</span>
          </div>
          <div className="text-right">
            {platformTokenSupplyLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : (
              `${formattedPlatformTokenSupply} CUT`
            )}
          </div>

          {/* Total Available Balance */}
          <div className="font-medium">
            Present Value
            <span className="text-gray-400 ml-2 text-sm">(cUSDC)</span>
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
          <div className="font-medium">Exchange Rate</div>
          <div className="text-right">1 CUT = 1 {paymentTokenSymbol || "USDC"}</div>
        </div>
      </div>

      {/* User-Specific Information */}
      {address && (
        <div className="bg-green-50 border border-green-200 rounded-lg shadow p-4 mb-4">
          <div className="text-lg font-semibold text-green-800 font-display mb-2">
            Your Token Manager Status
          </div>
          <div className="text-sm text-green-700 mb-2">
            Wallet: {address.slice(0, 6)}...{address.slice(-4)}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* User's Platform Token Balance */}
            <div className="font-medium">
              Your CUT Balance
              <span className="text-gray-400 ml-2 text-sm">(18 decimals)</span>
            </div>
            <div className="text-right">
              {userPlatformTokenBalanceLoading ? (
                <span className="text-gray-400 text-sm">Loading...</span>
              ) : (
                `${formattedUserPlatformTokenBalance} CUT`
              )}
            </div>

            {/* User's Current Value */}
            <div className="font-medium">
              Your Current Value
              <span className="text-gray-400 ml-2 text-sm">(USDC)</span>
            </div>
            <div className="text-right">
              {userPlatformTokenBalanceLoading ? (
                <span className="text-gray-400 text-sm">Loading...</span>
              ) : (
                `$${userCurrentValue}`
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compound Integration Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-blue-800 font-display mb-2">
          Compound V3 Integration Status
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Compound Supply Status */}
          <div className="font-medium">Compound Supply</div>
          <div className="text-right">
            {isCompoundSupplyPausedLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : isCompoundSupplyPaused ? (
              <span className="text-red-600">Paused</span>
            ) : (
              <span className="text-green-600">Active</span>
            )}
          </div>

          {/* Compound Withdraw Status */}
          <div className="font-medium">Compound Withdraw</div>
          <div className="text-right">
            {isCompoundWithdrawPausedLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : isCompoundWithdrawPaused ? (
              <span className="text-red-600">Paused</span>
            ) : (
              <span className="text-green-600">Active</span>
            )}
          </div>
        </div>

        <div className="mt-3 text-sm text-blue-700">
          <p className="mb-2">
            • {paymentTokenSymbol || "USDC"} is automatically supplied to Compound V3 for yield
            generation
          </p>
          <p className="mb-2">
            • If Compound is paused, {paymentTokenSymbol || "USDC"} is stored directly in the
            contract
          </p>
          <p>• Yield is retained by the platform for operational use</p>
        </div>
      </div>

      {/* Contract Addresses */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 font-display mb-2">
          Contract Addresses
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm">
          {/* USDC Token Address */}
          <div className="flex justify-between">
            <span className="font-medium">{paymentTokenSymbol || "USDC"} Token:</span>
            <span className="font-mono">
              {usdcTokenAddressLoading ? (
                <span className="text-gray-400">Loading...</span>
              ) : chainId && usdcTokenAddress ? (
                createExplorerLinkJSX(
                  usdcTokenAddress as string,
                  chainId,
                  `${(usdcTokenAddress as string)?.slice(0, 6)}...${(
                    usdcTokenAddress as string
                  )?.slice(-4)}`,
                  "text-blue-600 hover:text-blue-800 underline"
                )
              ) : (
                `${(usdcTokenAddress as string)?.slice(0, 6)}...${(
                  usdcTokenAddress as string
                )?.slice(-4)}`
              )}
            </span>
          </div>

          {/* Platform Token Address */}
          <div className="flex justify-between">
            <span className="font-medium">Platform Token:</span>
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
