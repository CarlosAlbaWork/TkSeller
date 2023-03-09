import { ethers } from "hardhat"
import { BigNumber } from "hardhat"

(async () => {

  const hardcap= 30000

  const dirETH = "0x0000000000000000000000000000000000000000"

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
  let err = false
  for (let ac of lstacc) {
    let bal = await provider.getBalance(ac)
    if (bal == 0)  { // redes reales
      console.log('ERR: ',ac,'no tiene ETH')
      err = true
    }
  }
  if (err)
    throw new Error("Mete saldo");

  let isig=0
  const deplTkSeller = provider.getSigner(isig++) // deploy y owner general del contrato de compraventa
  console.log('Irelevante Super-amo de TkSeller',await deplTkSeller.getAddress())
  const deplTkEnVenta = provider.getSigner(isig++) // deploy y owner del token en venta, suministrará los TK
  const dOwnTkEnVenta = await deplTkEnVenta.getAddress()
  console.log('Owner Token Venta',dOwnTkEnVenta)
  const deplTkPago1 = provider.getSigner(isig++) // deploy y owner del token de pago1
  const deplTkPago2 = provider.getSigner(isig++) // deploy y owner del token de pago2
  const iniciador = provider.getSigner(isig++)  // tipo que inicia la venta, por no poner el creador, podría ser dOwnTkEnVenta
  const dIniciador = await iniciador.getAddress()
  console.log('Iniciador', dIniciador)
  const comprador1 = provider.getSigner(isig++) // comprador, debe tener token de pago
  const dComprador1 =  await comprador1.getAddress()
  console.log('Comprador 1',dComprador1)
  const comprador2 = provider.getSigner(isig++) // comprador, debe tener token de pago
  const dComprador2 =  await comprador2.getAddress()
  console.log('Comprador 2',dComprador2)
  const pagaETH = provider.getSigner(isig++) // este comprará con ETH
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

  const tokenPago1 = await ethers.getContractFactory('ERC20Palero',deplTkPago1)
  console.log('=> deploy tokenPago 1')
  const cOwnTkPago1 = await tokenPago1.deploy('PAGO','PAGO')
  const dirTkPago1 = cOwnTkPago1.address
  console.log('Dir token Pago 1',dirTkPago1)
  const tokenPago2 = await ethers.getContractFactory('ERC20Palero',deplTkPago2)
  console.log('=> deploy tokenPago 2')
  const cOwnTkPago2 = await tokenPago2.deploy('PAGO','PAGO')
  const dirTkPago2 = cOwnTkPago2.address
  console.log('Dir token Pago 2',dirTkPago2)

  const precios = [0.1,10,8]
  const preciosBig = precios.map( (v) => bgn(v))
  const tkAdmitidos = [dirETH,dirTkPago1,dirTkPago2]

  // TkSeller visto por el iniciador
  const cIniciador = await ethers.getContractAt('TkSeller',dirTkSeller,iniciador)
  console.log('=> initSale')
  // cOwnTkEnVenta tiene el total de tokens a vender, autoriza al contrato a coger
  await espera(cOwnTkEnVenta.approve(dirTkSeller,bgn(hardcap)))
  // normalmente el iniciador será el propietario del token, pero no tiene por qué, por eso está separado
  await espera(cIniciador.initSale(
    dirTkEnVenta,dOwnTkEnVenta,
    bgn(hardcap),bgn(hardcap),bgn(hardcap/3),
    Math.round(Date.now()/1000)+24*3600,  // 1 día después
    preciosBig, tkAdmitidos,
    true,''))
  console.log('BAL en owner:', sbgn(await cOwnTkEnVenta.balanceOf(dOwnTkEnVenta)),
              'BAL en venta:', sbgn(await cOwnTkEnVenta.balanceOf(dirTkSeller)))

  // es curioso como devuelve los nombres de los campos, supongo que gracias al returns
  const datosVenta = await cOwnTkSeller.getSaleInfo(dirTkEnVenta)
  console.log('DATOS VENTA: '+datosVenta)
  console.log('CIERRE:',fec(datosVenta.endDate))
  /*
  esto está mal
      const cli1TkEnVenta = await ethers.getContractAt('ERC20Palero',dirTkEnVenta,pagaETH)
      await espera(pagaETH.sendTransaction({ to: dirTkSeller, value: bgn(10) , data: dirTkEnVenta })) mal ... solo envia ether
      console.log('Pagado con ether y recibido',await cli1TkEnVenta.balanceOf(pagaETH.address))
  */
  // TkSeller visto por el comprador1
  const cCompTkSeller1 = await ethers.getContractAt('TkSeller',dirTkSeller,comprador1)
  // el comprador debe tener tokens de PAGO, se los transfiere el owner
  espera(cOwnTkPago1.transfer(dComprador1,bgn(10000)))
  // token de pago visto por el comprador
  const cCompPago1 = await ethers.getContractAt('ERC20Palero',dirTkPago1,comprador1)
  console.log(await cOwnTkPago1.name(),
              ': BAL del comprador 1:', sbgn(await cCompPago1.balanceOf(dComprador1)))
  // TkSeller visto por el comprador2
  const cCompTkSeller2 = await ethers.getContractAt('TkSeller',dirTkSeller,comprador2)
  // el comprador debe tener tokens de PAGO, se los transfiere el owner
  espera(cOwnTkPago2.transfer(dComprador2,bgn(20000)))
  // token de pago visto por el comprador
  const cCompPago2 = await ethers.getContractAt('ERC20Palero',dirTkPago2,comprador2)
  console.log(await cOwnTkPago2.name(),
              ': BAL del comprador 2:', sbgn(await cCompPago2.balanceOf(dComprador2)))

  let buy=100
  console.log('=> Comprador 1 buy con token 1, compra ',buy)
  // autoriza que TkSeller le coja la pasta
  await espera(cCompPago1.approve(dirTkSeller,preciosBig[1].mul(buy)))
  console.log('ALLOW:', sbgn(await cCompPago1.allowance(dComprador1,dirTkSeller)))
  // llama al contrato
  await espera(cCompTkSeller1.buyTokensByToken(dirTkEnVenta,bgn(buy),dirTkPago1,''))

  // token en venta visto por el comprador
  const cCompTkEnVenta1 = await ethers.getContractAt('ERC20Palero',dirTkEnVenta,comprador1)
  console.log('Pagado con Token y recibido',await cCompTkEnVenta1.balanceOf(dComprador1))
  
  buy = 200
  console.log('=> Comprador 2 buy con token 2, compra',buy)
  // autoriza que TkSeller le coja la pasta
  await espera(cCompPago2.approve(dirTkSeller,preciosBig[2].mul(buy)))
  console.log('ALLOW:', sbgn(await cCompPago2.allowance(dComprador2,dirTkSeller)))
  // llama al contrato
  await espera(cCompTkSeller2.buyTokensByToken(dirTkEnVenta,bgn(buy),dirTkPago2,''))

  // token en venta visto por el comprador
  const cCompTkEnVenta2 = await ethers.getContractAt('ERC20Palero',dirTkEnVenta,comprador2)
  console.log('Pagado con Token y recibido',await cCompTkEnVenta2.balanceOf(dComprador2))
  
})()