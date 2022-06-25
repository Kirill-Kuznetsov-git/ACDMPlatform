//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20/ERC20.sol";

contract ACDMToken is ERC20 {
    constructor() ERC20("ACADEM Coin", "ACDM", 6) {}

}