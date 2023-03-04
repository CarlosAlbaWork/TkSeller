# TKSeller

Notas:

```
npx hardhat run scripts/deploy_and_test.ts
```
Estado actual: al ir a comprar tokens, me cierra la venta, y el cierre da error de not owner

En los **require** debes poner un mensaje corto. Yo he puesto algunos
hardhat tiene un console,log para solidity (que no va a funcionar en las redes reales) que permite depurar bastante cómodo

Para llevar registro de las ventas, es donde puedes usar el array de direcciones de tokens _tokensInSale, aunque le cambiaria de nombre, haces push al final de iniSale. La idea es no recorrelo, sino devolverlo con alguna función tipo salesList