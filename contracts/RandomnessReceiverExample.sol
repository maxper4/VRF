// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./IRandomnessReceiver.sol";
import "./IVRF.sol";

contract RandomnessReceiverExample is IRandomnessReceiver {
    bytes32 public requestId;
    uint256 public randomResult;
    IVRF public vrf;

    constructor(address _vrf) {
        vrf = IVRF(_vrf);
    }

    function askForRandomness(uint256 seed, uint256 confirmations) external{
        requestId = vrf.askForRandomness(seed, confirmations);
    }

    function receiveRandomness(uint256 randomness) external override {
        randomResult = randomness;
    }
}
