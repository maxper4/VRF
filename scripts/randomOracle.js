const { ethers } = require("hardhat");

async function main() {
    const VRFFactory = await ethers.getContractFactory("VRF");
    const vrf = await VRFFactory.attach("");

    const signer = await ethers.getSigner();

    if(vrf.oraclesRegistrationTimestamps(signer.address) == 0) {
        console.log("Registering oracle");
        await vrf.oracleRegistration();
    }

    vrf.on("RandomnessRequest", (requestId, seed) => {
        console.log(`RandomnessRequest: ${requestId} ${seed}`);

        const randomness = signer.signMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(["uint256"], [seed])));
        console.log(`Fulfilling with ${randomness}`);

        vrf.fullfillRandomness(requestId, randomness); 
    });
}