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
- Respecto a la ejecución simple y la ejecución con soft=1 :Uno respecto al allowance con el comprador 1(con el 2 y el 3 funciona bien parece ser)
- Respecto a la ejecución con el comando close=1: Sigue el fallo con el Allowance con el comprador 1, pero además se añade otro en el 2 sobre que se excede la cantidad a transferir del balance, y en el comprador 3 un error de que la función falló la ejecución. Creo que estos 3 fallan en cadena por el fallo del allowance en el comprador 1

