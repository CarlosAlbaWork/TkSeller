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


### 30/3
Todo añadido.
Hay 2 fallos principales:
- Respecto a la ejecución simple y la ejecución con soft=1 :Parece que el saldo final de algún token no es el adecuado. Supongo que tendrá algo que ver con closeSale y los momentos en los cuales se ejecuta, ya que usando close=1 cambia los saldos finales incorrectos
- Respecto a la ejecución con el comando close=1: Los intentos finales de retornar tokens no funcionan porque con el comando, se cierra la preventa sin estado de fallida y entonces no se pueden retornar tokens

