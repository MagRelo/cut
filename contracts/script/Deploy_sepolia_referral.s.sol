// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console2} from "forge-std/console2.sol";
import {ReferralGraph} from "../lib/referralTree/src/core/ReferralGraph.sol";
import {RewardCalculator} from "../lib/referralTree/src/core/RewardCalculator.sol";
import {ReferralDeployGuard} from "./ReferralDeployGuard.sol";

/// @notice Base Sepolia (84532): deploy only ReferralGraph + RewardCalculator.
contract DeploySepoliaReferral is ReferralDeployGuard {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        (address operator, uint256 operatorPk) = loadOperator(deployer);
        address platformRoot = requirePlatformRoot(operator);
        bytes32 referralGroupId = vm.envBytes32("REFERRAL_GROUP_ID");

        vm.startBroadcast(deployerPrivateKey);

        ReferralGraph referralGraph = new ReferralGraph(deployer, operator, referralGroupId);
        console2.log("ReferralGraph deployed to:", address(referralGraph));

        RewardCalculator rewardCalculator = new RewardCalculator();
        console2.log("RewardCalculator deployed to:", address(rewardCalculator));

        vm.stopBroadcast();

        registerPlatformRoot(referralGraph, platformRoot, referralGroupId, operatorPk, deployerPrivateKey);

        console2.log("=== Deployment Summary ===");
        console2.log("ReferralGraph:", address(referralGraph));
        console2.log("RewardCalculator:", address(rewardCalculator));
        console2.log("Operator (referral oracle):", operator);
        console2.log("Platform root:", platformRoot);
    }
}
