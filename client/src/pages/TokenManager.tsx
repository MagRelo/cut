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

  // Get token manager balance from contract
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
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "getExchangeRate",
  });

  // Format exchange rate for display (convert from 18 decimals)
  const formattedExchangeRate = exchangeRate
    ? Number(formatUnits(exchangeRate as bigint, 18)).toFixed(4)
    : "1.00";

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

      {/* Platform Token Manager Figures */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 font-display mb-2">
          Platform Token Manager Overview
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Original Purchases */}
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

          {/* Total Platform Tokens Minted */}
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

          {/* Token Manager Balance */}
          <div className="font-medium">
            Total Balance
            <span className="text-gray-400 ml-2 text-sm">(cUSDC)</span>
          </div>
          <div className="text-right">
            {tokenManagerBalanceLoading ? (
              <span className="text-gray-400 text-sm">Loading...</span>
            ) : (
              `$${formattedTokenManagerBalance}`
            )}
          </div>

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

      {/* User-Specific Information */}
      {address && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg shadow p-4 mb-4">
          <div className="text-lg font-semibold text-blue-800 font-display mb-2">
            Your Yield Information
          </div>
          <div className="text-sm text-blue-700 mb-2">
            Wallet: {address.slice(0, 6)}...{address.slice(-4)}
          </div>

          <div className="grid grid-cols-2 gap-2">
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

            {/* User's Last Yield Per Token */}
            <div className="font-medium">
              Your Last Yield Per Token
              <span className="text-gray-400 ml-2 text-sm">(18 decimals)</span>
            </div>
            <div className="text-right">
              {userLastYieldPerTokenLoading ? (
                <span className="text-gray-400 text-sm">Loading...</span>
              ) : (
                formattedUserLastYieldPerToken
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

      {/* Yield Information Card */}
      <div className="bg-green-50 border border-green-200 rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-green-800 font-display mb-2">
          Yield Information
        </div>
        <ul className="text-sm text-green-700 list-disc list-outside space-y-1 pl-4">
          <li>
            All purchases are continuously earning yield by providing liquidity to{" "}
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
          <li>When you sell, you receive your original buy amount + accumulated yield.</li>
        </ul>
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
