// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/** @notice Local-only test token. Never deploy this as a substitute for GIWA Playground VerifiedToken. */
contract MockVerifiedToken is ERC20 {
    constructor() ERC20("Mock VerifiedToken", "mVT") {
        _mint(msg.sender, 10_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
