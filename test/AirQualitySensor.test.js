const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AirQualitySensor Contract", function () {
    let contract;
    let admin, sensor1, sensor2, consumer;

    beforeEach(async function () {
        [admin, sensor1, sensor2, consumer] = await ethers.getSigners();
        const Contract = await ethers.getContractFactory("AirQualitySensor");
        contract = await Contract.connect(admin).deploy();
    });

    describe("1. Admin Functions", function () {
        it("1.1 Admin can register a sensor", async function () {
            await contract.registerSensor(sensor1.address, "Industrial_Zone_1");
            const isRegistered = await contract.isRegisteredSensor(sensor1.address);
            expect(isRegistered).to.be.true;
        });

        it("1.2 Non-admin CANNOT register a sensor", async function () {
            await expect(
                contract.connect(sensor1).registerSensor(sensor2.address, "Zone_2")
            ).to.be.revertedWith("Only admin can call this");
        });

        it("1.3 Admin can revoke a sensor", async function () {
            await contract.registerSensor(sensor1.address, "Zone_1");
            let sensorInfo = await contract.getSensorInfo(sensor1.address);
            expect(sensorInfo.isActive).to.be.true;

            await contract.revokeSensor(sensor1.address);
            sensorInfo = await contract.getSensorInfo(sensor1.address);
            expect(sensorInfo.isActive).to.be.false;
        });

        it("1.4 SensorRegistered event is emitted", async function () {
            await expect(
                contract.registerSensor(sensor1.address, "Industrial_Zone_1")
            )
                .to.emit(contract, "SensorRegistered")
                .withArgs(sensor1.address, "Industrial_Zone_1");
        });

        it("1.5 Cannot register same sensor twice", async function () {
            await contract.registerSensor(sensor1.address, "Zone_1");
            await expect(
                contract.registerSensor(sensor1.address, "Zone_1_Again")
            ).to.be.revertedWith("Sensor already registered");
        });
    });

    describe("2. Sensor Submission", function () {
        beforeEach(async function () {
            await contract.registerSensor(sensor1.address, "Industrial_Zone_1");
        });

        it("2.1 Unregistered sensor CANNOT submit reading", async function () {
            await expect(
                contract.connect(sensor2).submitReading(45, 78, 25, 10, 2, "Moderate", 1)
            ).to.be.revertedWith("Not a registered sensor");
        });

        it("2.2 Registered sensor CAN submit reading", async function () {
            await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
            const count = await contract.getReadingCount();
            expect(count).to.equal(1);
        });

        it("2.3 Reading values cannot exceed limits", async function () {
            await expect(
                contract.connect(sensor1).submitReading(600, 78, 25, 10, 2, "Moderate", 1)
            ).to.be.revertedWith("PM2.5 value too high");

            await expect(
                contract.connect(sensor1).submitReading(45, 600, 25, 10, 2, "Moderate", 1)
            ).to.be.revertedWith("PM10 value too high");
        });

        it("2.4 ReadingSubmitted event is emitted", async function () {
            await expect(
                contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1)
            ).to.emit(contract, "ReadingSubmitted");
        });

        it("2.5 Reading stores correct data", async function () {
            await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
            const reading = await contract.getReadingByIndex(0);

            expect(reading.sensorAddress).to.equal(sensor1.address);
            expect(reading.location).to.equal("Industrial_Zone_1");
            expect(reading.pm25).to.equal(45);
            expect(reading.pm10).to.equal(78);
            expect(reading.no2).to.equal(25);
            expect(reading.so2).to.equal(10);
            expect(reading.co).to.equal(2);
            expect(reading.aqi_category).to.equal("Moderate");
            expect(reading.nonce).to.equal(1);
        });
    });

    describe("3. Anti-Replay Protection (CRITICAL)", function () {
        beforeEach(async function () {
            await contract.registerSensor(sensor1.address, "Zone_1");
        });

        it("3.1 Same nonce twice is REJECTED", async function () {
            await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
            await expect(
                contract.connect(sensor1).submitReading(40, 70, 20, 8, 1, "Moderate", 1)
            ).to.be.revertedWith("Nonce must be greater than last accepted nonce");
        });

        it("3.2 Only INCREASING nonces accepted", async function () {
            await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
            await expect(
                contract.connect(sensor1).submitReading(40, 70, 20, 8, 1, "Moderate", 0)
            ).to.be.revertedWith("Nonce must be greater than last accepted nonce");

            await contract.connect(sensor1).submitReading(50, 80, 30, 12, 3, "Moderate", 2);
            const count = await contract.getReadingCount();
            expect(count).to.equal(2);
        });

        it("3.3 Cannot replay old valid transaction", async function () {
            const tx1 = await contract.connect(sensor1).submitReading(
                45, 78, 25, 10, 2, "Moderate", 1
            );
            await tx1.wait();

            await expect(
                contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1)
            ).to.be.revertedWith("Nonce must be greater than last accepted nonce");

            const count = await contract.getReadingCount();
            expect(count).to.equal(1);
        });

        it("3.4 Different sensors can use same nonce independently", async function () {
            await contract.registerSensor(sensor2.address, "Zone_2");

            await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
            await contract.connect(sensor2).submitReading(55, 88, 35, 15, 3, "Unhealthy", 1);

            const count = await contract.getReadingCount();
            expect(count).to.equal(2);

            const reading1 = await contract.getReadingByIndex(0);
            const reading2 = await contract.getReadingByIndex(1);
            expect(reading1.pm25).to.equal(45);
            expect(reading2.pm25).to.equal(55);
        });

        it("3.5 Nonce must increase monotonically", async function () {
            await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
            await contract.connect(sensor1).submitReading(50, 80, 30, 12, 3, "Moderate", 3);

            await expect(
                contract.connect(sensor1).submitReading(48, 76, 28, 11, 2, "Moderate", 2)
            ).to.be.revertedWith("Nonce must be greater than last accepted nonce");

            await expect(
                contract.connect(sensor1).submitReading(40, 70, 20, 8, 1, "Moderate", 1)
            ).to.be.revertedWith("Nonce must be greater than last accepted nonce");
        });
    });

    describe("4. Data Immutability", function () {
        beforeEach(async function () {
            await contract.registerSensor(sensor1.address, "Zone_1");
            await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
        });

        it("4.1 Reading cannot be edited", async function () {
            let reading = await contract.getReadingByIndex(0);
            expect(reading.pm25).to.equal(45);

            expect(contract.editReading).to.be.undefined;

            reading = await contract.getReadingByIndex(0);
            expect(reading.pm25).to.equal(45);
        });

        it("4.2 Reading cannot be deleted", async function () {
            expect(contract.deleteReading).to.be.undefined;

            const count = await contract.getReadingCount();
            expect(count).to.equal(1);

            const reading = await contract.getReadingByIndex(0);
            expect(reading.pm25).to.equal(45);
        });

        it("4.3 Readings stored in append-only array", async function () {
            let count = await contract.getReadingCount();
            expect(count).to.equal(1);

            let reading1 = await contract.getReadingByIndex(0);
            expect(reading1.pm25).to.equal(45);

            await contract.connect(sensor1).submitReading(50, 80, 30, 12, 3, "Moderate", 2);

            count = await contract.getReadingCount();
            expect(count).to.equal(2);

            reading1 = await contract.getReadingByIndex(0);
            expect(reading1.pm25).to.equal(45);

            const reading2 = await contract.getReadingByIndex(1);
            expect(reading2.pm25).to.equal(50);
        });

        it("4.4 Old readings not affected by new submissions", async function () {
            const originalReading = await contract.getReadingByIndex(0);
            const originalPm25 = originalReading.pm25;
            const originalTimestamp = originalReading.timestamp;

            await contract.connect(sensor1).submitReading(50, 80, 30, 12, 3, "Moderate", 2);
            await contract.connect(sensor1).submitReading(55, 85, 35, 15, 4, "Moderate", 3);
            await contract.connect(sensor1).submitReading(60, 90, 40, 20, 5, "Moderate", 4);

            const checkReading = await contract.getReadingByIndex(0);
            expect(checkReading.pm25).to.equal(originalPm25);
            expect(checkReading.timestamp).to.equal(originalTimestamp);
        });
    });

    describe("5. Revoked Sensors", function () {
        beforeEach(async function () {
            await contract.registerSensor(sensor1.address, "Zone_1");
        });

        it("5.1 Active sensor can submit", async function () {
            await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
            const count = await contract.getReadingCount();
            expect(count).to.equal(1);
        });

        it("5.2 Revoked sensor cannot submit", async function () {
            await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
            await contract.revokeSensor(sensor1.address);

            await expect(
                contract.connect(sensor1).submitReading(40, 70, 20, 8, 1, "Moderate", 2)
            ).to.be.revertedWith("Sensor is not active");
        });

        it("5.3 Revoked sensor shows isActive = false", async function () {
            let info = await contract.getSensorInfo(sensor1.address);
            expect(info.isActive).to.be.true;

            await contract.revokeSensor(sensor1.address);
            info = await contract.getSensorInfo(sensor1.address);
            expect(info.isActive).to.be.false;
        });

        it("5.4 SensorRevoked event is emitted", async function () {
            await expect(contract.revokeSensor(sensor1.address))
                .to.emit(contract, "SensorRevoked")
                .withArgs(sensor1.address);
        });
    });

    describe("6. Public Query Functions", function () {
        beforeEach(async function () {
            await contract.registerSensor(sensor1.address, "Zone_1");
            await contract.registerSensor(sensor2.address, "Zone_2");

            await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
            await contract.connect(sensor2).submitReading(55, 88, 35, 15, 3, "Unhealthy", 1);
        });

        it("6.1 Anyone can query getSensorInfo", async function () {
            const info = await contract.connect(consumer).getSensorInfo(sensor1.address);
            expect(info.location).to.equal("Zone_1");
            expect(info.isActive).to.be.true;
        });

        it("6.2 Anyone can get getReadingCount", async function () {
            const count = await contract.connect(consumer).getReadingCount();
            expect(count).to.equal(2);
        });

        it("6.3 Anyone can get getReadingByIndex", async function () {
            const reading = await contract.connect(consumer).getReadingByIndex(0);
            expect(reading.pm25).to.equal(45);
            expect(reading.location).to.equal("Zone_1");
        });

        it("6.4 Anyone can check isRegisteredSensor", async function () {
            const isReg1 = await contract.connect(consumer).isRegisteredSensor(sensor1.address);
            expect(isReg1).to.be.true;

            const isReg2 = await contract.connect(consumer).isRegisteredSensor(consumer.address);
            expect(isReg2).to.be.false;
        });

        it("6.5 Anyone can getSensorReadings", async function () {
            const readings = await contract.connect(consumer).getSensorReadings(sensor1.address);
            expect(readings.length).to.equal(1);
            expect(readings[0].pm25).to.equal(45);
        });

        it("6.6 Anyone can getSensorCount", async function () {
            const count = await contract.connect(consumer).getSensorCount();
            expect(count).to.equal(2);
        });

        it("6.7 Anyone can getAllSensors", async function () {
            const sensors = await contract.connect(consumer).getAllSensors();
            expect(sensors.length).to.equal(2);
            expect(sensors[0]).to.equal(sensor1.address);
            expect(sensors[1]).to.equal(sensor2.address);
        });
    });

    describe("7. Edge Cases", function () {
    it("7.1 Multiple sensors work independently", async function () {
      
      
      await contract.registerSensor(sensor1.address, "Zone1");
      await contract.registerSensor(sensor2.address, "Zone2");

      
     await contract.connect(sensor1).submitReading(10,20,30,40,50,"Moderate",1);
     await contract.connect(sensor2).submitReading(15,25,35,45,55,"Good",1);


      
      const count = await contract.getReadingCount();
      expect(count).to.equal(2);

     
      const reading1 = await contract.allReadings(0);
      const reading2 = await contract.allReadings(1);

      expect(reading1.sensorAddress).to.equal(sensor1.address);
      expect(reading2.sensorAddress).to.equal(sensor2.address);
    });

        it("7.2 Large nonce values work", async function () {
            await contract.registerSensor(sensor1.address, "Zone_1");
            await contract.connect(sensor1).submitReading(
                45, 78, 25, 10, 2, "Moderate", 999999999
            );
            const reading = await contract.getReadingByIndex(0);
            expect(reading.nonce).to.equal(999999999);
        });

        it("7.3 Valid readings at boundary values", async function () {
            await contract.registerSensor(sensor1.address, "Zone_1");
            await contract.connect(sensor1).submitReading(
                499, 499, 25, 10, 2, "Moderate", 1
            );
            const reading = await contract.getReadingByIndex(0);
            expect(reading.pm25).to.equal(499);
            expect(reading.pm10).to.equal(499);
        });

        it("7.4 Location is stored correctly", async function () {
            const location = "Highway_Junction_North_Industrial_Complex";
            await contract.registerSensor(sensor1.address, location);

            const info = await contract.getSensorInfo(sensor1.address);
            expect(info.location).to.equal(location);

            await contract.connect(sensor1).submitReading(
                45, 78, 25, 10, 2, "Moderate", 1
            );
            const reading = await contract.getReadingByIndex(0);
            expect(reading.location).to.equal(location);
        });
    });
});
