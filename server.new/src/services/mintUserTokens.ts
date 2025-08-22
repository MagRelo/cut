import { ethers } from 'ethers';
import MockUSDC from '../../contracts/MockUSDC.json' with { type: 'json' };

// Contract configuration
const contractConfig = {
    paymentTokenAddress: process.env.PAYMENT_TOKEN_ADDRESS || '0x7150669d6aD21be53D2d71c09138D46381b90b5b', // MockUSDC on Base Sepolia
    oracleWalletPrivateKey: process.env.ORACLE_PRIVATE_KEY || '',
    rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org'
};

// Initialize provider
const provider = new ethers.JsonRpcProvider(contractConfig.rpcUrl);

// Lazy initialization function for wallet and contracts
function initializeWalletAndContracts() {
    if (!contractConfig.oracleWalletPrivateKey) {
        throw new Error('ORACLE_WALLET_PRIVATE_KEY environment variable is required');
    }
    
    if (contractConfig.oracleWalletPrivateKey.length !== 64 && !contractConfig.oracleWalletPrivateKey.startsWith('0x')) {
        throw new Error('Invalid private key format. Expected 64 character hex string or 0x-prefixed hex string');
    }
    
    const oracleWallet = new ethers.Wallet(contractConfig.oracleWalletPrivateKey, provider);
    
    const paymentTokenContract = new ethers.Contract(
        contractConfig.paymentTokenAddress,
        MockUSDC.abi,
        oracleWallet
    );
    
    return { oracleWallet, paymentTokenContract };
}

/**
 * Mints USDC(x) tokens directly to a new user
 * @param userAddress Address of the user to receive USDC(x) tokens
 * @param amount Amount of USDC to mint (in USDC units, e.g., 1000 for 1000 USDC)
 * @returns Transaction result
 */
export async function mintUSDCToUser(userAddress: string, amount: number = 1000) {
    try {
        const { paymentTokenContract } = initializeWalletAndContracts();
        const tokenAmount = ethers.parseUnits(amount.toString(), 6); // USDC has 6 decimals
        
        console.log(`Minting ${amount} USDC(x) to user ${userAddress}...`);
        const mintTx = await paymentTokenContract.mint(userAddress, tokenAmount);
        await mintTx.wait();
        
        console.log(`Minted ${amount} USDC(x) to user. Transaction: ${mintTx.hash}`);
        
        return {
            success: true,
            transaction: mintTx.hash,
            amount: amount,
            recipient: userAddress
        };
    } catch (error) {
        console.error('Error minting USDC to user:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Quick function to mint USDC(x) tokens to a new user
 * @param userAddress Address of the user to receive USDC(x) tokens
 * @param amount Amount of USDC to mint
 * @returns Transaction result
 */
export async function quickMintUSDCToUser(userAddress: string, amount: number = 1000) {
    console.log(`Quick mint USDC(x) for user ${userAddress}...`);
    return await mintUSDCToUser(userAddress, amount);
} 