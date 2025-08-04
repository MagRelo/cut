// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PlatformToken.sol";
import "../src/Treasury.sol";
import "../src/EscrowFactory.sol";
import "../src/Escrow.sol";

contract DeployTestnetScript is Script {
    // Base Sepolia Testnet Addresses
    // USDC on Base Sepolia: https://sepolia.basescan.org/token/0x036CbD53842c5426634e7929541eC2318f3dCF7c
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7c;
    
    // Compound cUSDC on Base Sepolia: https://sepolia.basescan.org/token/0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf
    address constant CUSDC_BASE_SEPOLIA = 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console2.log("=== Deploying to Base Sepolia Testnet ===");
        console2.log("USDC Address:", USDC_BASE_SEPOLIA);
        console2.log("cUSDC Address:", CUSDC_BASE_SEPOLIA);

        // Deploy PlatformToken
        PlatformToken platformToken = new PlatformToken();
        console2.log("PlatformToken deployed to:", address(platformToken));

        // Deploy Treasury with testnet USDC and cUSDC
        Treasury treasury = new Treasury(
            USDC_BASE_SEPOLIA,
            address(platformToken),
            CUSDC_BASE_SEPOLIA
        );
        console2.log("Treasury deployed to:", address(treasury));

        // Set treasury in platform token
        platformToken.setTreasury(address(treasury));
        console2.log("Treasury set in PlatformToken");

        // Deploy EscrowFactory
        EscrowFactory factory = new EscrowFactory(
            USDC_BASE_SEPOLIA,
            address(treasury)
        );
        console2.log("EscrowFactory deployed to:", address(factory));

        // Add deployer as initial oracle
        factory.addOracle(msg.sender);
        console2.log("Oracle Added:", msg.sender);

        // Log all deployed addresses for verification
        console2.log("\n=== Deployment Summary ===");
        console2.log("PlatformToken:", address(platformToken));
        console2.log("Treasury:", address(treasury));
        console2.log("EscrowFactory:", address(factory));
        console2.log("USDC:", USDC_BASE_SEPOLIA);
        console2.log("cUSDC:", CUSDC_BASE_SEPOLIA);
        console2.log("Initial Oracle:", msg.sender);

        vm.stopBroadcast();
    }
} 