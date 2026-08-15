// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Monad testnet collateral. Each address can claim exactly 1,000 test USDC.
contract MockUSDC is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1_000 * 1e6;
    mapping(address account => bool hasClaimed) public claimed;

    error AlreadyClaimed();

    constructor() ERC20("Moncast Test USDC", "mtUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function claim() external {
        if (claimed[msg.sender]) revert AlreadyClaimed();
        claimed[msg.sender] = true;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
