// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./IRandomnessReceiver.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

error IncorrectConfirmation();
error ExpiredRequest();
error UnautorizedOracle();
error IncorrectRandomness();

contract VRF {

    struct RandomnessRequest {
        uint256 seed;
        address sender;
        uint256 requestBlock;
        uint256 expirationBlock;
        bool fullfilled;
    }

    mapping(bytes32 => RandomnessRequest) public randomnessRequests;
    mapping(address => uint256) public oraclesRegistrationTimestamps;           // This is to prevent brute force of the vrf

    uint256 public constant MAX_RANDOMNESS_REQUEST_CONFIRMATIONS = 256;
    uint256 public constant MIN_RANDOMNESS_REQUEST_CONFIRMATIONS = 2;

    event RandomnessRequest(bytes32 indexed requestId, uint256 indexed seed);

    function askForRandomness(uint256 seed, uint256 confirmations) public returns (bytes32 requestId) {
        if (confirmations < MIN_RANDOMNESS_REQUEST_CONFIRMATIONS || confirmations > MAX_RANDOMNESS_REQUEST_CONFIRMATIONS) {
            revert IncorrectConfirmation();
        }

        requestId = bytes32(keccak256(abi.encodePacked(block.timestamp, msg.sender, seed)));
        randomnessRequests[requestId] = RandomnessRequest(seed, msg.sender, block.number, block.number + confirmations, false);

        emit RandomnessRequest(requestId, seed);
    }

    function fullfillRandomness(bytes32 requestId, uint256 randomness) public {
        if (randomnessRequests[requestId].requestBlock < oraclesRegistrationTimestamps[msg.sender]) {
            revert UnautorizedOracle();
        }

        RandomnessRequest memory request = randomnessRequests[requestId];
        if (request.expirationBlock < block.number || request.fullfilled) {
            revert ExpiredRequest();
        }

        (address signer, ECDSA.RecoverError error) = ECDSA.tryRecover(ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(requestId, request.seed))), abi.encodePacked(randomness));
        if(error != ECDSA.RecoverError.NoError || signer != request.sender) {
            revert IncorrectRandomness();
        }

        randomnessRequests[requestId].fullfilled = true;

        IRandomnessReceiver(request.sender).receiveRandomness(randomness);
    }

    function oracleRegistration() public {
        if(oraclesRegistrationTimestamps[msg.sender] != 0)
            revert UnautorizedOracle();
            
        oraclesRegistrationTimestamps[msg.sender] = block.number;
    }
}
