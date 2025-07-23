// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PlatformToken.sol";
import "../src/PaymentToken.sol";
import "../src/Treasury.sol";
import "../src/EscrowFactory.sol";
import "../src/Escrow.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy PaymentToken (USDC simulation)
        PaymentToken paymentToken = new PaymentToken();
        console2.log("PaymentToken deployed to:", address(paymentToken));

        // Deploy PlatformToken
        PlatformToken platformToken = new PlatformToken();
        console2.log("PlatformToken deployed to:", address(platformToken));

        // Deploy Treasury (you'll need to provide the Aave Pool Addresses Provider)
        address aavePoolAddressesProvider = 0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e; // Replace with actual address
        Treasury treasury = new Treasury(
            address(paymentToken),
            address(platformToken),
            aavePoolAddressesProvider
        );
        console2.log("Treasury deployed to:", address(treasury));

        // Set treasury in platform token
        platformToken.setTreasury(address(treasury));

        // Deploy EscrowFactory
        EscrowFactory factory = new EscrowFactory(
            address(paymentToken),
            address(treasury)
        );

        // Add initial oracle (you can modify this address)
        factory.addOracle(msg.sender);

        // Log deployed addresses
        console2.log("EscrowFactory deployed to:", address(factory));
        console2.log("PaymentToken used:", address(paymentToken));
        console2.log("PlatformToken used:", address(platformToken));
        console2.log("Treasury used:", address(treasury));

        vm.stopBroadcast();
    }
} 