import { Router, Route } from "porto/server";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma.js";

// Function to load contract addresses from sepolia.json
function loadContractAddressesFromSepolia() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sepoliaConfigPath = path.join(__dirname, "../contracts/sepolia.json");
    const sepoliaConfig = JSON.parse(fs.readFileSync(sepoliaConfigPath, "utf8"));
    return {
      depositManagerAddress: sepoliaConfig.depositManagerAddress.toLowerCase(),
      escrowFactoryAddress: sepoliaConfig.escrowFactoryAddress.toLowerCase(),
      paymentTokenAddress: sepoliaConfig.paymentTokenAddress.toLowerCase(),
    };
  } catch (error) {
    console.error("Error loading contract addresses from sepolia.json:", error);
    throw new Error("Failed to load contract addresses from sepolia.json");
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

    // Load contract addresses from sepolia.json
    const { depositManagerAddress, escrowFactoryAddress, paymentTokenAddress } =
      loadContractAddressesFromSepolia();

    // console.log({ depositManagerAddress });
    // console.log({ escrowFactoryAddress });
    // console.log({ paymentTokenAddress });
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

    // Check if all addresses are either merchant factory, payment token, or sponsored contests
    const allSponsored = addresses.every(
      (address: any) =>
        address === depositManagerAddress ||
        address === escrowFactoryAddress ||
        address === paymentTokenAddress ||
        contestAddresses.includes(address)
    );

    // console.log("All calls sponsored:", allSponsored);
    return allSponsored;
  } catch (error) {
    console.error("Error checking sponsored contract:", error);
    return false;
  }
}

// Create Porto Router with merchant route using Hono adapter
// Provide default values for test environment
const merchantAddress =
  process.env.MERCHANT_ADDRESS || "0x1234567890123456789012345678901234567890";
const merchantKey =
  process.env.MERCHANT_PRIVATE_KEY ||
  "0x1234567890123456789012345678901234567890123456789012345678901234";

const porto = Router().route(
  "/merchant",
  Route.merchant({
    address: merchantAddress as `0x${string}`,
    key: merchantKey as `0x${string}`,
    sponsor: async (_request: any) => {
      // const isSponsored = false;
      const isSponsored = await isSponsoredContract(_request);
      console.log("Porto sponsor function called; isSponsored:", isSponsored);
      return isSponsored;
    },
  })
);

// Export the Porto Hono adapter
export default porto.hono;
