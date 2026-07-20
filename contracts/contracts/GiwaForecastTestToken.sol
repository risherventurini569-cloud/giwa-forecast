// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GiwaForecastTestToken
 * @notice Unrestricted ERC-20 collateral for the GIWA Forecast testnet demo.
 * @dev Testnet only. No real-world value. Transfers to contracts are permitted.
 */
contract GiwaForecastTestToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 ether;
    uint256 public constant FAUCET_AMOUNT = 1_000 ether;
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    mapping(address account => uint256 timestamp) public nextClaimAt;

    event FaucetClaimed(
        address indexed account,
        uint256 amount,
        uint256 nextClaimAt
    );

    error FaucetCooldownActive(uint256 nextClaimAt);
    error InvalidRecipient();

    constructor()
        ERC20("GIWA Forecast Test Token", "GFT")
        Ownable(msg.sender)
    {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @notice Claim 1,000 GFT once per 24 hours.
     */
    function claim() external {
        uint256 availableAt = nextClaimAt[msg.sender];

        if (block.timestamp < availableAt) {
            revert FaucetCooldownActive(availableAt);
        }

        uint256 nextAvailableAt = block.timestamp + FAUCET_COOLDOWN;
        nextClaimAt[msg.sender] = nextAvailableAt;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT, nextAvailableAt);
    }

    /**
     * @notice Owner-only test minting for demos and market seeding.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidRecipient();
        _mint(to, amount);
    }
}
