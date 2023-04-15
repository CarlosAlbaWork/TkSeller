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

De normal se despliega un nuevo contrato de compraventa en cada test. En redes como localhost, la opción reusar=1 le indica que intente utilizar un contrato ya desplegado en luagr de desplegar uno nuevo (junto con los mismos tokens de pago anteriores), así es más realista.

La opción claro=1 quita los ansii para color rojo. La opción exit=1 hace que el script termine (devuelve error al shell) si hay algún motivo de rojo.

### 30/3
Todo añadido.
Hay 2 fallos principales:
- Respecto a la ejecución simple y la ejecución con soft=1 : Parece que el saldo final de algún token no es el adecuado. Supongo que tendrá algo que ver con closeSale y los momentos en los cuales se ejecuta, ya que usando close=1 cambia los saldos finales incorrectos
- Respecto a la ejecución con el comando close=1: Los intentos finales de retornar tokens no funcionan porque con el comando, se cierra la preventa sin estado de fallida y entonces no se pueden retornar tokens

Respuesta:

- en el script, la ejecución con soft=1 se cierra con estado éxito. Sin eso, es fallida, pues no se alcanza el hardcap.
- por tanto sin soft=1 todos los retornos deben funcionar
- la diferencia entre cierre=1 y sin él , es que se cierra por tiempo simulado, pero los resultado son los mismos, no debe afectar
- Ejecución sin soft, te sale:
```
Saldo ENVENTA del Seller 30000.0
Tkseller vacío de PAGO1
Saldo PAGO2 del Seller 1200.0
Tkseller vacío de ETH
     Deployer saldos     0 cambio ETH      0.0 ENVENTA      0.0 PAGO1      0.0 PAGO2
Owner ENVENTA saldos     0 cambio ETH  90000.0 ENVENTA      0.0 PAGO1      0.0 PAGO2
  Owner PAGO1 saldos     0 cambio ETH      0.0 ENVENTA  80000.0 PAGO1      0.0 PAGO2
  Owner PAGO2 saldos     0 cambio ETH      0.0 ENVENTA      0.0 PAGO1  60000.0 PAGO2
    Iniciador saldos     0 cambio ETH      0.0 ENVENTA      0.0 PAGO1      0.0 PAGO2
  Comprador 1 saldos     0 cambio ETH      0.0 ENVENTA  10000.0 PAGO1  20000.0 PAGO2
  Comprador 2 saldos     0 cambio ETH      0.0 ENVENTA  30000.0 PAGO1  38800.0 PAGO2
  Comprador 3 saldos     0 cambio ETH      0.0 ENVENTA      0.0 PAGO1      0.0 PAGO2
```
Debería ser, salvo que me equivoque:
```
Tkseller vacío de ENVENTA
Tkseller vacío de PAGO1
Tkseller vacío de PAGO2
Tkseller vacío de ETH
     Deployer saldos     0 cambio ETH      0.0 ENVENTA      0.0 PAGO1      0.0 PAGO2
Owner ENVENTA saldos     0 cambio ETH 120000.0 ENVENTA      0.0 PAGO1      0.0 PAGO2
  Owner PAGO1 saldos     0 cambio ETH      0.0 ENVENTA  80000.0 PAGO1      0.0 PAGO2
  Owner PAGO2 saldos     0 cambio ETH      0.0 ENVENTA      0.0 PAGO1  60000.0 PAGO2
    Iniciador saldos     0 cambio ETH      0.0 ENVENTA      0.0 PAGO1      0.0 PAGO2
  Comprador 1 saldos     0 cambio ETH      0.0 ENVENTA  10000.0 PAGO1  20000.0 PAGO2
  Comprador 2 saldos     0 cambio ETH      0.0 ENVENTA  30000.0 PAGO1  40000.0 PAGO2
  Comprador 3 saldos     0 cambio ETH      0.0 ENVENTA      0.0 PAGO1      0.0 PAGO2
```