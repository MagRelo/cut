// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@aave/interfaces/IPool.sol";
import "@aave/interfaces/IPoolAddressesProvider.sol";

contract Escrow is ReentrancyGuard, Ownable {
    IERC20 public immutable paymentToken;
    address public immutable oracle;

    // Aave integration
    IPool public immutable aavePool;
    IERC20 public immutable aUSDC;
    uint256 public totalInitialDeposits;

    enum EscrowState { OPEN, IN_PROGRESS, SETTLED, CANCELLED }
    EscrowState public state;

    struct EscrowDetails {
        string name;
        uint256 depositAmount;
        uint256 maxParticipants;
        uint256 endTime;
    }
    EscrowDetails public details;

    mapping(address => bool) public hasDeposited;
    address[] public participants;

    event EscrowDeposited(address indexed participant);
    event EscrowWithdrawn(address indexed participant);
    event DepositsClosed();
    event PayoutsDistributed(uint256[] payouts);
    event EscrowCancelled();
    event ParticipantRefunded(address indexed participant, uint256 amount);

    modifier whenOpen() {
        require(state == EscrowState.OPEN, "Escrow not open");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    constructor(
        string memory _name,
        uint256 _depositAmount,
        uint256 _maxParticipants,
        uint256 _endTime,
        address _paymentToken,
        address _oracle,
        address _aavePoolAddressesProvider
    ) Ownable(msg.sender) {
        details = EscrowDetails({
            name: _name,
            depositAmount: _depositAmount,
            maxParticipants: _maxParticipants,
            endTime: _endTime
        });
        paymentToken = IERC20(_paymentToken);
        oracle = _oracle;
        state = EscrowState.OPEN;

        // Initialize Aave
        IPoolAddressesProvider provider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        aavePool = IPool(provider.getPool());
        aUSDC = IERC20(aavePool.getReserveData(_paymentToken).aTokenAddress);
    }

    function deposit() external whenOpen {
        require(!hasDeposited[msg.sender], "Already deposited");
        require(participants.length < details.maxParticipants, "Escrow full");

        paymentToken.transferFrom(msg.sender, address(this), details.depositAmount);
        
        // Track initial deposit
        totalInitialDeposits += details.depositAmount;
        
        // Deposit to Aave
        paymentToken.approve(address(aavePool), details.depositAmount);
        aavePool.supply(address(paymentToken), details.depositAmount, address(this), 0);
        
        participants.push(msg.sender);
        hasDeposited[msg.sender] = true;

        emit EscrowDeposited(msg.sender);
    }

    function withdraw() external whenOpen {
        require(hasDeposited[msg.sender], "Not deposited");

        // Withdraw from Aave
        aavePool.withdraw(address(paymentToken), details.depositAmount, address(this));
        
        // Return only the initial deposit
        paymentToken.transfer(msg.sender, details.depositAmount);
        
        // Update tracking
        totalInitialDeposits -= details.depositAmount;
        hasDeposited[msg.sender] = false;

        // Remove participant from the participants array (swap and pop)
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] == msg.sender) {
                participants[i] = participants[participants.length - 1];
                participants.pop();
                break;
            }
        }

        emit EscrowWithdrawn(msg.sender);
    }

    function closeDeposits() external onlyOracle {
        require(state == EscrowState.OPEN, "Escrow not open");
        state = EscrowState.IN_PROGRESS;
        emit DepositsClosed();
    }

    function distribute(uint256[] calldata _payoutBasisPoints) external onlyOracle {
        require(state == EscrowState.IN_PROGRESS, "Escrow not in progress");
        require(_payoutBasisPoints.length == participants.length, "Invalid payouts length");

        uint256 totalBasisPoints;
        for (uint256 i = 0; i < _payoutBasisPoints.length; i++) {
            totalBasisPoints += _payoutBasisPoints[i];
        }
        require(totalBasisPoints == 10000, "Total must be 10000 basis points");

        // Withdraw all funds from Aave
        uint256 aUSDCBalance = aUSDC.balanceOf(address(this));
        aavePool.withdraw(address(paymentToken), aUSDCBalance, address(this));

        // Calculate payouts based on basis points from initial deposits only
        uint256[] memory calculatedPayouts = new uint256[](_payoutBasisPoints.length);
        for (uint256 i = 0; i < _payoutBasisPoints.length; i++) {
            calculatedPayouts[i] = (totalInitialDeposits * _payoutBasisPoints[i]) / 10000;
        }

        // Update state 
        state = EscrowState.SETTLED;
        emit PayoutsDistributed(calculatedPayouts);

        // External calls last
        for (uint256 i = 0; i < calculatedPayouts.length; i++) {
            paymentToken.transfer(participants[i], calculatedPayouts[i]);
        }

        // Transfer all remaining yield to oracle
        uint256 remainingBalance = paymentToken.balanceOf(address(this));
        if (remainingBalance > 0) {
            paymentToken.transfer(oracle, remainingBalance);
        }
    }

    function emergencyWithdraw() external {
        require(hasDeposited[msg.sender], "Not deposited");
        require(block.timestamp > details.endTime, "Escrow not ended");

        // Withdraw from Aave
        aavePool.withdraw(address(paymentToken), details.depositAmount, address(this));
        
        paymentToken.transfer(msg.sender, details.depositAmount);
        hasDeposited[msg.sender] = false;
    }

    function getParticipantsCount() external view returns (uint256) {
        return participants.length;
    }

    function cancelAndRefund() external onlyOwner {
        require(state == EscrowState.OPEN, "Escrow not open");
        
        // Set state to cancelled
        state = EscrowState.CANCELLED;
        emit EscrowCancelled();
        
        // Withdraw all funds from Aave
        uint256 aUSDCBalance = aUSDC.balanceOf(address(this));
        if (aUSDCBalance > 0) {
            aavePool.withdraw(address(paymentToken), aUSDCBalance, address(this));
        }
        
        // Refund all participants
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            if (hasDeposited[participant]) {
                paymentToken.transfer(participant, details.depositAmount);
                hasDeposited[participant] = false;
                emit ParticipantRefunded(participant, details.depositAmount);
            }
        }
        delete participants;
        
        // Transfer any remaining funds to oracle
        uint256 remainingBalance = paymentToken.balanceOf(address(this));
        if (remainingBalance > 0) {
            paymentToken.transfer(oracle, remainingBalance);
        }
    }
} 