pragma solidity ^0.8.0;

contract AirQualitySensor {
    
    
    struct Sensor {
        address sensorAddress;
        string location;
        uint256 registeredAt;
        bool isActive;
        uint256 lastNonce;
    }
    
    struct Reading {
        address sensorAddress;
        string location;
        uint256 timestamp;
        uint256 pm25;
        uint256 pm10;
        uint256 no2;
        uint256 so2;
        uint256 co;
        string aqi_category;
        uint256 nonce;
    }
    
    
    address public admin;
    
    mapping(address => Sensor) public sensors;
    mapping(address => bool) public registeredSensors;
    address[] public sensorList;
    Reading[] public allReadings;
    mapping(address => Reading[]) public sensorReadings;
    mapping(address => uint256) public lastNonce;
    
    
    event SensorRegistered(address indexed sensorAddr, string location);
    event SensorRevoked(address indexed sensorAddr);
    event ReadingSubmitted(
        address indexed sensorAddr,
        string location,
        uint256 timestamp,
        uint256 pm25,
        uint256 pm10,
        uint256 no2,
        uint256 so2,
        uint256 co,
        string aqi_category
    );
    
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }
    
    modifier onlySensor() {
        require(registeredSensors[msg.sender], "Not a registered sensor");
        require(sensors[msg.sender].isActive, "Sensor is not active");
        _;
    }
    
    modifier validReading(uint256 pm25, uint256 pm10) {
        require(pm25 < 500, "PM2.5 value too high");
        require(pm10 < 500, "PM10 value too high");
        _;
    }
    
    
    constructor() {
        admin = msg.sender;
    }
    
    
    function registerSensor(address sensorAddr, string memory location) 
        public onlyAdmin 
    {
        require(sensorAddr != address(0), "Invalid sensor address");
        require(!registeredSensors[sensorAddr], "Sensor already registered");
        
        Sensor memory newSensor = Sensor({
            sensorAddress: sensorAddr,
            location: location,
            registeredAt: block.timestamp,
            isActive: true,
            lastNonce: 0
        });
        
        sensors[sensorAddr] = newSensor;
        registeredSensors[sensorAddr] = true;
        sensorList.push(sensorAddr);
        
        emit SensorRegistered(sensorAddr, location);
    }
    
    function revokeSensor(address sensorAddr) public onlyAdmin {
        require(registeredSensors[sensorAddr], "Sensor not registered");
        sensors[sensorAddr].isActive = false;
        emit SensorRevoked(sensorAddr);
    }
    
    function viewAllReadings() 
        public view onlyAdmin
        returns (Reading[] memory) 
    {
        return allReadings;
    }
    
    
    function submitReading(
        uint256 pm25,
        uint256 pm10,
        uint256 no2,
        uint256 so2,
        uint256 co,
        string memory aqi_category,
        uint256 nonce
    ) 
        public onlySensor validReading(pm25, pm10)
    {
        require(
            nonce > lastNonce[msg.sender],
            "Nonce must be greater than last accepted nonce"
        );
        
        lastNonce[msg.sender] = nonce;
        
        Reading memory newReading = Reading({
            sensorAddress: msg.sender,
            location: sensors[msg.sender].location,
            timestamp: block.timestamp,
            pm25: pm25,
            pm10: pm10,
            no2: no2,
            so2: so2,
            co: co,
            aqi_category: aqi_category,
            nonce: nonce
        });
        
        allReadings.push(newReading);
        sensorReadings[msg.sender].push(newReading);
        
        emit ReadingSubmitted(
            msg.sender,
            sensors[msg.sender].location,
            block.timestamp,
            pm25,
            pm10,
            no2,
            so2,
            co,
            aqi_category
        );
    }
    
    
    function getSensorInfo(address sensorAddr) 
        public view 
        returns (Sensor memory) 
    {
        return sensors[sensorAddr];
    }
    
    function getReadingCount() public view returns (uint256) {
        return allReadings.length;
    }
    
    function getReadingByIndex(uint256 idx) 
        public view 
        returns (Reading memory) 
    {
        require(idx < allReadings.length, "Index out of bounds");
        return allReadings[idx];
    }
    
    function getSensorReadings(address sensorAddr) 
        public view 
        returns (Reading[] memory) 
    {
        return sensorReadings[sensorAddr];
    }
    
    function isRegisteredSensor(address addr) public view returns (bool) {
        return registeredSensors[addr] && sensors[addr].isActive;
    }
    
    function getSensorCount() public view returns (uint256) {
        return sensorList.length;
    }
    
    function getAllSensors() public view returns (address[] memory) {
        return sensorList;
    }
}

