// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/EscrowFactory.sol";

contract DeployNewEscrowFactoryScript is Script {
    // Base Mainnet Addresses
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant NEW_TREASURY_ADDRESS = 0x9Ba098Bcd17b3474E6dA824A43704b8baA8cC3b5;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console2.log("=== Deploying New EscrowFactory with Correct Treasury ===");
        console2.log("USDC Address:", USDC_BASE);
        console2.log("New Treasury Address:", NEW_TREASURY_ADDRESS);

        // Deploy new EscrowFactory with correct Treasury
        EscrowFactory escrowFactory = new EscrowFactory(
            USDC_BASE,
            NEW_TREASURY_ADDRESS
        );
        console2.log("New EscrowFactory deployed to:", address(escrowFactory));

        // Add deployer as oracle
        escrowFactory.addOracle(msg.sender);
        console2.log("Deployer added as oracle");

        console2.log("\n=== Deployment Summary ===");
        console2.log("New EscrowFactory:", address(escrowFactory));
        console2.log("USDC:", USDC_BASE);
        console2.log("Treasury:", NEW_TREASURY_ADDRESS);
        console2.log("Deployer:", msg.sender);

        vm.stopBroadcast();
    }
} 