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

### Pendiente 9/3 :
Test -> Init correcto; primera compra: devuelve 0 tokens, deberían ser 100. Y cierra la preventa

### Sobre el test
Es posible que el test falle aunque tu contrato esté bien, porque lo programo a ciegas. Si falla me avisas.

### Reflexiones sobre el cierre
La interacción con TkSeller será normalmente por una página web. La página no dejará comprar más allá de la fecha final. Por ello no tiene mucho sentido que buyTokens cierre sin vender, pues el usuario paga gas por nada. O se le deja comprar fuera de plazo, o no vale la pena cerrar ahí, sólo en caso de alcanzar hardcap.
El buen sitio para el autocierre es al retornar los tokens, justo al principio de la función. Se decide si cerrar y luego ya se sabe si se admite retorno. Normalmente la página web no mostrará el botón de retorno si no procede, con lo que si está el botón, el cierre podrá ser efectivo si procede y es que habrá retrorno.

### Sobre returnTokens
El tercer parámetro no tiene sentido porque el usuario (o la página web) no sabe qué ha de meter ahí.
Cuando pones 0 , no miras el amount, devuelves todo. 
Yo quitaría el parámetro y devolvería según un FIFO hasta completar el amount, sin devolver error si no se alcanza el amount. Al final la función, cierre y requires aparte, no debería de tener más de 30 líneas.
