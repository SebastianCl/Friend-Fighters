# Laura · diseño vigente

La fuente de las 24 poses base de Laura es `public/art/characters/laura/source-sheet.jpg`, la hoja entregada por el usuario. Los tres recursos grab proceden de `public/art/characters/laura/grab-sheet.png`. `build-atlas.mjs` extrae las figuras, quita el fondo blanco y los números, y genera `atlas.png`, `guard.png` y `portrait.png`. Ejecutar desde la raíz del proyecto:

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

Las coordenadas de fuente, celda legacy y frame canónico `320×352` son espacios distintos. El origen legacy se calculó desde alfa para todas las poses, incluso las aéreas y tumbadas; tratarlo como raíz anatómica canónica requeriría una decisión posterior. Por eso `sourceTransform`, frame canónico, landmarks, contactos, lateralidad confirmada, manos, pierna de apoyo y `airborne` siguen pendientes en P05. No se trasladó contenido por `(+10,+18)` ni se alineó el píxel inferior con el suelo P04. P06 importó solo la fuente y los 24 recursos base; P07 añadió después los tres `grab_XX` al mismo spec draft sin modificar esos metadatos base. La semántica P03 y el uso actual P02 siguen referenciados por ID en sus propios contratos.

## P07 · importación grab legacy reproducible

La fuente y hoja runtime exacta es `public/art/characters/laura/grab-sheet.png` (PNG RGBA 1942×809, SHA-256 `427744ee147151b0a41a624b77909f8fce77fef6b5702ff229e701a216303159`), fijada por P01. [legacy-grab-regions.json](legacy-grab-regions.json) registra las tres regiones de P02: `grab_01`/`grab-reach` en `(0,0,700,809)`, `grab_02`/`grab-hold` en `(700,0,600,809)` y `grab_03`/`grab-throw` en `(1300,0,642,809)`. La clave es uso actual del motor, no contrato anatómico.

```sh
npm run import:laura-grab
node docs/characters/laura/import-legacy-grab.mjs --check
node docs/characters/validate-config.mjs --character docs/characters/laura/character-spec.json
```

El [importador](import-legacy-grab.mjs) copia cada región entera a un frame PNG del mismo tamaño y deja PNG/informe en `pipeline/generated/legacy/laura/grab/`, fuera de producción. El [manifiesto](legacy-grab-manifest.json) y los tres JSON en [legacy-frames](legacy-frames/) conservan la ruta/hash/formato fuente, rectángulo, traslación `(-x,-y)`, escala de extracción 1, tamaño legacy, alfa y pivote histórico. [legacy-image-compare.mjs](legacy-image-compare.mjs), hashing, validación P05 y snapshots de producción se comparten con P06. El Character Spec draft ahora contiene los 27 IDs y ambas fuentes; P06 sigue verificando sus 24 frames sin cambios.

El renderer actual usa `anchorX=round(width/2)`: **350, 300 y 321**. Calcula `footY` con el borde inferior de `alpha>128`: **759, 759 y 754**. Su escala de presentación actual es `420/650` píxeles de escena por píxel legacy, independiente de la copia fuente→frame, que no escala ni remuestrea. Los bounds `alpha>0` son `[0,21,700,787]`, `[1,25,584,765]` y `[17,19,622,783]`; los de `alpha>128` son `[59,159,674,759]`, `[31,163,497,759]` y `[51,96,612,754]`. El píxel semitransparente se conserva aunque no determine `footY`: llega por debajo del pivote hasta Y=787, 765 y 783, respectivamente. En `grab_01`, `alpha>0` toca ambos bordes horizontales del recorte; queda registrado como deuda de margen legacy, sin recortar ni limpiar. La recodificación PNG fue comprobada contra cada región de producción con igualdad de dimensiones, RGBA, alfa, bounds y pivote; no existe un PNG de producción independiente por grab para comparar sus bytes comprimidos.

Las coordenadas fuente, frame grab legacy y frame canónico P04 siguen separadas. Los grabs de hasta 700×809 no caben como copia 1:1 en `320×352`. Convertirlos requiere una decisión explícita de encuadre, escala y raíz/interacción, pendiente; el pivote `(160,328)` no sustituye a los pivotes históricos. Tampoco hay landmarks anatómicos ni contrato mano–víctima. La selección visual `grab-throw` puede adelantarse al release mecánico, que depende de los diez ticks de sujeción en `src/combat.ts`; sincronización y puntos de interacción pertenecen a P09/P17/P18. P07 no altera esos tiempos, la posición de la víctima ni la simulación.
