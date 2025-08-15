// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DepositManager.sol";
import "../src/PlatformToken.sol";
import "../src/mocks/MockUSDC.sol";
import "../src/mocks/MockCompound.sol";

contract DeploySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock USDC for testing
        MockUSDC mockUSDC = new MockUSDC();
        console2.log("MockUSDC deployed to:", address(mockUSDC));

        // Deploy mock Compound for testing
        MockCompound mockCompound = new MockCompound(address(mockUSDC));
        console2.log("MockCompound deployed to:", address(mockCompound));

        // Deploy platform token
        PlatformToken platformToken = new PlatformToken();
        console2.log("PlatformToken deployed to:", address(platformToken));

        // Deploy DepositManager with mock contracts
        DepositManager depositManager = new DepositManager(
            address(mockUSDC),
            address(platformToken),
            address(mockCompound)
        );
        console2.log("DepositManager deployed to:", address(depositManager));

        // Set deposit manager in platform token
        platformToken.setDepositManager(address(depositManager));
        console2.log("DepositManager set in PlatformToken");

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("MockUSDC:", address(mockUSDC));
        console2.log("MockCompound:", address(mockCompound));
        console2.log("PlatformToken:", address(platformToken));
        console2.log("DepositManager:", address(depositManager));
    }
} 