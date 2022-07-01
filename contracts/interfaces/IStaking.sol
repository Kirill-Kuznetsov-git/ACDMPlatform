// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStaking {
    function getStakeAmount(uint256 id) external view returns(uint256);

    function stake(uint256 amount, bytes32[] calldata proof) external returns(uint256);

    function stake(bytes32[] calldata proof) external payable returns(uint256);

    function claim() external;

    function unstake(uint256 idStake) external;

    function changeTimeFreezing(uint _timeFreezing) external;
}