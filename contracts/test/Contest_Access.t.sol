// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Contest.sol";
import "../src/mocks/MockUSDC.sol";

/**
 * @title Contest_Access - Merkle Gating Tests
 * @dev Comprehensive test suite for merkle tree-based access control
 */
contract Contest_Access is Test {
    Contest public contest;
    MockUSDC public usdc;

    address public oracle = address(1);
    address public whitelistedUser1 = address(2);
    address public whitelistedUser2 = address(3);
    address public nonWhitelistedUser = address(4);
    address public anotherNonWhitelisted = address(5);

    // Entry IDs for testing
    uint256 public constant ENTRY_1 = 1000;
    uint256 public constant ENTRY_2 = 1001;
    uint256 public constant ENTRY_3 = 1002;

    uint256 public constant PRIMARY_DEPOSIT = 100e6;
    uint256 public constant ORACLE_FEE = 100; // 1%
    uint256 public constant LIQUIDITY = 1000e6;
    uint256 public constant DEMAND_SENSITIVITY = 500; // 5%
    uint256 public constant PRIZE_SHARE = 750; // 7.5%
    uint256 public constant USER_SHARE = 750; // 7.5%
    uint256 public constant EXPIRY = 365 days;
    uint256 public constant SECONDARY_AMOUNT = 50e6;
    uint256 public constant TARGET_PRIMARY_SHARE = 5000;
    uint256 public constant MAX_CROSS_SUBSIDY = 0;

    // Merkle tree data
    bytes32 public primaryMerkleRoot;
    bytes32 public secondaryMerkleRoot;

    function setUp() public {
        usdc = new MockUSDC();

        contest = new Contest(
            address(usdc),
            oracle,
            PRIMARY_DEPOSIT,
            ORACLE_FEE,
            block.timestamp + EXPIRY,
            LIQUIDITY,
            DEMAND_SENSITIVITY,
            PRIZE_SHARE,
            USER_SHARE,
            TARGET_PRIMARY_SHARE,
            MAX_CROSS_SUBSIDY
        );

        // Setup merkle roots for whitelisted users
        // For simplicity, we'll create merkle trees manually
        // Tree for primary: [whitelistedUser1, whitelistedUser2]
        // Tree for secondary: [whitelistedUser1, whitelistedUser2]

        primaryMerkleRoot = _generateMerkleRoot(whitelistedUser1, whitelistedUser2);
        secondaryMerkleRoot = _generateMerkleRoot(whitelistedUser1, whitelistedUser2);
    }

    // ============ Helper Functions ============

    /**
     * @notice Generate a simple merkle root from two addresses
     * @dev Creates a balanced binary tree with two leaves
     */
    function _generateMerkleRoot(address addr1, address addr2) internal pure returns (bytes32) {
        bytes32 leaf1 = keccak256(abi.encodePacked(addr1));
        bytes32 leaf2 = keccak256(abi.encodePacked(addr2));

        // Sort leaves to ensure consistent ordering
        if (uint256(leaf1) < uint256(leaf2)) {
            return keccak256(abi.encodePacked(leaf1, leaf2));
        } else {
            return keccak256(abi.encodePacked(leaf2, leaf1));
        }
    }

    /**
     * @notice Get merkle proof for an address in a two-leaf tree
     */
    function _getMerkleProof(address target, address other) internal pure returns (bytes32[] memory) {
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = keccak256(abi.encodePacked(other));
        return proof;
    }

    /**
     * @notice Setup helper: fund and approve tokens for a user
     */
    function _setupUser(address user, uint256 amount) internal {
        usdc.mint(user, amount);
        vm.prank(user);
        usdc.approve(address(contest), amount);
    }

    // ============ Primary Position Tests - No Gating ============

    function testAddPrimaryPosition_NoGating() public {
        // When primaryMerkleRoot is bytes32(0), anyone can call
        _setupUser(nonWhitelistedUser, PRIMARY_DEPOSIT);

        // Verify merkle root is not set
        assertEq(contest.primaryMerkleRoot(), bytes32(0));

        // Non-whitelisted user should be able to add position with empty proof
        vm.prank(nonWhitelistedUser);
        bytes32[] memory emptyProof = new bytes32[](0);
        contest.addPrimaryPosition(ENTRY_1, emptyProof);

        assertEq(contest.entryOwner(ENTRY_1), nonWhitelistedUser);
        assertEq(contest.getEntriesCount(), 1);
    }

    // ============ Primary Position Tests - With Gating ============

    function testAddPrimaryPosition_ValidProof() public {
        // Set merkle root
        vm.prank(oracle);
        contest.setPrimaryMerkleRoot(primaryMerkleRoot);

        _setupUser(whitelistedUser1, PRIMARY_DEPOSIT);

        // Get proof for whitelistedUser1
        bytes32[] memory proof = _getMerkleProof(whitelistedUser1, whitelistedUser2);

        // Whitelisted user should be able to add position with valid proof
        vm.prank(whitelistedUser1);
        contest.addPrimaryPosition(ENTRY_1, proof);

        assertEq(contest.entryOwner(ENTRY_1), whitelistedUser1);
        assertEq(contest.getEntriesCount(), 1);
    }

    function testAddPrimaryPosition_InvalidProof() public {
        // Set merkle root
        vm.prank(oracle);
        contest.setPrimaryMerkleRoot(primaryMerkleRoot);

        _setupUser(nonWhitelistedUser, PRIMARY_DEPOSIT);

        // Try with wrong proof (using whitelistedUser2's proof)
        bytes32[] memory wrongProof = _getMerkleProof(whitelistedUser2, whitelistedUser1);

        // Non-whitelisted user should fail with any proof
        vm.prank(nonWhitelistedUser);
        vm.expectRevert("Invalid merkle proof");
        contest.addPrimaryPosition(ENTRY_1, wrongProof);
    }

    function testAddPrimaryPosition_NoProofWithGating() public {
        // Set merkle root
        vm.prank(oracle);
        contest.setPrimaryMerkleRoot(primaryMerkleRoot);

        _setupUser(whitelistedUser1, PRIMARY_DEPOSIT);

        // Empty proof array should revert when gating is enabled
        bytes32[] memory emptyProof = new bytes32[](0);
        vm.prank(whitelistedUser1);
        vm.expectRevert("Invalid merkle proof");
        contest.addPrimaryPosition(ENTRY_1, emptyProof);
    }

    function testSetPrimaryMerkleRoot_OnlyOracle() public {
        // Oracle should be able to set merkle root
        vm.prank(oracle);
        contest.setPrimaryMerkleRoot(primaryMerkleRoot);

        assertEq(contest.primaryMerkleRoot(), primaryMerkleRoot);
    }

    function testSetPrimaryMerkleRoot_NonOracle_Reverts() public {
        // Non-oracle should not be able to set merkle root
        vm.prank(nonWhitelistedUser);
        vm.expectRevert("Not oracle");
        contest.setPrimaryMerkleRoot(primaryMerkleRoot);
    }

    // ============ Secondary Position Tests - No Gating ============

    function testAddSecondaryPosition_NoGating() public {
        // First, add a primary position
        _setupUser(whitelistedUser1, PRIMARY_DEPOSIT);
        vm.prank(whitelistedUser1);
        bytes32[] memory emptyProof = new bytes32[](0);
        contest.addPrimaryPosition(ENTRY_1, emptyProof);

        // Setup secondary participant
        _setupUser(nonWhitelistedUser, SECONDARY_AMOUNT);

        // Verify secondary merkle root is not set
        assertEq(contest.secondaryMerkleRoot(), bytes32(0));

        // Non-whitelisted user should be able to add secondary position with empty proof
        vm.prank(nonWhitelistedUser);
        contest.addSecondaryPosition(ENTRY_1, SECONDARY_AMOUNT, emptyProof);

        assertGt(contest.balanceOf(nonWhitelistedUser, ENTRY_1), 0);
    }

    // ============ Secondary Position Tests - With Gating ============

    function testAddSecondaryPosition_ValidProof() public {
        // First, add a primary position
        _setupUser(whitelistedUser1, PRIMARY_DEPOSIT);
        vm.prank(whitelistedUser1);
        bytes32[] memory emptyProof = new bytes32[](0);
        contest.addPrimaryPosition(ENTRY_1, emptyProof);

        // Set secondary merkle root
        vm.prank(oracle);
        contest.setSecondaryMerkleRoot(secondaryMerkleRoot);

        // Setup secondary participant
        _setupUser(whitelistedUser2, SECONDARY_AMOUNT);

        // Get proof for whitelistedUser2
        bytes32[] memory proof = _getMerkleProof(whitelistedUser2, whitelistedUser1);

        // Whitelisted user should be able to add secondary position with valid proof
        vm.prank(whitelistedUser2);
        contest.addSecondaryPosition(ENTRY_1, SECONDARY_AMOUNT, proof);

        assertGt(contest.balanceOf(whitelistedUser2, ENTRY_1), 0);
    }

    function testAddSecondaryPosition_InvalidProof() public {
        // First, add a primary position
        _setupUser(whitelistedUser1, PRIMARY_DEPOSIT);
        vm.prank(whitelistedUser1);
        bytes32[] memory emptyProof = new bytes32[](0);
        contest.addPrimaryPosition(ENTRY_1, emptyProof);

        // Set secondary merkle root
        vm.prank(oracle);
        contest.setSecondaryMerkleRoot(secondaryMerkleRoot);

        // Setup non-whitelisted secondary participant
        _setupUser(nonWhitelistedUser, SECONDARY_AMOUNT);

        // Try with wrong proof
        bytes32[] memory wrongProof = _getMerkleProof(whitelistedUser1, whitelistedUser2);

        // Non-whitelisted user should fail
        vm.prank(nonWhitelistedUser);
        vm.expectRevert("Invalid merkle proof");
        contest.addSecondaryPosition(ENTRY_1, SECONDARY_AMOUNT, wrongProof);
    }

    function testAddSecondaryPosition_NoProofWithGating() public {
        // First, add a primary position
        _setupUser(whitelistedUser1, PRIMARY_DEPOSIT);
        vm.prank(whitelistedUser1);
        bytes32[] memory emptyProof = new bytes32[](0);
        contest.addPrimaryPosition(ENTRY_1, emptyProof);

        // Set secondary merkle root
        vm.prank(oracle);
        contest.setSecondaryMerkleRoot(secondaryMerkleRoot);

        // Setup whitelisted secondary participant
        _setupUser(whitelistedUser2, SECONDARY_AMOUNT);

        // Empty proof should fail even for whitelisted user
        vm.prank(whitelistedUser2);
        vm.expectRevert("Invalid merkle proof");
        contest.addSecondaryPosition(ENTRY_1, SECONDARY_AMOUNT, emptyProof);
    }

    function testSetSecondaryMerkleRoot_OnlyOracle() public {
        // Oracle should be able to set merkle root
        vm.prank(oracle);
        contest.setSecondaryMerkleRoot(secondaryMerkleRoot);

        assertEq(contest.secondaryMerkleRoot(), secondaryMerkleRoot);
    }

    function testSetSecondaryMerkleRoot_NonOracle_Reverts() public {
        // Non-oracle should not be able to set merkle root
        vm.prank(nonWhitelistedUser);
        vm.expectRevert("Not oracle");
        contest.setSecondaryMerkleRoot(secondaryMerkleRoot);
    }

    // ============ Independent Gating Tests ============

    function testIndependentGating() public {
        // Set only primary merkle root
        vm.prank(oracle);
        contest.setPrimaryMerkleRoot(primaryMerkleRoot);

        // Primary position should require proof
        _setupUser(whitelistedUser1, PRIMARY_DEPOSIT + SECONDARY_AMOUNT);
        bytes32[] memory proof1 = _getMerkleProof(whitelistedUser1, whitelistedUser2);
        vm.prank(whitelistedUser1);
        contest.addPrimaryPosition(ENTRY_1, proof1);

        // Secondary position should NOT require proof (no secondary root set)
        vm.prank(whitelistedUser1);
        bytes32[] memory emptyProof = new bytes32[](0);
        contest.addSecondaryPosition(ENTRY_1, SECONDARY_AMOUNT, emptyProof);

        assertEq(contest.entryOwner(ENTRY_1), whitelistedUser1);
        assertGt(contest.balanceOf(whitelistedUser1, ENTRY_1), 0);

        // Now set secondary merkle root
        vm.prank(oracle);
        contest.setSecondaryMerkleRoot(secondaryMerkleRoot);

        // Add another entry for testing
        _setupUser(whitelistedUser2, PRIMARY_DEPOSIT + SECONDARY_AMOUNT);
        bytes32[] memory proof2 = _getMerkleProof(whitelistedUser2, whitelistedUser1);
        vm.prank(whitelistedUser2);
        contest.addPrimaryPosition(ENTRY_2, proof2);

        // Secondary position should now require proof
        vm.prank(whitelistedUser2);
        contest.addSecondaryPosition(ENTRY_2, SECONDARY_AMOUNT, proof2);

        assertGt(contest.balanceOf(whitelistedUser2, ENTRY_2), 0);
    }

    function testMerkleRootUpdate() public {
        // Set initial merkle root
        vm.prank(oracle);
        contest.setPrimaryMerkleRoot(primaryMerkleRoot);

        assertEq(contest.primaryMerkleRoot(), primaryMerkleRoot);

        // Update to new merkle root (disabling gating)
        bytes32 newRoot = bytes32(0);
        vm.prank(oracle);
        contest.setPrimaryMerkleRoot(newRoot);

        assertEq(contest.primaryMerkleRoot(), newRoot);

        // Now anyone can add position
        _setupUser(nonWhitelistedUser, PRIMARY_DEPOSIT);
        vm.prank(nonWhitelistedUser);
        bytes32[] memory emptyProof = new bytes32[](0);
        contest.addPrimaryPosition(ENTRY_1, emptyProof);

        assertEq(contest.entryOwner(ENTRY_1), nonWhitelistedUser);
    }

    // ============ Edge Cases ============

    function testBothWhitelistedUsersCanParticipate() public {
        // Set both merkle roots
        vm.prank(oracle);
        contest.setPrimaryMerkleRoot(primaryMerkleRoot);
        vm.prank(oracle);
        contest.setSecondaryMerkleRoot(secondaryMerkleRoot);

        // User 1 adds primary position
        _setupUser(whitelistedUser1, PRIMARY_DEPOSIT + SECONDARY_AMOUNT);
        bytes32[] memory proof1 = _getMerkleProof(whitelistedUser1, whitelistedUser2);
        vm.prank(whitelistedUser1);
        contest.addPrimaryPosition(ENTRY_1, proof1);

        // User 2 adds primary position
        _setupUser(whitelistedUser2, PRIMARY_DEPOSIT + SECONDARY_AMOUNT);
        bytes32[] memory proof2 = _getMerkleProof(whitelistedUser2, whitelistedUser1);
        vm.prank(whitelistedUser2);
        contest.addPrimaryPosition(ENTRY_2, proof2);

        // User 1 adds secondary position on User 2's entry
        vm.prank(whitelistedUser1);
        contest.addSecondaryPosition(ENTRY_2, SECONDARY_AMOUNT, proof1);

        // User 2 adds secondary position on User 1's entry
        vm.prank(whitelistedUser2);
        contest.addSecondaryPosition(ENTRY_1, SECONDARY_AMOUNT, proof2);

        assertEq(contest.getEntriesCount(), 2);
        assertGt(contest.balanceOf(whitelistedUser1, ENTRY_2), 0);
        assertGt(contest.balanceOf(whitelistedUser2, ENTRY_1), 0);
    }

    function testDisableGatingBySettingZeroRoot() public {
        // Enable gating
        vm.prank(oracle);
        contest.setPrimaryMerkleRoot(primaryMerkleRoot);

        // Verify non-whitelisted user cannot participate
        _setupUser(nonWhitelistedUser, PRIMARY_DEPOSIT);
        bytes32[] memory emptyProof = new bytes32[](0);
        vm.prank(nonWhitelistedUser);
        vm.expectRevert("Invalid merkle proof");
        contest.addPrimaryPosition(ENTRY_1, emptyProof);

        // Disable gating
        vm.prank(oracle);
        contest.setPrimaryMerkleRoot(bytes32(0));

        // Now non-whitelisted user can participate
        vm.prank(nonWhitelistedUser);
        contest.addPrimaryPosition(ENTRY_1, emptyProof);

        assertEq(contest.entryOwner(ENTRY_1), nonWhitelistedUser);
    }
}
