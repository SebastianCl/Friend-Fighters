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

## P06 · importación base legacy reproducible

La fuente exacta es `public/art/characters/laura/source-sheet.jpg` (JPEG 1169×1280, SHA-256 `f89f959a8c7c1409dce4469b08414e7d37dda61ddf80f8f1c32b02ed72509dea`), fijada por P01. [legacy-base-crops.json](legacy-base-crops.json) conserva los 24 rectángulos históricos. [legacy-base-core.mjs](legacy-base-core.mjs) contiene la misma extracción que usa [build-atlas.mjs](build-atlas.mjs); [legacy-base-runner.mjs](legacy-base-runner.mjs) ejecuta el código en Chromium. El importador nunca llama al builder de producción.

```sh
npm run import:laura-legacy
node docs/characters/laura/import-legacy-base.mjs --check
node docs/characters/validate-config.mjs --character docs/characters/laura/character-spec.json
```

El comando reconstruye las 24 celdas `300×320` y deja los PNG y el informe de comparación en `pipeline/generated/legacy/laura/` (ignorado por Git). Regenera el [manifiesto de procedencia](legacy-base-manifest.json), los 24 [metadatos de frame](legacy-frames/) y el [Character Spec draft](character-spec.json) versionados aquí. `--check` no escribe archivos; verifica hashes P01, recortes, metadatos, P05 y equivalencia de los 24 frames contra el atlas de producción. La comparación informa igualdad de bytes del atlas y diferencias por píxel RGBA, alfa y bounding boxes. No se usa equivalencia visual subjetiva.

La extracción histórica conserva el umbral `min(R,G,B)<232`, el mayor componente conectado de tinta (8 vecinos), la eliminación del exterior (4 vecinos), la ropa clara cerrada opaca y alfa binario. Cada silueta se recorta en su bbox y se coloca con escala 1: centrado horizontal en la celda legacy y borde inferior en Y=310. El manifiesto guarda el recorte, bbox en la fuente, traslaciones `source→legacy` y `cutout→legacy`, bbox para `alpha>0` y `alpha>128`, celda, pivote histórico `(150,310)` y SHA-256 del PNG importado. Estos son hechos del builder legacy, no recomendaciones de normalización.

Las coordenadas de fuente, celda legacy y frame canónico `320×352` son espacios distintos. El origen legacy se calculó desde alfa para todas las poses, incluso las aéreas y tumbadas; tratarlo como raíz anatómica canónica requeriría una decisión posterior. Por eso `sourceTransform`, frame canónico, landmarks, contactos, lateralidad confirmada, manos, pierna de apoyo y `airborne` siguen pendientes en P05. No se trasladó contenido por `(+10,+18)` ni se alineó el píxel inferior con el suelo P04. El spec incluye solo la fuente y los 24 recursos base: `grab_XX` corresponde a P07. La semántica P03 y el uso actual P02 siguen referenciados por ID en sus propios contratos.
