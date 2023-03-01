// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ITkSeller.sol";

contract TkSeller is Ownable, ITkSeller {

    //Eventos



    address[] private _tokensInSale;
    string[] private _usedNames;
    mapping(address => Preventa) private _preventas;
    /**
     * @dev inicializa una venta
     * el vendedor será el gestor/propietario de la venta, puede ser o no el owner del token
     * token: dirección del token
     * amount: lo que se quiere depositar para vender
     * hardCap: Hard Cap es el límite máximo definido para recolectar los fondos en un evento de recaudación
     * softCap: Soft Cap es el límite mínimo definido para recolectar los fondos en un evento de recaudación
     * endDate: (unix time)
     * refund: permite hacer devoluciones con sellToken antes del fin de la venta
     * permit: si el token implementa permit, lo usa, si no, debe haber allowance
     */

    struct Preventa {
        address owner;
        uint256 amount;
        uint256 hardCap;
        uint256 softCap;
        uint256 endDate;
        uint256 priceETH;
        uint256 priceUSD;
        bool returnable;
        bool preSaleFinished;
    }

    constructor() {}

    function isNameAvailable(
        string memory name_,
        string[] memory usednames_
    ) private pure returns (bool) {
        for (uint i = 0; i < usednames_.length; i++) {
            if (
                keccak256(abi.encodePacked(usednames_[i])) ==
                keccak256(abi.encodePacked(name_))
            ) {
                return true;
            }
        }
        return false;
    }

    function isTokenCreated(
        address token_,
        address[] memory tokensInSale_
    ) private pure returns (bool) {
        for (uint i = 0; i < tokensInSale_.length; i++) {
            if (tokensInSale_[i] == token_) {
                return true;
            }
        }
        return false;
    }

    function isDateFuture(uint256 date_) private pure returns (bool) {
        return (block.timestamp < date_);
    }

    function areCapsValid(
        uint256 hardcap_,
        uint256 softcap_,
        uint256 amount
    ) private pure returns (bool) {
        return (hardcap_ != 0 /**&& softcap_!=0 */ &&
            softcap_ < hardcap_ &&
            hardcap_ < amount);
    }

    function getSaleInfo(
        address token
    )
        public
        view
        returns (
            address owner,
            uint256 amount,
            uint256 hardcap,
            uint256 softcap,
            uint256 endDate,
            uint256 priceETH,
            uint256 priceUSD,
            bool returnable,
            bool preSaleFinished
        )
    {
        require(isTokenCreated(token, _tokensInSale));
        Preventa memory saleWanted = _preventas[token];
        return (
            saleWanted.owner,
            saleWanted.amount,
            saleWanted.hardCap,
            saleWanted.softCap,
            saleWanted.endDate,
            saleWanted.priceETH,
            saleWanted.priceUSD,
            saleWanted.returnable,
            saleWanted.preSaleFinished
        );
    }

    function initSale(
        address tokenaddress_,
        uint256 amount_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256 priceETH_,
        uint256 priceUSD_,
        bool returnable_,
        string memory permit
    ) external payable {
        require(!isTokenCreated(tokenaddress_, _tokensInSale));
        require(isDateFuture(endDate_));
        require(areCapsValid(hardCap_, softCap_, amount_));
        IERC20 token_ = IERC20(tokenaddress_);
        require(token_.balanceOf(msg.sender) >= amount_);

        token_.transferFrom(msg.sender, address(this), amount_);
        _preventas[tokenaddress_]= Preventa(msg.sender, amount_, hardCap_, softCap_, endDate_, priceETH_, priceUSD_, returnable_, false);
        //Evento de Inicio de Venta
    }

    function setSale(
        address tokenaddress_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_
    ) external {
        require(!isTokenCreated(tokenaddress_, _tokensInSale));
        require(isDateFuture(endDate_));
        Preventa memory token_= _preventas[tokenaddress_];
        require(areCapsValid(hardCap_, softCap_,token_.amount));
        _preventas[tokenaddress_]=Preventa(token_.owner, token_.amount, hardCap_, softCap_, endDate_, token_.priceETH, token_.priceUSD, token_.returnable, false);
        //Evento de cambio de venta
        
    }

    function buyTokensByToken(
        address token,
        uint256 amount,
        address payToken,
        string memory permit
    ) external {}

    function buyTokensByTokenAllow(
        address token,
        uint256 amount,
        address payToken
    ) external {}

    function returnTokens(
        address token,
        uint256 amout,
        string memory permit
    ) external {
        
    }
}

/**
 * 

 */
