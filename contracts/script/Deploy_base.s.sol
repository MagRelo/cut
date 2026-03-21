// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PlatformToken} from "../lib/yieldToken/src/PlatformToken.sol";
import {DepositManager} from "../lib/yieldToken/src/DepositManager.sol";
import {ContestFactory} from "../lib/contestCatalyst/src/ContestFactory.sol";
import {ReferralGraph} from "../lib/referralTree/src/core/ReferralGraph.sol";
import {RewardDistributor} from "../lib/referralTree/src/core/RewardDistributor.sol";

contract DeployBase is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address referralOracle = vm.envOr("REFERRAL_ORACLE", address(0));

        vm.startBroadcast(deployerPrivateKey);

        PlatformToken platformToken = new PlatformToken("Cut Platform Token", "CUT");
        console2.log("PlatformToken deployed to:", address(platformToken));

        // USDC + Aave V3 Pool on Base mainnet (yieldToken DepositManager uses IPool, not Compound cUSDC)
        DepositManager depositManager = new DepositManager(
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            address(platformToken),
            0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
        );
        console2.log("DepositManager deployed to:", address(depositManager));

        platformToken.setDepositManager(address(depositManager));
        console2.log("DepositManager set in PlatformToken");

        ContestFactory contestFactory = new ContestFactory();
        console2.log("ContestFactory deployed to:", address(contestFactory));

        ReferralGraph referralGraph = new ReferralGraph(deployer, referralOracle);
        console2.log("ReferralGraph deployed to:", address(referralGraph));

        RewardDistributor rewardDistributor = new RewardDistributor(deployer, address(referralGraph), referralOracle);
        console2.log("RewardDistributor deployed to:", address(rewardDistributor));

        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("PlatformToken:", address(platformToken));
        console2.log("DepositManager:", address(depositManager));
        console2.log("ContestFactory:", address(contestFactory));
        console2.log("ReferralGraph:", address(referralGraph));
        console2.log("RewardDistributor:", address(rewardDistributor));
    }
}
