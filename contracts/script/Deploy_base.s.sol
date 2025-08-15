// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DepositManager.sol";
import "../src/PlatformToken.sol";

contract DeployBase is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy platform token
        PlatformToken platformToken = new PlatformToken();
        console2.log("PlatformToken deployed to:", address(platformToken));

        // Deploy DepositManager with real USDC and cUSDC
        DepositManager depositManager = new DepositManager(
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, // Base Mainnet USDC
            address(platformToken),
            0xb125E6687d4313864e53df431d5425969c15Eb2F // Base Mainnet cUSDC
        );
        console2.log("DepositManager deployed to:", address(depositManager));

        // Set deposit manager in platform token
        platformToken.setDepositManager(address(depositManager));
        console2.log("DepositManager set in PlatformToken");

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("PlatformToken:", address(platformToken));
        console2.log("DepositManager:", address(depositManager));
    }
} 