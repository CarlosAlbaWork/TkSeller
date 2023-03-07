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
  let err = false
  for (let ac of lstacc) {
    console.log(ac,sbgn(await provider.getBalance(ac)))
  }
})()