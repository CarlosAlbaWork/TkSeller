import { ethers } from "hardhat"
import { BigNumber } from "hardhat"
import { signERC2612Permit } from "eth-permit"
(async () => {

  const hardcap= 30000

  const dirETH = "0x0000000000000000000000000000000000000000"

  const decimals=18
  function sbgn(tk: BigNumber) { return ethers.utils.formatUnits(tk,decimals); }
  function bgn (tk: number) { return ethers.utils.parseUnits(tk.toString(),decimals) }
  function fec(tms: number) { return new Date(tms*1000).toLocaleString() }

  async function espera (x:Promise<any>) {
    console.log(' Espera'+String.fromCharCode(27)+'[A\r')
    let h=(await x).hash
    await provider.waitForTransaction(h)
    return h
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
  const deplTkSeller = provider.getSigner(isig++) // deploy y system owner del contrato de compraventa
  console.log('Irelevante Super-amo de TkSeller',await deplTkSeller.getAddress())
  const deplTkEnVenta = provider.getSigner(isig++) // deploy y owner del token en venta, suministrará los TK
  const dirOwnTkEnVenta = await deplTkEnVenta.getAddress()
  console.log('Owner Token Venta',dirOwnTkEnVenta)
  const deplTkPago1 = provider.getSigner(isig++) // deploy y owner del token de pago1
  const deplTkPago2 = provider.getSigner(isig++) // deploy y owner del token de pago2
  const iniciador = provider.getSigner(isig++)  // tipo que inicia la venta, por no poner el creador, podría ser dirOwnTkEnVenta
  const dIniciador = await iniciador.getAddress()
  console.log('Iniciador', dIniciador)
  const comprador1 = provider.getSigner(isig++) // comprador, debe tener token de pago
  const dirComprador1 =  await comprador1.getAddress()
  console.log('Comprador 1',dirComprador1)
  const comprador2 = provider.getSigner(isig++) // comprador, debe tener token de pago
  const dirComprador2 =  await comprador2.getAddress()
  console.log('Comprador 2',dirComprador2)
  const comprador3 = provider.getSigner(isig++) // este comprará con ETH
  const dirComprador3 = await comprador3.getAddress()
  console.log('Comprador con ETH',dirComprador3)

  const tkSellerFact = await ethers.getContractFactory('TkSeller',deplTkSeller)
  console.log('=> deploy TkSeller')
  const cOwnTkSeller = await tkSellerFact.deploy() // contrato visto por el owner
  const dirTkSeller = cOwnTkSeller.address; // dirección del contrato de compraventa
  console.log('Dirección del Smart Contract TkSeller',dirTkSeller)

  const tokenEnVenta = await ethers.getContractFactory('ERC20Palero',deplTkEnVenta)
  console.log('=> deploy tokenEnVenta')
  const cOwnTkEnVenta = await tokenEnVenta.deploy('ENVENTA','ENVENTA')
  const dirTkEnVenta = cOwnTkEnVenta.address
  console.log('Dir token Venta',dirTkEnVenta)
  // TkSeller necesita monedas, le doy permiso
  await espera(cOwnTkEnVenta.approve(dirTkSeller, bgn(hardcap)))
  // estas tres funciones las podría llamar cualquiera
  console.log(await cOwnTkEnVenta.name()+
              ': BAL:', sbgn(await cOwnTkEnVenta.balanceOf(dirOwnTkEnVenta)),
              'ALLOW:', sbgn(await cOwnTkEnVenta.allowance(dirOwnTkEnVenta,dirTkSeller)))

  const tokenPago1 = await ethers.getContractFactory('ERC20Palero',deplTkPago1)
  console.log('=> deploy tokenPago 1')
  const cOwnTkPago1 = await tokenPago1.deploy('PAGO1','PG1')
  const dirTkPago1 = cOwnTkPago1.address
  console.log('Dir token Pago 1',await cOwnTkPago1.name(),dirTkPago1)
  const tokenPago2 = await ethers.getContractFactory('ERC20Palero',deplTkPago2)
  console.log('=> deploy tokenPago 2')
  const cOwnTkPago2 = await tokenPago2.deploy('PAGO2','PG2')
  const dirTkPago2 = cOwnTkPago2.address
  console.log('Dir token Pago 2',await cOwnTkPago2.name(),dirTkPago2)

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
    dirTkEnVenta,dirOwnTkEnVenta,
    bgn(hardcap),bgn(hardcap/2+1),
    Math.round(Date.now()/1000)+24*3600,  // 1 día después
    preciosBig, tkAdmitidos,
    true,[]))
  console.log('BAL en owner:', sbgn(await cOwnTkEnVenta.balanceOf(dirOwnTkEnVenta)),
              'BAL en venta:', sbgn(await cOwnTkEnVenta.balanceOf(dirTkSeller)))

  // es curioso como devuelve los nombres de los campos, supongo que gracias al returns
  const datosVenta = await cOwnTkSeller.getSaleInfo(dirTkEnVenta)
  console.log('DATOS VENTA: '+datosVenta)
  console.log('CIERRE:',fec(datosVenta.endDate))

  // TkSeller visto por el comprador con ETH
  const cCompETHTkSeller = await ethers.getContractAt('TkSeller',dirTkSeller,comprador3)
  // TkSeller visto por el comprador1
  const cComp1TkSeller = await ethers.getContractAt('TkSeller',dirTkSeller,comprador1)
  // el comprador debe tener tokens de PAGO, se los transfiere el owner
  await espera(cOwnTkPago1.transfer(dirComprador1,bgn(10000)))
  // token de pago visto por el comprador
  const cCompPago1 = await ethers.getContractAt('ERC20Palero',dirTkPago1,comprador1)
  console.log(await cOwnTkPago1.name(),
              ': BAL del comprador 1:', sbgn(await cCompPago1.balanceOf(dirComprador1)))
  // TkSeller visto por el comprador2
  const cComp2TkSeller = await ethers.getContractAt('TkSeller',dirTkSeller,comprador2)
  // el comprador debe tener tokens de PAGO, se los transfiere el owner
  await espera(cOwnTkPago2.transfer(dirComprador2,bgn(20000)))
  // token de pago visto por el comprador
  const cCompPago2 = await ethers.getContractAt('ERC20Palero',dirTkPago2,comprador2)
  console.log(await cOwnTkPago2.name(),
              ': BAL del comprador 2:', sbgn(await cCompPago2.balanceOf(dirComprador2)))

  try {
    const buy = 300 ; const pagoBuy = preciosBig[0].mul(buy)
    console.log('=> Comprador 3 buy con ETH compra',buy,'paga',sbgn(pagoBuy))
    // token en venta visto por el comprador 3
    const cComp3TkEnVenta = await ethers.getContractAt('ERC20Palero',dirTkEnVenta,comprador3)
    await espera(cCompETHTkSeller.buyTokensByETH(dirTkEnVenta,{ value: pagoBuy }))
    const recibo = sbgn(await cComp3TkEnVenta.balanceOf(dirComprador3))
    console.log('SaleInfo: '+await cOwnTkSeller.getSaleInfo(dirTkEnVenta))
    console.log('Pagado con ETH y recibido',recibo,'vs',buy)
    if (parseFloat(recibo) != buy)
      console.log('***** Discrepancia')
  } catch(e:any) {
    console.log('***** La compra con ETH ha fallado',e)
  }

  try {
    const buy = 100 ; const pagoBuy = preciosBig[1].mul(buy)
    console.log('=> Comprador 1 buy con token',await cCompPago1.name(),'compra',buy,'paga',sbgn(pagoBuy))
    // token en venta visto por el comprador
    const cComp1TkEnVenta = await ethers.getContractAt('ERC20Palero',dirTkEnVenta,comprador1)
    // autoriza que TkSeller le coja la pasta
    await espera(cCompPago1.approve(dirTkSeller,pagoBuy))
    console.log('ALLOW:', sbgn(await cCompPago1.allowance(dirComprador1,dirTkSeller)))
    // llama al contrato
    await espera(cComp1TkSeller.buyTokensByToken(dirTkEnVenta,bgn(buy),dirTkPago1,[]))
    const recibo = sbgn(await cComp1TkEnVenta.balanceOf(dirComprador1))
    console.log('SaleInfo: '+await cOwnTkSeller.getSaleInfo(dirTkEnVenta))
    console.log('Pagado con Token y recibido',recibo,'vs',buy)
    if (parseFloat(recibo) != buy)
    console.log('***** Discrepancia')
  } catch(e:any) {
    console.log('***** La compra con ',await cCompPago1.name(),' ha fallado',e)
  }

  try {
    const buy = 200 ; const pagoBuy = preciosBig[2].mul(buy)
    console.log('=> Comprador 2 buy con token',await cCompPago2.name(),'compra',buy,'paga',sbgn(pagoBuy))
    // token en venta visto por el comprador
    const cComp2TkEnVenta = await ethers.getContractAt('ERC20Palero',dirTkEnVenta,comprador2)
    // autoriza que TkSeller le coja la pasta
    await espera(cCompPago2.approve(dirTkSeller,preciosBig[2].mul(buy)))
    console.log('ALLOW:', sbgn(await cCompPago2.allowance(dirComprador2,dirTkSeller)))
    // llama al contrato
    await espera(cComp2TkSeller.buyTokensByToken(dirTkEnVenta,bgn(buy),dirTkPago2,[]))
    const recibo = sbgn(await cComp2TkEnVenta.balanceOf(dirComprador2))
    console.log('SaleInfo: '+await cOwnTkSeller.getSaleInfo(dirTkEnVenta))
    console.log('Pagado con Token y recibido',recibo,'vs',buy)
    if (parseFloat(recibo) != buy)
      console.log('***** Discrepancia')
  } catch(e:any) {
    console.log('***** La compra con ',await cCompPago1.name(),' ha fallado',e)
  }

  try {
    console.log('================ ESTO ES UNA PRUEBA DE PERMIT, NO UNA COMPRA =============')
    const buy = 150; const pagoBuy = preciosBig[2].mul(buy)
    console.log('SIMULA => Comprador 2 buy con token',await cCompPago2.name(),'con permit, compra',buy,'paga',sbgn(pagoBuy))
  // esta será la buena const allowPerm = await signERC2612Permit(comprador2, dirTkPago2, dirComprador2, dirTkSeller, pagoBuy.toString());
    const allowPerm = await signERC2612Permit(comprador2, dirTkPago2, dirComprador2, await deplTkPago2.getAddress(), pagoBuy.toString());
    console.log('Permit pars',allowPerm)
    console.log('ESTO NO HAY QUE HACERLO, lo hará el contrato, de momento el spender que he puesto');
    await espera(cOwnTkPago2.permit(allowPerm.owner,allowPerm.spender,allowPerm.value,allowPerm.deadline,allowPerm.v,allowPerm.r,allowPerm.s))
    console.log('Allowance producida',sbgn(await cOwnTkPago2.allowance(allowPerm.owner,allowPerm.spender)))
    console.log('transfiero',sbgn(allowPerm.value))
    console.log('TX transferFrom',await espera(cOwnTkPago2.transferFrom(allowPerm.owner,dirTkSeller,allowPerm.value)))
    console.log('Saldo en TkSeller',sbgn(await cOwnTkPago2.balanceOf(dirTkSeller)),'vs',sbgn(pagoBuy))
  } catch(e:any) {
    console.log(e.message)
  }
})()
