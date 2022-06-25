//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20/ERC20.sol";

contract XXXToken is ERC20 {
    constructor() ERC20("XXX Coin", "XXX", 18){}   
}