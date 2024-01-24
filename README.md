# TKSeller

Testing.
```
npx hardhat run scripts/deploy_and_test.ts
```
Test in a local testnet. First:
```
npx hardhat node
```
Later:
```
npx hardhat run scripts/deploy_and_test.ts --network localhost
```
Final test (using gas):

```
npx hardhat run scripts/deploy_and_test.ts --network binanceTest
```

### Summary

This code was developed during my compulsory internship in my Computational Mathematics major.
It´s a program that manages selling and creation of ERC20 tokens ina Blockchain enviroments.

### Changes that will be made

-Hardhat was used to develop the project. However, my knowledge of TypeScript is limited, whereas my knowledge of Solidity is more developed. Therefore, i will migrate the project from Hardhat to Foundry.
-Completing the tests needed to check that the code works correctly
-Refactoring

