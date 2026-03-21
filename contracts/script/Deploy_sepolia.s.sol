// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PlatformToken} from "../lib/yieldToken/src/PlatformToken.sol";
import {DepositManager} from "../lib/yieldToken/src/DepositManager.sol";
import {ContestFactory} from "../lib/contestCatalyst/src/ContestFactory.sol";
import {ReferralGraph} from "../lib/referralTree/src/core/ReferralGraph.sol";
import {RewardDistributor} from "../lib/referralTree/src/core/RewardDistributor.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

/// @dev Base Sepolia (84532): mintable mock USDC + real Aave V3 Pool (AaveV3BaseSepolia)
address constant AAVE_POOL_BASE_SEPOLIA = 0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27;

contract DeploySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address referralOracle = vm.envOr("REFERRAL_ORACLE", address(0));

        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC();
        console2.log("MockUSDC deployed to:", address(usdc));

        PlatformToken platformToken = new PlatformToken("xCUT", "xCUT");
        console2.log("PlatformToken deployed to:", address(platformToken));

        DepositManager depositManager =
            new DepositManager(address(usdc), address(platformToken), AAVE_POOL_BASE_SEPOLIA);
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
        console2.log("MockUSDC:", address(usdc));
        console2.log("PlatformToken:", address(platformToken));
        console2.log("DepositManager:", address(depositManager));
        console2.log("ContestFactory:", address(contestFactory));
        console2.log("ReferralGraph:", address(referralGraph));
        console2.log("RewardDistributor:", address(rewardDistributor));
    }
}
