// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract TestCall {
    // Key-value pair storage mapping
    mapping(string => string) private dataStore;
    
    // Write data to storage
    function writeData(string memory key, string memory value) public {
        dataStore[key] = value;
        console.log("Data written - Key:", key, "Value:", value);
    }

    // Read data from storage
    function readData(string memory key) public view returns (string memory) {
        string memory value = dataStore[key];
        console.log("Data read - Key:", key, "Value:", value);
        return value;
    }

    // Check if key exists in storage
    function hasKey(string memory key) public view returns (bool) {
        return bytes(dataStore[key]).length > 0;
    }

    // Test function for contract functionality
    function testCall(string memory key) public returns (bool) {
        // Write test data
        string memory testValue = string(abi.encodePacked("test_value_", key));
        writeData(key, testValue);
        
        // Read and verify data
        string memory readValue = readData(key);
        return keccak256(bytes(readValue)) == keccak256(bytes(testValue));
    }
}
