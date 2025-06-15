import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from contracts directory
dotenv.config({ path: join(__dirname, '../.env') });

async function mintTokens() {
  // Get command line arguments
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: node mint-tokens.js <address> <amount>');
    process.exit(1);
  }

  const [recipientAddress, amount] = args;

  // Validate address
  if (!ethers.isAddress(recipientAddress)) {
    console.error('Invalid Ethereum address');
    process.exit(1);
  }

  // Validate amount
  const amountBN = ethers.parseEther(amount);
  if (amountBN <= 0n) {
    console.error('Amount must be greater than 0');
    process.exit(1);
  }

  // Get contract ABI
  const contractPath = join(
    __dirname,
    '../out/PlatformToken.sol/PlatformToken.json'
  );
  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const contractABI = contractJson.abi;

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Get contract address from environment variable
  const contractAddress = process.env.PLATFORM_TOKEN_ADDRESS;
  if (!contractAddress) {
    console.error('PLATFORM_TOKEN_ADDRESS not found in environment variables');
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
    console.log(`Tokens minted successfully!`);
    console.log(`Block number: ${receipt.blockNumber}`);
  } catch (error) {
    console.error('Error minting tokens:', error.message);
    process.exit(1);
  }
}

mintTokens().catch(console.error);
