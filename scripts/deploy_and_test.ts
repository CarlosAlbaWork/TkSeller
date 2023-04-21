import { ethers } from "hardhat"
import { signERC2612Permit } from "eth-permit"
import { constants , BigNumber } from "ethers"
import { time } from "@nomicfoundation/hardhat-network-helpers"
import { ERC20PaleroOwn, ITkSeller, TkSeller } from "../typechain-types"
import * as fs from "fs"

(async () => {

  let hardcap= 30000

  const dirZero = constants.AddressZero
  const b32 = '0x'.padEnd(66,'1')

  const decimals=18
  function sbgn(tk: BigNumber) { return ethers.utils.formatUnits(tk,decimals); }
  function bgn (tk: number) { return ethers.utils.parseUnits(tk.toString(),decimals) }
  function fec(tms: number) { return new Date(tms*1000).toLocaleString() }

  const esc=String.fromCharCode(27)
  function rojo(s: string) {
    if (process.env.claro)
      return s
    else {
      if (process.env.exit == '1')
        setTimeout(() => {
          process.exit(1)
        }, 0);
      return `${esc}[37;41m${s}${esc}[0m`
    }
  }
  async function espera (x:Promise<any>) {
    if (!process.env.claro)
      console.log(` Espera${esc}[A\r`)
    let t=(await x)
    let r=await provider.waitForTransaction(t.hash)
    if (!process.env.claro)
      console.log(`${esc}[K${esc}[A`)
    return [t,r]
  }
  function paciencia(fechaUnix: number) {
    return new Promise(res =>  {
      let iin = setInterval( () => {
        let queda = fechaUnix*1000 - Date.now()
        if (queda <= 0) {
          clearInterval(iin)
          if (!process.env.claro)
            console.log(`${esc}[K${esc}[A`)
          res('OK')
        } else
          if (process.env.claro)
            console.log('Esperando')
          else
            console.log(` Esperando ${queda} ${esc}[A`)
      },process.env.claro ? 3000 : 300)
    })
  }
  function procErr(subs: string | Array<string>, e:any, nor = 'NORMAL') {
    let mens = e.reason ? e.reason :e.message
    let inc = false
    if (typeof subs == 'string')
      inc=mens.includes(subs)
    else {
      for (let e of subs)
        if (mens.includes(e))
          inc=true
      subs=subs.join()
    }
    if (inc)
      console.log((subs.length ? nor : rojo(nor))+':',mens)
    else if (mens.includes('reverted without a reason string'))
      console.log(e)
    else
      console.log(rojo(`No "${subs}" en "${mens}"`))
  }
  function nodebio(m = '') {
    console.log(rojo('No debió pasar'),m);
  }
  async function sysHora() {
    return (await provider.getBlock(await provider.getBlockNumber())).timestamp+1
  }
  async function saleInfo(dir:string) {
    const si = (await cOwnTkSeller.getSaleInfo(dir));
    console.log('SaleInfo: left ',sbgn(si.amountleft),'finished',si.finished)
  }

  const provider = ethers.provider;

  const lstacc = await provider.listAccounts();

  if (lstacc.length < 9) {
    console.log("Se requieren 9 cuentas");
    return;
  }
  let saldosIni:any = {}
  let err = false
  for (let ac of lstacc) {
    let bal = await provider.getBalance(ac)
    if (bal.eq("0"))  { // redes reales
      console.log('ERR: ',ac,'no tiene ETH')
      err = true
    }
    saldosIni[ac]=bal;
  }
  if (err)
    throw new Error("Mete saldo")
  
  let esHardhat = ((await provider.getNetwork()).chainId == 31337) 

  let isig=0
  let cuentas:any={}
  const deplTkSeller = provider.getSigner(isig++) // deploy y system owner del contrato de compraventa
  const dirDepTkSeller = await deplTkSeller.getAddress()
  cuentas[dirDepTkSeller]='Deployer'
  console.log('Irelevante Super-amo de TkSeller',dirDepTkSeller)
  const deplTkEnVenta = provider.getSigner(isig++) // deploy y owner del token en venta, suministrará los TK
  const dirOwnTkEnVenta = await deplTkEnVenta.getAddress()
  cuentas[dirOwnTkEnVenta]='Owner ENVENTA'
  console.log('Owner Token Venta',dirOwnTkEnVenta)
  const deplTkPago1 = provider.getSigner(isig++) // deploy y owner del token de pago1
  cuentas[await deplTkPago1.getAddress()]='Owner PAGO1'
  const deplTkPago2 = provider.getSigner(isig++) // deploy y owner del token de pago2
  cuentas[await deplTkPago2.getAddress()]='Owner PAGO2'
  const iniciador = provider.getSigner(isig++)  // tipo que inicia la venta, por no poner el creador, podría ser dirOwnTkEnVenta
  const dIniciador = await iniciador.getAddress()
  cuentas[dIniciador]='Iniciador'
  console.log('Iniciador', dIniciador)
  const comprador1 = provider.getSigner(isig++) // comprador, debe tener token de pago
  const dirComprador1 =  await comprador1.getAddress()
  cuentas[dirComprador1]='Comprador 1'
  console.log('Comprador 1',dirComprador1)
  const comprador2 = provider.getSigner(isig++) // comprador, debe tener token de pago
  const dirComprador2 =  await comprador2.getAddress()
  cuentas[dirComprador2]='Comprador 2'
  console.log('Comprador 2',dirComprador2)
  const comprador3 = provider.getSigner(isig++) // este comprará con ETH
  const dirComprador3 = await comprador3.getAddress()
  cuentas[dirComprador3]='Comprador 3'
  console.log('Comprador con ETH',dirComprador3)

  const tkSellerFact = await ethers.getContractFactory('TkSeller',deplTkSeller)
  const tokenEnVenta = await ethers.getContractFactory('ERC20PaleroOwn',deplTkEnVenta)
  const tokenPago1 = await ethers.getContractFactory('ERC20PaleroOwn',deplTkPago1)
  const tokenPago2 = await ethers.getContractFactory('ERC20PaleroOwn',deplTkPago2)
  console.log('Tamaño:',tkSellerFact.bytecode.length/2-1)

  let cOwnTkSeller: TkSeller, dirTkSeller: string,
      cOwnTkEnVenta: ERC20PaleroOwn, dirTkEnVenta: string,
      cOwnTkPago1: ERC20PaleroOwn, dirTkPago1: string,
      cOwnTkPago2: ERC20PaleroOwn, dirTkPago2: string
  let anterDeploy, okAnt = false, tokens: any = {}
  try {
    if (process.env.reusar != "1")
      throw new Error("No reutilizo previo")
    anterDeploy=JSON.parse(fs.readFileSync('anterDeploy.json','ascii'))
    if (anterDeploy.bytecodeLen != tkSellerFact.bytecode.length)
      throw new Error("TkSeller cambiado")
    dirTkSeller = anterDeploy.dirTkSeller
    console.log('=> Try anterior',dirTkSeller)
    cOwnTkSeller = await ethers.getContractAt('TkSeller',dirTkSeller,deplTkSeller)
    await cOwnTkSeller.getSaleInfo(dirTkSeller) // dummy para saber que está vivo
    dirTkPago1 = anterDeploy.dirTkPago1
    cOwnTkPago1 = await ethers.getContractAt('ERC20PaleroOwn',dirTkPago1,deplTkPago1)
    dirTkPago2 = anterDeploy.dirTkPago2
    cOwnTkPago2 = await ethers.getContractAt('ERC20PaleroOwn',dirTkPago2,deplTkPago2)
    console.log('==> Uso anterior');
    okAnt=true
  } catch(e:any) {
    console.log('=> deploy TkSeller')
    cOwnTkSeller = await tkSellerFact.deploy() // contrato visto por el deployer
    dirTkSeller = cOwnTkSeller.address; // dirección del contrato de compraventa
    console.log('Dirección del Smart Contract TkSeller',dirTkSeller)

    console.log('=> deploy tokenPago 1')
    cOwnTkPago1 = await tokenPago1.deploy('PAGO1','PG1')
    dirTkPago1 = cOwnTkPago1.address
    console.log('Dir token Pago 1',await cOwnTkPago1.name(),dirTkPago1)

    console.log('=> deploy tokenPago 2')
    cOwnTkPago2 = await tokenPago2.deploy('PAGO2','PG2')
    dirTkPago2 = cOwnTkPago2.address
    console.log('Dir token Pago 2',await cOwnTkPago2.name(),dirTkPago2)
    fs.writeFileSync('anterDeploy.json',JSON.stringify(
      { bytecodeLen: tkSellerFact.bytecode.length,
        dirTkSeller: dirTkSeller,
        dirTkPago1: dirTkPago1,
        dirTkPago2: dirTkPago2
      }
    ))
  }
  console.log('=> deploy tokenEnVenta')
  cOwnTkEnVenta = await tokenEnVenta.deploy('ENVENTA','ENVENTA')
  dirTkEnVenta = cOwnTkEnVenta.address
  tokens[dirTkEnVenta] = 'ENVENTA'
  console.log('Dir token Venta',dirTkEnVenta)
        
  tokens[dirTkEnVenta] = 'ENVENTA'
  tokens[dirTkPago1] = 'PAGO1'
  tokens[dirTkPago2] = 'PAGO2'

  const tokensE = {...tokens}
  tokensE[dirZero]='ETH'

  let precios = [0.01,10,8]
  let preciosBig = precios.map( (v) => bgn(v))
  const tkAdmitidos = [dirZero,dirTkPago1,dirTkPago2]

  // TkSeller visto por el iniciador
  const cIniciador = await ethers.getContractAt('TkSeller',dirTkSeller,iniciador)

  // TkSeller visto por el comprador con ETH
  const cCompETHTkSeller = await ethers.getContractAt('TkSeller',dirTkSeller,comprador3)
  // TkSeller visto por el comprador1
  const cComp1TkSeller = await ethers.getContractAt('TkSeller',dirTkSeller,comprador1)
  // TkSeller visto por el comprador2
  const cComp2TkSeller = await ethers.getContractAt('TkSeller',dirTkSeller,comprador2)
  // el comprador debe tener tokens de PAGO, se los transfiere el owner
  await espera(cOwnTkPago1.transfer(dirComprador1,bgn(10000)))
  await espera(cOwnTkPago2.transfer(dirComprador1,bgn(20000)))
  await espera(cOwnTkPago1.transfer(dirComprador2,bgn(30000)))
  await espera(cOwnTkPago2.transfer(dirComprador2,bgn(40000)))
  // token de pago 1 visto por el comprador 1
  const cComp1Pago1 = await ethers.getContractAt('ERC20PaleroOwn',dirTkPago1,comprador1)
  console.log(await cOwnTkPago1.name(),
              ': BAL del comprador 1:', sbgn(await cComp1Pago1.balanceOf(dirComprador1)))
  // token de pago 2 visto por el comprador 1
  const cComp1Pago2 = await ethers.getContractAt('ERC20PaleroOwn',dirTkPago2,comprador1)
  console.log(await cOwnTkPago1.name(),
              ': BAL del comprador 1:', sbgn(await cComp1Pago2.balanceOf(dirComprador1)))
  // token de pago 2 visto por el comprador 2
  const cComp2Pago1 = await ethers.getContractAt('ERC20PaleroOwn',dirTkPago1,comprador2)
  console.log(await cOwnTkPago2.name(),
              ': BAL del comprador 2:', sbgn(await cComp2Pago1.balanceOf(dirComprador2)))
  // token de pago 2 visto por el comprador 2
  const cComp2Pago2 = await ethers.getContractAt('ERC20PaleroOwn',dirTkPago2,comprador2)
  console.log(await cOwnTkPago2.name(),
              ': BAL del comprador 2:', sbgn(await cComp2Pago2.balanceOf(dirComprador2)))

  // token en venta visto por los compradores
  const cComp1TkEnVenta = await ethers.getContractAt('ERC20PaleroOwn',dirTkEnVenta,comprador1)
  const cComp2TkEnVenta = await ethers.getContractAt('ERC20PaleroOwn',dirTkEnVenta,comprador2)
  const cComp3TkEnVenta = await ethers.getContractAt('ERC20PaleroOwn',dirTkEnVenta,comprador3)

  const saldoIniSupplier=await cOwnTkEnVenta.balanceOf(dirOwnTkEnVenta)
  console.log('\n=> initSale')
  // cOwnTkEnVenta tiene el total de tokens a vender, autoriza al contrato a coger
  await espera(cOwnTkEnVenta.approve(dirTkSeller,bgn(hardcap)))
  console.log(await cOwnTkEnVenta.name()+
              ': BAL:', sbgn(saldoIniSupplier),
              'ALLOW:', sbgn(await cOwnTkEnVenta.allowance(dirOwnTkEnVenta,dirTkSeller)))

  // normalmente el iniciador será el propietario del token, pero no tiene por qué, por eso está separado
  let cierre = Math.floor(Date.now()/1000)+(esHardhat ? 10000 : 20)
  await espera(cIniciador.initSale(
    dirTkEnVenta,dirOwnTkEnVenta,
    bgn(hardcap),bgn(hardcap/2+1),
    cierre,
    preciosBig, tkAdmitidos,
    true,[]))
  console.log('BAL en owner:', sbgn(await cOwnTkEnVenta.balanceOf(dirOwnTkEnVenta)),
              'BAL en venta:', sbgn(await cOwnTkEnVenta.balanceOf(dirTkSeller)))
  // es curioso como devuelve los nombres de los campos, supongo que gracias al returns
  const datosVenta = await cOwnTkSeller.getSaleInfo(dirTkEnVenta)
  console.log('DATOS VENTA: '+datosVenta)
  console.log('CIERRE:',fec(datosVenta.endDate.toNumber()))

  hardcap= 40000
  cierre = Math.floor(Date.now()/1000)+(esHardhat ? 10000 : 20) + 1000

  precios = [1,10,15]
  preciosBig = precios.map( (v) => bgn(v))

  console.log('TEST SETSALE')
  
  try {
    await espera(cIniciador.setSale(
      dirTkEnVenta, 
      bgn(hardcap),
      bgn(hardcap/2+1),
      cierre,
      preciosBig, 
      tkAdmitidos))
      console.log('Realizado correctamente')
  } catch (error) {
    procErr('',error,'setsale ha fallado')
  }

  try {
    console.log(await cIniciador.getSaleInfo(dirTkEnVenta))
  } catch (error) {
    procErr('',error,'getSaleInfo ha fallado')
  }


  hardcap= 30000
  cierre = Math.floor(Date.now()/1000)+(esHardhat ? 10000 : 20)


  precios = [0.01,10,8]
  preciosBig = precios.map( (v) => bgn(v))

  try {
    await espera(cIniciador.setSale(
      dirTkEnVenta, 
      bgn(hardcap),
      bgn(hardcap/2+1),
      cierre,
      preciosBig, 
      tkAdmitidos))
      console.log('Realizado correctamente')
  } catch (error) {
    procErr('',error,'setsale ha fallado')
  }

  try {
    console.log(await cIniciador.getSaleInfo(dirTkEnVenta))
  } catch (error) {
    procErr('',error,'getSaleInfo ha fallado')
  }
  

  let gasByETH = BigNumber.from("0")
  try {
    const buy = 300 ; const pagoBuy = preciosBig[0].mul(buy)
    console.log('=> Comprador 3 buy con ETH compra',buy,'paga',sbgn(pagoBuy))
    const saldoETH = await provider.getBalance(dirComprador3);
    await espera(cCompETHTkSeller.buyTokensByETH(dirTkEnVenta,{ value: pagoBuy }))
    const diff = saldoETH.sub(await provider.getBalance(dirComprador3))
    gasByETH=diff.sub(pagoBuy)
    console.log('Gasto de ETH',sbgn(diff),'gas',sbgn(gasByETH))
    const recibo = sbgn(await cComp3TkEnVenta.balanceOf(dirComprador3))
    await saleInfo(dirTkEnVenta)
    console.log('Pagado con ETH y recibido',recibo,'vs',buy)
    if (parseFloat(recibo) != buy)
      console.log(rojo('Discrepancia'))
  } catch(e:any) {
    procErr('',e,'La compra con ETH ha fallado')
  }

  try {
    const buy = 100 ; const pagoBuy = preciosBig[1].mul(buy)
    console.log('=> Comprador 1 buy con token',await cComp1Pago1.name(),'compra',buy,'paga',sbgn(pagoBuy))
    const saldoPgAntes= await cOwnTkPago1.balanceOf(dirComprador1)
    const saldoTkAntes= await cOwnTkEnVenta.balanceOf(dirComprador1)
    // autoriza que TkSeller le coja la pasta
    await espera(cComp1Pago1.approve(dirTkSeller,pagoBuy))
    console.log('ALLOW:', sbgn(await cComp1Pago1.allowance(dirComprador1,dirTkSeller)))
    // llama al contrato
    await espera(cComp1TkSeller.buyTokensByToken(dirTkEnVenta,bgn(buy),dirTkPago1,[]))
    const recibo = sbgn((await cComp1TkEnVenta.balanceOf(dirComprador1)).sub(saldoTkAntes))
    await saleInfo(dirTkEnVenta)
    console.log('Pagado con Token y recibido',recibo,'vs',buy)
    if (parseFloat(recibo) != buy)
      console.log(rojo('Discrepancia'))
    const cobrado= saldoPgAntes.sub(await cOwnTkPago1.balanceOf(dirComprador1))
    if (!cobrado.eq(pagoBuy))
      console.log(rojo('Pago incorrecto'),', cobrado',sbgn(cobrado),'debió ser',sbgn(pagoBuy))
  } catch(e:any) {
    procErr('',e,'La compra con '+(await cComp1Pago1.name())+' ha fallado')
  }

  try {
    const buy = 200 ; const pagoBuy = preciosBig[2].mul(buy)
    console.log('=> Comprador 2 buy con token',await cComp2Pago2.name(),'compra',buy,'paga',sbgn(pagoBuy))
    const saldoPgAntes= await cOwnTkPago2.balanceOf(dirComprador2)
    const saldoTkAntes= await cOwnTkEnVenta.balanceOf(dirComprador2)
    // autoriza que TkSeller le coja la pasta
    await espera(cComp2Pago2.approve(dirTkSeller,preciosBig[2].mul(buy)))
    console.log('ALLOW:', sbgn(await cComp2Pago2.allowance(dirComprador2,dirTkSeller)))
    // llama al contrato
    await espera(cComp2TkSeller.buyTokensByToken(dirTkEnVenta,bgn(buy),dirTkPago2,[]))
    const recibo = sbgn((await cComp2TkEnVenta.balanceOf(dirComprador2)).sub(saldoTkAntes))
    await saleInfo(dirTkEnVenta)
    console.log('Pagado con Token y recibido',recibo,'vs',buy)
    if (parseFloat(recibo) != buy)
      console.log(rojo('Discrepancia'))
    const cobrado= saldoPgAntes.sub(await cOwnTkPago2.balanceOf(dirComprador2))
    if (!cobrado.eq(pagoBuy))
      console.log(rojo('Pago incorrecto'),', cobrado',sbgn(cobrado),'debió ser',sbgn(pagoBuy))
  } catch(e:any) {
    procErr('',e,'La compra con '+(await cComp2Pago2.name())+' ha fallado')
  }

  /**

  try {
    console.log('================ ESTO ES UNA PRUEBA DE PERMIT, NO UNA COMPRA =============')
    const buy = 150; const pagoBuy = preciosBig[2].mul(buy)
    console.log('SIMULA => Comprador 2 buy con token',await cComp2Pago2.name(),'con permit, compra',buy,'paga',sbgn(pagoBuy))
  // esta será la buena const allowPerm = await signERC2612Permit(comprador2, dirTkPago2, dirComprador2, dirTkSeller, pagoBuy.toString());
    const allowPerm = await signERC2612Permit(comprador2, dirTkPago2, dirComprador2, await deplTkPago2.getAddress(), pagoBuy.toString());
    console.log('Permit pars',allowPerm)
    console.log('ESTO NO HAY QUE HACERLO, lo hará el contrato, de momento el spender que he puesto');
    await espera(cOwnTkPago2.permit(allowPerm.owner,allowPerm.spender,allowPerm.value,allowPerm.deadline,allowPerm.v,allowPerm.r,allowPerm.s))
    console.log('Allowance producida',sbgn(await cOwnTkPago2.allowance(allowPerm.owner,allowPerm.spender)))
    console.log('transfiero',sbgn(BigNumber.from(allowPerm.value)))
    console.log('TX transferFrom',(await espera(cOwnTkPago2.transferFrom(allowPerm.owner,dirTkSeller,allowPerm.value)))[0].hash)
    console.log('Saldo en TkSeller',sbgn(await cOwnTkPago2.balanceOf(dirTkSeller)),'vs',sbgn(pagoBuy))
  } catch(e:any) {
    procErr('',e,'')
  }
  */

  console.log("---- Compra falida por exceso")
  try {
    const buy = 90000 ; const pagoBuy = preciosBig[0].mul(buy)
    console.log('=> Comprador 3 buy con ETH compra',buy,'paga',sbgn(pagoBuy))
    const saldoETH = await provider.getBalance(dirComprador3);
    await espera(cCompETHTkSeller.buyTokensByETH(dirTkEnVenta,{ value: pagoBuy }))
    console.log(rojo('No debió dejar!!!'))
  } catch(e:any) {
    procErr('fill',e)
  }


  for (let op = 0; op <20; op++) // se repite 20 veces el retorno de 1 token de la 1ª compra
    try {
      saleInfo(dirTkEnVenta);
      console.log('=> Devuelvo 1-1, deben disminuir en 1 tokens, recuperar lo pagado e incrementar amountleft')
      console.log('Saldo PAGO 1',sbgn(await cComp1Pago1.balanceOf(dirComprador1)),'ENVENTA',sbgn(await cComp1TkEnVenta.balanceOf(dirComprador1)))
      await espera(cComp1TkEnVenta.increaseAllowance(dirTkSeller,bgn(1)))
      console.log('=> Devuelvo')
      await espera(cComp1TkSeller.returnTokens(dirTkEnVenta,bgn(1),1,[]))
      console.log('Saldo PAGO 1',sbgn(await cComp1Pago1.balanceOf(dirComprador1)),'ENVENTA',sbgn(await cComp1TkEnVenta.balanceOf(dirComprador1)))
      saleInfo(dirTkEnVenta)
    } catch(e:any) {
      procErr('',e,'No debió fallar si no has tocado compras')
    }
  

  if (process.env.soft == "1") {
    // provoco softcap cumplido
    await saleInfo(dirTkEnVenta)
    try {
      const buy = 16000 ; const pagoBuy = preciosBig[0].mul(buy)
      console.log('=> Comprador 3 buy con ETH compra',buy,'paga',sbgn(pagoBuy))
      // token en venta visto por el comprador 3
      await espera(cCompETHTkSeller.buyTokensByETH(dirTkEnVenta,{ value: pagoBuy }))
    } catch(e:any) {
      procErr('',e,'Cosa')
    }
    await saleInfo(dirTkEnVenta)
  }

  if (process.env.close == "1")
    await espera(cIniciador.closeSale(dirTkEnVenta))
  else {
    console.log('Espero al cierre')
    if (esHardhat) {
      try {
        await time.increaseTo(2*cierre)
        await espera(cIniciador.closeSale(dirTkEnVenta))
      } catch (e:any) { }
    } else
      await paciencia(cierre)
  }

  let saldoETH = await provider.getBalance(dirComprador3);
  try {
    const buy = 300 ; const pagoBuy = preciosBig[0].mul(buy)
    console.log('=> Comprador 3 buy con ETH compra',buy,'paga',sbgn(pagoBuy))
    // token en venta visto por el comprador 3
    await espera(cCompETHTkSeller.buyTokensByETH(dirTkEnVenta,{ value: pagoBuy }))
    const diffSaldo=saldoETH.sub(gasByETH).sub(await provider.getBalance(dirComprador3))
    console.log(rojo('Pérdida de ETH y no tienes tokens'),sbgn(diffSaldo))
  } catch(e:any) {
    procErr('not open',e)
    const diffSaldo=saldoETH.sub(await provider.getBalance(dirComprador3))
    if (diffSaldo.gt(gasByETH))
      console.log(rojo('Cambio en saldo'+sbgn(diffSaldo)))
    else
      console.log('Saldo OK')
  }

  let compradores: any = [comprador1, comprador2, comprador3]
  for (let comprador of compradores) {
    console.log(cuentas[await comprador.getAddress()])
    let seller = await ethers.getContractAt('TkSeller',dirTkSeller,comprador)
    for (let ctk of Object.keys(tokens)) {
      let x = await ethers.getContractAt('ERC20PaleroOwn',ctk,comprador)
      x.increaseAllowance(dirTkSeller,await(x.balanceOf(await comprador.getAddress())))
    }
    try {
      await espera(seller.returnTokens(dirTkEnVenta,0,0,[]))
    } catch(e:any) { 
      if (process.env.close == "1")
        procErr('Sale not open',e)
      else
        console.log(rojo(e.message))
    }
  }

  for (let tk of [cOwnTkEnVenta, cOwnTkPago1, cOwnTkPago2]) {
    let saldoFinTkseller = await tk.balanceOf(dirTkSeller);
    let nomTok = await tk.name();
    if (saldoFinTkseller.eq('0'))
      console.log('Tkseller vacío de',nomTok)
    else
      console.log(rojo('Saldo '+nomTok+' del Seller'),sbgn(saldoFinTkseller))
  }
  let saldoETHFinSeller = await provider.getBalance(dirTkSeller);
  if (saldoETHFinSeller.eq('0'))
    console.log('Tkseller vacío de ETH')
  else
    console.log(rojo('Saldo ETH del Seller'),sbgn(saldoETHFinSeller))

  const unadir=Object.keys(cuentas)[0]
  for (let di in cuentas) {
    let comprador = provider.getSigner(di)
    let dif = Math.round(parseFloat(sbgn((await comprador.getBalance()).sub(saldosIni[di]))))
    let saldos=dif.toString().padStart(6)+' cambio ETH'
    // el ether no puedo devolverlo fácilmente, no tiene owner 
    if (dif > 0)
      espera(comprador.sendTransaction({ to: unadir, value: bgn(dif) }))
    else if (dif < 0)
      await provider.getSigner(unadir).sendTransaction({ to: di, value: bgn(-dif) })
    for (let ctk of Object.keys(tokens)) {
      let x = await ethers.getContractAt('ERC20PaleroOwn',ctk,comprador)
      saldos+=sbgn(await x.balanceOf(di)).padStart(9)+' '+(await x.name())
      await x.transfer((await x.owner()),x.balanceOf(di)) // retorna al propietario
    }
    console.log(cuentas[di].padStart(13),'saldos'+saldos)
  }

  for (let di in cuentas) {
    let saldo=await provider.getBalance(di)
    if (Math.round(parseFloat(sbgn(saldo.sub(saldosIni[di])))) != 0)
      console.log('Saldo ETH raro',cuentas[di],sbgn(saldo))
  }

  console.log(await cComp2TkSeller.myPurchases(dirTkEnVenta))

  console.log('Fin')

})()
