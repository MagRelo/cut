import { Router } from "express";
import { MerchantRpc } from "porto/server";
import type { RpcSchema } from "porto";
import { baseSepolia } from "viem/chains";
import { http, createClient } from "viem";

import { prisma } from "../lib/prisma.js";

const router = Router();

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

    // Check if any address matches the merchant contract factory
    const merchantFactoryAddress = process.env.MERCHANT_CONTRACT_FACTORY?.toLowerCase();
    const merchantPaymentToken = process.env.MERCHANT_PAYMENT_TOKEN?.toLowerCase();

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
        address === merchantFactoryAddress ||
        address === merchantPaymentToken ||
        contestAddresses.includes(address)
    );

    // console.log("All calls sponsored:", allSponsored);
    return allSponsored;
  } catch (error) {
    console.error("Error checking sponsored contract:", error);
    return false;
  }
}

// Porto RPC endpoint for handling merchant RPC requests
router.all(
  "/rpc",
  async (req, res, next) => {
    console.log("Porto RPC route hit");
    console.log("Address:", process.env.MERCHANT_ADDRESS);
    // console.log("Private key:", process.env.MERCHANT_PRIVATE_KEY);

    // Test RPC connection using the same setup as Porto
    try {
      console.log("Testing Base Sepolia RPC connection...");
      const client = createClient({
        chain: baseSepolia,
        transport: http("https://base-sepolia.rpc.ithaca.xyz"),
      });

      console.log("Created viem client, testing block number request...");
      const blockNumber = await client.request({
        method: "eth_blockNumber",
      });

      console.log("RPC connection successful! Block number:", blockNumber);
    } catch (error) {
      console.error("RPC connection failed:", error);
    }

    console.log("About to call Porto requestListener...");
    next();
  },
  (req, res, next) => {
    console.log("Inside Porto requestListener middleware...");

    // Create requestListener with detailed error handling
    const requestListener = MerchantRpc.requestListener({
      address: process.env.MERCHANT_ADDRESS as `0x${string}`,
      key: {
        type: "secp256k1",
        privateKey: process.env.MERCHANT_PRIVATE_KEY as `0x${string}`,
      },
      chains: [baseSepolia],
      transports: {
        [baseSepolia.id]: http("https://base-sepolia.rpc.ithaca.xyz"),
      },
      // sponsor: async (request: RpcSchema.wallet_prepareCalls.Parameters) => {
      //   console.log("Porto sponsor function called");
      //   return true;
      //   // return await isSponsoredContract(request);
      // },
    });

    console.log("Porto requestListener created, calling it...");

    // Call requestListener with timeout
    const timeout = setTimeout(() => {
      console.error("Porto requestListener timed out after 30 seconds");
      res.status(500).json({ error: "Porto request timeout" });
    }, 30000);

    try {
      requestListener(req, res);
      console.log("Porto requestListener called successfully");
    } catch (error) {
      clearTimeout(timeout);
      console.error("Porto requestListener setup error:", error);
      res.status(500).json({
        error: "Porto setup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get Porto configuration
router.get("/config", async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        merchantAddress: process.env.MERCHANT_ADDRESS,
        supportedMethods: ["porto_merchant_request", "porto_merchant_status"],
      },
    });
  } catch (error) {
    console.error("Error getting Porto config:", error);
    res.status(500).json({ error: "Failed to get Porto configuration" });
  }
});

export default router;
