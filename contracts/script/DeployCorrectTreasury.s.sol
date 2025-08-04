// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Treasury.sol";
import "../src/PlatformToken.sol";

contract DeployCorrectTreasuryScript is Script {
    // Base Mainnet Addresses
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant CUSDC_BASE = 0xb125E6687d4313864e53df431d5425969c15Eb2F; // Correct cUSDC
    
    // Existing deployed contracts
    address constant EXISTING_PLATFORM_TOKEN = 0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console2.log("=== Deploying Treasury with Correct cUSDC ===");
        console2.log("USDC Address:", USDC_BASE);
        console2.log("Correct cUSDC Address:", CUSDC_BASE);
        console2.log("PlatformToken:", EXISTING_PLATFORM_TOKEN);

        // Deploy Treasury with correct cUSDC interface
        Treasury treasury = new Treasury(
            USDC_BASE,
            EXISTING_PLATFORM_TOKEN,
            CUSDC_BASE
        );
        console2.log("Treasury deployed to:", address(treasury));

        // Set new treasury in platform token
        PlatformToken(EXISTING_PLATFORM_TOKEN).setTreasury(address(treasury));
        console2.log("New Treasury set in PlatformToken");

        console2.log("\n=== Deployment Summary ===");
        console2.log("Treasury:", address(treasury));
        console2.log("PlatformToken:", EXISTING_PLATFORM_TOKEN);
        console2.log("USDC:", USDC_BASE);
        console2.log("Correct cUSDC:", CUSDC_BASE);
        console2.log("Deployer:", msg.sender);

        vm.stopBroadcast();
    }
} 