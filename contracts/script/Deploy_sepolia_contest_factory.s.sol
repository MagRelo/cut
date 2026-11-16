// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console2} from "forge-std/console2.sol";
import {ContestFactory} from "../lib/contestCatalyst/src/ContestFactory.sol";
import {ReferralDeployGuard} from "./ReferralDeployGuard.sol";

/// @notice Base Sepolia (84532): deploy only `ContestFactory` against an existing stack.
/// Requires PAYMENT_TOKEN_ADDRESS, REFERRAL_GRAPH_ADDRESS, REWARD_CALCULATOR_ADDRESS,
/// REFERRAL_GROUP_ID, OPERATOR_PK (or falls back to deployer as operator), and
/// REFERRAL_PLATFORM_ROOT_ADDRESS (must differ from operator; not a constructor arg).
contract DeploySepoliaContestFactory is ReferralDeployGuard {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        (address operator,) = loadOperator(deployer);
        address platformRoot = requirePlatformRoot(operator);

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
        // The factory deploys the delegate session-key policy (NoSelfCallPolicy) in its constructor.
        // The server and app read it from contestFactory.delegatePolicy(); point
        // server/src/contracts/*.json contestFactoryAddress at this factory to turn delegates on.
        console2.log("Delegate policy (NoSelfCallPolicy):", contestFactory.delegatePolicy());

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("ContestFactory:", address(contestFactory));
        console2.log("Delegate policy:", contestFactory.delegatePolicy());
        console2.log("Payment token:", paymentToken);
        console2.log("Operator:", operator);
        console2.log("Platform root:", platformRoot);
        console2.log("ReferralGraph:", referralGraph);
        console2.log("RewardCalculator:", rewardCalculator);
    }
}
