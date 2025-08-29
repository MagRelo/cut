import { Router } from "express";
import { MerchantRpc } from "porto/server";
import type { RpcSchema } from "porto";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { prisma } from "../lib/prisma.js";
import { createPortoMiddleware } from "../middleware/portoHandler.js";

const router = Router();

// Function to load contract addresses from sepolia.json
function loadContractAddressesFromSepolia() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sepoliaConfigPath = path.join(__dirname, "../../contracts/sepolia.json");
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

// Function to check if a contract address is sponsored
async function isSponsoredContract(
  request: RpcSchema.wallet_prepareCalls.Parameters
): Promise<boolean> {
  try {
    const { calls } = request;
    if (!calls || calls.length === 0) {
      return false;
    }

    // Extract all 'to' addresses from calls
    const addresses = calls
      .map((call) => call.to)
      .filter((to): to is `0x${string}` => !!to)
      .map((address) => address.toLowerCase());
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
    const contestAddresses = contests.map((contest) => contest.address.toLowerCase());

    // Check if all addresses are either merchant factory, payment token, or sponsored contests
    const allSponsored = addresses.every(
      (address) =>
        address === depositManagerAddress ||
        address === escrowFactoryAddress ||
        address === paymentTokenAddress ||
        contestAddresses.includes(address)
    );

    console.log("All calls sponsored:", allSponsored);
    return allSponsored;
  } catch (error) {
    console.error("Error checking sponsored contract:", error);
    return false;
  }
}

// Create Porto RequestHandler function
function createPortoHandler() {
  return MerchantRpc.requestHandler({
    address: process.env.MERCHANT_ADDRESS as `0x${string}`,
    key: {
      type: "secp256k1",
      privateKey: process.env.MERCHANT_PRIVATE_KEY as `0x${string}`,
    },
    sponsor: async (request: RpcSchema.wallet_prepareCalls.Parameters) => {
      const isSponsored = await isSponsoredContract(request);
      // const isSponsored = true;
      // const isSponsored = false;
      console.log("Porto sponsor function called; isSponsored:", isSponsored);
      return isSponsored;
    },
  });
}

// Porto RPC endpoint for handling merchant RPC requests
router.all(
  "/rpc",
  (req, res, next) => {
    // console.log("Porto RPC request received");
    next();
  },
  (req, res, next) => {
    // Create the Porto handler when the route is accessed
    const portoHandler = createPortoHandler();
    return createPortoMiddleware(portoHandler)(req, res, next);
  }
);

export default router;
