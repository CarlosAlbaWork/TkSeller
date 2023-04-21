# TKSeller

Para hacer la prueba.
```
npx hardhat run scripts/deploy_and_test.ts
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

### Sobre el test
Es posible que el test falle aunque tu contrato esté bien, porque lo programo a ciegas. Si falla me avisas.

### 21/4

Test sin errores
