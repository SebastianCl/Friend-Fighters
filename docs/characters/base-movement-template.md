# P08 — Base Movement Template v1

P08 fija relaciones corporales, intención y apoyos para los 24 `base_XX`.
La anatomía, estatura y proporciones pertenecen al Character Spec; las coordenadas
finales pertenecen a una instancia de personaje. Laura legacy es evidencia
histórica, no una plantilla anatómica ni geométrica universal.

## Documentos y fuentes de verdad

- `base-movement-template.json`: documento global, `schemaVersion: 1`,
  `templateVersion: 1.0.0`, `status: structure-approved`. Contiene 24 definiciones,
  restricciones cualitativas, variaciones, marcha y contrato del maniquí.
- `schemas/base-movement-template.schema.json`: esquema cerrado de esa versión.
  El contrato TypeScript añade coherencia semántica y reutiliza las reglas de P03
  para contactos, lateralidad y airborne, y las referencias de P05.
- `schemas/movement-template-instance.schema.json`: extensión **separada y
  explícitamente versionada**, `instanceVersion: 1.0.0`, para datos de autoría por
  personaje. Referencia con SHA-256 el Character Spec P05 y esta plantilla;
  declara variante lateral y `neutralPelvisReference`. No incrusta ni modifica
  el Character Spec y no se ha creado una instancia real de Laura.
- P03 sigue siendo la única autoridad para etiquetas y reservas: la unión es por
  `resourceId`. P04 sigue siendo la autoridad geométrica. Las referencias a P03,
  P04 y la configuración global P05 incluyen path, versión y SHA-256; deben
  coincidir con las referencias globales P05. No se cambian sus esquemas.
- `engine-map.json` conserva por separado los usos del motor. Esta plantilla no
  contiene claves del motor ni asigna recursos reservados.

La extensión admite el pipeline `1.0.0-draft.1`. Cambiar políticas, vocabulario o
firmas estructurales exige una revisión/versionado explícito del contrato y sus
validaciones; no basta con renombrar una pose o añadir un campo suelto.

## Lectura del formato

Cada pose tiene `resourceId`, `intent`, `family`, `structure`, una explicación,
`criticalLandmarks`, `variableLandmarks`, `allowedVariations` y un estado explícito
`character-instance-pending` para coordenadas. No hay coordenadas en la plantilla.

`structure` declara torso, relación cabeza/pelvis, brazos, piernas, carga,
ejecutor, dirección, manos, pierna de apoyo, airborne, superficies de contacto y
relación con pelvis neutral. Los códigos tienen significado estable; los textos
explican su lectura visual. Los validadores comprueban las combinaciones de
códigos. No verifican que una imagen futura cumpla esas relaciones: eso necesitará
instancia, anotaciones, controles visuales y revisión.

Los 22 nombres de P03 se reparten sin omisiones ni duplicados entre críticos y
variables. **Crítico no significa coordenada fija**: identifica articulaciones
cuya relación hace reconocible la pose. **Variable no significa libre**: sigue
sujeto a anatomía, longitud constante de segmentos, apoyos y estructura. En
particular, mover un pie no permite levantar un contacto de apoyo declarado.
Las posiciones de contactos superficiales son anotaciones independientes de los
centros articulares.

Las variaciones permitidas son cualitativas y están acotadas por la estructura.
El parámetro de variación no permite cambiar manos, apoyos, airborne, miembro
ejecutor, longitud de huesos ni escala. Ropa, pelo, volumen, estilo y longitudes
corporales pueden diferir **entre personajes**, según su Character Spec, pero no
fluctuar arbitrariamente entre poses de un mismo personaje. No se fijan grados,
distancias, coordenadas o tolerancias anatómicas porcentuales.

## Las 24 poses

Las etiquetas de esta tabla son las aprobadas en P03. I/D significan izquierda y
derecha **anatómicas**, en la variante de autoría predeterminada. En todas las
poses son críticos cabeza, cuello, esternón y pelvis. El JSON especifica la lista
completa de landmarks críticos y variables por pose.

| ID      | Semántica P03 y estructura                                                       | Manos I/D         | Apoyos; airborne                                       | Variación permitida                            |
| ------- | -------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------ | ---------------------------------------------- |
| base_01 | Guardia neutral A: equilibrada, torso 3/4; puño I ante pecho, D junto a mejilla  | puño/puño         | ambos pies; no                                         | distancia de guardia                           |
| base_02 | Guardia neutral B: compacta; codos próximos, manos centrales                     | puño/puño         | ambos pies; no                                         | distancia de guardia sin perder compacidad     |
| base_03 | Guardia neutral C — reserva: exploratoria; antebrazo I avanza aún flexionado     | puño/puño         | ambos pies; no                                         | alcance de guardia sin convertirse en golpe    |
| base_04 | Marcha A: contacto I delante; brazo D adelantado                                 | relajada/relajada | talón I + antepié D; no                                | amplitud de paso                               |
| base_05 | Marcha B: paso sobre I; D pasa bajo pelvis                                       | relajada/relajada | planta I; no                                           | flexión y despeje de pierna oscilante          |
| base_06 | Marcha C — reserva: contacto D delante; brazo I adelantado                       | relajada/relajada | talón D + antepié I; no                                | amplitud de paso                               |
| base_07 | Salto recogido: recogimiento bilateral, sin rodilla atacante                     | puño/puño         | ninguno; sí                                            | plegado bilateral sin convertirse en 22        |
| base_08 | Agachado abierto: pelvis baja, brazos abiertos/bajos                             | abierta/abierta   | ambos pies; no                                         | apertura de brazos                             |
| base_09 | Alcance bajo — reserva: torso inclinado, mano D alcanza bajo sin apoyarse        | puño/abierta      | ambos pies; no                                         | distancia de alcance                           |
| base_10 | Guardia agachada: base baja de 08 y protección compacta                          | puño/puño         | ambos pies; no                                         | distancia de guardia                           |
| base_11 | Defensa de antebrazo: barrera I oblicua/transversal ante cara y pecho            | puño/puño         | ambos pies; no                                         | inclinación de barrera                         |
| base_12 | Guardia alta unilateral — reserva: I junto a sien, D junto a esternón            | puño/puño         | ambos pies; no                                         | altura de guardia unilateral                   |
| base_13 | Reacción de impacto: cabeza/torso retroceden, rodillas absorben                  | relajada/relajada | ambos pies; no                                         | amplitud de reacción                           |
| base_14 | Derribo tumbado boca arriba: eje horizontal, cabeza atrás y pies delante         | relajada/relajada | superficies posteriores de espalda, pelvis, cabeza; no | flexión de reposo sin perder apoyos            |
| base_15 | Guardia neutral D: mayor giro y carga posterior D; sigue siendo guardia          | puño/puño         | ambos pies; no                                         | giro del torso                                 |
| base_16 | Puñetazo recto de pie: derecha extendida, izquierda protege                      | puño/puño         | ambos pies; no                                         | alcance sin bloquear codo                      |
| base_17 | Preparación de patada con rodilla elevada: D elevada y tibia plegada             | puño/puño         | pie I; no                                              | altura de cámara de patada                     |
| base_18 | Patada alta de pie: D extendida hacia nivel alto del propio cuerpo               | puño/puño         | pie I; no                                              | alcance y compensación preservando patada alta |
| base_19 | Puñetazo agachado: recto D desde base baja                                       | puño/puño         | ambos pies; no                                         | alcance sin levantar pelvis a postura de pie   |
| base_20 | Patada baja con apoyo de mano: extensión D baja, I flexionada y palma D sostiene | puño/abierta      | pie I + palma D; no                                    | separación entre apoyos                        |
| base_21 | Empuje de palmas de pie: palmas hacia delante, codos suaves                      | abierta/abierta   | ambos pies; no                                         | separación de palmas                           |
| base_22 | Rodillazo aéreo: rodilla D dominante hacia delante, talón recogido, I atrás      | puño/puño         | ninguno; sí                                            | proyección de rodilla sin convertirse en 07/23 |
| base_23 | Patada aérea extendida: extensión y pie D dominan, I recogida                    | puño/puño         | ninguno; sí                                            | alcance manteniendo extensión reconocible      |
| base_24 | Empuje de palmas agachado: lenguaje de 21 desde base baja                        | abierta/abierta   | ambos pies; no                                         | separación de palmas                           |

La tabla resume la variación principal. El JSON añade explícitamente las variaciones
secundarias aprobadas: anchura de apoyo en guardias y poses bilaterales pertinentes;
oscilación de brazos y articulación local de pelvis en marcha; asimetría limitada
del recogimiento bilateral; profundidad agachada; giro/carga posterior; compensación
del torso y plegado de la pierna no ejecutora. Cada parámetro incluye su condición
de conservación estructural. Ninguno introduce escala independiente por pose.

03, 06, 09 y 12 siguen como reservas, sin uso del motor. 08/10/19/24 no son poses
arrodilladas. 17→18 mantiene pierna ejecutora, apoyo y longitudes. 21/24 mantienen
lenguaje bilateral de palmas, con distinta altura causada por la postura.

## Lateralidad y mirror

Autoría predeterminada: I adelantada, D ejecutora donde hay ejecución unilateral.
Las fases de marcha declaran sus contactos propios; esta convención no convierte
la pierna I en la única que puede avanzar. Una instancia futura puede declarar
`lateralVariant: { declaration: opposite, lead: right, executor: left, ... }`.
Esa variante implica resolver de nuevo las restricciones con esos roles, incluidos
brazos, piernas, carga posterior y contactos. No se materializa ni genera en P08.

La variante de autoría y el facing son operaciones diferentes. El mirror por
facing refleja coordenadas alrededor de `(160,328)` y **conserva todos los IDs
anatómicos**. `left_palm` continúa siendo la palma izquierda, esté al lado que
esté de la pantalla. Los contactos de superficie siguen la misma regla.

## Marcha y continuidad de autoría

`04 contacto I → 05 paso/apoyo I → 06 contacto D → paso/apoyo D no almacenado → 04`.

La transición no almacenada tiene `resourceId: null`, apoyo plantar D, pierna I
oscilante y manos relajadas. No es un recurso 28 ni un `base_25` ni una modificación
de animación. El motor continúa usando sus dos recursos y 06 sigue reservado.

Para una futura referencia continua se interpolan articulaciones conservando
longitudes, con el contacto plantado durante su fase. De 04 a 05 el peso pasa a I,
D despega y pasa; de 05 a 06 D avanza a contacto de talón; después I despega y pasa
bajo pelvis sobre apoyo D antes de volver a 04. Los brazos oscilan en oposición.
La traslación necesaria para observar un paso plantado es la trayectoria externa
al root, no un desplazamiento incorporado al sprite. No se añaden timings,
velocidades, trayectorias mecánicas ni interpolación al renderer actual.

## Root, pelvis, suelo y aire

El único origen del actor es P04: frame `320×352`, pivot `(160,328)`, suelo `Y=328`,
densidad `0.75` unidades/píxel. Se mantiene:

`source image → canonical frame → actor local space → simulation world → scene/screen`.

`neutralPelvisReference` es una referencia anatómica **por personaje**, almacenada
como punto del frame canónico cuando exista evidencia. No aplica traslación a los
actores ni añade `bodyRoot`. Su equivalente local es
`((x−160)×0.75, (328−y)×0.75)` antes del facing. Todos los frames conservan el mismo
pivot, densidad y anatomía; pelvis y articulaciones se colocan como parte de la
postura, sin centrar por alfa y sin escalar para llenar la celda.

- Guardia, marcha, defensa y ataques de pie: pelvis relativa a la referencia
  neutral y apoyos declarados sobre el suelo. Giros y cargas son articulación.
- Agachadas: pelvis baja mediante flexión, con raíz y longitudes conservadas.
- Reacción: cabeza/torso retroceden respecto a pelvis; no se añade desplazamiento
  físico por el arte.
- Aéreas 07/22/23: `pelvis_center` comparte el punto local de referencia neutral
  del personaje. Las diferencias proceden de articulación de piernas/torso. No
  contienen tres alturas de salto: la trayectoria vertical es de la simulación.
  No hay contactos ni alineación automática del píxel inferior al suelo.
- Tumbada 14: la colocación se resuelve respecto a la misma referencia anatómica
  y raíz, con superficies posteriores explícitas. `head_center` y `pelvis_center`
  no son los puntos de contacto de cabeza/pelvis. La separación hasta la superficie
  depende del volumen del personaje. El desplazamiento anatómico concreto de
  pelvis al tumbarse queda para la instancia y revisión visual; nunca se obtiene
  centrando una bounding box.
- 20: el apoyo de palma es una superficie medida/anotada aparte del centro de mano;
  no se igualan sus coordenadas por convención.

Se heredan las tolerancias P04; P08 no añade umbrales anatómicos. Una anatomía válida
que desborde la celda se informa para revisión; no se reduce silenciosamente.

## Contrato del maniquí paramétrico

Deriva de `Character proportions + Base Movement Template`. Requiere proporciones,
estatura y referencia de pelvis del personaje; no contiene un cuerpo humano de
medidas universales ni utiliza la altura/bounds de Laura. Longitudes de segmentos
y volúmenes se conservan entre sus 24 poses. El maniquí neutral omite ropa,
peinado, rasgos de identidad y textura; conserva las proporciones de **ese**
personaje. La Master Character Reference mantiene la identidad en la generación.

La combinación futura es:

`Character Spec + Master Character Reference + Pose Definition + Parametric Mannequin + Skeleton/Landmarks`.

Outputs de control esperados, aún **no generados**:

1. Referencia de volumen neutral en el frame canónico, asociada a versiones de
   personaje/plantilla y cámara compartida.
2. Esqueleto y los 22 IDs anatómicos en coordenadas canónicas, con referencia a
   proporciones y variante. Es geometría de control **autorizada por autoría**,
   no una medición de articulaciones ocultas de una imagen existente.
3. Overlay de pivot, suelo, pelvis neutral y contactos superficiales independientes.
4. Orden de profundidad de miembros, orientación de palmas y visibilidad
   visible/occluded/unknown bajo la misma cámara. Estas señales desambiguarán
   superposiciones que los 22 puntos 2D solos no resuelven.
5. Informe de restricciones/variaciones, pendientes y márgenes/desbordes P04.

La cámara será común entre poses. `projection` y `parameters` permanecen `null`,
con estado `pending-visual-validation`; **no se aprueba ortográfica** ni valores
concretos. Resolver esos parámetros y el formato final de los outputs requerirá
validación visual y una extensión versionada, no insertar campos ad hoc en P05.

## Validación y límites

```sh
npm run validate:movement-template
node docs/characters/validate-movement-template.mjs --template docs/characters/base-movement-template.json
# Para una futura instancia del esquema P08:
node docs/characters/validate-movement-template.mjs --instance path/to/authoring-instance.json
```

CLI de solo lectura; no compila a disco ni genera assets. Comprueba esquema,
versiones y hashes, catálogo exacto, semántica/estructura, manos, contactos,
airborne, lateralidad, partición de landmarks, marcha, raíz, cámara pendiente y
variaciones. La instancia comprueba además Character Spec mediante P05, identidad,
variante y referencia de pelvis. `pending` exige posición/evidencia nulas;
`specified` exige punto dentro del frame y evidencia con hash verificable. El hash
establece procedencia, **no aprueba por sí solo una medición ni su valor artístico**.

Ambos validadores devuelven `productionReady: false`: aprobación estructural no
es aprobación de un paquete. La instancia P08 v1 solo admite `draft`. P05 sigue
siendo la validación de paquetes existente; P08 no elude su gate de producción ni
marca el draft legacy como completo. El futuro generador tendrá que validar ambos
contratos y sus controles antes de publicar; ese generador no se implementa aquí.

Pendientes: datos reales de cada personaje, coordenadas/contactos de las instancias,
control del maniquí, profundidad, cámara/proyección y revisión visual, materialización
de variantes laterales, criterios anatómicos cuantitativos. P09 puede reutilizar
referencias, distinción entre estructura y anatomía, laterality, root y superficies
para diseñar las poses de agarre. P08 no define agarres ni contratos mano–víctima,
no resuelve release/sincronización y no modifica el renderer (P15).
