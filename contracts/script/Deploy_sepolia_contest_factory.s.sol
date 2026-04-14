// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ContestFactory} from "../lib/contestCatalyst/src/ContestFactory.sol";

/// @notice Base Sepolia (84532): deploy only `ContestFactory` (no MockUSDC, PlatformToken, etc.).
contract DeploySepoliaContestFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ContestFactory contestFactory = new ContestFactory();
        console2.log("ContestFactory deployed to:", address(contestFactory));

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("ContestFactory:", address(contestFactory));
    }
}
