# Threat Model - Smart City Air Quality Blockchain
## 1. Assets We Are Protecting
**Asset 1: Sensor Registry**
- The whitelist of legitimate sensors
- If compromised: fake sensors can submit false data
- Severity: HIGH
**Asset 2: Immutable Readings**
- All air quality measurements stored on blockchain
- If modified: data integrity is destroyed
- Severity: CRITICAL
**Asset 3: Admin Privileges**
- Authority to register/revoke sensors
- If compromised: attacker controls everything
- Severity: CRITICAL
**Asset 4: System Integrity**
- Prevention of replay/duplicate submissions
- If lost: old data can be replayed to hide pollution
- Severity: HIGH
## 2. Four Attack Vectors
### ATTACK 1: Impersonation (Spoofing)
**Description:** Unauthorized actor tries to submit readings as a legitimate sensor
**Scenario:**
- Attacker knows a sensor's address (public blockchain)
- Attacker tries to submit readings from that address
- Problem: Attacker doesn't have the sensor's private key
**Defense:** onlySensor modifier with whitelist check
- Only registered sensors (checked via msg.sender) can submit
- msg.sender = Ethereum address that signed the transaction
- Attacker's msg.sender will be different, so rejected
**Test:** Unregistered address tries to submit → Revert error
---
### ATTACK 2: Data Tampering (Modification)
**Description:** Attacker modifies a reading after it was submitted
**Scenario:**
- Sensor submits reading: PM2.5 = 45 (polluted)
- Attacker tries to change it to: PM2.5 = 10 (not polluted)
- Problem: No editReading() function exists
**Defense:** Immutable append-only storage
- Readings stored in array, can only push (add), never modify
- No editReading() function exists
- No deleteReading() function exists
- Once stored, permanently immutable
**Test:** Try to call editReading() → Function doesn't exist
---
### ATTACK 3: Replay Attack (Resubmission)
**Description:** Attacker captures a valid transaction and replays it multiple times
**Scenario:**
- Sensor submits at 10:00: PM2.5=45, nonce=1
- Attacker captures this transaction
- At 10:30, attacker replays same transaction with nonce=1
- Current PM2.5 is actually 120, but old low value is replayed
**Defense:** Nonce-based anti-replay
- Each sensor has lastNonce tracker
- require(nonce > lastNonce[sender])
- New nonce must ALWAYS be greater than previous
- Attacker cannot reduce nonce, so replay fails
**Test:** Submit with nonce=1, then try nonce=1 again → Revert error
---
### ATTACK 4: Unauthorized Admin Access
**Description:** Non-admin tries to register sensors or revoke them
**Scenario:**
- Attacker calls registerSensor() from non-admin address
- Fake sensor gets registered
- Fake sensor submits false data
**Defense:** onlyAdmin modifier
- Only admin address can call registerSensor/revokeSensor
- Admin set in constructor, cannot be changed
- Any non-admin call reverts
**Test:** Non-admin tries registerSensor() → Revert error
## 3. Threat Summary
| Attack | Defense | Prevention |
|--------|---------|-----------|
| Impersonation | Whitelist + onlySensor | msg.sender check |
| Tampering | Append-only immutable | No edit/delete functions |
| Replay | Nonce tracking | require(nonce > lastNonce) |
| Unauthorized Admin | onlyAdmin modifier | Single admin address |
## 4. Assumptions
1. Ethereum blockchain is operational and secure
2. No breaking of cryptographic algorithms
3. Sensor private keys are securely managed
4. Network between sensor and blockchain is secure
## 5. Out of Scope
- Physical tampering of sensors
- DDoS attacks
- Hardware security
- Key management infrastructure
