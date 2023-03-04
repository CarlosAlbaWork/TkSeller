# TKSeller

Notas:

```
npx hardhat run scripts/deploy_and_test.ts
```
Estado actual: al ir a comprar tokens, me cierra la venta, y el cierre da error de not owner

He quitado el openzeppelin/Ownable, es código de más con funcionalidad que no se necesita ni se necesitará, he puesto un systemOwner que de momento no sirve de nada, ya veremos.

En los **require** debes poner un mensaje corto. Yo he puesto algunos.

Hardhat tiene un console,log para solidity (que no va a funcionar en las redes reales) que permite depurar bastante cómodo

Para llevar registro de las ventas, es donde puedes usar el array de direcciones de tokens _tokensInSale, aunque le cambiaria de nombre, haces push al final de iniSale. La idea es no recorrelo, sino devolverlo con alguna función tipo "salesList"

La función close: el caller nunca va a ser el contrato, porque eso aplica cuando un contrato llama a otro. La solución es hacer dos funciones, una _close interna y la actual externa, que hace el require de owner y llama a la interna. Y las funciones de venta llaman a la interna