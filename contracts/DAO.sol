//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IStaking.sol";
import "./ERC20/InterfaceERC20.sol";
import "hardhat/console.sol";


contract DAOVoting {
    using Counters for Counters.Counter;
    Counters.Counter private votingID;
    address private owner;
    InterfaceERC20 public token;
    IStaking public staking;
    uint256 public minimumQuorum;
    uint256 public debatingPeriodDuration;
    mapping(address => bool) public isChairMan;
    mapping(address => bool) public isDAO;

    // account address to array of ids of stakes
    mapping(address => uint256[]) private balanceTotal;

    // account address to id of last voting
    mapping(address => uint256) private lastVoting;

    // account address to index which get first id stake which still was not used in balanceTotal[address]
    mapping(address => uint256) private firstNotUsedStake; 
    
    struct Voting {
        string description;

        // account address to number of votes(tokens)
        mapping(address => uint256) participants;
        uint256 totalVotes;
        uint256 positiveVotes;

        address recipient;
        bytes callData;

        uint256 startAt;
        uint256 endAt;
        bool ended;
    }

    // id voting to voting
    mapping(uint256 => Voting) public votings;

    event VotingCreated(uint256 id, string description);
    event VotingEnded(uint256 id, bool result);

    modifier OnlyOwner() {
        require(msg.sender == owner, "not an owner");
        _;
    }

    modifier OnlyChairMan() {
        require(isChairMan[msg.sender], "not a chairman");
        _;
    }

    modifier OnlyDAO() {
        require(isDAO[msg.sender], "not a DAO");
        _;
    }

    constructor(address chairMan, InterfaceERC20 _token, IStaking _staking, uint256 _minimumQuorum, uint256 _debatingPeriodDuration) {
        owner = msg.sender;
        addChairMan(chairMan);
        addChairMan(owner);
        addDAO(address(this));
        token = _token;
        staking = _staking;
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    function getBalance() public view returns(uint256) {
        uint returnValue = 0;
        for (uint i = 0; i < balanceTotal[msg.sender].length; i++) {
            returnValue += staking.getStakeAmount(balanceTotal[msg.sender][i]);
        }
        return returnValue;
    }

    function getUserBalance(address user) internal view returns(uint256) {
        uint returnValue = 0;
        for (uint i = 0; i < balanceTotal[user].length; i++) {
            returnValue += staking.getStakeAmount(balanceTotal[user][i]);
        }
        return returnValue;
    }

    function getFrozenBalance() external view returns(uint256) {
        if (votings[lastVoting[msg.sender]].endAt <= block.timestamp) {
            return 0;
        }
        return votings[lastVoting[msg.sender]].participants[msg.sender];
    }

    function addChairMan(address account) public OnlyOwner {
        isChairMan[account] = true;
    }

    function addDAO(address account) public OnlyOwner {
        isDAO[account] = true;
    }

    function setMinimumQuorum(uint256 newMinimumQuorum) external OnlyDAO {
        minimumQuorum = newMinimumQuorum;
    }

    function setDebatingPeriodDuration(uint256 newDebatingPeriodDuration) external OnlyDAO {
        debatingPeriodDuration = newDebatingPeriodDuration;
    }

    function deposit(uint256 funds, bytes32[] memory merkleProof) external {
        require(token.balanceOf(msg.sender) >= funds, "not enough funds");
        SafeERC20.safeTransferFrom(token, msg.sender, address(this), funds);
        token.approve(address(staking), funds);
        uint id = staking.stake(funds, merkleProof);
        balanceTotal[msg.sender].push(id);
    }

    function addProposal(bytes memory callData, address recipient, string memory description) external OnlyChairMan {
        Voting storage newVoting = votings[votingID.current()];
        newVoting.callData = callData;
        newVoting.recipient = recipient;
        newVoting.description = description;
        newVoting.startAt = block.timestamp;
        newVoting.endAt = block.timestamp + debatingPeriodDuration;
        emit VotingCreated(votingID.current(), description);
        votingID.increment();
    }

    function vote(uint256 votingId, bool voteValue) external {
        require(votingID.current() >= votingId, "such voting does not exist");
        require(getUserBalance(msg.sender) != 0, "you don't froze enough tokens");
        require(block.timestamp < votings[votingId].endAt, "already ended");
        require(votings[votingId].participants[msg.sender] == 0, "you already voted");

        lastVoting[msg.sender] = votingId;
        firstNotUsedStake[msg.sender] = balanceTotal[msg.sender].length;
        votings[votingId].participants[msg.sender] = getUserBalance(msg.sender);
        votings[votingId].totalVotes += getUserBalance(msg.sender);
        if (voteValue) {
            votings[votingId].positiveVotes += getUserBalance(msg.sender);
        }
    }

    function finishProposal(uint256 votingId) external {
        require(votingID.current() >= votingId, "such voting does not exist");
        require(block.timestamp >= votings[votingId].endAt, "proposal is runnning right now");
        require(!votings[votingId].ended, "already ended");
        bool called = false;
        if (votings[votingId].totalVotes >= minimumQuorum && votings[votingId].positiveVotes > votings[votingId].totalVotes - votings[votingId].positiveVotes) {
            callFunction(votings[votingId].recipient, votings[votingId].callData);
            called = true;
        }

        votings[votingId].ended = true;
        emit VotingEnded(votingId, votings[votingId].ended);
    }

    function callFunction(address recipient, bytes memory signature) internal {
        (bool success, ) = recipient.call(signature);   
        require(success, "ERROR call function");
    }

    function withdraw() external {
        if (votings[lastVoting[msg.sender]].endAt > block.timestamp && votings[lastVoting[msg.sender]].participants[msg.sender] < getUserBalance(msg.sender)) {
            uint value;
            while (firstNotUsedStake[msg.sender] < balanceTotal[msg.sender].length) {
                value = staking.getStakeAmount(balanceTotal[msg.sender][balanceTotal[msg.sender].length - 1]);
                staking.unstake(balanceTotal[msg.sender][balanceTotal[msg.sender].length - 1]);
                SafeERC20.safeTransfer(token, msg.sender, value);
                balanceTotal[msg.sender].pop();
            }
        }
        // if last voting already end
        if (votings[lastVoting[msg.sender]].endAt <= block.timestamp) {
            uint i = 0;
            // try to unstake all stakes which already ended
            while (i < balanceTotal[msg.sender].length){
                uint value = staking.getStakeAmount(balanceTotal[msg.sender][i]);
                try staking.unstake(balanceTotal[msg.sender][i]) {
                    i++;
                    SafeERC20.safeTransfer(token, msg.sender, value);
                } catch {
                    // it means Error: "not ended yet"
                    break;
                }
            }
            // if all stake was unstaked then delete all ids
            if (i == balanceTotal[msg.sender].length) {
                delete balanceTotal[msg.sender];
            }
            else {
                uint ii = 0;
                // move currect stakes to the start of array
                while (i < balanceTotal[msg.sender].length){
                    balanceTotal[msg.sender][ii] = balanceTotal[msg.sender][i];
                    ii++;
                    i++;
                }
                // pop ids of stake which was unstaked
                while (ii < balanceTotal[msg.sender].length) {
                    balanceTotal[msg.sender].pop();
                }
            }
        }
    }
}