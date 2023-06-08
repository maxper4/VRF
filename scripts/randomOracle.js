const { ethers } = require("hardhat");

async function main() {
    const VRFFactory = await ethers.getContractFactory("VRF");
    const vrf = await VRFFactory.attach("");

    const signer = await ethers.getSigner();

    if(vrf.oraclesRegistrationTimestamps(signer.address) == 0) {
        console.log("Registering oracle");
        await vrf.oracleRegistration();
    }

    vrf.on("OnRandomnessRequest", async(requestId, seed) => {
        console.log(`RandomnessRequest: ${requestId} ${seed}`);

        const randomness = await signer.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(["bytes32", "uint256"], [requestId, seed])));
        console.log(`Fulfilling with ${randomness}`);

        vrf.fulfill(requestId, randomness); 
    });
}