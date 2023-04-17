// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ITkSeller.sol";
import "hardhat/console.sol";

contract TkSeller is ITkSeller {
    //Eventos

    /**
     * @dev
     * Evento que certifica que se ha cerrado satisfactoriamente la Preventa de token_
     */
    event ClosedSale(address token_);

    /**
     * @dev
     * Evento que certifica que se ha cerrado fallidamente la Preventa de token_
     */
    event FailedSale(address token_);

    /**
     * @dev
     * Evento que informa sobre la apertura de una nueva preventa
     */

    event OpenedSale(
        address tokenaddress_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256[] prices,
        address[] tokensAllowed,
        bool returnable_
    );

    /**
     * @dev
     * Evento que informa sobre el cambio de parámetros de una preventa
     */

    event ChangedSale(
        address tokenaddress_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256[] prices,
        address[] tokensAllowed
    );

    /**
     * @dev
     * Evento que informa de la venta en ether de un token de preventa
     */
    event ETHsold(address token_, uint256 amount_, address buyer_);

    /**
     * @dev
     * Evento que informa de la venta de un token mediante otro token
     */

    event TokenExchanged(
        address token_,
        uint256 cant_,
        address paytoken_,
        address buyer_
    );

    // dirección
    address systemOwner;

    // @dev datos de las preventas
    mapping(address => Preventa) private _preventas; // implica que sólo puede venderse una vez

    // @dev mapa compras individuales. La estructura es: (token -> comprador -> Array de sus compras)
    mapping(address => mapping(address => Compra[])) private _compras;

    // @dev mapa precios de cada token. La estructura es: (token de la preventa -> token con el que está permitido pagar -> precio)
    mapping(address => mapping(address => uint256)) private _precios;

    // @dev mapa cantidad vendida de cada tipo de token permitido en la preventa. La estructura es: (token de la preventa -> token con el que está permitido pagar -> cantidad vendida)
    mapping(address => mapping(address => uint256)) private _cantidades;

    /**
     * @dev
     * Struct que contiene la información referente a cada compra realizada
     * amount: cantidad comprada
     * token; la dirección del token con el que se compra
     * amountPayToken; Si no se pagó en Ethereum, cantidad de Token de pago de la compra
     */

    struct Compra {
        uint256 amount;
        address token;
        uint256 amountPayToken;
    }

    /**
     * @dev
     * Struct que contiene la información referente a las preventas
     * owner: dirección del propietario de la preventa
     * amountleft: cantidad de token que queda para vender
     * hardCap: La cantidad total de los token disponibles
     * softCap: Mínima cantidad de Tokens que se ha de vender para que la preventa no se considere fallida
     * endDate: Fecha de finalización de la preventa(unix time)
     * prices: Array con los precios de los distintos tokens aprobados para compra
     * tokensAllowed: Array con los tokens con los que se permite comprar
     * returnable: Muestra si se pueden hacer devoluciones con sellToken antes del fin de la venta
     * preSaleFinished: Estado de la compra. 0=abierta, 1=cerrada, 2=fallida
     */

    struct Preventa {
        address owner;
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
        systemOwner = msg.sender;
    }

    /** @dev
     * Función que se asegura de que el token ha sido registrado alguna vez en el sistema de preventas
     */

    function isTokenCreated(address token_) private view returns (bool) {
        return (_preventas[token_].owner != address(0));
    }

    /** @dev
     * Función que se asegura de que la fecha proporcionada sea mayor que la actual
     */

    function isDateFuture(uint256 date_) private view returns (bool) {
        return (block.timestamp < date_);
    }

    /** @dev
     * Función que se asegura que los caps son válidos
     */

    function areCapsValid(
        uint256 hardcap_,
        uint256 softcap_
    ) private pure returns (bool) {
        return (hardcap_ != 0 &&
            softcap_ <= hardcap_ &&
            hardcap_ / 2 <= softcap_); //La última es respecto a lo que hemos visto sobre que normalmente se pide que softcap tenga más de la mitad de hardcap
    }

    /** @dev
     * Devuelve el struct Preventa asociado al token del que se quiere obtener la información
     */

    function getSaleInfo(
        address token
    ) public view returns (Preventa memory preventa) {
        require(isTokenCreated(token), "Token not available");
        return (_preventas[token]);
    }

    /**
     * @dev inicializa una venta
     * el vendedor será el gestor/propietario de la venta, puede ser o no el owner del token
     * tokenaddress_: dirección del token
     * supplier: el que crea la venta
     * hardCap_: lo que se quiere depositar para vender
     * softCap: Mínima cantidad de Tokens que se ha de vender para que la preventa no se considere fallida
     * endDate_: Fecha de finalización de la preventa(unix time)
     * precios_: Array con los precios de los distintos tokens aprobados para compra
     * tokensdepago_: Array con los tokens con los que se permite comprar
     * returnable_: Muestra si se pueden hacer devoluciones con returnToken antes del fin de la venta
     * permit: si el token implementa permit, lo usa, si no, debe haber allowance
     */

    function initSale(
        address tokenaddress_,
        address supplier,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256[] memory precios_,
        address[] memory tokensdepago_,
        bool returnable_,
        bytes memory permit
    ) external payable {
        require(
            !isTokenCreated(tokenaddress_),
            "Token has been previously sold"
        ); //No puede haber 2 preventas del mismo token
        require(isDateFuture(endDate_), "Bad date");
        require(areCapsValid(hardCap_, softCap_), "Caps not valid");
        require(
            precios_.length == tokensdepago_.length,
            "Arrays have different length"
        );
        IERC20 token_ = IERC20(tokenaddress_);
        require(
            token_.allowance(supplier, address(this)) >= hardCap_,
            "Insufficient Allowance"
        );
        console.log("*>Se han pasado los require");

        token_.transferFrom(supplier, address(this), hardCap_);

        console.log("*>Se ha logrado realizar la transferencia inicial");

        _preventas[tokenaddress_] = Preventa(
            msg.sender,
            hardCap_,
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

        console.log("*>Funcion ejecutada con exito");

        emit OpenedSale(
            tokenaddress_,
            hardCap_,
            softCap_,
            endDate_,
            precios_,
            tokensdepago_,
            returnable_
        );
        console.log("*>Evento emitido con exito");
    }

    /** @dev
     * Función que deja al creador del token modificar la preventa
     * tokenaddress_: dirección del token
     * hardCap_: Lo que se quiere depositar para vender
     * softCap: Mínima cantidad de Tokens que se ha de vender para que la preventa no se considere fallida
     * endDate_: Fecha de finalización de la preventa(unix time)
     * changedPrices_: Array con los precios de los distintos tokens aprobados para compra
     * addressOfChangedPrices_: Array con los tokens con los que se permite comprar
     */

    function setSale(
        address tokenaddress_,
        uint256 hardCap_,
        uint256 softCap_,
        uint256 endDate_,
        uint256[] memory changedPrices_,
        address[] memory addressOfChangedPrices_
    ) external {
        require(isTokenCreated(tokenaddress_), "Token not created");
        require(
            msg.sender == _preventas[tokenaddress_].owner,
            "Not owner of the presale"
        );
        require(isDateFuture(endDate_), "Bad End Date");
        require(areCapsValid(hardCap_, softCap_), "Caps not valid");
        require(
            changedPrices_.length == addressOfChangedPrices_.length,
            "Arrays have different length"
        );
        Preventa memory token_ = _preventas[tokenaddress_];

        console.log("*>Los require no han dado ningun error");

        for (uint i = 0; i < changedPrices_.length; i++) {
            _precios[tokenaddress_][
                addressOfChangedPrices_[i]
            ] = changedPrices_[i];
        }

        console.log("*>Se han cambiado los precios correctamente");

        _preventas[tokenaddress_] = Preventa(
            token_.owner,
            token_.amountleft,
            hardCap_,
            softCap_,
            endDate_,
            changedPrices_,
            addressOfChangedPrices_,
            token_.returnable,
            0
        );

        console.log("*>Funcion ejecutada con exito");

        emit ChangedSale(
            tokenaddress_,
            hardCap_,
            softCap_,
            endDate_,
            changedPrices_,
            addressOfChangedPrices_
        );

        console.log("*>Evento emitido con exito");
    }

    /** @dev
     * Función que permite al comprador usar un token permitido por el vendedor para adquirir los tokens
     * token_: dirección del token
     * amount_: La cantidad que se quiere COMPRAR
     * payToken_: Token que se quiere usar para comprar
     * permit: si el token implementa permit, lo usa, si no, debe haber allowance
     */

    function buyTokensByToken(
        address token_,
        uint256 amount_,
        address payToken_,
        bytes memory permit_
    ) external {
        require(isTokenCreated(token_), "No token"); //Ha de existir el token
        require(amount_ > 0, "Cant buy 0 tokens");
        Preventa memory preventa = _preventas[token_];
        require(isDateFuture(preventa.endDate), "Sale not open");
        require(preventa.preSaleFinished == 0, "Sale not open"); //Ha de estar abierta
        require(
            _precios[token_][payToken_] != 0,
            "Not allowed to pay with this token"
        );
        require(preventa.amountleft >= amount_, "Not enough selling token"); // No ha de comprar más de lo que queda
        console.log("*>Los require no han dado error");
        uint256 cant = (_precios[token_][payToken_] * amount_) /
            1000000000000000000;
        IERC20 payToken = IERC20(payToken_);
        IERC20 token = IERC20(token_);

        payToken.transferFrom(msg.sender, address(this), cant);
        console.log("*>Se ejecuta el transferFrom");

        _preventas[token_].amountleft -= amount_;
        console.log("*>Se resta al amountLEft");

        token.transfer(msg.sender, amount_);
        console.log("*>Se transfiere al comprador");

        _cantidades[token_][payToken_] += cant;

        _compras[token_][msg.sender].push(Compra(amount_, payToken_, cant));
        console.log(
            "*>Se registra la compra en el mapa de compras y cantidades"
        );
        if (
            _preventas[token_].amountleft == 0 ||
            (!isDateFuture(preventa.endDate) &&
                preventa.hardCap - preventa.amountleft >= preventa.softCap)
        ) {
            //Si se llega a 0 tokens restantes, o con fuera de fecha y con el softcap alcanzado se cierra con status de no fallida
            _closeSale(token_, false);
            console.log("*>Se ha cerrado con status de no fallida");
        } else if (
            !isDateFuture(preventa.endDate) &&
            preventa.hardCap - preventa.amountleft < preventa.softCap
        ) {
            //si en el tiempo en el que está ejecutandose la preventa pasa el tiempo y no se llega al softcap se cierra con status de fallida
            _closeSale(token_, true);
            console.log("*>Se ha cerrado con status de fallida");
        }

        console.log("*>Funcion ejecutada con exito");
        emit TokenExchanged(token_, amount_, payToken_, msg.sender);

        console.log("*>Evento emitido con exito");
    }

    /** @dev
     * Función que permite al comprador usar ETH para adquirir los tokens
     * El ETH se envía al llamar a la función
     * token_: dirección del token
     */

    function buyTokensByETH(address token_) external payable {
        require(isTokenCreated(token_), "No token");
        require(isDateFuture(_preventas[token_].endDate), "Sale not open");
        require(_preventas[token_].preSaleFinished == 0, "Sale not open");
        require(_precios[token_][address(0)] != 0, "Cant buy with ETH");
        require(msg.value > 0, "No eth sent");
        require(
            _preventas[token_].amountleft * _precios[token_][address(0)] >=
                1000000000000000000 * msg.value,
            "Not enough tokens to fill the ETH You sended"
        );

        console.log("*>Los require no han dado error");

        uint256 cantporEth = 1000000000000000000 *
            (msg.value / _precios[token_][address(0)]);
        console.log("*>El calculo de la cantidad no dado error");
        _preventas[token_].amountleft -= cantporEth;
        console.log("*>La resta a amountLeft no dado error");
        IERC20 token = IERC20(token_);
        token.transfer(msg.sender, cantporEth);
        _cantidades[token_][address(0)] += (msg.value * 1000000000000000000);

        console.log("*>La transferencia  no dado error");
        _compras[token_][msg.sender].push(
            Compra(cantporEth, address(0), msg.value * 1000000000000000000)
        );
        console.log("*>La carga en el mapa de compras no dado error");
        Preventa memory preventa = _preventas[token_];
        if (
            _preventas[token_].amountleft == 0 ||
            (!isDateFuture(preventa.endDate) &&
                preventa.hardCap - preventa.amountleft >= preventa.softCap)
        ) {
            _closeSale(token_, false);
            console.log("*>Se ha cerrado con status de no fallida");
        } else if (
            !isDateFuture(_preventas[token_].endDate) &&
            preventa.hardCap - preventa.amountleft < preventa.softCap
        ) {
            _closeSale(token_, true);
            console.log("*>Se ha cerrado con status de fallida");
        }

        emit ETHsold(token_, cantporEth, msg.sender);

        console.log("*>Evento emitido con exito");
        console.log("*>Funcion ejecutada con exito");
    }

    /** @dev
     * Función que permite al comprador ver sus compras
     * token_: dirección del token
     */
    function myPurchases(
        address token_
    ) external view returns (Compra[] memory) {
        require(isTokenCreated(token_), "No token");
        require(
            _compras[token_][msg.sender].length > 0,
            "You have no purchases"
        );
        Compra[] memory aux;
        for (uint i = 0; i < _compras[token_][msg.sender].length; i++) {
            aux[i] = _compras[token_][msg.sender][i];
        }
        return aux;
    }

    /** @dev
     * Función que permite al comprador cancelar compras y hacer que le devuelvan los tokens
     * token_: dirección del token
     * amount_: La cantidad que se quiere devolver
     * idCompra_: Número de la transacción que se quiere devolver. El 0 sse usa si se quieren devolver todas las compras
     * permit: si el token implementa permit, lo usa, si no, debe haber allowance
     */

    function returnTokens(
        address token_,
        uint256 amount_, // el amount 0 representará que quiere devolver todas las compras
        uint256 idCompra_,
        bytes memory permit_
    ) external {
        require(amount_ >= 0, "Cant return negative tokens");
        if (amount_ > 0) {
            require(idCompra_ > 0, "Id not valid");
        }
        require(msg.sender != _preventas[token_].owner, "owner has no buyings");
        require(isTokenCreated(token_), "Token not available");
        require(_preventas[token_].preSaleFinished != 1, "Sale not open");
        require(_preventas[token_].returnable == true, "Sale not returnable");
        require(
            _compras[token_][msg.sender].length > 0,
            "You have no purchases"
        );
        console.log("*>Los require no han dado error");

        IERC20 token = IERC20(token_);
        Compra[] memory sales = _compras[token_][msg.sender];

        if (amount_ == 0) {
            console.log("*>Se pidio la devolucion de todas las compras");

            for (uint i = 0; i < sales.length; i++) {
                if (sales[i].amount > 0) {
                    //Que la compra no haya sido devuelta ya
                    console.log("*>Esta compra aun no fue devuelta");
                    uint256 devuelto = sales[i].amount;

                    token.transferFrom(msg.sender, address(this), devuelto); //Pasamos sus tokens al contrato de compraventa
                    console.log("*>TransferFrom ejecutado");

                    _preventas[token_].amountleft += devuelto; //Devolvemos los tokens para que se puedan comprar otra vez
                    console.log("*>Actualizamos amountLeft");

                    sales[i].amount = 0;
                    _cantidades[token_][sales[i].token] -= sales[i]
                        .amountPayToken;
                    console.log("*>Actualizamos _cantidades");
                    if (sales[i].token == address(0)) {
                        address payable vendedor = payable(msg.sender);
                        console.log("*>Procedemos a transferir el eTH");
                        vendedor.transfer(
                            sales[i].amountPayToken / 1000000000000000000
                        ); //Enviamos el ETH que pagó
                    } else {
                        //Hecha con otro token
                        IERC20 payToken = IERC20(sales[i].token);
                        console.log("*>Procedemos a transferir el otro token");
                        payToken.transfer(msg.sender, sales[i].amountPayToken); //Devolvemos los tokens al comprador arrepentido
                    }
                    if (_preventas[token_].preSaleFinished == 2) {
                        token.transfer(_preventas[token_].owner, devuelto);
                    }
                }
                console.log("*>Esta iteracion no dio error");
            }
            console.log("*>Se devolvieron todas las compras correctamente");
        } else {
            uint256 i = idCompra_ - 1;
            Compra memory compra = sales[i];
            require(compra.amount > 0, "Sale previously returned");
            require(amount_ <= compra.amount, "Cant return more than bought"); //Que no se devuelva más de lo que se compró en la compra

            console.log("*>Los require no han dado error");
            console.log("*>Se devuelve una compra");
            token.transferFrom(msg.sender, address(this), amount_); //Pasamos sus tokens al contrato de compraventa

            console.log("*>El transferFrom no ha dado error");

            console.log("*>Se resta el amount a la compra");
            _preventas[token_].amountleft += amount_; //Devolvemos los tokens para que se puedan comprar otra vez
            uint256 amountToSend = amount_ *
                (compra.amountPayToken / compra.amount);
            uint256 cantidadRestante = compra.amount - amount_;
            uint256 pagoRestante = compra.amountPayToken - amountToSend;
            _cantidades[token_][compra.token] -= amountToSend;
            console.log("*>Se devuelven los tokens");
            if (compra.token == address(0)) {
                //Hecha en Ethereum
                console.log("*>La compra se hizo en ETH");
                address payable vendedor = payable(msg.sender);
                vendedor.transfer(amountToSend / 1000000000000000000); //Enviamos el ETH que pagó
                console.log("*>El pago de ETH se resolvio sin complicaciones");
            } else {
                //Hecha con otro token
                console.log("*>La compra se hizo con token");
                IERC20 payToken = IERC20(compra.token);
                payToken.transfer(msg.sender, amountToSend); //Devolvemos los tokens al comprador arrepentido
                console.log("*>La compra se realizo con exito");
            }
            if (_preventas[token_].preSaleFinished == 2) {
                token.transfer(_preventas[token_].owner, amount_);
            }
            _compras[token_][msg.sender][i] = Compra(
                cantidadRestante,
                compra.token,
                pagoRestante
            );
        }
        console.log("*>Funcion ejecutada con exito");
    }

    /** @dev
     * Función que permite al vendedor cancelar cerrar la compra
     * token_: dirección del token
     * failed_: Describe si la venta ha sido fallida o no
     */

    function closeSale(address token_) external {
        require(msg.sender == _preventas[token_].owner, "Not owner");
        require(_preventas[token_].preSaleFinished == 0, "Preventa ya cerrada");
        console.log("*>El owner llamo a la funcion");
        bool failed = false;
        if (
            _preventas[token_].hardCap - _preventas[token_].amountleft <
            _preventas[token_].softCap
        ) {
            failed = true;
        }
        _closeSale(token_, failed);
    }

    function _closeSale(address token_, bool failed_) private {
        require(_preventas[token_].preSaleFinished == 0, "Preventa ya cerrada");
        IERC20 token = IERC20(token_);
        if (_preventas[token_].amountleft != 0) {
            token.transfer(
                _preventas[token_].owner,
                _preventas[token_].amountleft
            );
            _preventas[token_].amountleft = 0;
        }
        console.log("*>Funcion ejecutada con exito");
        if (failed_) {
            _preventas[token_].preSaleFinished = 2; //El estado ahora es fallido
            emit FailedSale(token_);
        } else {
            _preventas[token_].preSaleFinished = 1; //El estado ahora es cerrado
            for (uint i = 0; i < _preventas[token_].tokensAllowed.length; i++) {
                address payToken = _preventas[token_].tokensAllowed[i];
                if (_cantidades[token_][payToken] != 0) {
                    uint256 cant = _cantidades[token_][payToken];
                    if (payToken == address(0)) {
                        address payable vendedor = payable(
                            _preventas[token_].owner
                        );
                        vendedor.transfer(cant / 1000000000000000000);
                    } else {
                        IERC20 tokenContract = IERC20(payToken);
                        tokenContract.transfer(_preventas[token_].owner, cant);
                    }
                }
            }
            emit ClosedSale(token_);
        }
    }
}
