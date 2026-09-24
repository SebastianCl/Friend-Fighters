# P04 · Perfil geométrico y unidades

Perfil aprobado para el Character Pipeline. [geometry-profile.json](geometry-profile.json) es la configuración canónica; [geometry-contract.ts](geometry-contract.ts) ofrece funciones puras de autoría y validación. Ninguno se importa desde el juego. La integración del renderer corresponde a **P15**.

## Perfil aprobado

| Campo                  | Valor / unidad                                                      |
| ---------------------- | ------------------------------------------------------------------- |
| ID                     | `canonical-320x352-v1`                                              |
| Frame                  | 320 × 352 píxeles canónicos                                         |
| Pivote                 | (160, 328) píxeles canónicos                                        |
| Significado del pivote | Origen local del actor; no articulación, contacto o borde de alfa   |
| Suelo nominal          | Y=328 píxeles canónicos                                             |
| Densidad común         | 0.75 unidades del juego por píxel canónico                          |
| Alfa                   | Conservar todo alfa > 0, incluidos agarres; sin limpieza automática |

El origen normalizado es un valor derivado: `(160/320, 328/352)`, aproximadamente `(0.5, 0.93181818)`. No se mantiene una segunda configuración editable. La densidad es común a todos los personajes. No se define la estatura de Laura, Mariana, Rata o Sebastián ni una tolerancia porcentual anatómica: pertenecen al futuro Character Spec.

## Espacios y transformación

`source image → canonical frame → actor local space → simulation world → scene/screen`

1. **Fuente:** imagen identificada por ruta/hash de P01 y dimensiones. P03 anota en ese espacio con origen superior izquierdo, X derecha, Y abajo.
2. **Frame canónico:** transformación explícita `p = (sourcePoint − sourceOrigin) × uniformScale + translation`. `sourceOrigin` expresa un desplazamiento conocido de la referencia, no uno calculado del alfa. No se ejecutan recortes ni remuestreos en P04. La escala debe calibrarse por personaje/lote; no se calcula por pose para llenar la celda.
3. **Actor local:** `qx = (px − 160) × 0.75`, `qy = (328 − py) × 0.75`. X derecha, Y arriba; el pivote se convierte en (0,0).
4. **Mundo:** `world = actorPosition + (facing × qx, qy)`. `facing` vale +1 o −1. El actor es entrada de solo lectura: una posición visual nunca redefine su posición física.
5. **Escena:** una conversión de presentación explícita cambia unidades y sentido de Y. Como referencia legacy, `sceneX=2×worldX`, `sceneY=612−2×worldY`; estos valores no forman parte del perfil de personajes.
6. **Pantalla:** cámara y viewport aplican sus transformaciones después. `sceneToScreen` expresa escala uniforme y traslación suministradas por el consumidor. No implementa cámara ni efectos del juego.

Las coordenadas son continuas sobre bordes de celda; los centros de píxel están en semienteros. Bounding boxes: izquierda/superior inclusivos y derecha/inferior exclusivos. Si más adelante se almacena transparencia recortada, deben conservarse `trimOffset` y tamaño canónico para reconstruir las coordenadas antes de transformar. No se redefine el pivote al recortar.

## Poses, contactos y raíz

| Familia   | Regla                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------- |
| De pie    | Contactos de apoyo declarados alineados con suelo nominal. No se fuerza el pie elevado.            |
| Agachadas | Misma escala y raíz; la postura reduce la altura. Se admiten pie, rodilla y mano según anotación.  |
| Aéreas    | Raíz virtual estable y ausencia de contactos. Nunca alinear automáticamente por el píxel inferior. |
| Tumbadas  | Raíz conservada y contactos corporales explícitos: espalda, pelvis u otros sitios de P03.          |
| Agarres   | Cada actor conserva su raíz física. Los puntos visuales de interacción se declaran por separado.   |

La intención de la plantilla no es el estado de la simulación. `land → base_08`, `fall → base_14`, `special-hit → base_21`, `air-punch → base_22` y las reutilizaciones de P02 continúan intactas. Una pose tumbada puede mostrarse en vuelo sin cambiar su semántica o declarar contacto actual con el suelo del mundo.

`interactionPoints` contiene puntos visuales opcionales en el frame canónico, con valores nulos hasta medirlos; no son anclajes mecánicos ni autorizan reposicionar una víctima. P04 no crea anotaciones reales para agarres ni amplía el catálogo artístico de P03.

## Landmarks de P03 y mirror

`projectPoseAnnotations` valida primero el borrador P03 y exige una imagen de referencia identificada. Produce una copia con `profileId`, `sourceSpace`, `sourceTransform` y coordenadas canónicas derivadas de la transformación explícita. Los `null`, visibilidad y atributos desconocidos se conservan. No hay coordenadas anatómicas medidas o inventadas en los artefactos de P04.

La reflexión es `x' = 2×pivot.x − x`, `y'=y`. Se aplica a landmarks, contactos y puntos de interacción sin intercambiar sus IDs. `left_wrist` y `left_foot` siguen siendo del lado anatómico izquierdo. Se invierte `facing`, pero se conservan estado de manos, pierna de apoyo y lateralidad. La reflexión geométrica no revela articulaciones ocultas ni genera una nueva vista anatómica.

Reflejar las anotaciones sirve para revisión de una vista derivada. Un futuro adaptador debe reflejar una sola vez: conservar las coordenadas canónicas originales y aplicar `facing` al pasar a mundo, o usar la vista reflejada con orientación positiva. Aplicar ambas operaciones duplicaría el mirror.

## Estatura, límites y alfa

La celda es un contenedor, no una altura objetivo. Un personaje o pose válidos que excedan la celda requieren revisión; el pipeline no reduce su escala, desplaza su raíz ni descarta píxeles automáticamente. La estatura y proporciones visuales del Character Spec son independientes de las dimensiones mecánicas de combate.

`measureAlpha` lee RGBA sin alterarlo y registra conteo y bounding box tanto para **alfa > 0** como para **alfa > 128**. El margen se comprueba contra alfa > 0. Una imagen únicamente semitransparente puede tener `gt128.bounds=null` sin estar vacía. El alfa informa renderizado, diagnóstico y validación; nunca calcula pivote, suelo, escala o landmarks.

`geometry-diagnostics.mjs` lee las dos hojas runtime de Laura y comprueba hashes/dimensiones contra P01. Usa las regiones actuales del motor y la cuadrícula base legacy, incluyendo reservas. Emite JSON reproducible en stdout para los 27 recursos, sin escribir assets ni normalizarlos. Sus coordenadas son **legacy**, no certificación de cumplimiento canónico ni manifiesto de recortes fuente para P05.

## Tolerancias provisionales y validación

| Comprobación                          | Límite aprobado                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| Margen de todo contenido con alfa > 0 | ≥8 px canónicos en cada lado                                                    |
| Contacto medido con suelo nominal     | Error absoluto ≤1 px canónico                                                   |
| Colocación redondeada en escena       | Error por eje ≤0.5 px de escena                                                 |
| Transformación antes del redondeo     | Error por eje ≤0.0001 px de escena                                              |
| Mirror                                | Reversible dentro de la tolerancia numérica, tras convertir a píxeles de escena |
| Proporciones anatómicas               | Porcentaje sin definir                                                          |

`validateCanonicalGeometry` detecta dimensiones/pivote incorrectos, contenido vacío, datos de alfa incoherentes, desbordamiento/margen insuficiente, puntos fuera de frame y contactos fuera de tolerancia. Devuelve `errors` y `pending` por separado: datos sin medir no equivalen a geometría aprobada. Un resultado sin errores no certifica anatomía, completitud ni exportabilidad. La validación de fuente de P03 sigue siendo obligatoria; este validador geométrico no sustituye su contrato semántico.

Las comprobaciones se aplican a futuros frames canónicos. No se exige que los PNG legacy tengan estas dimensiones; se conserva su compatibilidad. Ningún validador corrige o normaliza su entrada.

## Evidencia y sistema actual conservado

- Laura base: atlas 1800×1280, 24 celdas de 300×320; envolvente alfa `[24,26] → [277,310]`. La extracción centra cada silueta y coloca su borde inferior en 310, incluidas aéreas/tumbada.
- Laura grab: hoja 1942×809; regiones de 700, 600 y 642 px de ancho, alto 809. Bounding boxes alfa >128: `[59,159,674,759]`, `[31,163,497,759]`, `[51,96,612,754]`.
- Alfa >0 grab: `[0,21,700,787]`, `[1,25,584,765]`, `[17,19,622,783]`. Estos límites justifican conservar margen adicional; no son contactos anatómicos.
- Con las escalas legacy y el factor de comparación 280/650 para agarres, la envolvente de los 27 recursos en el perfil aprobado sería aproximadamente `[9.23,10.09] → [310.77,340.49]`. Es evidencia geométrica, no autorización para remuestrear ni una plantilla medida.
- El renderer sigue con `unit=2`, `fighterHeight=420`, escalas `420/referenceHeight`, `footY` calculado por alfa >128 y mirror mediante escala X negativa. `groundAnchor` sigue participando solo en la preview estática.
- El clamp horizontal de `fall`, la caída visual adicional en KO, el indicador nominal `RenderedHeight`, selección de animaciones y geometría mecánica permanecen intactos. La migración del renderer pertenece a **P15**.

## Comprobaciones y continuidad hacia P05

```sh
node docs/characters/inventory-sources.mjs --check
node docs/characters/geometry-diagnostics.mjs
npm test
./node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --resolveJsonModule docs/characters/pose-master-contract.ts docs/characters/geometry-contract.ts
npm run build
```

P05 recibe un perfil identificable y aprobado, unidades, políticas y validadores puros para referenciar en los siguientes contratos/manifiestos. Quedan por definir o medir procedencia/transformaciones concretas de futuras plantillas, recortes cuando correspondan, landmarks, contactos, interacción de agarres y Character Specs con estaturas/proporciones. P04 no implementa esos entregables, importadores, exportadores ni normalización.

La numeración histórica Txx de `character-pipeline.md` no sustituye las decisiones Pxx aprobadas en esta conversación. En particular, P15 aquí designa la integración futura autorizada como pendiente por el usuario.
