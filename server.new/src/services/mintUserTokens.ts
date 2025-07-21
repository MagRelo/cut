import { ethers } from 'ethers';
import PlatformToken from '../../contracts/PlatformToken.json' with { type: 'json' };

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY!, provider);

export async function mintUserTokens(userWalletAddress: string, amount: number = 25) {
  try {
    // Validate wallet address
    if (!ethers.isAddress(userWalletAddress)) {
      throw new Error(`Invalid wallet address: ${userWalletAddress}`);
    }

    // Initialize platform token contract
    const platformTokenContract = new ethers.Contract(
      process.env.PLATFORM_TOKEN_ADDRESS!,
      PlatformToken.abi,
      wallet
    );

    // Convert amount to token units (assuming 18 decimals like most ERC20 tokens)
    const tokenAmount = ethers.parseUnits(amount.toString(), 18);

    // Mint tokens to the user
    const mintTx = await platformTokenContract.mint(userWalletAddress, tokenAmount);
    await mintTx.wait();

    console.log(`Minted ${amount} BTCUT tokens to ${userWalletAddress}. Transaction: ${mintTx.hash}`);

    return {
      success: true,
      transactionHash: mintTx.hash,
      amount: amount,
      recipient: userWalletAddress
    };
  } catch (error) {
    console.error('Error minting user tokens:', error);
    throw error;
  }
}

// Main execution block for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const walletAddress = process.argv[2];
  const amount = process.argv[3] ? parseInt(process.argv[3]) : 25;

  if (!walletAddress) {
    console.error('Please provide a wallet address as an argument');
    process.exit(1);
  }

  mintUserTokens(walletAddress, amount)
    .then((result) => {
      console.log('Token minting completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Token minting failed:', error);
      process.exit(1);
    });
} 