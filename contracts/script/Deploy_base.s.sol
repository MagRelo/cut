// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console2} from "forge-std/console2.sol";
import {ContestFactory} from "../lib/contestCatalyst/src/ContestFactory.sol";
import {ReferralGraph} from "../lib/referralTree/src/core/ReferralGraph.sol";
import {RewardCalculator} from "../lib/referralTree/src/core/RewardCalculator.sol";
import {ReferralDeployGuard} from "./ReferralDeployGuard.sol";

/// @notice Base mainnet (8453): referral stack + ContestFactory.
/// Payment token is canonical USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) — recorded by deploy.js, not deployed here.
contract DeployBase is ReferralDeployGuard {
    address constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

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

        ContestFactory contestFactory = new ContestFactory(
            BASE_USDC,
            operator,
            address(referralGraph),
            address(rewardCalculator),
            referralGroupId
        );
        console2.log("ContestFactory deployed to:", address(contestFactory));

        vm.stopBroadcast();

        registerPlatformRoot(referralGraph, platformRoot, referralGroupId, operatorPk, deployerPrivateKey);

        console2.log("=== Deployment Summary ===");
        console2.log("ContestFactory:", address(contestFactory));
        console2.log("ReferralGraph:", address(referralGraph));
        console2.log("RewardCalculator:", address(rewardCalculator));
        console2.log("Operator (OPS):", operator);
        console2.log("Platform root:", platformRoot);
        console2.log("Owner (deployer):", deployer);
        console2.log("Payment token (canonical USDC):", BASE_USDC);
    }
}
