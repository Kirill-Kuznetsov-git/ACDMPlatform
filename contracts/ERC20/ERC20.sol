// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./InterfaceERC20.sol";

contract ERC20 is InterfaceERC20 {
    address private owner;
    mapping(address => uint256) private _balances;
    mapping(address => bool) private isAdmin;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint8 private _decimals; // 1 token = 1 wei
    string private _name;
    string private _symbol;
    uint256 private _totalTokens;

    modifier enoughTokens(address from, uint256 value){
        require(balanceOf(from) >= value, "not enough tokens");
        _;
    }

    modifier onlyOwner(){
        require(msg.sender == owner, "not an owner");
        _;
    }

    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "not an admin");
        _;
    }
    

    constructor(string memory name_, string memory symbol_, uint8 decimals_){
        require(decimals_ >= 1 && decimals_ <= 18, "wrong decomals");
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        owner = msg.sender;
        isAdmin[msg.sender] = true;
    }

    function giveAdminRole(address newAdmin) override external onlyOwner{
        isAdmin[newAdmin] = true;
    }

    function name() override public view returns(string memory){
        return _name;
    }
    function symbol() override public view returns(string memory){
        return _symbol;
    }
    function decimals() override public view returns(uint8){
        return _decimals;
    }
    function totalSupply() override public view returns(uint256){
        return _totalTokens;
    }

    function balanceOf(address ownerTokens) override public view returns(uint256){
        return _balances[ownerTokens];
    }
    function allowance(address ownerTokens, address spender) override public view returns(uint256){
        return _allowances[ownerTokens][spender];
    }

    function transfer(address to, uint256 value) override public enoughTokens(msg.sender, value) returns(bool){
        _balances[msg.sender] -= value;
        _balances[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) override public enoughTokens(from, value)  returns(bool){
        require(allowance(from, to) >= value, "not allowed");
        _balances[from] -= value;
        _balances[to] += value;
        emit Transfer(from, to, value);
        return true;
    }

    function approve(address spender, uint256 value) override public returns(bool){
        _allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function burn(address account, uint256 amount) override public onlyAdmin{
        _balances[account] -= amount;
        _totalTokens -= amount;
    }

    function mint(address account, uint256 amount) override public onlyAdmin{
        _balances[account] += amount;
        _totalTokens += amount;
    }
}