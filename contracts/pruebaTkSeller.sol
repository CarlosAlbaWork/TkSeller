// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "./TkSeller.sol";

contract pruebaTkSeller is TkSeller {
  /*
  Debe usarse this por si hay parametros con calldata
  De hecho debería haberlos
  
  this.initSale(
        address tokenaddress_,
        address supplier,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256[] memory precios_,
        address[] memory tokensdepago_,
        bool returnable_,
        bytes memory permit
    )
  */
}