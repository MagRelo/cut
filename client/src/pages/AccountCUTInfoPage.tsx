import { useState, useEffect } from "react";
import { useReadContract, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useSearchParams } from "react-router-dom";
// import { PageHeader } from "../components/common/PageHeader.tsx";
import { Breadcrumbs } from "../components/common/Breadcrumbs.tsx";
// import { TestnetWarning } from "../components/common/ChainWarning.tsx";
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

  // Debug logging (remove when confirmed working)
  // console.log("📊 APR Calculations:");
  // console.log("formattedSupplyAPR:", formattedSupplyAPR);
  // console.log("Raw supply rate:", cUSDCSupplyRate);

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "CUT" }]}
        className="mb-3"
      />
      {/* <PageHeader title="About CUT" className="mb-3" /> */}

      {/* CUT Token Info Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        {/* Header with Logo and Title */}
        <div className="flex items-center mb-2">
          <img src="/logo-transparent.png" alt="CUT" className="h-12 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900 font-display">What is CUT?</h2>
        </div>

        {/* Token Description */}
        <div className="text-md text-gray-700 font-display mb-4">
          <p>
            CUT is the native currency of the Cut platform. Each CUT is backed by and convertible to
            USDC at a 1:1 ratio. USDC deposits are held in Compound to generate yield.
          </p>
        </div>

        {/* Token Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {platformTokenSupplyLoading ? "..." : formattedPlatformTokenSupply}
            </div>
            <div className="text-sm text-gray-600 mt-1">CUT Minted</div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {cUSDCSupplyRateLoading ? "..." : `${formattedSupplyAPR.toFixed(2)}%`}
            </div>
            <div className="text-sm text-gray-600 mt-1">Supply APY</div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {compoundUSDCBalanceLoading ? "..." : `$${formattedCompoundUSDCBalance}`}
            </div>
            <div className="text-sm text-gray-600 mt-1">cUSDC Balance</div>
          </div>
        </div>
      </div>

      {/* Buy/Sell/Transfer Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-4">
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-display leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-blue-600 text-blue-700"
                    : "text-gray-600 hover:text-gray-800"
                )
              }
            >
              Buy
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-display leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-blue-600 text-blue-700"
                    : "text-gray-600 hover:text-gray-800"
                )
              }
            >
              Sell
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-display leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-blue-600 text-blue-700"
                    : "text-gray-600 hover:text-gray-800"
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
