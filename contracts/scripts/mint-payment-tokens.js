import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from contracts directory
dotenv.config({ path: join(__dirname, "../.env") });

async function mintPaymentTokens() {
  // Get command line arguments
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error("Usage: node mint-payment-tokens.js <address> <amount>");
    console.error("Note: PaymentToken uses 6 decimals (like USDC), so 1.0 = 1000000");
    process.exit(1);
  }

  const [recipientAddress, amount] = args;

  // Validate address
  if (!ethers.isAddress(recipientAddress)) {
    console.error("Invalid Ethereum address");
    process.exit(1);
  }

  // Validate amount - PaymentToken uses 6 decimals
  const amountBN = ethers.parseUnits(amount, 6);
  if (amountBN <= 0n) {
    console.error("Amount must be greater than 0");
    process.exit(1);
  }

  // Get contract ABI
  const contractPath = join(__dirname, "../out/PaymentToken.sol/PaymentToken.json");
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const contractABI = contractJson.abi;

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Get contract address from environment variable
  const contractAddress = process.env.PAYMENT_TOKEN_ADDRESS;
  if (!contractAddress) {
    console.error("PAYMENT_TOKEN_ADDRESS not found in environment variables");
    process.exit(1);
  }

  // Create contract instance
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  try {
    // Mint tokens
    const tx = await contract.mint(recipientAddress, amountBN);
    console.log(`Transaction hash: ${tx.hash}`);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log(`Payment tokens minted successfully!`);
    console.log(`Block number: ${receipt.blockNumber}`);
    console.log(`Amount minted: ${ethers.formatUnits(amountBN, 6)} USDC(x)`);
  } catch (error) {
    console.error("Error minting payment tokens:", error.message);
    process.exit(1);
  }
}

mintPaymentTokens().catch(console.error);
