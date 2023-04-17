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

### 17/4
Todo añadido. Uno de los fallos era por el test del permit, que aún no hemos trabajado con él, he comentado esa parte en el test.
Hay 1 fallo:
- La ejecución sin close=1 : No se entra a la función closeSale y por tanto no se devuelven los tokens ENVENTA al owner


```
