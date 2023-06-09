# Custom Verifiable Random Function (VRF)

This project is a simple implementation of a VRF. It is using hardhat and contains an example of how to use the VRF in a smart contract.
It can be used to not rely on Chainlink or to not have to pay for it. It can also be useful when developping for a chain is not supported by Chainlink's VRF, Gnosis Chain for instance.

## Content

- `contracts/VRF.sol` A VRF contract where you can ask for a random number with a seed.
- `contracts/RandomnessReceiverExample.sol` An example contract that is able to ask for a random number to the VRF and to receive a callback with such number.
- `scripts/randomOracle.js` A script for an oracle bot written in JS. It is currently relying on Hardhat but it could be easily exported as a standalone with just ethers.js.
- `test` directory contains some tests that you can run in hardhat with `npx hardhat test`.

## How to use it

### Deployment

The script `scripts/deploy.js` can be used with hardhat (`npx hardhat run scripts/deploy.js`) to deploy the VRF contract. You can easily edit it to also deploy your custom contract.

### Oracle

You can run an oracle with `npx hardhat run scripts/randomOracle.js`. Warning: these will cost you gas but you can implement in the VRF a way for randomness query to be rewarding for the oracle.
The way it is currently implemented, only the first oracle can answer to the query. A transaction to an already answered query will fail.

### Extension

You can use the `contracts/IRandomnessReceiver.sol` interface in your custom smart contract to connect it to a VRF contract and start querying random numbers. 
You can have a look to `contracts/RandomnessReceiverExample.sol` for a very simple example.
You should use as seed something like a combinaison of block.blockhash, block.timestamp and some custom state variable for example. 

## Warning

Please, keep in mind that this system does not satisfy the liveness property: your contract may never receive a callback from the VRF, for example if no oracle is currently running or if validators censor its transactions. 
However, it does satisfy the safety property: if an answer is given by the VRF, then you are sure that the randomness was not manipulated. 

You should definitely take this into account when building your custom contract that use VRF, with a mecanism that allow to ask again for a random number if the last request expired.
  
