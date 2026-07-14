// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ReferralGraph} from "../lib/referralTree/src/core/ReferralGraph.sol";
import {RewardCalculator} from "../lib/referralTree/src/core/RewardCalculator.sol";

/// @notice Base Sepolia (84532): deploy only ReferralGraph + RewardCalculator.
contract DeploySepoliaReferral is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address referralOracle = vm.envOr("REFERRAL_ORACLE", deployer);
        bytes32 referralGroupId = vm.envBytes32("REFERRAL_GROUP_ID");

        vm.startBroadcast(deployerPrivateKey);

        ReferralGraph referralGraph = new ReferralGraph(deployer, referralOracle, referralGroupId);
        console2.log("ReferralGraph deployed to:", address(referralGraph));

        RewardCalculator rewardCalculator = new RewardCalculator();
        console2.log("RewardCalculator deployed to:", address(rewardCalculator));

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("ReferralGraph:", address(referralGraph));
        console2.log("RewardCalculator:", address(rewardCalculator));
    }
}
