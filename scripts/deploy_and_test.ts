import { ethers } from "hardhat"

(async () => {

    const decimals=18
    function sbgn(tk: BigInt) { return ethers.utils.formatUnits(tk,decimals); }
    function bgn (tk: number) { return ethers.utils.parseUnits(tk.toString(),decimals) }
    function fec(tms: number) { return new Date(tms*1000).toLocaleString() }

    async function esperah(hash: string) {
      await provider.waitForTransaction(hash)
    }
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

    const sgnIniciador = provider.getSigner(0)
    const tkSellerFact = await ethers.getContractFactory('TkSeller',sgnIniciador)
    console.log('=> deploy TkSeller')
    const ownTkSeller = await tkSellerFact.deploy() // contrato visto por el owner
    const dirTkSeller = ownTkSeller.address;
    await esperah(ownTkSeller.deployTransaction.hash)

    const sgnTkEnVenta = provider.getSigner(1)
    const tokenEnVenta = await ethers.getContractFactory('ERC20Palero',sgnTkEnVenta)
    console.log('=> deploy tokenEnVenta')
    const ownTkEnVenta = await tokenEnVenta.deploy(['ENVENTA','ENVENTA'])
    const dirTkEnVenta = ownTkEnVenta.address
    await esperah(ownTkEnVenta.deployTransaction.hash)

    const sgnPago = provider.getSigner(2)
    const tokenPago = await ethers.getContractFactory('ERC20Palero',sgnPago)
    console.log('=> deploy tokenPago')
    const ownTkPago = await tokenPago.deploy(['PAGO','PAGO'])
    const dirTkPago = ownTkPago.address
    await esperah(ownTkPago.deployTransaction.hash)

    console.log('=> initSale')
    const hardcap= 30000
    await espera(ownTkEnVenta.approve(dirTkSeller,bgn(hardcap)))
    await espera(ownTkSeller.initSale(dirTkEnVenta,bgn(hardcap),bgn(hardcap),bgn(hardcap/3),
                                Math.round(Date.now()/1000)+24*3600,bgn(0.1),10,true,''))
    
                                /*
    const pagaETH = provider.getSigner(3)
    const cli1TkEnVenta = await ethers.getContractAt('ERC20Palero',dirTkEnVenta,pagaETH)
    await espera(pagaETH.sendTransaction({ to: dirTkSeller, value: bgn(10) , data: dirTkEnVenta })) mal ... solo envia ether
    console.log('Pagado con ether y recibido',await cli1TkEnVenta.balanceOf(pagaETH.address))
*/
    const cli2TkEnVenta = await ethers.getContractAt('ERC20Palero',dirTkEnVenta,sgnPago)
    const cli2TkSeller = await ethers.getContractAt('TkSeller',dirTkSeller,sgnPago)

    await espera(ownTkPago.approve(dirTkSeller,bgn(1000)))
    await espera(cli2TkSeller.buyTokensByToken(dirTkEnVenta,bgn(100),dirTkPago,''))
    console.log('Pagado con Token y recibido',await cli2TkEnVenta.balanceOf(sgnPago.address))


})()