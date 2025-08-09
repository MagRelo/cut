// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TokenManager.sol";
import "../src/PlatformToken.sol";
import "../src/PaymentToken.sol";

contract DeploySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy payment token (USDC)
        PaymentToken paymentToken = new PaymentToken();
        console2.log("PaymentToken deployed to:", address(paymentToken));

        // Deploy platform token
        PlatformToken platformToken = new PlatformToken();
        console2.log("PlatformToken deployed to:", address(platformToken));

        // Deploy TokenManager (you'll need to provide the Compound cUSDC address)
        TokenManager tokenManager = new TokenManager(
            address(paymentToken),
            address(platformToken),
            address(0x1234567890123456789012345678901234567890) // Mock cUSDC address for Sepolia
        );
        console2.log("TokenManager deployed to:", address(tokenManager));

        // Set token manager in platform token
        platformToken.setTokenManager(address(tokenManager));
        console2.log("TokenManager set in PlatformToken");

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("PaymentToken:", address(paymentToken));
        console2.log("PlatformToken:", address(platformToken));
        console2.log("TokenManager:", address(tokenManager));
    }
} 