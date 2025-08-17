import { ethers } from 'ethers';
import DepositManager from '../../contracts/DepositManager.json' with { type: 'json' };
import MockUSDC from '../../contracts/MockUSDC.json' with { type: 'json' };
import PlatformToken from '../../contracts/PlatformToken.json' with { type: 'json' };

// Contract configuration
const contractConfig = {
    paymentTokenAddress: process.env.PAYMENT_TOKEN_ADDRESS || '0x7150669d6aD21be53D2d71c09138D46381b90b5b', // MockUSDC on Base Sepolia
    depositManagerAddress: process.env.DEPOSIT_MANAGER_ADDRESS || '0x14138DC74022AE1290132cd4945381e94aCE2A88',
    platformTokenAddress: process.env.PLATFORM_TOKEN_ADDRESS || '0x772c846Ac2BC1CF0733331e76912d90479c0481d',
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

    const depositManagerContract = new ethers.Contract(
        contractConfig.depositManagerAddress,
        DepositManager.abi,
        oracleWallet
    );

    const platformTokenContract = new ethers.Contract(
        contractConfig.platformTokenAddress,
        PlatformToken.abi,
        oracleWallet
    );
    
    return { oracleWallet, paymentTokenContract, depositManagerContract, platformTokenContract };
}

/**
 * Mints USDC(x) tokens to the oracle wallet
 * @param amount Amount of USDC to mint (in USDC units, e.g., 1000 for 1000 USDC)
 * @returns Transaction result
 */
export async function mintUSDC(amount: number = 1000) {
    try {
        const { oracleWallet, paymentTokenContract } = initializeWalletAndContracts();
        const tokenAmount = ethers.parseUnits(amount.toString(), 6); // USDC has 6 decimals
        
        console.log(`Minting ${amount} USDC(x) to oracle wallet...`);
        const mintTx = await paymentTokenContract.mint(oracleWallet.address, tokenAmount);
        await mintTx.wait();
        
        console.log(`Minted ${amount} USDC(x). Transaction: ${mintTx.hash}`);
        
        return {
            success: true,
            transaction: mintTx.hash,
            amount: amount,
            recipient: oracleWallet.address
        };
    } catch (error) {
        console.error('Error minting USDC:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Approves DepositManager contract to spend USDC from oracle wallet
 * @param amount Amount of USDC to approve (in USDC units)
 * @returns Transaction result
 */
export async function approveDepositManagerToSpendUSDC(amount: number = 1000) {
    try {
        const { oracleWallet, paymentTokenContract, depositManagerContract } = initializeWalletAndContracts();
        const tokenAmount = ethers.parseUnits(amount.toString(), 6);
        
        console.log(`Approving DepositManager to spend ${amount} USDC(x)...`);
        
        // Approve DepositManager to spend USDC from oracle wallet
        const approveTx = await paymentTokenContract.approve(depositManagerContract.target, tokenAmount);
        await approveTx.wait();
        
        console.log(`Approved DepositManager to spend ${amount} USDC(x). Transaction: ${approveTx.hash}`);
        
        // Verify approval
        const allowance = await paymentTokenContract.allowance(
            oracleWallet.address,
            depositManagerContract.target
        );
        
        console.log(`Allowance verified: ${ethers.formatUnits(allowance, 6)} USDC`);
        
        return {
            success: true,
            transaction: approveTx.hash,
            spender: depositManagerContract.target,
            amount: amount
        };
    } catch (error) {
        console.error('Error approving DepositManager to spend USDC:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Deposits USDC into DepositManager contract, which mints CUT tokens to the oracle wallet
 * @param amount Amount of USDC to deposit (in USDC units)
 * @returns Transaction result
 */
export async function depositUSDCToDepositManager(amount: number = 1000) {
    try {
        const { oracleWallet, depositManagerContract, platformTokenContract } = initializeWalletAndContracts();
        const tokenAmount = ethers.parseUnits(amount.toString(), 6);
        
        console.log(`Depositing ${amount} USDC(x) into DepositManager...`);
        
        // Deposit USDC into DepositManager (this will mint CUT tokens to the oracle wallet)
        const depositTx = await depositManagerContract.depositUSDC(tokenAmount);
        await depositTx.wait();
        
        console.log(`Deposited ${amount} USDC(x) into DepositManager. Transaction: ${depositTx.hash}`);
        
        // Check CUT token balance
        const cutBalance = await platformTokenContract.balanceOf(oracleWallet.address);
        console.log(`Oracle wallet CUT balance: ${ethers.formatUnits(cutBalance, 18)} CUT`);
        
        return {
            success: true,
            transaction: depositTx.hash,
            depositManager: depositManagerContract.target,
            amount: amount,
            cutBalance: ethers.formatUnits(cutBalance, 18)
        };
    } catch (error) {
        console.error('Error depositing USDC to DepositManager:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Transfers CUT tokens from oracle wallet to a new user
 * @param userAddress Address of the user to receive CUT tokens
 * @param amount Amount of CUT tokens to transfer (in CUT units)
 * @returns Transaction result
 */
export async function transferCUTToUser(userAddress: string, amount: number = 1000) {
    try {
        const { platformTokenContract } = initializeWalletAndContracts();
        const tokenAmount = ethers.parseUnits(amount.toString(), 18); // CUT has 18 decimals
        
        console.log(`Transferring ${amount} CUT to user ${userAddress}...`);
        
        const transferTx = await platformTokenContract.transfer(userAddress, tokenAmount);
        await transferTx.wait();
        
        console.log(`Transferred ${amount} CUT to user. Transaction: ${transferTx.hash}`);
        
        return {
            success: true,
            transaction: transferTx.hash,
            recipient: userAddress,
            amount: amount
        };
    } catch (error) {
        console.error('Error transferring CUT to user:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Complete flow: Mint USDC, approve DepositManager, deposit to DepositManager (mints CUT), and transfer to new user
 * @param userAddress Address of the user to receive CUT tokens
 * @param usdcAmount Amount of USDC to process (in USDC units)
 * @param cutAmount Amount of CUT tokens to transfer to user (in CUT units)
 * @returns Complete transaction result
 */
export async function mintAndTransferToUser(
    userAddress: string, 
    usdcAmount: number = 1000, 
    cutAmount: number = 1000
) {
    try {
        console.log(`Starting complete flow for user ${userAddress}...`);
        
        // Step 1: Mint USDC to oracle wallet
        console.log('Step 1: Minting USDC to oracle wallet...');
        const mintResult = await mintUSDC(usdcAmount);
        if (!mintResult.success) {
            throw new Error(`Minting failed: ${mintResult.error}`);
        }
        
        // Step 2: Approve DepositManager to spend USDC
        console.log('Step 2: Approving DepositManager to spend USDC...');
        const approveResult = await approveDepositManagerToSpendUSDC(usdcAmount);
        if (!approveResult.success) {
            throw new Error(`Approval failed: ${approveResult.error}`);
        }
        
        // Step 3: Deposit USDC into DepositManager (this mints CUT tokens to oracle wallet)
        console.log('Step 3: Depositing USDC into DepositManager...');
        const depositResult = await depositUSDCToDepositManager(usdcAmount);
        if (!depositResult.success) {
            throw new Error(`Deposit failed: ${depositResult.error}`);
        }
        
        // Step 4: Transfer CUT tokens to user
        console.log('Step 4: Transferring CUT tokens to user...');
        const transferResult = await transferCUTToUser(userAddress, cutAmount);
        if (!transferResult.success) {
            throw new Error(`Transfer failed: ${transferResult.error}`);
        }
        
        console.log('Complete flow finished successfully!');
        
        return {
            success: true,
            steps: {
                usdcMint: mintResult,
                depositManagerApproval: approveResult,
                depositManagerDeposit: depositResult,
                cutTransfer: transferResult
            },
            summary: {
                userAddress,
                usdcProcessed: usdcAmount,
                cutTransferred: cutAmount
            }
        };
    } catch (error) {
        console.error('Error in complete flow:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Quick function to mint and transfer tokens to a new user
 * @param userAddress Address of the user to receive CUT tokens
 * @param amount Amount of USDC to process and CUT to transfer
 * @returns Transaction result
 */
export async function quickMintAndTransfer(userAddress: string, amount: number = 1000) {
    console.log(`Quick mint and transfer for user ${userAddress}...`);
    
    // First ensure we have enough USDC
    await mintUSDC(amount);
    
    // Then approve and deposit
    await approveDepositManagerToSpendUSDC(amount);
    await depositUSDCToDepositManager(amount);
    
    // Finally transfer to user
    return await transferCUTToUser(userAddress, amount);
} 