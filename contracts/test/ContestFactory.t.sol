// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ContestFactory.sol";
import "../src/Contest.sol";
import "../src/PlatformToken.sol";

contract ContestFactoryTest is Test {
    ContestFactory public factory;
    PlatformToken public platformToken;
    
    address public oracle = address(1);
    address public user1 = address(2);
    
    function setUp() public {
        factory = new ContestFactory();
        platformToken = new PlatformToken("Cut Platform Token", "CUT");
    }
    
    function testCreateContest() public {
        uint256 depositAmount = 100e18; // 100 CUT tokens
        uint256 expiry = block.timestamp + 7 days;
        
        address contest = factory.createContest(
            address(platformToken),
            oracle,
            depositAmount,
            100, // 1% oracle fee
            expiry,
            1000e18, // liquidity parameter
            500 // demand sensitivity 5%
        );
        
        assertEq(factory.contestHost(contest), address(this));
        
        address[] memory contests = factory.getContests();
        assertEq(contests.length, 1);
        assertEq(contests[0], contest);
        assertEq(factory.getContestCount(), 1);
    }
    
    function testMultipleContests() public {
        uint256 depositAmount = 50e18;
        uint256 expiry = block.timestamp + 7 days;
        
        // Create 3 contests
        for (uint i = 0; i < 3; i++) {
            factory.createContest(
                address(platformToken),
                oracle,
                depositAmount,
                100,
                expiry + i * 1 days,
                1000e18,
                500
            );
        }
        
        assertEq(factory.getContestCount(), 3);
        
        address[] memory contests = factory.getContests();
        assertEq(contests.length, 3);
    }
}

