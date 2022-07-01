//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20/InterfaceERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./DAO.sol";

contract Staking {
    address public owner;
    InterfaceERC20 public lpToken;
    InterfaceERC20 public rewardToken;
    DAOVoting private dao;
    uint public timeFreezing = 10 minutes;
    uint public timeReward = 7 days;
    uint public procent = 3;
    mapping(address => mapping(uint => StakeIndexed)) private stakes;
    
    // Two indexes
    // First index is id of first stake
    // Second index is id of last stake
    mapping(address => uint[2]) private indexes;

    // Root for Merkle Tree Proof WhiteList
    bytes32 public merkleRoot;
    
    event Rewarded(address account, uint256 amount);
    event Staked(uint256 stakeId, address account, uint256 amount, string token);
    event Unstaked(uint256 stakeId, address account, uint256 amount, string token);

    modifier onlyOwner(){
        require(msg.sender == owner, "not an owner");
        _;
    }

    modifier onlyDAO(){
        require(address(dao) == msg.sender, "not a DAO");
        _;
    }

    modifier onlyWhiteList(bytes32[] calldata proof) {
        require(MerkleProof.verify(proof, merkleRoot, keccak256(abi.encodePacked(msg.sender))), "not in white list");
        _;
    }

    struct StakeIndexed{
        Stake stake;
        uint256 idPreviousStake;
        uint256 idNextStake;
    }

    struct Stake {
        uint256 startAt;
        uint256 endAt;
        uint256 amount;
        uint256 alreadyReturned;
        // XXX or ETH;
        string token;
    }

    constructor(InterfaceERC20 _rewardToken, InterfaceERC20 _lpToken, bytes32 root) {
        merkleRoot = root;
        rewardToken = _rewardToken;
        lpToken = _lpToken;
        owner = msg.sender;
    }

    function setDAO(DAOVoting _dao) public onlyOwner {
        require(address(dao) == address(0), "already set");
        dao = _dao;
    }

    function setRoot(bytes32 newRoot) external onlyOwner {
        merkleRoot = newRoot;
    }

    function getStakeAmount(uint256 id) public view returns(uint) {
        return stakes[msg.sender][id].stake.amount;
    }


    function stake(uint256 amount, bytes32[] calldata proof) external onlyWhiteList(proof) returns(uint256) {
        require(amount > 0, "not enough funds");
        SafeERC20.safeTransferFrom(lpToken, msg.sender, address(this), amount);
        stake(amount, "XXX");
        return indexes[msg.sender][1];
    }

    function stake(bytes32[] calldata proof) external payable onlyWhiteList(proof) returns(uint256) {
        require(msg.value > 0, "not enough funds");
        stake(msg.value, "ETH");
        return indexes[msg.sender][1];
    }

    function stake(uint256 amount, string memory token) internal {
        Stake memory newStake = Stake(block.timestamp, block.timestamp + timeFreezing, amount, 0, token);
        StakeIndexed memory newStakeIndexed = StakeIndexed(newStake, indexes[msg.sender][1], 0);
        if (indexes[msg.sender][0] == 0 && indexes[msg.sender][1] == 0) {
            indexes[msg.sender][0]++;
        }
        indexes[msg.sender][1]++;
        stakes[msg.sender][indexes[msg.sender][1]] = newStakeIndexed;
        emit Staked(indexes[msg.sender][1], msg.sender, amount, token);
    }

    function claim() public {
        uint256 valueReward = 0;
        uint256 index = indexes[msg.sender][0];
        uint256 reward = 0;
        while (index != 0 && stakes[msg.sender][index].stake.endAt <= block.timestamp) {
            reward = stakes[msg.sender][index].stake.amount * procent * ((block.timestamp - stakes[msg.sender][index].stake.startAt) / timeReward) / 100;
            valueReward += reward;
            valueReward -= stakes[msg.sender][index].stake.alreadyReturned;
            stakes[msg.sender][index].stake.alreadyReturned = reward;
            index = stakes[msg.sender][index].idNextStake;
        }
        SafeERC20.safeTransfer(rewardToken, msg.sender, valueReward);
        emit Rewarded(msg.sender, valueReward);
    }

    function unstake(uint256 idStake) external {
        require(stakes[msg.sender][idStake].stake.amount != 0, "such stake does not exist");
        require(stakes[msg.sender][idStake].stake.endAt <= block.timestamp, "not ended yet");
        claim();
        stakes[msg.sender][stakes[msg.sender][idStake].idPreviousStake].idNextStake = stakes[msg.sender][idStake].idNextStake;
        stakes[msg.sender][stakes[msg.sender][idStake].idNextStake].idPreviousStake = stakes[msg.sender][idStake].idPreviousStake;
        if (idStake == indexes[msg.sender][0]) {
            indexes[msg.sender][0] = stakes[msg.sender][idStake].idNextStake;
        }
        if (idStake == indexes[msg.sender][1]) {
            indexes[msg.sender][1] = stakes[msg.sender][idStake].idPreviousStake;
        }
        if (compareStrings(stakes[msg.sender][idStake].stake.token, "XXX")){
            SafeERC20.safeTransfer(lpToken, msg.sender, stakes[msg.sender][idStake].stake.amount);
        }
        if (compareStrings(stakes[msg.sender][idStake].stake.token, "ETH")){
            payable(msg.sender).transfer(stakes[msg.sender][idStake].stake.amount);
        }
        emit Unstaked(idStake, msg.sender, stakes[msg.sender][idStake].stake.amount, stakes[msg.sender][idStake].stake.token);
        delete(stakes[msg.sender][idStake]);
    }

    function changeTimeFreezing(uint _timeFreezing) public onlyDAO {
        timeFreezing = _timeFreezing;
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}