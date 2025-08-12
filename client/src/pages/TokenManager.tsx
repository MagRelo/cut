import { useReadContract, useAccount, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { PageHeader } from "../components/util/PageHeader";
// import { TokenManagerBalanceChart } from "../components/common/TokenManagerBalanceChart";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { tokenManagerAddress, platformTokenAddress } from "../utils/contracts/sepolia.json";
import TokenManagerContract from "../utils/contracts/TokenManager.json";
import PlatformTokenContract from "../utils/contracts/PlatformToken.json";
import { createExplorerLinkJSX } from "../utils/blockchain";

export function TokenManagerPage() {
  const { address } = useAccount();
  const chainId = useChainId();

  // Get token manager balance from contract (includes yield)
  const { data: tokenManagerBalance, isLoading: tokenManagerBalanceLoading } = useReadContract({
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "getTokenManagerBalance",
  });

  // Format token manager balance for display
  const formattedTokenManagerBalance = tokenManagerBalance
    ? Number(formatUnits(tokenManagerBalance as bigint, 6)).toFixed(2)
    : "0.00";

  // Get total USDC balance (original purchases)
  const { data: totalUSDCBalance, isLoading: totalUSDCBalanceLoading } = useReadContract({
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "totalUSDCBalance",
  });

  // Format total USDC balance for display
  const formattedTotalUSDCBalance = totalUSDCBalance
    ? Number(formatUnits(totalUSDCBalance as bigint, 6)).toFixed(2)
    : "0.00";

  // Calculate total yield generated
  const totalYieldGenerated =
    tokenManagerBalance && totalUSDCBalance
      ? Number(
          formatUnits((tokenManagerBalance as bigint) - (totalUSDCBalance as bigint), 6)
        ).toFixed(2)
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
    : "0";

  // Get exchange rate (fixed function call)
  const { data: exchangeRate, isLoading: exchangeRateLoading } = useReadContract({
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "getExchangeRateExternal",
  });

  // Format exchange rate for display (convert from 6 decimals to show as USDC per token)
  const formattedExchangeRate = exchangeRate
    ? Number(formatUnits(exchangeRate as bigint, 6)).toFixed(4)
    : "1.0000";

  // Get total platform tokens minted
  const { data: totalPlatformTokensMinted, isLoading: totalPlatformTokensMintedLoading } =
    useReadContract({
      address: tokenManagerAddress as `0x${string}`,
      abi: TokenManagerContract.abi,
      functionName: "totalPlatformTokensMinted",
    });

  // Format total platform tokens minted for display
  const formattedTotalPlatformTokensMinted = totalPlatformTokensMinted
    ? Number(formatUnits(totalPlatformTokensMinted as bigint, 18)).toFixed(0)
    : "0";

  // Get system-wide accumulated yield per token
  const { data: accumulatedYieldPerToken, isLoading: accumulatedYieldPerTokenLoading } =
    useReadContract({
      address: tokenManagerAddress as `0x${string}`,
      abi: TokenManagerContract.abi,
      functionName: "getAccumulatedYieldPerToken",
    });

  // Get last yield update time
  const { data: lastYieldUpdateTime, isLoading: lastYieldUpdateTimeLoading } = useReadContract({
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "getLastYieldUpdateTime",
  });

  // Format last yield update time
  const formattedLastYieldUpdateTime = lastYieldUpdateTime
    ? new Date(Number(lastYieldUpdateTime) * 1000).toLocaleString()
    : "Never";

  // Get user's platform token balance (if address is available)
  const { data: userPlatformTokenBalance, isLoading: userPlatformTokenBalanceLoading } =
    useReadContract({
      address: platformTokenAddress as `0x${string}`,
      abi: PlatformTokenContract.abi,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
    });

  // Format user's platform token balance for display
  const formattedUserPlatformTokenBalance = userPlatformTokenBalance
    ? Number(formatUnits(userPlatformTokenBalance as bigint, 18)).toFixed(2)
    : "0.00";

  // Calculate user's current value in USDC
  const userCurrentValue =
    userPlatformTokenBalance && exchangeRate
      ? Number(
          formatUnits(
            ((userPlatformTokenBalance as bigint) * (exchangeRate as bigint)) / BigInt(1e18),
            6
          )
        ).toFixed(2)
      : "0.00";

  // Get user's claimable yield (if address is available)
  const { data: userClaimableYield, isLoading: userClaimableYieldLoading } = useReadContract({
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "getClaimableYield",
    args: address ? [address] : undefined,
  });

  // Format user's claimable yield for display
  const formattedUserClaimableYield = userClaimableYield
    ? Number(formatUnits(userClaimableYield as bigint, 6)).toFixed(6)
    : "0.000000";

  // Get user's last yield per token (if address is available)
  const { data: userLastYieldPerToken, isLoading: userLastYieldPerTokenLoading } = useReadContract({
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "userLastYieldPerToken",
    args: address ? [address] : undefined,
  });

  // Format user's last yield per token for display
  const formattedUserLastYieldPerToken = userLastYieldPerToken
    ? Number(formatUnits(userLastYieldPerToken as bigint, 18)).toFixed(6)
    : "0.000000";

  // Get user's accumulated yield (if address is available)
  const { data: userAccumulatedYield, isLoading: userAccumulatedYieldLoading } = useReadContract({
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "userAccumulatedYield",
    args: address ? [address] : undefined,
  });

  // Format user's accumulated yield for display
  const formattedUserAccumulatedYield = userAccumulatedYield
    ? Number(formatUnits(userAccumulatedYield as bigint, 6)).toFixed(6)
    : "0.000000";

  // Get contract addresses
  const { data: usdcTokenAddress, isLoading: usdcTokenAddressLoading } = useReadContract({
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "usdcToken",
  });

  const {
    data: platformTokenAddressFromContract,
    isLoading: platformTokenAddressFromContractLoading,
  } = useReadContract({
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "platformToken",
  });

  const { data: cUSDCAddress, isLoading: cUSDCAddressLoading } = useReadContract({
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "cUSDC",
  });

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "Token Manager" }]}
        className="mb-3"
      />
      <PageHeader title="Token Manager" className="mb-3" />

      {/* Platform Token Manager Overview */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 font-display mb-2">
          Platform Token Manager Overview
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Total Purchases */}
          <div className="font-medium">
            Total Purchases
            <span className="text-gray-400 ml-2 text-sm">(USDC)</span>
          </div>
          <div className="text-right">
            {totalUSDCBalanceLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : (
              `$${formattedTotalUSDCBalance}`
            )}
          </div>

          {/* Total Yield Generated */}
          <div className="font-medium">
            Total Yield Generated
            <span className="text-gray-400 ml-2 text-sm">(USDC)</span>
          </div>
          <div className="text-right text-green-600">
            {tokenManagerBalanceLoading || totalUSDCBalanceLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : (
              `$${totalYieldGenerated}`
            )}
          </div>

          {/* Total Balance (including yield) */}
          <div className="font-medium">
            Total Balance
            <span className="text-gray-400 ml-2 text-sm">(USDC + Yield)</span>
          </div>
          <div className="text-right">
            {tokenManagerBalanceLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : (
              `$${formattedTokenManagerBalance}`
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

          {/* Total CUT Minted */}
          <div className="font-medium">
            Total CUT Minted
            <span className="text-gray-400 ml-2 text-sm">(18 decimals)</span>
          </div>
          <div className="text-right">
            {totalPlatformTokensMintedLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : (
              `${formattedTotalPlatformTokensMinted} CUT`
            )}
          </div>

          {/* Current CUT Supply */}
          <div className="font-medium">Current CUT Supply</div>
          <div className="text-right">
            {platformTokenSupplyLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : (
              `${formattedPlatformTokenSupply} CUT`
            )}
          </div>
        </div>
      </div>

      {/* Yield System Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-green-800 font-display mb-2">
          Yield System Information
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* System Accumulated Yield Per Token */}
          <div className="font-medium">
            System Yield Per Token
            <span className="text-gray-400 ml-2 text-sm">(18 decimals)</span>
          </div>
          <div className="text-right">
            {accumulatedYieldPerTokenLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : accumulatedYieldPerToken ? (
              Number(formatUnits(accumulatedYieldPerToken as bigint, 18)).toFixed(6)
            ) : (
              "0.000000"
            )}
          </div>

          {/* Last Yield Update */}
          <div className="font-medium">Last Yield Update</div>
          <div className="text-right text-sm">
            {lastYieldUpdateTimeLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : (
              formattedLastYieldUpdateTime
            )}
          </div>
        </div>

        <div className="mt-3 text-sm text-green-700">
          <p className="mb-2">• All purchases earn yield through Compound Finance integration</p>
          <p className="mb-2">
            • Yield is automatically compounded and reflected in the exchange rate
          </p>
          <p>• When you withdraw, you receive your original amount plus accumulated yield</p>
        </div>
      </div>

      {/* User-Specific Information */}
      {address && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg shadow p-4 mb-4">
          <div className="text-lg font-semibold text-blue-800 font-display mb-2">
            Your Token Manager Status
          </div>
          <div className="text-sm text-blue-700 mb-2">
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
              {userPlatformTokenBalanceLoading || exchangeRateLoading ? (
                <span className="text-gray-400 text-sm">Loading...</span>
              ) : (
                `$${userCurrentValue}`
              )}
            </div>

            {/* User's Claimable Yield */}
            <div className="font-medium">
              Your Claimable Yield
              <span className="text-gray-400 ml-2 text-sm">(USDC)</span>
            </div>
            <div className="text-right text-green-600">
              {userClaimableYieldLoading ? (
                <span className="text-gray-400 text-sm">Loading...</span>
              ) : (
                `$${formattedUserClaimableYield}`
              )}
            </div>

            {/* User's Accumulated Yield */}
            <div className="font-medium">
              Your Accumulated Yield
              <span className="text-gray-400 ml-2 text-sm">(USDC)</span>
            </div>
            <div className="text-right">
              {userAccumulatedYieldLoading ? (
                <span className="text-gray-400 text-sm">Loading...</span>
              ) : (
                `$${formattedUserAccumulatedYield}`
              )}
            </div>

            {/* User's Last Yield Per Token */}
            <div className="font-medium">
              Your Last Yield Per Token
              <span className="text-gray-400 ml-2 text-sm">(18 decimals)</span>
            </div>
            <div className="text-right text-sm">
              {userLastYieldPerTokenLoading ? (
                <span className="text-gray-400">Loading...</span>
              ) : (
                formattedUserLastYieldPerToken
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contract Addresses */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 font-display mb-2">
          Contract Addresses
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm">
          {/* USDC Token Address */}
          <div className="flex justify-between">
            <span className="font-medium">USDC Token:</span>
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
            <span className="font-medium">Compound cUSDC:</span>
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

      {/* Test Network Warning Card */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-yellow-800 font-display mb-2">
          ⚠️ Test Network Notice
        </div>
        <div className="text-sm text-yellow-700">
          <p className="mb-2">
            This project is currently deployed on a test network (Base Sepolia). No actual value is
            involved or earned in this environment.
          </p>
          <p>
            When deployed to mainnet, real USDC purchases will earn actual yield through Compound
            Finance integration.
          </p>
        </div>
      </div>

      {/* <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 font-display mb-2">
          Historical Balance
        </div>
        <TokenManagerBalanceChart className="mb-4" />
      </div> */}
    </div>
  );
}
