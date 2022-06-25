// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDAO {
    function getBalance() external view returns(uint256);

    function getFrozenBalance() external view returns(uint256);

    function addChairMan(address account) external;

    function addDAO(address account) external;

    function setMinimumQuorum(uint256 newMinimumQuorum) external;

    function setDebatingPeriodDuration(uint256 newDebatingPeriodDuration) external;

    function deposit(uint256 funds) external;

    function addProposal(bytes memory callData, address recipient, string memory description) external;

    function vote(uint256 votingId, bool voteValue) external;

    function finishProposal(uint256 votingId) external;

    function withdraw() external;
}