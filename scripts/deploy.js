const { ethers } = require("hardhat");
async function main() {
 console.log("\n========================================");
 console.log(" Deploying AirQualitySensor Contract");
 console.log("========================================\n");

 const [deployer] = await ethers.getSigners();
 console.log(`Deploying from: ${deployer.address}\n`);

 console.log("Compiling contract...");
 const Contract = await ethers.getContractFactory("AirQualitySensor");

 console.log("Deploying to network...");
 const contract = await Contract.deploy();

 await contract.deployed();
 console.log(` Contract deployed to: ${contract.address}\n`);

 console.log("Registering example sensor...");
 const tx = await contract.registerSensor(
 deployer.address,
 "Test_Industrial_Zone"
 );
 await tx.wait();
 console.log(` Example sensor registered\n`);

 console.log("========================================");
 console.log(" Deployment Summary");
 console.log("========================================");
 console.log(`Contract Address: ${contract.address}`);
 console.log(`Admin Address: ${deployer.address}`);
 console.log(`Network: Hardhat`);
 console.log(`Deployed At: ${new Date().toISOString()}`);
 console.log("\nDeployment complete!\n");
}
main()
 .then(() => process.exit(0))
 .catch(error => {
 console.error(error);
 process.exit(1);
 });
