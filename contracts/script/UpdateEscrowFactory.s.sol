// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/EscrowFactory.sol";

contract UpdateEscrowFactoryScript is Script {
    // Base Mainnet Addresses
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant CUSDC_BASE = 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf;
    
    // Updated Treasury with CUSDC interface fix
    address constant NEW_TREASURY = 0x1A213BD5CB7ABa03D21e385E38a1BAd36B0C8b65;
    
    // New payment token address (replace with your desired token)
    address constant NEW_PAYMENT_TOKEN = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC for now

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console2.log("=== Deploying Updated EscrowFactory ===");
        console2.log("New Payment Token:", NEW_PAYMENT_TOKEN);
        console2.log("New Treasury:", NEW_TREASURY);

        // Deploy updated EscrowFactory with new Treasury
        EscrowFactory factory = new EscrowFactory(
            NEW_PAYMENT_TOKEN,
            NEW_TREASURY
        );
        console2.log("Updated EscrowFactory deployed to:", address(factory));

        // Add deployer as initial oracle
        factory.addOracle(msg.sender);
        console2.log("Oracle Added:", msg.sender);

        console2.log("\n=== Deployment Summary ===");
        console2.log("Updated EscrowFactory:", address(factory));
        console2.log("New Payment Token:", NEW_PAYMENT_TOKEN);
        console2.log("New Treasury:", NEW_TREASURY);
        console2.log("Initial Oracle:", msg.sender);

        vm.stopBroadcast();
    }
} 