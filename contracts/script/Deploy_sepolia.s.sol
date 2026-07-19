// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {ContestFactory} from "../lib/contestCatalyst/src/ContestFactory.sol";
import {ReferralGraph} from "../lib/referralTree/src/core/ReferralGraph.sol";
import {RewardCalculator} from "../lib/referralTree/src/core/RewardCalculator.sol";

/// @notice Base Sepolia (84532): MockUSDC (xUSDC) + ContestFactory + referral stack.
contract DeploySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 opsOraclePk = vm.envOr("OPS_ORACLE_PK", uint256(0));
        address referralOracle = opsOraclePk != 0 ? vm.addr(opsOraclePk) : deployer;
        bytes32 referralGroupId = vm.envBytes32("REFERRAL_GROUP_ID");

        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC();
        console2.log("MockUSDC deployed to:", address(usdc));

        ContestFactory contestFactory = new ContestFactory();
        console2.log("ContestFactory deployed to:", address(contestFactory));

        ReferralGraph referralGraph = new ReferralGraph(deployer, referralOracle, referralGroupId);
        console2.log("ReferralGraph deployed to:", address(referralGraph));

        RewardCalculator rewardCalculator = new RewardCalculator();
        console2.log("RewardCalculator deployed to:", address(rewardCalculator));

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("MockUSDC:", address(usdc));
        console2.log("ContestFactory:", address(contestFactory));
        console2.log("ReferralGraph:", address(referralGraph));
        console2.log("RewardCalculator:", address(rewardCalculator));
        console2.log("Owner (deployer):", deployer);
    }
}
