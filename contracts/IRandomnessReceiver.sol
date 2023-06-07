// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

interface IRandomnessReceiver {
    function receiveRandomness(uint256 randomness) external;
}