# System Model - Smart City Air Quality Blockchain

## 1. Project Scenario

A smart city needs to monitor air quality using distributed IoT sensors placed at:
- Industrial Zone
- Residential Area
- Highway Junction
- City Park

Each sensor must register, authenticate, and submit immutable readings to a blockchain.

## 2. Actors and Their Roles

### Actor 1: Admin (City Authority)
- Single authorized Ethereum address
- Can register new sensors
- Can revoke inactive sensors
- Can view all readings

**Permissions:**
- registerSensor(address, location) ✓
- revokeSensor(address) ✓
- viewAllReadings() ✓

### Actor 2: Sensor (IoT Device)
- Must be registered by Admin first
- Can submit air quality readings
- Cannot modify or delete readings
- Can view own submission history

**Permissions:**
- submitReading(pm25, pm10, no2, so2, co, aqi_category, nonce) ✓
- getSensorReadings() ✓

### Actor 3: Consumer (Public/Policy Maker)
- Any Ethereum address
- Can read all immutable data
- Can verify sensor authenticity
- Cannot submit or modify data

**Permissions:**
- getSensorInfo(address) ✓
- getReadingByIndex(uint256) ✓
- getReadingCount() ✓
- getSensorReadings(address) ✓
- isRegisteredSensor(address) ✓

## 3. System Architecture

┌─────────────────────────────────┐
│ Admin │
│ Registers/Revokes Sensors │
└────────────────┬────────────────┘
│
┌─────────▼──────────┐
│ Smart Contract │
│ AirQualitySensor │
└─────────┬──────────┘
│
┌──────────┼──────────┐
│ │ │
Submits Queries Queries
│ │ │
┌─────▼──┐ ┌────▼───┐ ┌──▼────┐
│Sensors │ │Sensors │ │Public │
│(write) │ │(read) │ │(read) │
└────────┘ └────────┘ └────────┘


## 4. Data Structures

### Sensor Struct
- sensorAddress: Ethereum address
- location: Physical location name
- registeredAt: Registration timestamp
- isActive: Currently active boolean
- lastNonce: For replay protection

### Reading Struct
- sensorAddress: Which sensor submitted
- location: Sensor location
- timestamp: When submitted
- pm25, pm10, no2, so2, co: Pollutant values
- aqi_category: "Good", "Moderate", "Unhealthy"
- nonce: For anti-replay protection

## 5. Key Requirements

✓ Only registered sensors can submit
✓ All readings are immutable
✓ Replay attacks rejected (via nonce)
✓ Admin is single and cannot be changed
✓ Public can query all data transparently

