const { time, mine, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VRF Tests", function () {
  const fixture = async () => {
    const VRFFactory = await ethers.getContractFactory("VRF");
    const vrf = await VRFFactory.deploy();
    await vrf.deployed();
  
    const [oracle, attacker] = await ethers.getSigners();
    await vrf.connect(oracle).oracleRegistration();

    const RanomnessReceiverFactory = await ethers.getContractFactory("RandomnessReceiverExample");
    const randomnessReceiver = await RanomnessReceiverFactory.deploy(vrf.address);
    await randomnessReceiver.deployed();

    const timestamp = await vrf.oraclesRegistrationTimestamps(oracle.address);
    console.log(`Oracle registered at ${timestamp}`)
  
    return { vrf, oracle, attacker, randomnessReceiver };
  };

  it("Should allow oracle to register", async function () {
    const { vrf, oracle } = await loadFixture(fixture);

    const timestamp = await vrf.oraclesRegistrationTimestamps(oracle.address);
    expect(timestamp).to.not.equal(0);
  });

  it("Should not allow oracle to register twice", async function () {
    const { vrf, oracle } = await loadFixture(fixture);

    await expect(vrf.connect(oracle).oracleRegistration()).to.be.revertedWithCustomError(vrf, "UnautorizedOracle");
  });

  it("Should compute the proper request ID", async function () {
    const { vrf, oracle, randomnessReceiver } = await loadFixture(fixture);

    await randomnessReceiver.askForRandomness(100, 10);

    const requestId = await randomnessReceiver.requestId();
    const timestamp = await time.latest();

    const expectedRequestId = ethers.utils.solidityKeccak256(["uint256", "address", "uint256"], [timestamp, randomnessReceiver.address, 100]);
    
    expect(requestId).to.equal(expectedRequestId);
  });

  it("Should allow oracle to fulfill randomness request", async function () {
    const { vrf, oracle, randomnessReceiver } = await loadFixture(fixture);

    const seed = 100;
    await randomnessReceiver.askForRandomness(seed, 10);
    const requestId = await randomnessReceiver.requestId();

    const oracleRandomness = await oracle.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(["bytes32", "uint256"], [requestId, seed])));
    await vrf.connect(oracle).fulfillRandomness(requestId, oracleRandomness);

    const randomness = await randomnessReceiver.randomResult();
    expect(randomness).to.equal(BigInt(oracleRandomness.slice(0, 66)));
  });

  it("Should not allow oracle to fulfill randomness request twice", async function () {
    const { vrf, oracle, randomnessReceiver } = await loadFixture(fixture);

    const seed = 100;
    await randomnessReceiver.askForRandomness(seed, 10);
    const requestId = await randomnessReceiver.requestId();

    const oracleRandomness = await oracle.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(["bytes32", "uint256"], [requestId, seed])));
    await vrf.connect(oracle).fulfillRandomness(requestId, oracleRandomness);

    await expect(vrf.connect(oracle).fulfillRandomness(requestId, oracleRandomness)).to.be.revertedWithCustomError(vrf, "ExpiredRequest");
  });

  it("Should not allow oracle to fulfill randomness request with wrong request ID", async function () {
    const { vrf, oracle, randomnessReceiver } = await loadFixture(fixture);

    const seed = 100;
    await randomnessReceiver.askForRandomness(seed, 10);
    const requestId = await randomnessReceiver.requestId();

    const oracleRandomness = await oracle.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(["bytes32", "uint256"], [requestId, seed])));
    await expect(vrf.connect(oracle).fulfillRandomness(ethers.utils.solidityKeccak256(["uint256"], [0]), oracleRandomness)).to.be.revertedWithCustomError(vrf, "UnautorizedOracle");
  });

  it("Should not allow oracle to fulfill randomness request with wrong seed", async function () {
    const { vrf, oracle, randomnessReceiver } = await loadFixture(fixture);

    const seed = 100;
    await randomnessReceiver.askForRandomness(seed, 10);
    const requestId = await randomnessReceiver.requestId();

    const oracleRandomness = await oracle.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(["bytes32", "uint256"], [requestId, seed+1])));
    await expect(vrf.connect(oracle).fulfillRandomness(requestId, oracleRandomness)).to.be.revertedWithCustomError(vrf, "IncorrectRandomness");
  });

  it("Should not allow an unregistered oracle to fullfil a request", async function () {
    const { vrf, oracle, randomnessReceiver, attacker } = await loadFixture(fixture);

    const seed = 100;
    await randomnessReceiver.askForRandomness(seed, 10);
    const requestId = await randomnessReceiver.requestId();

    const timestampRegister = await vrf.oraclesRegistrationTimestamps(attacker.address);
    expect(timestampRegister).to.equal(0);

    const oracleRandomness = await attacker.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(["bytes32", "uint256"], [requestId, seed])));
    await expect(vrf.connect(attacker).fulfillRandomness(requestId, oracleRandomness)).to.be.revertedWithCustomError(vrf, "UnautorizedOracle");
  });

  it("Should not allow an attacker to fulfill randomness request with the signature of an oracle", async function () {
    const { vrf, oracle, randomnessReceiver, attacker } = await loadFixture(fixture);

    const seed = 100;
    await randomnessReceiver.askForRandomness(seed, 10);
    const requestId = await randomnessReceiver.requestId();

    const oracleRandomness = await oracle.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(["bytes32", "uint256"], [requestId, seed])));
    await expect(vrf.connect(attacker).fulfillRandomness(requestId, oracleRandomness)).to.be.revertedWithCustomError(vrf, "UnautorizedOracle");
  });

  it("Should not allow to request randomness with 0 confirmations or with a too high number of confirmations", async function () {
    const { vrf, oracle, randomnessReceiver } = await loadFixture(fixture);

    const max = await vrf.MAX_RANDOMNESS_REQUEST_CONFIRMATIONS();

    await expect(randomnessReceiver.askForRandomness(100, 0)).to.be.revertedWithCustomError(vrf, "IncorrectConfirmation");
    await expect(randomnessReceiver.askForRandomness(100, max + 1)).to.be.revertedWithCustomError(vrf, "IncorrectConfirmation");
  });

  it("Should not allow to fulfill expired requests", async function () {
    const { vrf, oracle, randomnessReceiver } = await loadFixture(fixture);

    const seed = 100;
    await randomnessReceiver.askForRandomness(seed, 10);
    const requestId = await randomnessReceiver.requestId();

    await mine(1000);

    const oracleRandomness = await oracle.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(["bytes32", "uint256"], [requestId, seed])));
    await expect(vrf.connect(oracle).fulfillRandomness(requestId, oracleRandomness)).to.be.revertedWithCustomError(vrf, "ExpiredRequest");
  });
});
