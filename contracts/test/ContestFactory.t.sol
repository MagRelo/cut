// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ContestFactory.sol";
import "../src/PlatformToken.sol";

contract ContestFactoryTest is Test {
    ContestFactory public factory;
    PlatformToken public platformToken;
    address public owner;
    address public oracle;
    uint256 public constant ENTRY_FEE = 1e18; // 1 token with 18 decimals

    function setUp() public {
        owner = address(this);
        oracle = address(0x1);
        platformToken = new PlatformToken("BetTheCut", "BTCUT");
        factory = new ContestFactory(100, address(platformToken));
    }

    function testCreateContest() public {
        // Add oracle first
        factory.addOracle(oracle);
        assertTrue(factory.oracles(oracle));

        // Now create the contest
        address contest = factory.createContest("Test Contest", ENTRY_FEE, 10, block.timestamp + 2 hours, oracle);
        assertTrue(contest != address(0));
    }

    function testAddOracle() public {
        factory.addOracle(oracle);
        assertTrue(factory.oracles(oracle));
    }

    function testRemoveOracle() public {
        factory.addOracle(oracle);
        factory.removeOracle(oracle);
        assertFalse(factory.oracles(oracle));
    }

    function testSetPlatformFee() public {
        factory.setPlatformFee(200);
        assertEq(factory.platformFee(), 200);
    }

    function testCreateContestWithInvalidEntryFee() public {
        factory.addOracle(oracle);
        vm.expectRevert("Entry fee must be greater than 0");
        factory.createContest("Test Contest", 0, 10, block.timestamp + 2 hours, oracle);
    }

    function testCreateContestWithInvalidOracle() public {
        vm.expectRevert("Not an approved oracle");
        factory.createContest("Test Contest", ENTRY_FEE, 10, block.timestamp + 2 hours, oracle);
    }

    function testCreateContestWithInvalidEndTime() public {
        factory.addOracle(oracle);
        vm.expectRevert("End time must be in future");
        factory.createContest("Test Contest", ENTRY_FEE, 10, block.timestamp - 1, oracle);
    }

    function testCreateContestWithInvalidMaxParticipants() public {
        factory.addOracle(oracle);
        vm.expectRevert("Need at least 2 participants");
        factory.createContest("Test Contest", ENTRY_FEE, 1, block.timestamp + 2 hours, oracle);
    }

    function testSetPlatformFeeTooHigh() public {
        vm.expectRevert("Fee too high");
        factory.setPlatformFee(1001); // Max is 1000 (10%)
    }
} 