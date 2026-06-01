// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {ContestFactory} from "../lib/contestCatalyst/src/ContestFactory.sol";
import {ReferralGraph} from "../lib/referralTree/src/core/ReferralGraph.sol";
import {RewardDistributor} from "../lib/referralTree/src/core/RewardDistributor.sol";

/// @notice Base Sepolia (84532): MockUSDC (xUSDC) + ContestFactory + referral stack.
contract DeploySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address referralOracle = vm.envOr("REFERRAL_ORACLE", deployer);

        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC();
        console2.log("MockUSDC deployed to:", address(usdc));

        ContestFactory contestFactory = new ContestFactory();
        console2.log("ContestFactory deployed to:", address(contestFactory));

        ReferralGraph referralGraph = new ReferralGraph(deployer, referralOracle);
        console2.log("ReferralGraph deployed to:", address(referralGraph));

        RewardDistributor rewardDistributor =
            new RewardDistributor(deployer, address(referralGraph), referralOracle);
        console2.log("RewardDistributor deployed to:", address(rewardDistributor));

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("MockUSDC:", address(usdc));
        console2.log("ContestFactory:", address(contestFactory));
        console2.log("ReferralGraph:", address(referralGraph));
        console2.log("RewardDistributor:", address(rewardDistributor));
        console2.log("Owner (deployer):", deployer);
    }
}
