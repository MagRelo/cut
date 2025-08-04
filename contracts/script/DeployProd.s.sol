// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PlatformToken.sol";
import "../src/Treasury.sol";
import "../src/EscrowFactory.sol";
import "../src/Escrow.sol";

contract DeployProdScript is Script {
    // Base Mainnet Addresses
    // USDC on Base: https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    
    // Compound cUSDC on Base: https://basescan.org/token/0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf
    address constant CUSDC_BASE = 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console2.log("=== Deploying to Base Mainnet ===");
        console2.log("USDC Address:", USDC_BASE);
        console2.log("cUSDC Address:", CUSDC_BASE);

        // Deploy PlatformToken
        PlatformToken platformToken = new PlatformToken();
        console2.log("PlatformToken deployed to:", address(platformToken));

        // Deploy Treasury with real USDC and cUSDC
        Treasury treasury = new Treasury(
            USDC_BASE,
            address(platformToken),
            CUSDC_BASE
        );
        console2.log("Treasury deployed to:", address(treasury));

        // Set treasury in platform token
        platformToken.setTreasury(address(treasury));
        console2.log("Treasury set in PlatformToken");

        // Deploy EscrowFactory with platformToken instead of USDC
        EscrowFactory factory = new EscrowFactory(
            address(platformToken),
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
        console2.log("USDC:", USDC_BASE);
        console2.log("cUSDC:", CUSDC_BASE);
        console2.log("Initial Oracle:", msg.sender);

        vm.stopBroadcast();
    }
} 