// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

/// @notice Base Sepolia (84532): deploy only MockUSDC (xUSDC).
contract DeploySepoliaMockUsdc is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC();
        console2.log("MockUSDC deployed to:", address(usdc));

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("MockUSDC:", address(usdc));
        console2.log("Owner (deployer):", deployer);
    }
}
