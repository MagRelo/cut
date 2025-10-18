// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PlatformToken.sol";
import "../src/DepositManager.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy PlatformToken
        PlatformToken platformToken = new PlatformToken("Cut Platform Token", "CUT");
        console.log("PlatformToken deployed at:", address(platformToken));

        // Deploy DepositManager
        // Note: You'll need to set these addresses based on your network
        address usdcToken = vm.envAddress("USDC_TOKEN_ADDRESS");
        address cUSDC = vm.envAddress("CUSDC_ADDRESS");
        
        DepositManager depositManager = new DepositManager(
            usdcToken,
            address(platformToken),
            cUSDC
        );
        console.log("DepositManager deployed at:", address(depositManager));

        // Set up permissions
        platformToken.setDepositManager(address(depositManager));
        console.log("DepositManager set as token manager for PlatformToken");

        vm.stopBroadcast();
    }
}
