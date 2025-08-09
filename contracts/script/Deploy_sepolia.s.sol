// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TokenManager.sol";
import "../src/PlatformToken.sol";
import "../src/PaymentToken.sol";
import "../src/EscrowFactory.sol";
import "../test/MockCompound.sol";

contract DeploySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console2.log("=== Deploying to Base Sepolia ===");

        // Deploy payment token (Mock USDC for Sepolia)
        PaymentToken paymentToken = new PaymentToken();
        console2.log("PaymentToken deployed to:", address(paymentToken));

        // Deploy platform token (CUT)
        PlatformToken platformToken = new PlatformToken();
        console2.log("PlatformToken deployed to:", address(platformToken));

        // Deploy MockCToken for Sepolia (simulates cUSDC)
        MockCToken mockCToken = new MockCToken(address(paymentToken));
        console2.log("MockCToken deployed to:", address(mockCToken));
        
        // Mint some initial USDC to MockCToken to simulate yield
        paymentToken.mint(address(mockCToken), 1000000 * 1e6); // 1M USDC
        
        // Deploy TokenManager
        TokenManager tokenManager = new TokenManager(
            address(paymentToken),
            address(platformToken),
            address(mockCToken)
        );
        console2.log("TokenManager deployed to:", address(tokenManager));

        // Set token manager in platform token
        platformToken.setTokenManager(address(tokenManager));
        console2.log("TokenManager set in PlatformToken");

        // Deploy EscrowFactory
        EscrowFactory escrowFactory = new EscrowFactory(
            address(platformToken)
        );
        console2.log("EscrowFactory deployed to:", address(escrowFactory));

        // Add deployer as initial oracle
        escrowFactory.addOracle(msg.sender);
        console2.log("Oracle Added:", msg.sender);

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("PaymentToken:", address(paymentToken));
        console2.log("PlatformToken:", address(platformToken));
        console2.log("MockCToken:", address(mockCToken));
        console2.log("TokenManager:", address(tokenManager));
        console2.log("EscrowFactory:", address(escrowFactory));
        console2.log("Initial Oracle:", msg.sender);
    }
} 