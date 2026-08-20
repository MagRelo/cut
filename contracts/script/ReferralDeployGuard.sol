// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {ReferralGraph} from "../lib/referralTree/src/core/ReferralGraph.sol";

/// Shared operator / platform-root loading for forge deploys.
/// Platform root is not a constructor arg; it must still be set at deploy and
/// must not be the hot operator (settlement referral fees credit this address).
abstract contract ReferralDeployGuard is Script {
    address internal constant REFERRAL_ROOT = address(1);

    function loadOperator(address deployer) internal view returns (address operator, uint256 operatorPk) {
        operatorPk = vm.envOr("OPERATOR_PK", uint256(0));
        operator = operatorPk != 0 ? vm.addr(operatorPk) : deployer;
    }

    function requirePlatformRoot(address operator) internal view returns (address platformRoot) {
        platformRoot = vm.envAddress("REFERRAL_PLATFORM_ROOT_ADDRESS");
        require(platformRoot != address(0), "REFERRAL_PLATFORM_ROOT_ADDRESS is zero");
        require(platformRoot != REFERRAL_ROOT, "REFERRAL_PLATFORM_ROOT_ADDRESS cannot be REFERRAL_ROOT");
        require(
            platformRoot != operator,
            "REFERRAL_PLATFORM_ROOT_ADDRESS must differ from operator"
        );
    }

    /// Register the cold platform root under REFERRAL_ROOT. Caller must be the
    /// graph's authorized oracle (OPERATOR_PK, or deployer when OPERATOR_PK is unset).
    function registerPlatformRoot(
        ReferralGraph graph,
        address platformRoot,
        bytes32 groupId,
        uint256 operatorPk,
        uint256 deployerPk
    ) internal {
        uint256 oraclePk = operatorPk != 0 ? operatorPk : deployerPk;
        vm.startBroadcast(oraclePk);
        graph.register(platformRoot, REFERRAL_ROOT, groupId);
        vm.stopBroadcast();
        console2.log("Platform root registered under REFERRAL_ROOT:", platformRoot);
    }
}
