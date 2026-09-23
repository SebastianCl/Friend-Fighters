# Laura · diseño vigente

La única fuente de apariencia de Laura es `public/art/characters/laura/source-sheet.jpg`, la hoja de 24 poses entregada por el usuario. `build-atlas.mjs` extrae las figuras, quita el fondo blanco y los números, y genera `atlas.png`, `guard.png` y `portrait.png`. Ejecutar desde la raíz del proyecto:

```sh
node docs/characters/laura/build-atlas.mjs
```

Las 21 poses usadas por el combate se asignan a cuadros del atlas en `src/visual-assets.ts`. Guardia y respiración usan las poses 1 y 2. Las tres poses de agarre viven en `grab-sheet.png` y comparten el mismo diseño.

Prompt usado con ImageGen integrado para `grab-sheet.png` (referencia: la hoja adjunta del usuario): «Crea tres poses completas de Laura orientada a la derecha: extender la mano abierta para agarrar, sujetar firmemente con ambas manos a un rival invisible y lanzarlo hacia arriba y adelante. Conserva el cabello oscuro voluminoso y rizado, la piel morena, el top negro sin tirantes, la falda blanca plisada con detalles dorados, los tenis blancos, las pulseras blancas, las proporciones, el rostro y el trazo de la hoja de referencia. Fondo realmente transparente, figuras separadas y misma línea de suelo; sin rival, números, texto ni efectos».
