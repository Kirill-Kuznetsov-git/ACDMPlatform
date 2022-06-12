//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20/InterfaceERC20.sol";

contract Stacking {
    address private owner;
    InterfaceERC20 public lpToken;
    InterfaceERC20 public rewardToken;
    uint private timeFreezing = 10 * 60; // 10 minutes
    uint private procent = 3;
    mapping (address => uint) private returnLpTokens;
    mapping(address => mapping(uint => Stack)) private stacks;
    uint private firstIndexStackElement = 0;
    uint private stacksLength = 0;

    modifier onlyOwner(){
        require(msg.sender == owner, "not an owner");
        _;
    }

    struct Stack {
        uint256 startAt;
        uint256 endAt;
        uint256 amount;
        bool ended;
    }

    constructor(InterfaceERC20 _rewardToken, InterfaceERC20 _lpToken) {
        rewardToken = _rewardToken;
        lpToken = _lpToken;
        owner = msg.sender;
    }

    function stake(uint256 amount) public {
        lpToken.transferFrom(msg.sender, address(this), amount);
        Stack memory newStack = Stack(block.timestamp, block.timestamp + timeFreezing,  amount, false);
        stacks[msg.sender][stacksLength] = newStack;
        stacksLength++;
    }

    function claim() public {
        uint256 valueReward = 0;
        while (firstIndexStackElement < stacksLength && stacks[msg.sender][firstIndexStackElement].startAt + timeFreezing <= block.timestamp) {
            returnLpTokens[msg.sender] += stacks[msg.sender][firstIndexStackElement].amount;
            valueReward += stacks[msg.sender][firstIndexStackElement].amount * 100 / procent;
            firstIndexStackElement++;
        }
        rewardToken.transfer(msg.sender, valueReward);
    }

    function unstake() public {
        claim();
        lpToken.transfer(msg.sender, returnLpTokens[msg.sender]);
        returnLpTokens[msg.sender] = 0;
    }

    function changeTimeFreezing(uint _timeFreezing) public onlyOwner {
        timeFreezing = _timeFreezing;
    }

    function changeProcent(uint _procent) public onlyOwner {
        procent = _procent;
    }
}