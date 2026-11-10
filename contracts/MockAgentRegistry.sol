// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title MockAgentRegistry
/// @notice Registry Agent ID palsu untuk test lokal + BSC testnet.
/// Di mainnet diganti alamat registry Binance Agent ID yang asli.
contract MockAgentRegistry {
    mapping(uint256 => address) private owners;
    address public admin;

    constructor() {
        admin = msg.sender;
    }

    function setOwner(uint256 agentId, address owner) external {
        require(msg.sender == admin, "only admin");
        owners[agentId] = owner;
    }

    function ownerOf(uint256 agentId) external view returns (address) {
        return owners[agentId];
    }
}
