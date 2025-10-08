import { useState, useEffect } from "react";
import { useReadContract, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/util/PageHeader.tsx";
import { Breadcrumbs } from "../components/util/Breadcrumbs.tsx";
import { ChainWarning, TestnetWarning } from "../components/util/ChainWarning.tsx";
// import { TokenBalances } from "../components/user/TokenBalances";
import { Buy } from "../components/user/Buy.tsx";
import { Sell } from "../components/user/Sell.tsx";
import { Transfer } from "../components/user/Transfer.tsx";
import DepositManagerContract from "../utils/contracts/DepositManager.json";
import PlatformTokenContract from "../utils/contracts/PlatformToken.json";
import cUSDCContract from "../utils/contracts/cUSDC.json";
import {
  createExplorerLinkJSX,
  useTokenSymbol,
  getContractAddress,
} from "../utils/blockchainUtils.tsx";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function CUTInfoPage() {
  const chainId = useChainId();
  const [searchParams] = useSearchParams();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Check query params for tab selection
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      // Map tab names to indices
      const tabMap: { [key: string]: number } = {
        buy: 0,
        sell: 1,
        transfer: 2,
      };

      const tabIndex = tabMap[tab.toLowerCase()];
      if (tabIndex !== undefined) {
        setSelectedIndex(tabIndex);
      }
    }
  }, [searchParams]);

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
        items={[{ label: "Account", path: "/account" }, { label: "CUT Token" }]}
        className="mb-3"
      />
      <PageHeader title="CUT Token" className="mb-3" />

      {/* Chain Warnings */}
      <ChainWarning />
      <TestnetWarning />

      {/* CUT Token Hero Card */}
      <div className="relative bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl shadow-lg border border-emerald-200 overflow-hidden mb-6">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20"></div>
        </div>

        <div className="relative p-6">
          {/* Header with Logo and Title */}
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center">
              <img
                src="/logo-transparent.png"
                alt="CUT Token Logo"
                className="w-12 h-12 object-contain"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 font-display mb-1">CUT</h1>
              <p className="text-sm text-emerald-700 font-medium">ERC-20 token</p>
            </div>
          </div>

          {/* Token Description */}
          <div className="p-2 mb-4">
            <p className="text-emerald-900 leading-relaxed font-medium">
              The CUT token is the currency that powers the Cut platform. CUT is always backed by
              (and convertable to) USDC at a 1:1 ratio. USDC deposits are held in Compound III in
              order to generate yield for platform rewards.
            </p>
          </div>

          {/* Token Stats */}
          <div className="mt-4 space-y-4">
            {/* Token Section */}
            <div>
              <h3 className="text-sm font-semibold text-emerald-900 mb-2 px-1">CUT Token</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-800">
                    ${totalAvailableBalanceLoading ? "..." : formattedTotalAvailableBalance}
                  </div>
                  <div className="text-xs text-gray-600">USDC Deposited</div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-800">
                    {platformTokenSupplyLoading ? "..." : formattedPlatformTokenSupply}
                  </div>
                  <div className="text-xs text-gray-600">CUT Minted</div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-800">∞</div>
                  <div className="text-xs text-gray-600">Max Supply</div>
                </div>
              </div>
            </div>

            {/* Deposits Section */}
            <div>
              <h3 className="text-sm font-semibold text-emerald-900 mb-2 px-1">
                <a
                  href="https://app.compound.finance/?market=usdc-basemainnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-900 hover:text-green-600 underline"
                >
                  Compound III
                </a>{" "}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-800">
                    {cUSDCUtilization === undefined ? "..." : `${formattedUtilization.toFixed(2)}%`}
                  </div>
                  <div className="text-xs text-gray-600">Utilization Rate</div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-800">
                    {cUSDCSupplyRateLoading ? "..." : `${formattedSupplyAPR.toFixed(2)}%`}
                  </div>
                  <div className="text-xs text-gray-600">Supply APY</div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-800">
                    {compoundUSDCBalanceLoading ? "..." : `$${formattedCompoundUSDCBalance}`}
                  </div>
                  <div className="text-xs text-gray-600">cUSDC Balance</div>
                </div>
              </div>
            </div>
          </div>

          {/* Buy/Sell/Transfer Tabs */}
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-lg border border-emerald-200/50">
            <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
              <TabList className="flex space-x-1 border-b border-gray-200 px-4">
                <Tab
                  className={({ selected }: { selected: boolean }) =>
                    classNames(
                      "w-full py-2 text-sm font-medium leading-5",
                      "focus:outline-none",
                      selected
                        ? "border-b-2 border-green-600 text-green-700"
                        : "text-gray-600 hover:border-emerald-300 hover:text-gray-800"
                    )
                  }
                >
                  Buy
                </Tab>
                <Tab
                  className={({ selected }: { selected: boolean }) =>
                    classNames(
                      "w-full py-2 text-sm font-medium leading-5",
                      "focus:outline-none",
                      selected
                        ? "border-b-2 border-green-600 text-green-700"
                        : "text-gray-600 hover:border-emerald-300 hover:text-gray-800"
                    )
                  }
                >
                  Sell
                </Tab>
                <Tab
                  className={({ selected }: { selected: boolean }) =>
                    classNames(
                      "w-full py-2 text-sm font-medium leading-5",
                      "focus:outline-none",
                      selected
                        ? "border-b-2 border-green-600 text-green-700"
                        : "text-gray-600 hover:border-emerald-300 hover:text-gray-800"
                    )
                  }
                >
                  Transfer
                </Tab>
              </TabList>
              <div className="p-4">
                <TabPanel>
                  <Buy />
                </TabPanel>
                <TabPanel>
                  <Sell />
                </TabPanel>
                <TabPanel>
                  <Transfer />
                </TabPanel>
              </div>
            </TabGroup>
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
