// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ContestFactory} from "../lib/contestCatalyst/src/ContestFactory.sol";

/// @notice Base Sepolia (84532): deploy only `ContestFactory` against an existing stack.
/// Requires PAYMENT_TOKEN_ADDRESS, REFERRAL_GRAPH_ADDRESS, REWARD_CALCULATOR_ADDRESS,
/// REFERRAL_GROUP_ID, and OPS_ORACLE_PK (or falls back to deployer as operator).
contract DeploySepoliaContestFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 opsOraclePk = vm.envOr("OPS_ORACLE_PK", uint256(0));
        address operator = opsOraclePk != 0 ? vm.addr(opsOraclePk) : deployer;

        address paymentToken = vm.envAddress("PAYMENT_TOKEN_ADDRESS");
        address referralGraph = vm.envAddress("REFERRAL_GRAPH_ADDRESS");
        address rewardCalculator = vm.envAddress("REWARD_CALCULATOR_ADDRESS");
        bytes32 referralGroupId = vm.envBytes32("REFERRAL_GROUP_ID");

        vm.startBroadcast(deployerPrivateKey);

        ContestFactory contestFactory = new ContestFactory(
            paymentToken,
            operator,
            referralGraph,
            rewardCalculator,
            referralGroupId
        );
        console2.log("ContestFactory deployed to:", address(contestFactory));

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("ContestFactory:", address(contestFactory));
        console2.log("Payment token:", paymentToken);
        console2.log("Operator:", operator);
        console2.log("ReferralGraph:", referralGraph);
        console2.log("RewardCalculator:", rewardCalculator);
    }
}
