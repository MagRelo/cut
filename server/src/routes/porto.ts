import { Router, Route } from "porto/server";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma.js";

// Function to load contract addresses from network config files
function loadContractAddresses(network: "sepolia" | "base" = "sepolia") {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const configPath = path.join(__dirname, `../contracts/${network}.json`);
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    return {
      depositManagerAddress: config.depositManagerAddress.toLowerCase(),
      escrowFactoryAddress: config.escrowFactoryAddress.toLowerCase(),
      paymentTokenAddress: config.paymentTokenAddress?.toLowerCase(),
      platformTokenAddress: config.platformTokenAddress?.toLowerCase(),
    };
  } catch (error) {
    console.error(`Error loading contract addresses from ${network}.json:`, error);
    throw new Error(`Failed to load contract addresses from ${network}.json`);
  }
}

// Function to determine network from request
function getNetworkFromRequest(request: any): "sepolia" | "base" {
  const chainId = request.chainId;

  // console.log("Attempting to determine network from request:");
  // console.log("chainId (hex):", chainId);

  // Convert hex chainId to decimal
  const chainIdDecimal = parseInt(chainId, 16);
  // console.log("chainId (decimal):", chainIdDecimal);

  // Chain ID mappings:
  // Base: 8453 (0x2105)
  // Base Sepolia: 84532 (0x14a34)
  switch (chainIdDecimal) {
    case 8453: // Base
      // console.log("Detected Base network");
      return "base";
    case 84532: // Base Sepolia
      // console.log("Detected Base Sepolia network");
      return "sepolia";
    default:
      console.warn(`Unknown chain ID: ${chainId} (${chainIdDecimal}), defaulting to sepolia`);
      return "sepolia";
  }
}

// Check if a contract address is sponsored
async function isSponsoredContract(
  request: any // Using any for now due to type compatibility issues
): Promise<boolean> {
  try {
    const { calls } = request;
    if (!calls || calls.length === 0) {
      return false;
    }

    // Extract all 'to' addresses from calls
    const addresses = calls
      .map((call: any) => call.to)
      .filter((to: any): to is `0x${string}` => !!to)
      .map((address: any) => address.toLowerCase());
    if (addresses.length === 0) {
      return false;
    }

    // Determine network from request chain ID
    const network = getNetworkFromRequest(request);

    // Load contract addresses from the appropriate network config
    const {
      depositManagerAddress,
      escrowFactoryAddress,
      paymentTokenAddress,
      platformTokenAddress,
    } = loadContractAddresses(network);

    // console.log({ depositManagerAddress });
    // console.log({ escrowFactoryAddress });
    // console.log({ paymentTokenAddress });
    // console.log({ platformTokenAddress });
    // console.log({ to: addresses });

    // Make a single database query to find all contests that match the addresses
    const contests = await prisma.contest.findMany({
      where: {
        address: {
          in: addresses,
        },
      },
      select: {
        address: true,
      },
    });
    const contestAddresses = contests.map((contest: { address: string }) =>
      contest.address.toLowerCase()
    );

    // Check if all addresses are either merchant factory, payment token, platform token, or sponsored contests
    const allSponsored = addresses.every(
      (address: any) =>
        address === depositManagerAddress ||
        address === escrowFactoryAddress ||
        address === paymentTokenAddress ||
        address === platformTokenAddress ||
        contestAddresses.includes(address)
    );

    // console.log("All calls sponsored:", allSponsored);
    return allSponsored;
  } catch (error) {
    console.error("Error checking sponsored contract:", error);
    return false;
  }
}

// Create Porto Router with sponsor route using Hono adapter
const merchantAddress = process.env.MERCHANT_ADDRESS;
const merchantKey = process.env.MERCHANT_PRIVATE_KEY;
const porto = Router().route(
  "/sponsor",
  Route.merchant({
    address: merchantAddress as `0x${string}`,
    key: merchantKey as `0x${string}`,
    sponsor: async (_request: any) => {
      const isSponsored = await isSponsoredContract(_request);

      console.log("Sponsor request:", {
        chain: getNetworkFromRequest(_request),
        merchantAddress: merchantAddress,
        feeToken: _request.capabilities.meta.feeToken,
        Sponsor: isSponsored,
      });

      return isSponsored;
    },
  })
);

// Export the Porto Hono adapter
export default porto.hono;
