// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Fomo Token ($AF)
/// @notice Reward token untuk holder NFT Fomo Agent. Hanya alamat `minter`
/// (kontrak NFT) yang boleh mencetak token, dan total supply dibatasi.
/// @dev Max supply 100.000.000 AF (18 desimal).
contract FomoToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 ether;

    address public minter;

    event MinterSet(address indexed minter);

    constructor() ERC20("AF", "AF") Ownable(msg.sender) {}

    /// @notice Owner menunjuk kontrak NFT sebagai satu-satunya minter.
    function setMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "minter zero");
        minter = _minter;
        emit MinterSet(_minter);
    }

    /// @notice Cetak token ke `to`. Hanya minter, dan tidak boleh melewati MAX_SUPPLY.
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "only minter");
        require(totalSupply() + amount <= MAX_SUPPLY, "max supply");
        _mint(to, amount);
    }
}
