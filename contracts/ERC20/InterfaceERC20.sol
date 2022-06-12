// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface InterfaceERC20 is IERC20 {
    function giveAdminRole(address newAdmin) external;
    function name() external view returns(string memory);
    function symbol() external view returns(string memory);
    function decimals() external view returns(uint8);
    function totalSupply() external view returns(uint256);
    function balanceOf(address ownerTokens) external view returns(uint256);
    function allowance(address ownerTokens, address spender) external view returns(uint256);

    function transfer(address to, uint256 value) external returns(bool);
    function transferFrom(address from, address to, uint256 value) external returns(bool);
    function approve(address spender, uint256 value) external returns(bool);

    function burn(address account, uint256 amount) external;
    function mint(address account, uint256 amount) external;
}
