import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function addOracle() {
  // Get command line arguments
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('Usage: node add-oracle.js <oracle_address>');
    process.exit(1);
  }

  const [oracleAddress] = args;

  // Validate address
  if (!ethers.isAddress(oracleAddress)) {
    console.error('Invalid Ethereum address');
    process.exit(1);
  }

  // Get contract ABI
  const contractPath = join(
    __dirname,
    '../out/ContestFactory.sol/ContestFactory.json'
  );
  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const contractABI = contractJson.abi;

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Get contract address from environment variable
  const contractAddress = process.env.CONTEST_FACTORY_ADDRESS;
  if (!contractAddress) {
    console.error('CONTEST_FACTORY_ADDRESS not found in environment variables');
    process.exit(1);
  }

  // Create contract instance
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  try {
    // Add oracle
    const tx = await contract.addOracle(oracleAddress);
    console.log(`Transaction hash: ${tx.hash}`);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log(`Oracle added successfully!`);
    console.log(`Block number: ${receipt.blockNumber}`);
  } catch (error) {
    console.error('Error adding oracle:', error.message);
    process.exit(1);
  }
}

addOracle().catch(console.error);
