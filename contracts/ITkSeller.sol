// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Interface
 */
interface ITkSeller {
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
     * returnable_: Muestra si se pueden hacer devoluciones con sellToken antes del fin de la venta
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
    ) external payable;

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
    ) external;

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
    ) external;

    /** @dev
     * Función que permite al comprador usar ETH para adquirir los tokens
     * El ETH se envía al llamar a la función
     * token_: dirección del token
     */

    function buyTokensByETH(address token_) external payable;

    /** @dev
     * Función que permite al comprador cancelar compras y hacer que le devuelvan los tokens
     * token_: dirección del token
     * amount_: La cantidad que se quiere devolver
     * idCompra_: Número de la transacción que se quiere devolver. El 0 sse usa si se quieren devolver todas las compras
     * permit: si el token implementa permit, lo usa, si no, debe haber allowance
     */

    function returnTokens(
        address token_,
        uint256 amount_,
        uint256 idCompra_, // el id 0 representará que quiere devolver todas las compras
        bytes memory permit_
    ) external;

    /** @dev
     * Función que permite al vendedor cancelar cerrar la compra
     * token_: dirección del token
     * failed_: Describe si la venta ha sido fallida o no
     */

    function closeSale(address token_, bool failed_) external;
}
