// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20PaleroOwn is ERC20, Ownable, ERC20Permit {
<<<<<<< HEAD
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) ERC20Permit(name) {
        _mint(msg.sender, 120000 * 10 ** decimals());
    }
}
=======
  constructor(string memory name, string memory symbol) ERC20(name, symbol) ERC20Permit(name) {
    _mint(msg.sender, 120000 * 10 ** decimals());
  }
}
>>>>>>> 866ee50e48d7e4397451f6102c253f18176ee907
