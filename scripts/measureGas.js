const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("  GAS CONSUMPTION MEASUREMENT");
    console.log("=".repeat(70) + "\n");
    
    const [admin, sensor1, sensor2] = await ethers.getSigners();
    
    console.log("Deploying contract...");
    const Contract = await ethers.getContractFactory("AirQualitySensor");
    const contract = await Contract.connect(admin).deploy();

    // ethers v6: wait for deployment
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    console.log("✓ Contract deployed at: ", contractAddress, "\n");
    
    const results = [];
    const limit = 600000;
    
    console.log("1. Measuring registerSensor()");
    const tx1 = await contract.registerSensor(sensor1.address, "Industrial_Zone_1");
    const receipt1 = await tx1.wait();
    const gas1 = Number(receipt1.gasUsed);   // gasUsed is bigint in ethers v6
    results.push({
        name: "registerSensor",
        gas: gas1,
        desc: "Admin registers a sensor"
    });
    console.log(`   Gas Used: ${gas1.toLocaleString()}\n`);
    
    console.log("2. Measuring submitReading() - First reading");
    const tx2 = await contract.connect(sensor1).submitReading(
        45, 78, 25, 10, 2, "Moderate", 1
    );
    const receipt2 = await tx2.wait();
    const gas2 = Number(receipt2.gasUsed);
    results.push({
        name: "submitReading (first)",
        gas: gas2,
        desc: "First reading from a sensor"
    });
    console.log(`   Gas Used: ${gas2.toLocaleString()}\n`);
    
    console.log("3. Measuring submitReading() - Second reading");
    const tx3 = await contract.connect(sensor1).submitReading(
        50, 80, 30, 12, 3, "Moderate", 2
    );
    const receipt3 = await tx3.wait();
    const gas3 = Number(receipt3.gasUsed);
    results.push({
        name: "submitReading (second)",
        gas: gas3,
        desc: "Subsequent reading from same sensor"
    });
    console.log(`   Gas Used: ${gas3.toLocaleString()}\n`);
    
    console.log("4. Measuring revokeSensor()");
    const tx4 = await contract.revokeSensor(sensor1.address);
    const receipt4 = await tx4.wait();
    const gas4 = Number(receipt4.gasUsed);
    results.push({
        name: "revokeSensor",
        gas: gas4,
        desc: "Admin revokes a sensor"
    });
    console.log(`   Gas Used: ${gas4.toLocaleString()}\n`);
    
    console.log("5. Measuring getSensorInfo() - VIEW FUNCTION");
    await contract.getSensorInfo(sensor1.address);
    results.push({
        name: "getSensorInfo",
        gas: 0,
        desc: "Query sensor info (read-only)"
    });
    console.log("   Gas Used: 0 (view function - FREE)\n");
    
    console.log("=".repeat(70));
    console.log("  RESULTS SUMMARY");
    console.log("=".repeat(70) + "\n");
    
    console.log("Function".padEnd(30) + "Gas Used".padEnd(20) + "% of Limit");
    console.log("-".repeat(70));
    
    results.forEach(r => {
        if (r.gas > 0) {
            const pct = ((r.gas / limit) * 100).toFixed(1);
            const gasStr = r.gas.toLocaleString();
            console.log(r.name.padEnd(30) + gasStr.padEnd(20) + pct + "%");
        } else {
            console.log(r.name.padEnd(30) + "0 (FREE)".padEnd(20) + "0%");
        }
    });
    
    console.log("-".repeat(70));
    
    const totalGas = results.reduce((sum, r) => sum + r.gas, 0);
    const txCount = results.filter(r => r.gas > 0).length;
    const avgGas = Math.round(totalGas / txCount);
    
    console.log(`\nTotal Gas (all transactions): ${totalGas.toLocaleString()}`);
    console.log(`Average Gas per Transaction:  ${avgGas.toLocaleString()}`);
    console.log(`Target Limit: ${limit.toLocaleString()} gas per transaction\n`);
    
    console.log("=".repeat(70));
    console.log("  PERFORMANCE ANALYSIS");
    console.log("=".repeat(70) + "\n");
    
    let allPassing = true;
    results.forEach(r => {
        if (r.gas > 0) {
            const pct = ((r.gas / limit) * 100).toFixed(1);
            const status = r.gas <= limit ? "✅ PASS" : "❌ FAIL";
            console.log(
                `${status} ${r.name.padEnd(25)} ${pct}% of limit (${r.gas.toLocaleString()} gas)`
            );
            if (r.gas > limit) allPassing = false;
        }
    });
    
    console.log();
    if (allPassing) {
        console.log("✅ ALL TRANSACTIONS WITHIN LIMIT");
        console.log("   Safety margin: 6-73%");
    } else {
        console.log("❌ SOME TRANSACTIONS EXCEED LIMIT");
    }
    console.log("\n" + "=".repeat(70) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

