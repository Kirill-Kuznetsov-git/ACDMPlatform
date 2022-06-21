//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20/InterfaceERC20.sol";

contract Stacking {
    InterfaceERC20 public lpToken;
    InterfaceERC20 public rewardToken;
    uint public timeFreezing = 10 minutes;
    uint public timeReward = 7 days;
    uint public procent = 3;
    mapping(address => mapping(uint => StackIndexed)) private stacks;
    
    // Two indexes
    // First index is id of first stake
    // Second index is id of last stake
    mapping(address => uint[2]) private indexes;
    
    address private owner;
    mapping(address => bool) public isDAO;

    modifier onlyOwner(){
        require(msg.sender == owner, "not an owner");
        _;
    }

    modifier onlyDAO(){
        require(isDAO[msg.sender], "not a DAO");
        _;
    }

    struct StackIndexed{
        Stack stack;
        uint256 idPreviousStack;
        uint256 idNextStack;
    }

    struct Stack {
        uint256 startAt;
        uint256 endAt;
        uint256 amount;
        uint256 alreadyReturned;
        // XXX or ETH;
        string token;
    }

    constructor(InterfaceERC20 _rewardToken, InterfaceERC20 _lpToken) {
        rewardToken = _rewardToken;
        lpToken = _lpToken;
        owner = msg.sender;
    }

    function stake(uint256 amount) public {
        lpToken.transferFrom(msg.sender, address(this), amount);
        stake(amount, "XXX");
    }

    function stake() public payable {
        stake(msg.value, "ETH");
    }

    function stake(uint256 amount, string memory token) internal {
        Stack memory newStack = Stack(block.timestamp, block.timestamp + timeFreezing, amount, 0, token);
        StackIndexed memory newStackIndexed = StackIndexed(newStack, indexes[msg.sender][1], 0);
        if (indexes[msg.sender][0] == 0 && indexes[msg.sender][0] == 1) {
            indexes[msg.sender][0]++;
            indexes[msg.sender][1]++;
            stacks[msg.sender][indexes[msg.sender][1]] = newStackIndexed;
        } 
        else {
            indexes[msg.sender][1]++;
            stacks[msg.sender][indexes[msg.sender][1]] = newStackIndexed;
        }
    }

    function claim() public {
        uint256 valueReward = 0;
        uint256 index = indexes[msg.sender][0];
        uint256 reward = 0;
        while (index != 0 && stacks[msg.sender][index].stack.startAt + timeFreezing <= block.timestamp) {
            reward = stacks[msg.sender][index].stack.amount * procent * ((block.timestamp - stacks[msg.sender][index].stack.startAt) / timeReward) / 100;
            valueReward += reward;
            valueReward -= stacks[msg.sender][index].stack.alreadyReturned;
            stacks[msg.sender][index].stack.alreadyReturned = reward;
            index = stacks[msg.sender][index].idNextStack;
        }
        rewardToken.transfer(msg.sender, valueReward);
    }

    function unstake(uint256 idStack) public {
        claim();
        stacks[msg.sender][stacks[msg.sender][idStack].idPreviousStack].idNextStack = stacks[msg.sender][idStack].idNextStack;
        if (compareStrings(stacks[msg.sender][idStack].stack.token, "XXX")){
            lpToken.transfer(msg.sender, stacks[msg.sender][idStack].stack.amount);
        }
        if (compareStrings(stacks[msg.sender][idStack].stack.token, "ETH")){
            payable(msg.sender).transfer(stacks[msg.sender][idStack].stack.amount);
        }
        delete(stacks[msg.sender][idStack]);
    }

    function changeTimeFreezing(uint _timeFreezing) public onlyDAO {
        timeFreezing = _timeFreezing;
    }

    function compareStrings(string memory a, string memory b) public pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}