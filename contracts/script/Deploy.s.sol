// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PlatformToken} from "../lib/yieldToken/src/PlatformToken.sol";
import {DepositManager} from "../lib/yieldToken/src/DepositManager.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        PlatformToken platformToken = new PlatformToken("Cut Platform Token", "CUT");
        console.log("PlatformToken deployed at:", address(platformToken));

        address usdcToken = vm.envAddress("USDC_TOKEN_ADDRESS");
        address cUSDC = vm.envAddress("CUSDC_ADDRESS");

        DepositManager depositManager = new DepositManager(usdcToken, address(platformToken), cUSDC);
        console.log("DepositManager deployed at:", address(depositManager));

        platformToken.setDepositManager(address(depositManager));
        console.log("DepositManager set as token manager for PlatformToken");

        vm.stopBroadcast();
    }
}
