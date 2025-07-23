// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PlatformToken is ERC20, Ownable {
    address public treasury;

    event TreasurySet(address indexed treasury);

    constructor() ERC20("Cut Platform Token", "CUT") Ownable(msg.sender) {}

    modifier onlyTreasury() {
        require(msg.sender == treasury, "Only treasury can call this function");
        _;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
        emit TreasurySet(_treasury);
    }

    function mint(address to, uint256 amount) external onlyTreasury {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyTreasury {
        _burn(from, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
} 