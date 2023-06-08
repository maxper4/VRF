// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

interface IVRF {
    function askForRandomness(uint256 seed, uint256 confirmations) external returns (bytes32 requestId);
    function fulfillRandomness(bytes32 requestId, bytes memory randomness) external;
}