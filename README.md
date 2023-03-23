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


### 22/3

Pasa el test correctamente hasta la fecha. Voy a ir añadiendo más require que se me ocurran para que sea lo más robusto posible
