import { createWalletClient, http, parseUnits, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import MockUSDC from '../contracts/MockUSDC.json' with { type: 'json' };
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Function to load payment token address from sepolia.json
function loadPaymentTokenAddressFromSepolia(): string {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const sepoliaConfigPath = path.join(__dirname, '../contracts/sepolia.json');
        const sepoliaConfig = JSON.parse(fs.readFileSync(sepoliaConfigPath, 'utf8'));
        return sepoliaConfig.paymentTokenAddress;
    } catch (error) {
        console.error('Error loading payment token address from sepolia.json:', error);
        throw new Error('Failed to load payment token address from sepolia.json');
    }
}

// Contract configuration
const contractConfig = {
    paymentTokenAddress: loadPaymentTokenAddressFromSepolia(), // Load from sepolia.json
    oracleWalletPrivateKey: process.env.ORACLE_PRIVATE_KEY || '',
    rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org'
};



// Lazy initialization function for wallet and contracts
function initializeWalletAndContracts() {
    if (!contractConfig.oracleWalletPrivateKey) {
        throw new Error('ORACLE_WALLET_PRIVATE_KEY environment variable is required');
    }
    
    if (contractConfig.oracleWalletPrivateKey.length !== 64 && !contractConfig.oracleWalletPrivateKey.startsWith('0x')) {
        throw new Error('Invalid private key format. Expected 64 character hex string or 0x-prefixed hex string');
    }
    
    const account = privateKeyToAccount(contractConfig.oracleWalletPrivateKey as `0x${string}`);
    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(contractConfig.rpcUrl)
    });
    
    const paymentTokenContract = getContract({
        address: contractConfig.paymentTokenAddress as `0x${string}`,
        abi: MockUSDC.abi,
        client: walletClient
    });
    
    return { account, walletClient, paymentTokenContract };
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
        const tokenAmount = parseUnits(amount.toString(), 6); // USDC has 6 decimals
        
        console.log(`Minting ${amount} USDC(x) to user ${userAddress}...`);
        const hash = await paymentTokenContract.write.mint?.([userAddress, tokenAmount]);
        
        console.log(`Minted ${amount} USDC(x) to user. Transaction: ${hash}`);
        
        return {
            success: true,
            transaction: hash,
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