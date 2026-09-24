# Amigos y Rivales Character Pipeline v1

Estado: especificación inicial para implementar progresivamente. Fecha: 2026-09-24.

Este documento define un proceso reproducible para convertir referencias personales en personajes animados de Amigos y Rivales. El contrato inicial contiene **24 poses base y una extensión de agarre de 3 poses**. Esos 27 recursos visuales no equivalen necesariamente a 27 estados del motor ni a una animación de 27 frames consecutivos.

Los nombres de animaciones, índices de exportación, tiempos, eventos y dimensiones definitivas deben validarse contra el repositorio del juego antes de congelar el estándar. Los ejemplos numéricos de este documento no son valores aprobados para producción.

## 1. Objetivo y principios

Conservar la identidad de cada personaje y mantener coherentes sus proporciones, apariencia, orientación, escala, apoyos y poses. El resultado debe poder regenerarse parcialmente, validarse y ensamblarse sin depender de un único spritesheet producido por un generador de imágenes.

Principios:

- Separar identidad visual, pose, geometría de exportación y reglas de combate.
- Usar referencias aprobadas y versionadas; no reinterpretar fotos en cada frame.
- Compartir una plantilla anatómica y un lenguaje de movimiento, permitiendo diferencias corporales explícitas por personaje.
- Mantener una escala estable por personaje y una escala de mundo común.
- Preferir PNG individuales normalizados y ensamblaje determinista.
- Conservar originales; corregir y exportar mediante derivados.
- Tratar la generación visual como iterativa y no determinista. El ensamblaje y las validaciones sí deben ser reproducibles.
- No confundir una pose con una animación completa: anticipación, fase activa y recuperación pueden requerir recursos adicionales en versiones futuras.

## 2. Referencias utilizadas y límites de interpretación

Se revisaron los cuatro spritesheets de la conversación «Mejorar spritesheets de personajes» y el archivo adicional de agarre de Laura. No se incrustan imágenes en este documento.

| Referencia | Dimensiones observadas | Uso y observación |
|---|---:|---|
| `stripe_sheet_laura.png` | 1199 × 1312 | 24 poses numeradas, dispuestas visualmente en seis columnas y cuatro filas. Base del catálogo de poses; no es una cuadrícula técnica confirmada. |
| `stripe_sheet_mariana.png` | 1024 × 1536 | 21 figuras visibles, organizadas en cuatro columnas con una última fila parcial. Referencia de identidad y material para migración. |
| `stripe_sheet_rata.png` | 1024 × 1536 | 21 figuras visibles y distribución similar a Mariana. No asignar índices por equivalencia de posición con Laura. |
| `stripe_sheet_sebastian.png` | 1024 × 1536 | 21 figuras visibles y distribución similar a Mariana. Mantener sus rasgos y revisar correspondencias individualmente. |
| `public/art/characters/laura/grab-sheet.png` | 1942 × 809 | Tres poses de agarre. La anchura no es divisible entre tres: medir regiones reales antes de recortar. |

Los cuatro personajes comparten una estética de lucha estilizada, contornos marcados y sombreado por masas. Laura tiene cabello largo rizado, top oscuro, falda clara y accesorios; Mariana, cabello claro, conjunto deportivo oscuro/rosa y tatuajes; Rata, cabello corto, prendas claras y tatuajes; Sebastián, cabello oscuro rizado, camiseta sin mangas oscura, pantalón azul y tatuajes. Estas observaciones sirven para iniciar diseños, no para fijar detalles finos o lateralidad sin revisión.

Las hojas presentan diferencias de distribución, volumen, separación entre figuras y apoyos. Se observan también bordes de color en algunas siluetas: revisar el alfa y la imagen compuesta sobre varios fondos antes de decidir si son contorno intencional o contaminación. Un fondo oscuro en una vista previa no demuestra que el PNG sea opaco.

La hoja de agarre conserva la identidad de Laura, pero usa una escala y un nivel de detalle que deben reconciliarse con el arte base. No basta con insertarla directamente en el atlas.

## 3. Artefactos separados y fuentes de verdad

| Artefacto | Contenido | Función |
|---|---|---|
| Fotos de referencia | Fotos originales y recortes útiles sin interfaz de Instagram | Informar rasgos identificables durante el diseño. No son la entrada habitual de animación. |
| Character Design | Exploraciones de rostro, silueta, ropa, accesorios y proporciones | Resolver decisiones visuales con revisión humana. |
| Character Spec | YAML estructurado de apariencia, medidas relativas, restricciones y versiones | Contrato textual del personaje. |
| Master Character Reference | Imagen neutral aprobada, vista lateral 3/4 coherente con el juego; detalles adicionales cuando hagan falta | Fuente visual oficial de identidad para todas las poses. |
| Plantilla maestra de poses | Maniquí o esqueleto sin identidad, siluetas, articulaciones, apoyos y orientación | Fuente de verdad del movimiento: 24 poses base y 3 de agarre. |
| Metadatos visuales | Pivotes, landmarks, recortes, offsets y procedencia | Conectar el arte con la exportación. |
| Datos de combate | Estados, tiempos, colisiones, eventos y reglas de agarre | Fuente de verdad mecánica independiente de los PNG. |

El Character Design precede a la aprobación del Character Spec y de la Master Character Reference; estos dos últimos se ajustan juntos hasta ser coherentes. Si la imagen y el YAML discrepan, detener la aprobación visual y resolver el conflicto explícitamente. No permitir que el generador elija arbitrariamente una interpretación.

La plantilla se deriva de Laura, pero elimina su ropa, cabello y rasgos personales. Conserva la intención de cada pose, no sus posibles errores anatómicos. Las variantes corporales deben declararse y revisarse; no se exige que todos tengan exactamente la misma altura.

## 4. Catálogo de 24 poses base

Identificadores internos estables: `base_01` a `base_24`. La numeración corresponde a Laura. Los nombres siguientes son **descripciones provisionales**, no claves confirmadas del motor. La tabla define recursos, no tiempos ni transiciones.

| N.º | ID | Nombre provisional | Intención / validación necesaria |
|---:|---|---|---|
| 1 | `base_01` | `idle_a` | Guardia de reposo, primera variante. |
| 2 | `base_02` | `idle_b` | Segunda variante de reposo. |
| 3 | `base_03` | `idle_c` | Tercera variante; comprobar continuidad del ciclo. |
| 4 | `base_04` | `walk_a` | Primera pose de paso. |
| 5 | `base_05` | `walk_b` | Segunda pose de paso. |
| 6 | `base_06` | `walk_c` | Tercera pose; validar orden, dirección y loop. |
| 7 | `base_07` | `jump_or_knee` | Pierna recogida; distinguir salto, transición o ataque según el código. |
| 8 | `base_08` | `crouch_a` | Agachado, variante de entrada o postura. |
| 9 | `base_09` | `crouch_b` | Agachado bajo con mano próxima al suelo. |
| 10 | `base_10` | `crouch_c` | Agachado con guardia; confirmar uso. |
| 11 | `base_11` | `guard_a` | Defensa con brazo cruzado frente al torso/rostro. |
| 12 | `base_12` | `guard_b` | Defensa alta. |
| 13 | `base_13` | `hit_reaction` | Retroceso al recibir impacto. |
| 14 | `base_14` | `knockdown` | Personaje tumbado; apoyo corporal distinto al de pie. |
| 15 | `base_15` | `fighting_idle` | Guardia de combate; confirmar diferencia respecto a 1–3. |
| 16 | `base_16` | `standing_punch` | Puñetazo de pie. |
| 17 | `base_17` | `knee` | Rodilla elevada; comprobar apoyo y fase del ataque. |
| 18 | `base_18` | `high_kick` | Patada alta con una pierna de apoyo. |
| 19 | `base_19` | `crouching_punch` | Puñetazo agachado. |
| 20 | `base_20` | `crouching_kick` | Patada baja con apoyo corporal reducido. |
| 21 | `base_21` | `standing_block_or_push` | Palmas al frente; distinguir bloqueo y empuje. |
| 22 | `base_22` | `jump_knee_attack` | Rodilla recogida; confirmar fase aérea y función. |
| 23 | `base_23` | `air_kick` | Patada en postura aérea. |
| 24 | `base_24` | `crouching_block` | Defensa agachada con brazos al frente. |

Crear un `engine-map.yaml` separado con ID interno, clave del motor, índice/rectángulo de exportación, secuencia y versión compatible del juego. Una clave puede utilizar varios recursos y un recurso puede reutilizarse en varias secuencias. No renombrar ni reordenar recursos por deducción visual.

## 5. Extensión de agarre: tres poses adicionales

Identificadores: `grab_01`, `grab_02`, `grab_03`. Mantenerlos separados de `base_01`–`base_24`; no convertir el último frame base en agarre ni desplazar los índices existentes.

| ID | Descripción visible | Interpretación provisional |
|---|---|---|
| `grab_01` | Mano adelantada abierta, otra cerca del torso | Alcance o intento de captura. |
| `grab_02` | Ambas manos juntas al frente | Sujeción o preparación de la acción. |
| `grab_03` | Brazos extendidos hacia arriba y cambio de apoyo | Elevación o continuación del agarre. |

El usuario confirma que se usan para agarrar a otro personaje. El PNG por sí solo no confirma su orden de reproducción, duración, impacto, lanzamiento ni liberación. Resolverlo inspeccionando la implementación actual. Conservar inicialmente una salida separada `grab-sheet.png` si así la consume el juego; unificar atlas únicamente mediante un adaptador compatible.

El agarre requiere además un contrato entre dos actores:

- Rol de atacante y víctima, estados compatibles y condición de captura.
- Zona de captura, alcance, orientación y ventana temporal, definidos en datos de combate.
- Punto de sujeción del atacante y punto de anclaje de la víctima, relativos a sus respectivos pivotes.
- Offset relativo entre actores y reglas de orientación/espejado.
- Eventos explícitos de captura confirmada, sujeción, daño si corresponde, liberación y cancelación.
- Comportamiento ante fallo, interrupción, derrota, obstáculos y fin de secuencia.
- Regla de movimiento durante la sujeción: la simulación controla la relación espacial; el desplazamiento aparente del dibujo no debe mover dos veces a los actores.

La víctima puede reutilizar una pose existente solo tras una revisión visual. Si necesita poses propias, registrarlas como extensión pendiente; estos tres frames no prueban que exista arte suficiente para ambos roles. No inventar esos recursos dentro del catálogo de 27.

## 6. Canvas, grid y celdas configurables

Medir primero el cargador de sprites, los recursos actuales, la escala de render y los límites del motor. Elegir después un perfil de exportación. Cada perfil declara tamaño de celda, filas/columnas, márgenes, separación, formato y orden explícito de IDs. Las entradas originales pueden tener recortes irregulares; las salidas normalizadas sí deben cumplir el perfil.

Para celdas de ancho `W`, alto `H`, `C` columnas, `R` filas, márgenes `ML/MR/MT/MB` y separaciones `GX/GY`:

```text
canvasWidth  = ML + MR + C × W + (C − 1) × GX
canvasHeight = MT + MB + R × H + (R − 1) × GY
column(i) = i mod C
row(i) = floor(i / C)
x(i) = ML + column(i) × (W + GX)
y(i) = MT + row(i) × (H + GY)
```

Aquí `i` es el índice de exportación desde cero, no el número visible del frame. La capacidad debe cubrir los IDs y cualquier celda vacía debe declararse.

Ejemplo **ilustrativo y no aprobado**: base de 6 × 4 celdas de 256 × 384, sin márgenes ni separación, produce 1536 × 1536. Un perfil de agarre de 3 × 1 con esas celdas produciría 768 × 384. No adoptar esas medidas por aparecer aquí; ni 1199 × 1312 ni 1942 × 809 justifican recortes mediante división entera.

Borrador válido de configuración, deliberadamente incompleto:

```yaml
schema_version: 1
standard_version: 1.0.0-draft.1
status: draft
frame_sets:
  base:
    count: 24
    order_manifest: specs/base-order.yaml
  grab:
    count: 3
    order_manifest: specs/grab-order.yaml
geometry:
  cell_width: null
  cell_height: null
  ground_y: null
  origin_x: null
  origin_y: null
  logical_pixel_scale: null
profiles:
  base:
    columns: null
    rows: null
    margins: {left: 0, right: 0, top: 0, bottom: 0}
    spacing: {x: 0, y: 0}
  grab:
    columns: null
    rows: null
    margins: {left: 0, right: 0, top: 0, bottom: 0}
    spacing: {x: 0, y: 0}
```

Los `null` permiten documentar decisiones pendientes, pero deben bloquear una exportación de producción. No rellenarlos con valores silenciosos.

## 7. Escala, suelo y pivote

Convención canónica: coordenadas de celda en píxeles, origen superior izquierdo, X hacia la derecha, Y hacia abajo. El pivote es una coordenada geométrica fija de la celda que representa el origen local del actor. `groundY` es la línea nominal de contacto para poses apoyadas. Normalmente `originY = groundY`; cualquier excepción debe justificarse en el perfil.

- Definir la altura neutral objetivo de cada personaje respecto de una referencia común. No igualar todas las alturas ni redimensionar cada pose por su bounding box.
- Aplicar un factor uniforme por personaje/lote, conservando proporción de ancho y alto. Revisar aparte el lote de agarre por su distinta escala de entrada.
- Alinear mediante pivote, puntos anatómicos y apoyos anotados. Un puñetazo que amplía la silueta no debe recentrar todo el personaje.
- En poses de pie, al menos el apoyo declarado debe coincidir con `groundY` dentro de la tolerancia aprobada. El pie elevado no se fuerza al suelo.
- En agachado o tumbado, usar los puntos de contacto pertinentes; no mover el personaje para conservar altura de cabeza.
- En poses aéreas, no alinear el píxel inferior al suelo. Mantener el origen de referencia y dejar la trayectoria al motor, salvo desplazamiento local expresamente declarado.
- Si se recorta transparencia para almacenar un recurso, conservar `trimOffset` y tamaño original. Reconstruir la celda antes de exportar a un consumidor de celdas fijas.
- Mantener el personaje dentro de la celda con margen para pelo, manos y patadas. Si una pose no cabe, revisar el perfil; no encoger solo ese frame.

Para un punto en la celda `p`, el punto relativo al actor es `q = p − origin`. Si se dibuja mirando al lado opuesto, reflejar `qx` alrededor del pivote, no alrededor del bounding box variable. Un rectángulo local `(x, y, w, h)` se refleja como `(-x-w, y, w, h)`. El adaptador convierte estas coordenadas a las convenciones del motor.

Definir si el estilo será pixel art estricto o ilustración inspirada en pixel art. En modo estricto: resolución lógica, paleta y escalado entero con vecino más cercano. No prometer recuperar pixel art limpio reduciendo automáticamente una ilustración detallada; puede requerir retoque.

## 8. Consistencia anatómica y visual

Mantener por personaje las relaciones cabeza/torso/extremidades, volumen corporal, longitud de brazos y piernas, tamaño de manos y zapatos, rostro, línea del cabello, ropa, accesorios y tatuajes. Las deformaciones expresivas o escorzos deben ser intencionales.

Fijar perspectiva, dirección de luz, grosor de contorno a resolución lógica, contraste, niveles de sombra y paleta. Los detalles pequeños se simplifican de forma estable para seguir siendo legibles a escala de juego.

La lateralidad se describe respecto del cuerpo del personaje, no de la pantalla. Anotar tatuajes y accesorios asimétricos; decidir si el espejado del motor es aceptable o requiere variantes. Un único lado generado no garantiza consistencia de ambos lados.

Revisar animaciones en bucle y transiciones entre grupos. Una pose correcta de manera aislada puede producir saltos al alternarla con otra.

## 9. Character Spec en YAML

Campos mínimos: versión de esquema, ID, versiones de estándar/plantilla, estado de aprobación, referencias, apariencia, proporciones, estilo, restricciones y conjuntos de poses. Usar IDs sin tildes para rutas y nombres de presentación con su ortografía normal.

Ejemplo basado en Mariana, **pendiente de validar detalles, lateralidad, medidas y colores**:

```yaml
schema_version: 1
character:
  id: mariana
  display_name: Mariana
  revision: 1
  status: draft
compatibility:
  standard: 1.0.0-draft.1
  pose_template: 1.0.0-draft.1
  export_profile: null
references:
  design: design/selected.png
  master: master/reference.png
  legacy_sheet: ../../references/legacy/mariana/stripe_sheet_mariana.png
appearance:
  hair: cabello claro largo, peinado según referencia aprobada
  top: top deportivo oscuro
  bottom: shorts deportivos rosa
  shoes: zapatillas claras con detalles rosa
  gloves: guantes oscuros sin dedos
  distinctive_features:
    - feature: tatuajes de brazo
      body_side: null
      detail_reference: null
    - feature: tatuajes de pierna
      body_side: null
      detail_reference: null
body:
  build: atlética
  neutral_height_ratio: null
  head_to_body_ratio: null
style:
  family: Amigos y Rivales
  rendering: pixel_art_inspired
  outline: oscuro, grosor a fijar a resolución lógica
  shading: masas de color coherentes
  palette_file: palette.yaml
constraints:
  preserve_identity: true
  preserve_outfit: true
  preserve_tattoo_laterality: true
  canonical_facing: right
frame_sets:
  required: [base, grab]
review:
  appearance_approved: false
  anatomy_approved: false
  unresolved:
    - Confirmar lateralidad de tatuajes
    - Aprobar escala y paleta
    - Crear referencia maestra coherente con la plantilla
```

Las rutas del Character Spec se resuelven desde su carpeta. Las rutas de configuración global se resuelven desde `character-pipeline/`. Definir estas bases en los esquemas para evitar ambigüedad.

Ejemplo de segundo personaje: `character.id: sebastian`, `display_name: Sebastián`, cabello oscuro rizado, camiseta sin mangas oscura y pantalón azul. Completar su propio YAML; no heredar ropa, paleta o tatuajes de Mariana. Para Laura y Rata seguir el mismo esquema sin inventar medidas.

## 10. Generación por grupos o frames individuales

Cada solicitud de generación recibe la Master Character Reference aprobada, el Character Spec, el maniquí de la pose solicitada y las restricciones visuales. Las fotos originales vuelven a utilizarse solo si se reabre el diseño.

Partición inicial que cubre todos los recursos exactamente una vez:

| Grupo | IDs |
|---|---|
| Reposo | `base_01`, `base_02`, `base_03`, `base_15` |
| Caminar | `base_04`, `base_05`, `base_06` |
| Salto/transición | `base_07` |
| Agachado | `base_08`, `base_09`, `base_10` |
| Defensa | `base_11`, `base_12`, `base_21`, `base_24` |
| Daño | `base_13`, `base_14` |
| Ataques | `base_16`–`base_20`, `base_22`, `base_23` |
| Agarre | `grab_01`, `grab_02`, `grab_03` |

Subdividir ataques o generar poses individuales cuando la consistencia lo requiera. Los grupos sirven para organizar generación, no para imponer secuencias al motor.

Guardar cada candidato con ID, revisión, prompt, referencias y parámetros disponibles. Seleccionar explícitamente el aprobado; regenerar una patada no sustituye el resto de frames. Una imagen generada con varias poses es una entrada intermedia: revisar sus recortes antes de convertirla en PNG individuales.

No aceptar texto, numeración, cuadrículas, extremidades cortadas ni fondos simulando transparencia en los PNG finales. Las guías y números pertenecen a previews de revisión.

## 11. Estructura recomendada

```text
repository/
├── docs/
│   └── character-pipeline.md
├── character-pipeline/
│   ├── specs/
│   │   ├── character-standard.yaml
│   │   ├── poses.yaml
│   │   ├── base-order.yaml
│   │   ├── grab-order.yaml
│   │   ├── engine-map.yaml
│   │   └── schemas/
│   ├── templates/
│   │   └── v1/{base,grab}/
│   ├── references/
│   │   ├── photos/<character-id>/
│   │   └── legacy/{laura,mariana,rata,sebastian}/
│   ├── characters/
│   │   └── <character-id>/
│   │       ├── character.yaml
│   │       ├── palette.yaml
│   │       ├── design/
│   │       ├── master/
│   │       ├── generation/       # prompts, entradas y candidatos
│   │       ├── approved/{base,grab}/
│   │       ├── normalized/{base,grab}/
│   │       ├── metadata/
│   │       └── migration.yaml
│   ├── gameplay/
│   │   ├── combat-profiles/
│   │   └── grab-profiles/
│   ├── scripts/
│   ├── tests/fixtures/
│   └── build/<character-id>/     # atlas, manifest y QA derivados
└── public/art/characters/       # destino existente, si lo confirma el repo
```

Adaptar esta estructura al repositorio inspeccionado. No duplicar sistemas de assets ya existentes. Los originales y cualquier material sincronizado bajo `sources/` son de solo lectura; registrar su procedencia y trabajar sobre derivados. Las fotos no deben formar parte de la exportación del juego.

## 12. Metadatos por frame

Separar tres conceptos: metadatos visuales de cada recurso; secuencias y duración de reproducción; datos de combate y sus eventos. No deducir duración, daño o fase activa por el nombre del PNG.

Ejemplo ilustrativo de metadatos visuales; los números y nombres de perfil deben sustituirse por valores aprobados:

```yaml
schema_version: 1
character_id: laura
frame_id: grab_02
frame_set: grab
standard_version: 1.0.0-draft.1
pose_template_version: 1.0.0-draft.1
character_revision: 1
image: normalized/grab/grab_02.png
coordinate_space: cell_pixels_top_left
cell: {width: 256, height: 384}
origin: {x: 128, y: 340}
ground_y: 340
facing: right
support:
  mode: grounded
  contacts:
    - {name: left_sole, x: 88, y: 340}
    - {name: right_sole, x: 182, y: 340}
landmarks:
  visual_grip: {x: 196, y: 180}
trim_offset: {x: 0, y: 0}
root_offset: {x: 0, y: 0}
source:
  file: generation/grab/candidate-002.png
  crop_rect: null
  sha256: null
normalization:
  uniform_scale: null
  translation: null
review:
  status: draft
  report: null
```

En producción, `source.sha256`, transformación y revisión deben estar completos; `crop_rect` puede ser nulo si la entrada ya es un frame completo. `root_offset` es un desplazamiento visual explícito y no altera por sí mismo la posición física. El landmark `visual_grip` ayuda a revisar la mano, pero no sustituye el anclaje mecánico aprobado.

El manifest generado agrega por frame su `sourceRect` en el atlas, tamaño original, pivote, offsets, ruta final y hash. Si el motor requiere pivotes normalizados, derivarlos del pivote canónico; no mantener dos valores editables independientes.

## 13. Hitboxes, hurtboxes y agarre fuera del PNG

Definir en archivos de combate independientes:

- Hurtboxes: regiones vulnerables del actor.
- Hitboxes: regiones activas de un ataque, con sus ventanas y propiedades.
- Zona de captura: región y condiciones que permiten iniciar un agarre; puede tener reglas distintas a un golpe.
- Cuerpo de movimiento o pushbox: colisión física entre actores si existe en el juego.
- Anclajes de agarre, offsets relativos y eventos de sincronización.

Usar coordenadas locales respecto del pivote, con unidades declaradas. Convertir a unidades del motor en un único adaptador. El PNG y su transparencia no determinan alcance, daño ni colisión. Las cajas dibujadas en una preview son superposiciones de depuración y no se hornean en la textura.

Si todos los personajes comparten capacidades, pueden compartir un perfil mecánico versionado, aunque sus alturas visuales difieran. Validar la correspondencia visual y registrar excepciones explícitas. Sustituir arte no modifica silenciosamente los datos de combate.

Para el agarre, verificar en preview que el punto del atacante y el de la víctima coincidan según el offset definido, durante toda la sujeción. Validar ambas orientaciones y personajes de distinta altura. El motor debe poder liberar a la víctima de manera determinista también en cancelaciones; no depender del último PNG para terminar la interacción.

## 14. Validaciones automáticas y revisión visual

La herramienta produce un informe por personaje con errores bloqueantes, advertencias y revisiones humanas pendientes. Las tolerancias se fijan en el estándar; no esconderlas en scripts.

| Comprobación | Regla / resultado esperado |
|---|---|
| Esquemas | YAML/JSON válido, versiones compatibles, campos obligatorios completos y rutas existentes. |
| Cobertura | IDs base 01–24 y grab 01–03 completos, únicos y en orden de exportación explícito. |
| Geometría | Dimensiones exactas de celda y canvas; rectángulos dentro de límites y sin solapamientos involuntarios. |
| PNG y alfa | Formato aprobado, contenido no vacío, transparencia real cuando se exige; detectar halos y píxeles aislados como advertencias. |
| Recortes | Nada cortado; advertir contenido que toca bordes y requerir revisión. |
| Pivote y apoyos | Pivote compatible con perfil; apoyos anotados alineados dentro de tolerancia. Excluir poses aéreas de la regla de pies en suelo. |
| Escala y anatomía | Comparar landmarks/proporciones anotadas con la referencia; alertar cambios injustificados. No usar únicamente bounding boxes entre poses diferentes. |
| Estilo | En pixel art estricto, comprobar paleta/escala cuando corresponda; identidad, escorzo y sombreado requieren revisión visual. |
| Secuencias | Claves del motor resueltas, frames referenciados existentes, tiempos positivos y eventos en ventanas válidas. |
| Combate | Geometrías válidas, unidades explícitas, fases activas declaradas y compatibilidad de perfiles. |
| Agarre | Roles, anclajes y eventos completos; pruebas de captura, fallo, cancelación, liberación y espejado. |
| Reproducibilidad | Mismas entradas aprobadas/configuración/herramientas producen mismos píxeles y metadatos canónicos. |
| Integración | El cargador real consume el resultado y mantiene índices, escala y orientación previstos. |

La detección automática de landmarks es una ayuda opcional, no prueba de corrección. Si no puede localizar un apoyo con confianza, exigir anotación/revisión; no desplazar automáticamente el sprite basándose en el píxel más bajo.

Generar contact sheets, overlays con pivotes/suelo, previews de animación a escala real y ampliación sin suavizado, y una escena con dos actores para agarre. La aceptación necesita tanto validaciones técnicas como revisión visual humana.

## 15. Ensamblaje automático

1. Cargar el estándar, los specs aprobados y el mapeo de exportación; rechazar decisiones obligatorias pendientes.
2. Resolver PNG aprobados y verificar hashes/versiones.
3. Normalizar mediante transformaciones guardadas, sin deformar ni recentrar por frame automáticamente.
4. Validar las celdas normalizadas.
5. Crear canvas transparente según el perfil y colocar cada recurso en su rectángulo explícito.
6. Emitir atlas base, atlas de agarre y manifest, o el formato confirmado por el adaptador del juego.
7. Generar previews e informe; comprobar que extraer cada región del atlas recupera la celda normalizada.
8. Publicar mediante sustitución atómica solo tras aprobación y controles completos; conservar la versión anterior para revertir.

Las salidas de build son derivadas: no se editan a mano. Mantener orden estable, serialización canónica y versiones de herramientas; excluir marcas de tiempo variables del contenido cuya igualdad se verifica. Registrar fecha de ejecución en un informe separado si se necesita.

## 16. Versionado y migración de los cuatro personajes

Versionar por separado esquema de datos, estándar, plantilla de poses, diseño del personaje, perfil de combate y adaptador del motor. Usar `1.0.0-draft.1` mientras falten decisiones y publicar `1.0.0` al aprobarlas.

Un cambio incompatible de pivote, coordenadas, dimensiones consumidas o significado de IDs requiere nueva versión mayor o una migración explícita. Una extensión opcional compatible puede ser menor; correcciones sin cambio de contrato pueden ser patch. Nunca cambiar la interpretación de un ID existente sin declararlo. Los personajes antiguos deben señalar qué versión usan.

| Personaje | Tratamiento inicial |
|---|---|
| Laura | Preservar hoja original, extraer y verificar 24 poses. Crear maniquí maestro corregido y Master Character Reference. Incorporar el agarre como lote separado, con escala y recortes medidos. |
| Mariana | Conservar identidad; mapear sus 21 figuras por significado, identificar faltantes respecto a la base y generar solo lo necesario. Crear su extensión de agarre desde la plantilla aprobada. |
| Rata | Mismo proceso, revisando especialmente consistencia de tatuajes, prendas claras y bordes. |
| Sebastián | Mismo proceso, conservando ropa, cabello y proporciones. Revisar poses aéreas y transición a agarre. |

Cada `migration.yaml` registra archivo y hash original, región manual de cada figura, ID destino, confianza, estado (`reuse`, `retouch`, `regenerate`, `missing`) y nota de revisión. No concluir que bastan exactamente tres figuras nuevas por tener 21 visibles: puede haber duplicados o poses sin correspondencia. Ninguna equivalencia dudosa se aprueba automáticamente.

Completar un piloto con Laura y después un segundo personaje antes de migrar el resto. Conservar los assets activos del juego hasta que el nuevo paquete pase integración.

## 17. Flujo end-to-end

1. Inspeccionar repositorio, cargadores, animaciones y combate; inventariar referencias y discrepancias.
2. Validar catálogo base y agarre contra el código; resolver nombres, tiempos y correspondencias.
3. Aprobar perfil geométrico, escala, convención de pivote y reglas de suelo.
4. Diseñar el maniquí maestro de 24 + 3 poses y registrar landmarks/apoyos.
5. Seleccionar fotos útiles y producir Character Design.
6. Aprobar Character Spec y Master Character Reference juntos.
7. Generar por grupos o poses individuales, guardando procedencia y candidatos.
8. Seleccionar, retocar y normalizar frames; marcar pendientes sin ocultarlos.
9. Ejecutar validaciones y revisar previews, incluyendo agarre con una víctima.
10. Asociar recursos a secuencias y perfiles de combate independientes.
11. Ensamblar automáticamente y probar en el juego.
12. Aprobar paquete, versionar y publicar; regenerar únicamente los recursos afectados en futuras revisiones.

## 18. Responsabilidades

| Responsable | Trabajo |
|---|---|
| ChatGPT y herramientas de generación de imágenes | Ayudar a interpretar referencias, proponer diseño, redactar instrucciones visuales, crear referencias maestras y candidatos de poses, corregir inconsistencias mediante iteración. |
| Codex | Inspeccionar el repositorio, proponer arquitectura, implementar esquemas, inventario, recortes reproducibles, normalización, validadores, ensamblaje, previews, adaptadores y pruebas. Registrar entradas/salidas y preparar solicitudes de generación. |
| Persona responsable de arte/juego | Aprobar identidad, estilo, poses y mecánicas; resolver ambigüedades y revisar visualmente las animaciones. |

La generación de imágenes no garantiza dimensiones exactas, anatomía perfecta ni transparencia correcta. Codex no debe considerar un resultado visual aprobado solo porque el archivo pasa validación. La automatización de llamadas al generador depende de las herramientas disponibles; el pipeline debe aceptar importación manual de candidatos sin bloquear su uso.

## 19. Criterios de aceptación

- [ ] Catálogo base de 24 poses y extensión de 3 agarres documentados con mapeo confirmado contra el juego.
- [ ] Perfil de canvas/celda, escala, pivote, suelo y tolerancias aprobado, sin valores obligatorios pendientes.
- [ ] Plantilla de maniquí y referencias maestras versionadas.
- [ ] Character Spec aprobado para cada personaje que se publique.
- [ ] Todos los recursos exigidos por el perfil completos y con procedencia trazable.
- [ ] Sin recortes accidentales, variaciones injustificadas de volumen ni pérdida de rasgos distintivos.
- [ ] Transiciones y loops sin saltos de pivote o suelo no intencionales, revisados a escala real.
- [ ] Transparencia y estilo correctos sobre fondos claros y oscuros.
- [ ] Hitboxes, hurtboxes y reglas de agarre externas al PNG y compatibles con ambas orientaciones.
- [ ] Agarre probado con dos actores: captura, fallo, sujeción, interrupción y liberación; variantes de víctima resueltas.
- [ ] Ensamblaje reproducible e informe sin errores bloqueantes ni revisiones obligatorias pendientes.
- [ ] Integración verificada y posibilidad de revertir al paquete anterior.

Una migración parcial puede aceptarse como hito de trabajo, pero no se etiqueta como personaje completo si le faltan recursos requeridos.

## 20. Roadmap de tickets pequeños

Los tickets son una propuesta para revisar tras inspeccionar el repositorio. No autorizan implementar todo en una sola modificación.

| Ticket | Entregable acotado | Depende de | Criterio de cierre |
|---|---|---|---|
| T01 | Inventario de assets y contratos actuales | — | Informe con cargadores, claves, dimensiones, pivotes y uso de agarre; sin modificar código del juego. |
| T02 | Mapa Laura base + agarre → motor | T01 | 27 recursos identificados; ambigüedades documentadas y resueltas antes de aprobar. |
| T03 | Decisión de arquitectura y perfil geométrico | T01–T02 | Propuesta revisable con medidas, unidades, adapters y decisiones pendientes. |
| T04 | Esquemas y configuración versionada | T03 | Lectura/validación de YAML y rechazo de configuración incompleta en producción. |
| T05 | Inventario y manifiesto de recortes legacy | T02, T04 | Rectángulos medidos; originales intactos; extracción revisable de Laura y agarre. |
| T06 | Plantilla maestra de poses base | T05 | 24 maniquíes con apoyos/landmarks revisados. |
| T07 | Plantilla y contrato visual de agarre | T05 | 3 poses y puntos de sujeción; necesidades de víctima identificadas. |
| T08 | Spec y referencia maestra de Laura | T04 | Identidad, proporciones, paleta y estilo aprobados. |
| T09 | Registro e importación de candidatos | T04, T08 | Importar/regenerar un recurso mantiene intactos los demás y conserva procedencia. |
| T10 | Normalización de frames | T06–T09 | Escala uniforme y pivote estable; casos de pie, aéreo, tumbado y agarre verificados. |
| T11 | Validadores técnicos e informe | T10 | Fixtures detectan ID faltante, dimensiones erróneas, alfa inválido y apoyos fuera de tolerancia. |
| T12 | Ensamblador base y agarre | T11 | Atlas y manifest correctos; extracción inversa y repetición del build verificadas. |
| T13 | Visor de revisión visual | T12 | Suelo/pivote, loop, transición, fondos y escala real disponibles. |
| T14 | Perfiles externos de combate | T02, T04 | Cajas y tiempos separados del arte; espejado y unidades verificados. |
| T15 | Sincronización de agarre con dos actores | T07, T13–T14 | Captura, fallo, interrupción y liberación probados con anclajes visibles. |
| T16 | Adaptador al juego y piloto de Laura | T12–T15 | Carga real compatible y paquete reversible aprobado. |
| T17 | Migración piloto de Mariana | T16 | Correspondencias explícitas, faltantes resueltos y flujo completo validado. |
| T18 | Migración de Rata | T17 | Paquete completo conforme al estándar. |
| T19 | Migración de Sebastián | T17 | Paquete completo conforme al estándar. |
| T20 | Automatización de build y guía operativa | T16–T19 | Ejecución documentada y validación automática que no publica paquetes inválidos. |

Mantener cada ticket revisable, con un resultado concreto y pruebas proporcionales. Si falta una decisión artística, preparar opciones y ejemplos; no ocultarla con un valor arbitrario en código.