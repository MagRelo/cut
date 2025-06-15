// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PlatformToken.sol";
import "../src/ContestFactory.sol";
import "../src/Contest.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy PlatformToken first
        PlatformToken paymentToken = new PlatformToken(
            "BetTheCut",
            "BTCUT"
        );
        console2.log("PlatformToken deployed to:", address(paymentToken));

        // Deploy ContestFactory with platform fee from constants
        ContestFactory factory = new ContestFactory(
            250, // platformFee in basis points (2.5%)
            address(paymentToken)
        );

        // Add initial oracle (you can modify this address)
        factory.addOracle(msg.sender);

        // Log deployed addresses
        console2.log("ContestFactory deployed to:", address(factory));
        console2.log("PaymentToken used:", address(paymentToken));

        vm.stopBroadcast();
    }
} 