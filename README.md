# TKSeller

Notas:

```
npx hardhat run scripts/deploy_and_test.ts
```
Estado actual: al ir a comprar tokens, me da un mensaje que no entiendo

Hardhat tiene un console,log para solidity (que no va a funcionar en las redes reales) que permite depurar bastante cómodo

Para llevar registro de las ventas, es donde puedes usar el array de direcciones de tokens _tokensInSale, aunque le cambiaria de nombre, haces push al final de iniSale. La idea es no recorrelo, sino devolverlo con alguna función tipo "salesList"



```
Actualización del 07/03/23
```
Faltan 2 cosas importantes, están comentadas o no implementadas aún. Compila perfectamente, excepto los warnings asocidados al permit que aún no hemos implementado.

Estas 2 cosas son:

- No se permite crear un Struct (Preventa) con un mapping anidado( El que guarda las distintas compras realizadas). He comentado las líneas afectadas en las funciones initSale y setSale (líneas 157 y 202). 
- Hay que crear el mapping que relacione el address del token, con la address del smart contract desde el cual se obtiene su precio en eth, para poder realizar correctamente las funciones del buyTokensByToken.

