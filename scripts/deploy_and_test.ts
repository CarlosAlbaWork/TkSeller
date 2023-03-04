import { ethers } from "hardhat"
import { BigNumber } from "hardhat"

(async () => {

    const decimals=18
    function sbgn(tk: BigNumber) { return ethers.utils.formatUnits(tk,decimals); }
    function bgn (tk: number) { return ethers.utils.parseUnits(tk.toString(),decimals) }
    function fec(tms: number) { return new Date(tms*1000).toLocaleString() }

    async function espera (x:Promise<any>) {
      await provider.waitForTransaction((await x).hash)
    }

    // 'web3Provider' is a remix global variable object
    const provider = ethers.provider;

    const lstacc = await provider.listAccounts();

    if (lstacc.length < 9) {
      console.log("Se requieren 9 cuentas");
      return;
    }

    const hardcap= 30000
    const deplTkSeller = provider.getSigner(0) // deploy y owner general del contrato de compraventa
    console.log('Irelevante Super-amo de TkSeller',await deplTkSeller.getAddress())
    const deplTkEnVenta = provider.getSigner(1) // deploy y owner del token en venta, suministrará los TK
    const dOwnTkEnVenta = await deplTkEnVenta.getAddress()
    console.log('Owner Token Venta',dOwnTkEnVenta)
    const deplTkPago = provider.getSigner(2) // deploy y owner del token de pago
    const iniciador = provider.getSigner(3)  // tipo que inicia la venta, por no poner el creador, podría ser dOwnTkEnVenta
    const dIniciador = await iniciador.getAddress()
    console.log('Iniciador', dIniciador)
    const comprador = provider.getSigner(4) // comprador, debe tener token de pago
    const dComprador =  await comprador.getAddress()
    console.log('Comprador',dComprador)
    const pagaETH = provider.getSigner(5) // este comprará con ETH
    const dPagaETH = await pagaETH.getAddress()
    console.log('Comprador con ETH',dPagaETH)

    const tkSellerFact = await ethers.getContractFactory('TkSeller',deplTkSeller)
    console.log('=> deploy TkSeller')
    const cOwnTkSeller = await tkSellerFact.deploy() // contrato visto por el owner
    const dirTkSeller = cOwnTkSeller.address; // dirección del contrato de compraventa

    const tokenEnVenta = await ethers.getContractFactory('ERC20Palero',deplTkEnVenta)
    console.log('=> deploy tokenEnVenta')
    const cOwnTkEnVenta = await tokenEnVenta.deploy('ENVENTA','ENVENTA')
    const dirTkEnVenta = cOwnTkEnVenta.address
    // TkSeller necesita monedas, le doy permiso
    await espera(cOwnTkEnVenta.approve(dirTkSeller, bgn(hardcap)))
    // estas tres funciones las podría llamar cualquiera
    console.log(await cOwnTkEnVenta.name(),
                ': BAL', sbgn(await cOwnTkEnVenta.balanceOf(dOwnTkEnVenta)),
                'ALLOW:', sbgn(await cOwnTkEnVenta.allowance(dOwnTkEnVenta,dirTkSeller)))

    const tokenPago = await ethers.getContractFactory('ERC20Palero',deplTkPago)
    console.log('=> deploy tokenPago')
    const cOwnTkPago = await tokenPago.deploy('PAGO','PAGO')
    const dirTkPago = cOwnTkPago.address

    // TkSeller visto por el iniciador
    const cIniciador = await ethers.getContractAt('TkSeller',dirTkSeller,iniciador)
    console.log('=> initSale')
    // ownTkEnVenta tiene el total de tokens a vender, autoriza al contrato a coger
    await espera(cOwnTkEnVenta.approve(dirTkSeller,bgn(hardcap)))
    // normalmente el iniciador será el propietario del token, pero no tiene por qué, por eso está separado
    await espera(cIniciador.initSale(dirTkEnVenta,dOwnTkEnVenta,
                                      bgn(hardcap),bgn(hardcap),bgn(hardcap/3),
                                      Math.round(Date.now()/1000)+24*3600,
                                      bgn(0.1),10,
                                      true,''))
    console.log('BAL en owner:', sbgn(await cOwnTkEnVenta.balanceOf(dOwnTkEnVenta)),
                'BAL en venta:', sbgn(await cOwnTkEnVenta.balanceOf(dirTkSeller)))

    // es curioso como devuelve los nombres de los campos, supongo que gracias al returns
    const datosVenta = await cOwnTkSeller.getSaleInfo(dirTkEnVenta)
    console.log('DATOS VENTA:',datosVenta)
    console.log('CIERRE: ',fec(datosVenta.endDate))
    /*
    esto está mal
        const cli1TkEnVenta = await ethers.getContractAt('ERC20Palero',dirTkEnVenta,pagaETH)
        await espera(pagaETH.sendTransaction({ to: dirTkSeller, value: bgn(10) , data: dirTkEnVenta })) mal ... solo envia ether
        console.log('Pagado con ether y recibido',await cli1TkEnVenta.balanceOf(pagaETH.address))
    */
    // TkSeller visto por el comprador
    const cCompTkSeller = await ethers.getContractAt('TkSeller',dirTkSeller,comprador)
    // el comprador debe tener tokens de PAGO, se los transfiere el owner
    espera(cOwnTkPago.transfer(dComprador,bgn(10000)))
    // token de pago visto por el comprador
    const cCompPago = await ethers.getContractAt('ERC20Palero',dirTkPago,comprador)
    console.log(await cOwnTkPago.name(),
                ': BAL del comprador:', sbgn(await cCompPago.balanceOf(dComprador)))

    console.log('=> buy 100')
    // autoriza que TkSeller le coja la pasta
    await espera(cCompPago.approve(dirTkSeller,bgn(100)))
    console.log('ALLOW:', sbgn(await cCompPago.allowance(dComprador,dirTkSeller)))
    // llama al contrato
    await espera(cCompTkSeller.buyTokensByToken(dirTkEnVenta,bgn(100),dirTkPago,''))

    // token en venta visto por el comprador
    const cCompTkEnVenta = await ethers.getContractAt('ERC20Palero',dirTkEnVenta,comprador)
    console.log('Pagado con Token y recibido',await cCompTkEnVenta.balanceOf(dComprador))


})()