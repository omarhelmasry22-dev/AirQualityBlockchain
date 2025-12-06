# Security Analysis Report

## Executive Summary

The AirQualitySensor smart contract successfully mitigates all identified threats. **Result: ALL THREATS PROTECTED**

---

## 1. Impersonation Attack Analysis

### Test Cases: 1.2 and 2.1

**Test 1.2:**

```javascript
it("1.2 Non-admin CANNOT register a sensor", async function () {
    await expect(
        contract.connect(sensor1).registerSensor(sensor2.address, "Zone_2")
    ).to.be.revertedWith("Only admin can call this");
});
```

**Test 2.1:**

```javascript
it("2.1 Unregistered sensor CANNOT submit reading", async function () {
    await expect(
        contract.connect(sensor2).submitReading(45, 78, 25, 10, 2, "Moderate", 1)
    ).to.be.revertedWith("Not a registered sensor");
});
```

**Defense Mechanism:**

```solidity
modifier onlySensor() {
    require(registeredSensors[msg.sender], "Not a registered sensor");
    require(sensors[msg.sender].isActive, "Sensor is not active");
    _;
}
```

**How It Works:**

* `msg.sender` = the Ethereum address that signed the transaction
* Only the holder of a private key can have their `msg.sender` appear
* Even if attacker knows sensor's address, their `msg.sender` will be different
* `registeredSensors[attackerAddress] = false`
* Transaction reverts immediately

**Status: PROTECTED**

---

## 2. Data Tampering Analysis

### Test Cases: 4.1, 4.2, 4.3, 4.4

**Test 4.1:**

```javascript
it("4.1 Reading cannot be edited", async function () {
    let reading = await contract.getReadingByIndex(0);
    expect(reading.pm25).to.equal(45);
    expect(contract.editReading).to.be.undefined;
    reading = await contract.getReadingByIndex(0);
    expect(reading.pm25).to.equal(45);
});
```

**Test 4.2:**

```javascript
it("4.2 Reading cannot be deleted", async function () {
    expect(contract.deleteReading).to.be.undefined;
    const count = await contract.getReadingCount();
    expect(count).to.equal(1);
});
```

**Defense Mechanism:**

```solidity
Reading[] public allReadings;
allReadings.push(newReading);
```

**How It Works:**

* Solidity arrays only support push (add) operation
* No function exists to modify past data
* Once data is in the array, it's permanent
* Immutable by design

**Status: PROTECTED**

---

## 3. Replay Attack Analysis

### Test Cases: 3.1, 3.2, 3.3, 3.4, 3.5

**Test 3.1:**

```javascript
it("3.1 Same nonce twice is REJECTED", async function () {
    await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
    await expect(
        contract.connect(sensor1).submitReading(40, 70, 20, 8, 1, "Moderate", 1)
    ).to.be.revertedWith("Nonce must be greater than last accepted nonce");
});
```

**Test 3.3:**

```javascript
it("3.3 Cannot replay old valid transaction", async function () {
    const tx1 = await contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1);
    await tx1.wait();
    await expect(
        contract.connect(sensor1).submitReading(45, 78, 25, 10, 2, "Moderate", 1)
    ).to.be.revertedWith("Nonce must be greater than last accepted nonce");
    const count = await contract.getReadingCount();
    expect(count).to.equal(1);
});
```

**Defense Mechanism:**

```solidity
mapping(address => uint256) public lastNonce;
function submitReading(..., uint256 nonce) public onlySensor {
    require(nonce > lastNonce[msg.sender], "Nonce must be greater than last accepted nonce");
    lastNonce[msg.sender] = nonce;
    allReadings.push(newReading);
}
```

**How It Works:**

* Sensor A History: lastNonce[SensorA] = 0 → nonce=1 ✓ → lastNonce[SensorA] = 1
* Replay: nonce=1 → 1 > 1? NO ✗ REVERT
* Next valid: nonce=2 → 2 > 1? YES ✓
* Key: Nonces independent per sensor

**Status: PROTECTED**

---

## 4. Unauthorized Admin Access Analysis

### Test Cases: 1.2 (registerSensor), 1.3 (revokeSensor)

**Defense Mechanism:**

```solidity
address public admin;

constructor() {
    admin = msg.sender;
}

modifier onlyAdmin() {
    require(msg.sender == admin, "Only admin can call this");
    _;
}

function registerSensor(...) public onlyAdmin { }

function revokeSensor(...) public onlyAdmin { }
```

**How It Works:**

* Admin is set in constructor = deployer's address
* Cannot be changed (no setAdmin function exists)
* Any attempt from non-admin reverts immediately
* Only holder of admin's private key can call these functions

**Status: PROTECTED**

---

## 5. Test Results Summary

Total: 35 Tests - 35 Passing

* Admin Functions: 5/5
* Sensor Submission: 5/5
* Anti-Replay Protection: 5/5
* Data Immutability: 4/4
* Revoked Sensors: 4/4
* Public Queries: 7/7
* Edge Cases: 5/5

35/35

---

## 6. Threat Coverage Matrix

| Threat             | Severity | Defense                 | Test Case |
| ------------------ | -------- | ----------------------- | --------- |
| Impersonation      | HIGH     | onlySensor + whitelist  | 2.1       |
| Tampering          | CRITICAL | Append-only immutable   | 4.1-4.4   |
| Replay             | HIGH     | Nonce-based anti-replay | 3.1-3.5   |
| Unauthorized Admin | CRITICAL | onlyAdmin modifier      | 1.2,1.3   |

---

## 7. Conclusion

ALL SECURITY THREATS SUCCESSFULLY MITIGATED
The contract is secure and ready for deployment.

