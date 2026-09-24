# Laura · diseño vigente

La única fuente de apariencia de Laura es `public/art/characters/laura/source-sheet.jpg`, la hoja de 24 poses entregada por el usuario. `build-atlas.mjs` extrae las figuras, quita el fondo blanco y los números, y genera `atlas.png`, `guard.png` y `portrait.png`. Ejecutar desde la raíz del proyecto:

```sh
node docs/characters/laura/build-atlas.mjs
```

Las 21 claves de animación base usan 20 cuadros distintos del atlas, según `src/animation.ts`; sus regiones llegan al juego mediante `src/visual-assets.ts`. Guardia y respiración usan las poses 1 y 2. Las tres poses de agarre viven en `grab-sheet.png` y comparten el mismo diseño.

Prompt usado con ImageGen integrado para `grab-sheet.png` (referencia: la hoja adjunta del usuario): «Crea tres poses completas de Laura orientada a la derecha: extender la mano abierta para agarrar, sujetar firmemente con ambas manos a un rival invisible y lanzarlo hacia arriba y adelante. Conserva el cabello oscuro voluminoso y rizado, la piel morena, el top negro sin tirantes, la falda blanca plisada con detalles dorados, los tenis blancos, las pulseras blancas, las proporciones, el rostro y el trazo de la hoja de referencia. Fondo realmente transparente, figuras separadas y misma línea de suelo; sin rival, números, texto ni efectos».

## P02 · mapa de recursos y uso actual

[engine-map.json](engine-map.json) registra los 24 IDs base y los tres de agarre. Sus claves son el uso comprobado por el motor, no nombres artísticos de las poses. La fuente de los IDs base es `public/art/characters/laura/source-sheet.jpg`; la de agarre es `public/art/characters/laura/grab-sheet.png`, ambas verificadas contra el inventario P01.

El mapeo base se comprueba contra las celdas de `src/animation.ts`; el orden de agarre se comprueba contra las regiones de `src/visual-assets.ts`. `base_03`, `base_06`, `base_09` y `base_12` no tienen uso actual. `base_15` se reutiliza para `punch-wind` y `special-wind`. `tests/character-resource-map.test.ts` detecta cambios en esas asignaciones, IDs faltantes o duplicados y reutilizaciones no declaradas.

## P03 · semántica aprobada

[pose-semantics.json](../pose-semantics.json) formaliza las 24 etiquetas artísticas aprobadas, unidas al mapa del motor únicamente por ID. La semántica no cambia las asignaciones de P02; las cuatro reservas siguen sin uso. Por ejemplo, base_08 es Agachado abierto aunque el motor use land, y base_22 es Rodillazo aéreo aunque use air-punch.

El [contrato de poses maestras](../pose-master-contract.md) define landmarks, lateralidad, manos, apoyos y estado aéreo. Las coordenadas y los atributos no confirmados permanecen pendientes. P03 no modifica los recursos grab ni los assets de producción.
