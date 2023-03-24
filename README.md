# TKSeller

Para hacer la prueba.
```
npx hardhat run scripts/deploy_and_test.ts
close=1 npx hardhat run scripts/deploy_and_test.ts
soft=1 npx hardhat run scripts/deploy_and_test.ts
close=1 soft=1 npx hardhat run scripts/deploy_and_test.ts

```
Prueba sobre red local. Una vez:
```
npx hardhat node
```
Después:
```
npx hardhat run scripts/deploy_and_test.ts --network localhost
```
Prueba final (gasta gas):

```
npx hardhat run scripts/deploy_and_test.ts --network binanceTest
```


### 24/3
Añadida casi toda la funcionalidad de recaudación. Solo falta la parte de recaudación cuando se cierra con status de fallida, que ya me comentaste como realizarla
Hay 2 fallos principales:
- Uno respecto al allowance con el comprador 1(con el 2 y el 3 funciona bien parece ser)
- Uno de funcionamiento al ejecutar el comando con close=1. El fallo parece que está en la llamada a la función _closeSale.
El lunes intentaré solucionarlos
