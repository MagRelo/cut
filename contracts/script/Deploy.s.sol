// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PlatformToken.sol";
import "../src/EscrowFactory.sol";
import "../src/Escrow.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy PlatformToken first
        PlatformToken paymentToken = new PlatformToken(
            "BetTheCut",
            "BTCUT"
        );
        console2.log("PlatformToken deployed to:", address(paymentToken));

        // Deploy EscrowFactory
        EscrowFactory factory = new EscrowFactory(
            address(paymentToken),
            0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e
        );

        // Add initial oracle (you can modify this address)
        factory.addOracle(msg.sender);

        // Log deployed addresses
        console2.log("EscrowFactory deployed to:", address(factory));
        console2.log("PaymentToken used:", address(paymentToken));

        vm.stopBroadcast();
    }
} 