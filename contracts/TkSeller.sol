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
        uint256[] prices,
        address[] tokensAllowed,
        bool returnable_
    );
    event ChangedSale(
        address tokenaddress_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256[] prices,
        address[] tokensAllowed
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
    address systemOwner;
    // dirección del token USD

    // datos de las preventas
    mapping(address => Preventa) private _preventas; // implica que sólo puede venderse una vez
    // ***** mapa compras individuales
    mapping(address => mapping(address => Compra[])) private _compras;
    // mapa precios
    mapping(address => mapping(address => uint256)) private _precios;

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
    struct Compra {
        uint256 amount;
        uint256 price;
        address token;
        uint256 amountPayToken;
    }

    struct Preventa {
        address owner;
        uint256 amount;
        uint256 amountleft;
        uint256 hardCap;
        uint256 softCap;
        uint256 endDate;
        uint256[] prices;
        address[] tokensAllowed;
        bool returnable;
        uint8 preSaleFinished;
    }

    constructor() {
        //Habría que incluir en el constructor un listado de las monedas aceptadas para hacer transacciones no?
        systemOwner = msg.sender;
    }

    function isTokenCreated(address token_) private view returns (bool) {
        return (_preventas[token_].owner != address(0)); //Done
    }

    function isDateFuture(uint256 date_) private view returns (bool) {
        return (block.timestamp < date_); //Done
    }

    function areCapsValid(
        uint256 hardcap_,
        uint256 softcap_,
        uint256 amount
    ) private pure returns (bool) {
        return (hardcap_ != 0 && softcap_ <= hardcap_ && hardcap_ <= amount);
    }

    function getSaleInfo(
        address token
    ) public view returns (Preventa memory preventa) {
        require(isTokenCreated(token), "Token not available");
        return (_preventas[token]);
    }

    function initSale(
        address tokenaddress_,
        address supplier,
        uint256 amount_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256[] memory precios_,
        address[] memory tokensdepago_,
        bool returnable_,
        string memory permit
    ) external payable {
        require(
            !isTokenCreated(tokenaddress_),
            "Token has been previously sold"
        ); //No puede haber 2 preventas del mismo token
        require(isDateFuture(endDate_), "Bad date");
        require(areCapsValid(hardCap_, softCap_, amount_), "Caps not valid");
        require(
            precios_.length == tokensdepago_.length,
            "Arrays have different length"
        );
        IERC20 token_ = IERC20(tokenaddress_);
        require(
            token_.allowance(supplier, address(this)) >= amount_,
            "Insufficient Allowance"
        );
        token_.transferFrom(supplier, address(this), amount_);
        _preventas[tokenaddress_] = Preventa(
            msg.sender,
            amount_,
            amount_,
            hardCap_,
            softCap_,
            endDate_,
            precios_,
            tokensdepago_,
            returnable_,
            0
        );

        for (uint i = 0; i < tokensdepago_.length; i++) {
            _precios[tokenaddress_][tokensdepago_[i]] = precios_[i];
        }

        emit OpenedSale(
            tokenaddress_,
            amount_,
            hardCap_,
            softCap_,
            endDate_,
            precios_,
            tokensdepago_,
            returnable_
        );
    }

    function setSale(
        address tokenaddress_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256[] memory changedPrices_,
        address[] memory addressOfChangedPrices_
    ) external {
        require(isTokenCreated(tokenaddress_), "Token not created");
        require(isDateFuture(endDate_), "Bad End Date");
        require(
            changedPrices_.length == addressOfChangedPrices_.length,
            "Arrays have different length"
        );
        Preventa storage token_ = _preventas[tokenaddress_];
        require(msg.sender == token_.owner, "Not owner of the presale");
        require(
            areCapsValid(hardCap_, softCap_, token_.amount),
            "Caps not valid"
        );
        for (uint i = 0; i < changedPrices_.length; i++) {
            _precios[tokenaddress_][
                addressOfChangedPrices_[i]
            ] = changedPrices_[i];
        }
        _preventas[tokenaddress_] = Preventa(
            token_.owner,
            token_.amount,
            token_.amountleft,
            hardCap_,
            softCap_,
            endDate_,
            changedPrices_,
            addressOfChangedPrices_,
            token_.returnable,
            0
        );

        emit ChangedSale(
            tokenaddress_,
            hardCap_,
            softCap_,
            endDate_,
            changedPrices_,
            addressOfChangedPrices_
        );
    }

    function buyTokensByToken(
        address token_,
        uint256 amount_,
        address payToken_,
        string memory permit_
    ) external {
        require(isTokenCreated(token_), "No token"); //Ha de existir el token
        Preventa memory preventa = _preventas[token_];
        require(preventa.preSaleFinished == 0, "Not open"); //Ha de estar abierta
        require(
            _precios[token_][payToken_] != 0,
            "Not allowed to pay with this token"
        );
        require(preventa.amountleft >= amount_, "Not enough selling token"); // No ha de comprar más de lo que queda

        //require que tenga el valor de los tokens a vender para comprar los deseados
        if (!isDateFuture(preventa.endDate)) {
            //checkear que no se haya entrado fuera de tiempo
            uint256 precioEnETH = amount_ * _precios[token_][address(0)];
            uint256 cant = precioEnETH / _precios[token_][payToken_];
            IERC20 payToken = IERC20(payToken_);
            require(
                payToken.balanceOf(msg.sender) >= cant,
                "You dont have enough tokens in your wallet"
            );

            IERC20 token = IERC20(token_);
            payToken.transferFrom(msg.sender, address(this), cant);
            _preventas[token_].amountleft -= amount_;
            token.transfer(msg.sender, amount_);
            _compras[token_][msg.sender].push(
                Compra(amount_, precioEnETH, payToken_, cant)
            );
            if (_preventas[token_].amountleft == 0) {
                //Si se llega a 0 tokens restantes se cierra con status de no fallida
                _closeSale(token_, false);
            } else if (!isDateFuture(preventa.endDate)) {
                //si en el tiempo en el que está ejecutandose la preventa pasa el tiempo se cierra
                _closeSale(token_, true);
            }
        } else if (
            _preventas[token_].softCap <
            _preventas[token_].amount - _preventas[token_].amountleft
        ) {
            //Si es despues de la fecha de cierre y no se ha cumplido el objetivo del softcap
            _closeSale(token_, true);
        } else {
            //Si es despues de la fecha de cierre y se cumplio el objetivo del softcap
            _closeSale(token_, false);
        }

        emit TokenExchanged(token_, amount_, payToken_, msg.sender);
    }

    function buyTokensByETH(address token_) external payable {
        require(isTokenCreated(token_), "No token");
        require(_preventas[token_].preSaleFinished == 0, "Sale not open");
        require(_precios[token_][address(0)] != 0, "Cant buy with ETH");
        require(
            _preventas[token_].amountleft * _precios[token_][address(0)] >=
                msg.value,
            "Not enough tokens to fill the ETH You sended"
        );

        if (!isDateFuture(_preventas[token_].endDate)) {
            uint256 cantporEth;
            cantporEth = msg.value / _precios[token_][address(0)];
            _preventas[token_].amountleft -= cantporEth;
            IERC20 token = IERC20(token_);
            token.transfer(msg.sender, cantporEth);
            _compras[token_][msg.sender].push(
                Compra(cantporEth, msg.value, address(0), 0)
            );
            if (_preventas[token_].amountleft == 0) {
                _closeSale(token_, false);
            } else if (!isDateFuture(_preventas[token_].endDate)) {
                _closeSale(token_, true);
            }
            emit ETHsold(token_, cantporEth, msg.sender);
        } else if (
            _preventas[token_].softCap <
            _preventas[token_].amount - _preventas[token_].amountleft
        ) {
            //Si es despues de la fecha de cierre y no se ha cumplido el objetivo del softcap
            _closeSale(token_, true);
        } else {
            //Si es despues de la fecha de cierre y se cumplio el objetivo del softcap
            _closeSale(token_, false);
        }
    }

    function returnTokens(
        address token_,
        uint256 amount_, //Tokens que se quieren devolver
        uint256 idCompra_, // el id 0 representará que quiere devolver todas las compras
        string memory permit_
    ) external {
        require(isTokenCreated(token_), "Token not available");
        require(_preventas[token_].preSaleFinished == 0, "Sale not open");
        require(_preventas[token_].returnable == true, "Sale not returnable");
        IERC20 token = IERC20(token_);
        Compra[] memory sales = _compras[token_][msg.sender];
        if (idCompra_ == 0) {
            for (uint i = 0; i < sales.length; i++) {
                // en caso de que length no sea correcto se puede guardar un uint en Preventa con la cantidad de compras
                if (sales[i].amount > 0) {
                    //Que la compra no haya sido devuelta ya
                    token.transferFrom(
                        msg.sender,
                        address(this),
                        sales[i].amount
                    ); //Pasamos sus tokens al contrato de compraventa
                    _preventas[token_].amountleft += sales[i].amount; //Devolvemos los tokens para que se puedan comprar otra vez
                    if (sales[i].token == address(0)) {
                        //Hecha en Ethereum
                        address payable vendedor = payable(msg.sender);
                        vendedor.transfer(sales[i].price); //Enviamos el ETH que pagó
                    } else {
                        //Hecha con otro token
                        IERC20 payToken = IERC20(sales[i].token);
                        payToken.transfer(msg.sender, sales[i].amountPayToken); //Devolvemos los tokens al comprador arrepentido
                    }
                }
            }
        } else {
            require(amount_ > 0, "Cant return 0 tokens");
            uint256 i = idCompra_ - 1; //Como usamos el 0 para devolver todo, la idCompra está desplazada un número a la derecha del acceso al array
            Compra memory compra = sales[i];
            require(compra.amount > 0, "Sale previously returned");
            require(amount_ <= compra.amount, "Cant return more than bought"); //Que no se devuelva más de lo que se compró en la compra
            token.transferFrom(msg.sender, address(this), amount_); //Pasamos sus tokens al contrato de compraventa
            compra.amount -= amount_;
            _preventas[token_].amountleft += compra.amount; //Devolvemos los tokens para que se puedan comprar otra vez
            if (compra.token == address(0)) {
                //Hecha en Ethereum
                uint256 EthToSend = amount_ * (compra.price / compra.amount); //Enviamos la parte de ethereum que toca
                address payable vendedor = payable(msg.sender);
                vendedor.transfer(EthToSend); //Enviamos el ETH que pagó
            } else {
                //Hecha con otro token
                uint256 tokenToSend = amount_ *
                    (compra.amountPayToken / compra.amount);
                IERC20 payToken = IERC20(compra.token);
                payToken.transfer(msg.sender, tokenToSend); //Devolvemos los tokens al comprador arrepentido
            }
        }
    }

    function closeSale(address token_, bool failed_) public {
        require(msg.sender == _preventas[token_].owner, "Not owner");
        _closeSale(token_, failed_);
    }

    function _closeSale(address token_, bool failed_) private {
        if (_preventas[token_].preSaleFinished == 0) {
            // Hacer algo solo si está abierta
            if (failed_) {
                _preventas[token_].preSaleFinished = 2; //El estado ahora es fallido
                IERC20 token = IERC20(token_);
                token.transfer(
                    _preventas[token_].owner,
                    _preventas[token_].amountleft
                );
            } else {
                _preventas[token_].preSaleFinished = 1; //El estado ahora es cerrado
            }
            emit ClosedSale(token_);
        }
    }
}
