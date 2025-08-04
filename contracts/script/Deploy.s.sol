// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PlatformToken.sol";
import "../src/PaymentToken.sol";
import "../src/Treasury.sol";
import "../src/EscrowFactory.sol";
import "../src/Escrow.sol";
import "../test/MockCompound.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy PaymentToken (USDC simulation)
        PaymentToken paymentToken = new PaymentToken();
        console2.log("PaymentToken deployed to:", address(paymentToken));

        // Deploy PlatformToken
        PlatformToken platformToken = new PlatformToken();
        console2.log("PlatformToken deployed to:", address(platformToken));

        // Deploy MockCToken for testing (use this for Base Sepolia)
        MockCToken mockCUSDC = new MockCToken(address(paymentToken));
        console2.log("MockCToken deployed to:", address(mockCUSDC));

        // Mint initial USDC to MockCToken for testing
        paymentToken.mint(address(mockCUSDC), 1_000_000_000e6); // 1B USDC
        console2.log("Minted 1B USDC to MockCToken");

        // Deploy Treasury (you'll need to provide the Compound cUSDC address)
        address cUSDC = address(mockCUSDC); // Use MockCToken for testing
        Treasury treasury = new Treasury(
            address(paymentToken),
            address(platformToken),
            cUSDC
        );
        console2.log("Treasury deployed to:", address(treasury));

        // Set treasury in platform token
        platformToken.setTreasury(address(treasury));

        // Deploy EscrowFactory with platformToken instead of paymentToken
        EscrowFactory factory = new EscrowFactory(
            address(platformToken),
            address(treasury)
        );

        // Add initial oracle (you can modify this address)
        factory.addOracle(msg.sender);

        // Log deployed addresses
        console2.log("EscrowFactory deployed to:", address(factory));
        console2.log("PaymentToken used:", address(paymentToken));
        console2.log("PlatformToken used:", address(platformToken));
        console2.log("Treasury used:", address(treasury));
        console2.log("cUSDC used:", cUSDC);
        console2.log("MockCToken used:", address(mockCUSDC));
        console2.log("Oracle Added:", msg.sender);

        vm.stopBroadcast();
    }
} 