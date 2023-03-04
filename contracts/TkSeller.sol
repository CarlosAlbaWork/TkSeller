// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ITkSeller.sol";
import "hardhat/console.sol";

contract TkSeller is ITkSeller {
    //Eventos
    event ClosedSale(address token_);
    event OpenedSale(
        address tokenaddress_,
        uint256 amount_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256 priceETH_,
        uint256 priceUSD_,
        bool returnable_
    );
    event ChangedSale(
        address tokenaddress_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256 priceETH_,
        uint256 priceUSD_
    );

    event ETHsold(address token_, uint256 amount_, address buyer_);
    event TokenExchanged(
        address token_,
        uint256 cost_,
        address paytoken_,
        address buyer_
    );

    // Datos globales necesarios para el funcionamiento del contrato

    // dirección 
    address systemowner;
    // historal de ventas
    address[] private _tokensInSale;
    // datos de las preventas
    mapping(address => Preventa) private _preventas; // implica que sólo puede venderse una vez? o dejamos que machaque?
    
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
        uint256 amountleft;
        uint256 hardCap;
        uint256 softCap;
        uint256 endDate;
        uint256 priceETH;
        uint256 priceUSD;
        bool returnable;
        uint8 preSaleFinished;
    }

    constructor() {
        systemowner = msg.sender;
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

    function isDateFuture(uint256 date_) private view returns (bool) {
        return (block.timestamp < date_);
    }

    function areCapsValid(
        uint256 hardcap_,
        uint256 softcap_,
        uint256 amount
    ) private pure returns (bool) {
        return (hardcap_ != 0 /**&& softcap_!=0 */ &&
            softcap_ <= hardcap_ &&
            hardcap_ <= amount);
    }

    function getSaleInfo(
        address token
    )
        public
        view
        returns (
            address owner,
            uint256 amount,
            uint256 amountleft,
            uint256 hardcap,
            uint256 softcap,
            uint256 endDate,
            uint256 priceETH,
            uint256 priceUSD,
            bool returnable,
            uint8 preSaleFinished //0= abierto, 1=cerrado, 2=fallido
        )
    {
        require(isTokenCreated(token, _tokensInSale));
        Preventa memory saleWanted = _preventas[token];
        return (
            saleWanted.owner,
            saleWanted.amount,
            saleWanted.amountleft,
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
        address supplier,
        uint256 amount_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256 priceETH_,
        uint256 priceUSD_,
        bool returnable_,
        string memory permit
    ) external payable {
        // require(!isTokenCreated(tokenaddress_, _tokensInSale)); el token no es "creado" , es "vendido" 
        require(isDateFuture(endDate_),"Bad date");
        require(areCapsValid(hardCap_, softCap_, amount_),"Caps valid");
        IERC20 token_ = IERC20(tokenaddress_);
        require(token_.allowance(supplier, address(this)) >= amount_,"Insufficient Allowance");
        token_.transferFrom(supplier, address(this), amount_);
        _preventas[tokenaddress_] = Preventa(
            msg.sender,
            amount_,
            amount_,
            hardCap_,
            softCap_,
            endDate_,
            priceETH_,
            priceUSD_,
            returnable_,
            0
        );
        _tokensInSale.push(tokenaddress_);

        emit OpenedSale(
            tokenaddress_,
            amount_,
            hardCap_,
            softCap_,
            endDate_,
            priceETH_,
            priceUSD_,
            returnable_
        );

    }

    function setSale(
        address tokenaddress_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256 priceETH_,
        uint256 priceUSD_
    ) external {
        require(!isTokenCreated(tokenaddress_, _tokensInSale));
        require(isDateFuture(endDate_));
        Preventa memory token_ = _preventas[tokenaddress_];
        require(msg.sender == token_.owner);
        require(areCapsValid(hardCap_, softCap_, token_.amount));
        _preventas[tokenaddress_] = Preventa(
            token_.owner,
            token_.amount,
            token_.amountleft,
            hardCap_,
            softCap_,
            endDate_,
            priceETH_,
            priceUSD_,
            token_.returnable,
            0
        );

        emit ChangedSale(
            tokenaddress_,
            hardCap_,
            softCap_,
            endDate_,
            priceETH_,
            priceUSD_
        );
    }

    function getETHInfo(address token_) public view returns (uint256) {
        require(isTokenCreated(token_, _tokensInSale));
        return (_preventas[token_].amountleft * _preventas[token_].priceETH);
    }

    function getUSDInfo(address token_) public view returns (uint256) {
        require(isTokenCreated(token_, _tokensInSale));
        return (_preventas[token_].amountleft * _preventas[token_].priceUSD);
    }



function buyTokensByToken(
        address token_,
        uint256 amount_,
        address payToken_,
        string memory permit_
    ) external {
        require(isTokenCreated(token_, _tokensInSale),"No token"); //Ha de existir el token
        Preventa memory preventa = _preventas[token_];
        require(preventa.preSaleFinished == 0,"No opened"); //Ha de estar abierta
        require(preventa.amountleft >= amount_,"No balance left"); //Ha de comprar menos de lo que queda
        //require que tenga el valor de los tokens a vender para comprar los deseados
        if (!isDateFuture(preventa.endDate)) {
            //checkear que no se haya entrado fuera de tiempo
            uint256 cant = 0; //cantidad de paytoken a traspasar
            IERC20 payToken = IERC20(payToken_);
            IERC20 token = IERC20(token_);
            payToken.transferFrom(msg.sender, preventa.owner, cant);
            _preventas[token_].amountleft -= amount_;
            token.transfer(msg.sender, amount_);
            if (_preventas[token_].amountleft == 0) {
                //Si se llega a 0 tokens restantes se cierra con status de no fallida
                closeSale(token_, false);
            } else if (!isDateFuture(preventa.endDate)) {
                //si en el tiempo en el que está ejecutandose la preventa pasa el tiempo se cierra
                closeSale(token_, true);
            }
        } else {
            closeSale(token_, true); //si se cierra antes de hacer el traspaso es porque aún quedan un mínimo de tokens por vender
        }

        emit TokenExchanged(token_, amount_, payToken_, msg.sender);
    }



    function buyTokensByETH(address token_) external payable {
        require(isTokenCreated(token_, _tokensInSale));
        require(_preventas[token_].preSaleFinished == 0);
        require(_preventas[token_].priceETH != 0);
        require(getETHInfo(token_) >= msg.value);
        uint256 cantporEth;
        if (!isDateFuture(_preventas[token_].endDate)) {
            cantporEth = msg.value / _preventas[token_].priceETH;
            _preventas[token_].amountleft -= cantporEth;
            IERC20 token = IERC20(token_);
            token.transfer(msg.sender, cantporEth);
            if (_preventas[token_].amountleft == 0) {
                closeSale(token_, false);
            } else if (!isDateFuture(_preventas[token_].endDate)) {
                closeSale(token_, true);
            }
        } else{
            closeSale(token_, true);
        }

        emit ETHsold(token_, cantporEth, msg.sender);
    }

    

    function returnTokens(
        address token_,
        uint256 amout_,
        string memory permit_
    ) external {
        require(isTokenCreated(token_, _tokensInSale));
        require(_preventas[token_].preSaleFinished == 0 && _preventas[token_].returnable==true );


    }

    function closeSale(address token_, bool failed) public {
        require(msg.sender == _preventas[token_].owner ||
                msg.sender == address(this),
        "Not owner");
        if (_preventas[token_].preSaleFinished == 0) {
            // Hacer algo solo si está abierta
            if (failed) {
                _preventas[token_].preSaleFinished = 2; //El estado ahora es fallido
                IERC20 token = IERC20(token_);
                token.transfer(_preventas[token_].owner, _preventas[token_].amountleft);
            } else {
                _preventas[token_].preSaleFinished = 1; //El estado ahora es cerrado
            }
        }
        emit ClosedSale(token_);
    }
}
