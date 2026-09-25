# P09 — Grab Visual Template v1

Contrato aprobado de autoría para `grab_01`, `grab_02` y `grab_03`. Mantiene
separados **anatomía → pose → interacción visual → estado mecánico**. Ninguna
función de este módulo importa el runtime o escribe posiciones físicas. No se
han generado imágenes, modificado sprites ni corregido la sincronización legacy.

## Documentos, versiones y autoridades

- `grab-visual-template.json`: plantilla global `schemaVersion: 1`,
  `templateVersion: 1.0.0`, estado `structure-approved`. Referencia mediante hash
  P03 (semántica y contrato de landmarks), P04, P05, P08 y la evidencia P07.
- `schemas/grab-visual-template.schema.json`: esquema cerrado. Mantiene explícitas
  versiones compatibles y políticas; el validador TypeScript comprueba además
  coherencia entre identidades, manos, apoyos, contactos y fases.
- `schemas/interaction-hand-gestures.schema.json`: extensión de manos
  `contractVersion: 1.0.0` que admite `open`, `fist`, `relaxed`, **`grasp`** y `null`
  cuando el estado se hereda o está pendiente. No cambia el enum cerrado de P03/P08.
- `schemas/grab-composition.schema.json`: composición de dos actores,
  `compositionVersion: 1.0.0`, únicamente `draft`. Referencia la plantilla y una
  instancia P08 independiente por rol. A través de ella se conservan Character
  Spec, anatomía, proporciones, pelvis neutral, variantes y anotaciones propias.
- `grab-visual-contract.ts`: validación, proyección de anchors y diagnóstico puro.
  Reutiliza P03 para apoyos, P04 para transformaciones y P08/P05 para referencias.

No hay Character Specs nuevos ni modificaciones a los existentes. El catálogo
sigue teniendo 27 recursos; los tres de P09 son los ya existentes. `engine-map`
sigue separado y no se modifica. La extensión de autoría no es un nuevo formato
runtime ni una modificación informal de los esquemas P05.

## Roles y poses

Los roles son `attacker` y `victim`, nunca P1/P2 ni screen-left/screen-right.
Cada actor físico tiene identidad distinta; pueden compartir el mismo personaje
(un mirror match). Sus posiciones numéricas pueden coincidir sin que eso
signifique que comparten un root: la identidad y la autoridad física son distintas.

| Recurso                 | Atacante                                                                                                                                     | Víctima                                                                                                           | Vínculos                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `grab_01` reach/attempt | Izquierda adelantada, derecha abierta alcanza con codo flexible; izquierda relajada preparada cerca del torso; ambos pies apoyados           | Conserva pose y estado previos hasta capture; manos/apoyos se heredan                                             | Ninguno activo; intención hacia superficies objetivo   |
| `grab_02` hold          | Base estable, ambos brazos delante, codos flexibles, ambas manos `grasp`, ambos pies apoyados                                                | Postura recibida de pie/agachada y reacción moderada; ambos pies, manos relajadas y brazos despejando la sujeción | Exactamente dos contactos independientes al torso alto |
| `grab_03` throw         | Continuación inmediatamente post-release hacia delante/arriba; manos abiertas, izquierda adelantada sostiene y derecha posterior por antepié | Libre de las manos; pose local desequilibrada, vuelo gobernado por simulación y sin suelo durante flight          | Ninguno activo; impact queda fuera de esta pose        |

Los dos contactos son independientes de ropa, cabello o accesorios. La mano que
sujeta no se describe como puño. El adaptador interno para validar apoyos con P03
usa manos no medidas; `grasp` se valida en su extensión y nunca se escribe en P03
ni se convierte en `fist` para sortear su esquema.

Cada pose declara `structuralConstraints`, `allowedVariations`, landmarks y
anchors críticos. Las variaciones incluyen base de apoyo, flexión articular,
orientación del torso y colocación dentro de la región objetivo. No permiten
cambiar proporciones, estirar segmentos, escalar personajes, cambiar apoyos o
trasladar roots. Los landmarks críticos no son coordenadas fijas; los 22 nombres
anatómicos de P03 conservan su significado.

La anatomía concreta, las coordenadas y la evaluación visual de estas relaciones
pertenecen a instancias futuras. Esta plantilla no demuestra que un bitmap actual
satisfaga el contrato.

## Cuatro conceptos diferentes

1. **Anatomical landmarks:** los 22 puntos de P03, con su evidencia/visibilidad.
2. **Anatomical/body surfaces:** regiones corporales; por ejemplo la superficie
   palmar con dedos o la zona anterolateral del torso alto. No son centros articulares.
3. **Ground contacts:** contacto de una superficie corporal con el suelo y soporte
   de peso. P03/P04 mantienen sus reglas y tolerancias.
4. **Actor-to-actor contacts:** vínculo entre un anchor del atacante y uno de la
   víctima; tiene identidad, endpoints y activación independiente por fase.

La plantilla declara cuatro superficies: izquierda/derecha de mano del atacante
e izquierda/derecha de torso alto de víctima. Su geometría es una región
`character-or-pair-instance-pending`, sin polígonos ni coordenadas universales.
Un punto concreto dentro de la región se resuelve después para personaje/pareja.

Anchors propuestos:

- `left_grip_contact`, `right_grip_contact`, propiedad de attacker.
- `left_upper_torso_contact`, `right_upper_torso_contact`, propiedad de victim.

Cada anchor contiene propietario, lateralidad anatómica, `surfaceId`, espacio
`canonical-frame-pixels`, posición, orientación de superficie, procedencia,
estado `pending/authored/measured` y revisión `pending/approved` con revisor.
En la plantilla todas las posiciones, orientaciones y procedencias son `null`,
y las revisiones están pendientes. La composición permite datos futuros con
procedencia verificable; un hash acredita integridad, no prueba por sí solo la
exactitud anatómica. Una orientación es un vector direccional finito no nulo,
no un ángulo/cámara fijado por P09.

Un anchor `pending` no puede contener coordenadas ni figurar aprobado. Un anchor
resuelto exige posición dentro del frame y procedencia; los datos `authored` del
maniquí se distinguen de observaciones `measured` en una imagen. P03 sigue
prohibiendo inventar coordenadas de landmarks ocultos.

## Emparejamiento y revisión

Candidato inicial:

- `right_grip`: `attacker.right_grip_contact` ↔ `victim.left_upper_torso_contact`.
- `left_grip`: `attacker.left_grip_contact` ↔ `victim.right_upper_torso_contact`.

Se permite declarar el otro emparejamiento uno-a-uno. La revisión mediante maniquí
dual debe decidir si preserva anatomía, acceso a superficies y legibilidad sin
forzar brazos cruzados. La validación de configuración comprueba endpoints y
unicidad, **no afirma detectar cruces de brazos en imágenes no generadas**.

`pairingReview` queda pendiente hasta tener evidencia y revisor. Los IDs de
contacto conservan la mano anatómica, aunque cambie la superficie asociada.
`grip_center` solo podría ser un diagnóstico derivado; no existe como sustituto
de los dos vínculos. Errores opuestos no se cancelan para aprobar una sujeción.

## Root, separación y diagnóstico

Cada actor conserva P04: frame `320×352`, pivot `(160,328)`, suelo nominal `328`,
densidad `0.75`. La pelvis neutral P08 es referencia anatómica individual, no
otra transformación del actor. Cada frame sigue la cadena:

`source image → canonical frame → actor local → simulation world → scene/screen`.

Para un punto canónico `(x,y)`, la posición local es
`((x−160)×0.75, (328−y)×0.75)`. P04 aplica facing y suma el root del actor.
`projectInteractionAnchor` usa exactamente esas funciones. `diagnoseGrabComposition`
devuelve por cada contacto los anchors mundiales, el vector
`worldAnchor(attacker) − worldAnchor(victim)` y su magnitud equivalente canónica.
También devuelve distancia euclídea entre roots en unidades de juego. No devuelve
correcciones de root, escala, pose ni renderer, y no modifica sus inputs.

`rootDistanceRangeGameUnits` y `contactToleranceCanonicalPixels` son `null` hasta
existir evidencia. El intervalo se refiere a esa pareja, articulación, superficies
y facing; no se aprende una constante universal. Una futura evidencia debe
abarcar esas condiciones. Un rango escalar es un filtro adicional: no sustituye
los dos errores de contacto ni resuelve diferencias verticales.

Las composiciones pueden estar `pending`, `compatible` o `incompatible` respecto
a factibilidad, conservando siempre estado documental `draft`. Un diagnóstico
incompatible tiene razones explícitas. Valores/rangos propuestos exigen evidencia;
no se copian los 100 u del motor ni la tolerancia de suelo como tolerancia de manos.
Una declaración `compatible` requiere datos completos/revisados y ausencia de
incompatibilidades. Los inputs pendientes de P08, incluida la validación visual
necesaria, impiden certificar compatibilidad ahora. No se implementa un solver de
anatomía o alcance ni un generador de maniquíes.

Los offsets globales del sprite están prohibidos. Las incompatibilidades se
informan, sin reducir al personaje, estirar brazos ni mover actores para ocultarlas.

## Lateralidad y mirror

Se hereda P08: izquierda adelantada, derecha ejecutora por defecto; una instancia
puede declarar la variante opuesta. Las descripciones laterales de la plantilla
son la convención predeterminada. La futura materialización aplica la variante
explícita a los roles de ejecución/apoyo, conservando los IDs anatómicos del cuerpo
resultante. P09 no materializa nuevos frames ni reasigna recursos.

El mirror por facing **no** cambia roles, manos anatómicas ni superficies. Los
anchors se proyectan desde el frame de cada actor alrededor de su propio pivot.
Sus orientaciones también se transforman: componente X por facing, componente Y
convertida de imagen hacia abajo a mundo hacia arriba. No se refleja otra vez un
punto canónico si facing ya realiza la reflexión: eso la aplicaría dos veces.

Una vista reflejada de la pareja transforma coherentemente ambas posiciones
mostradas y facing. Es una vista de control, nunca una orden al motor. Las pruebas
usan composiciones sintéticas para comprobar reflexión y reversibilidad, sin
intercambiar roles o IDs.

## Oclusión, layering y maniquí dual

`occlusion.relations` declara pares `front/back` entre partes identificadas por
rol y parte anatómica. Se comprueban ciclos, relaciones duplicadas y autorrelaciones.
Si las relaciones exigen partes de attacker delante de victim **y** partes de
victim delante de attacker, se exige `requiresLayering: true`. El orden de dos
sprites completos no puede satisfacer ese patrón. Una revisión puede declarar
otras necesidades de capas; no se descartan porque las relaciones sean parciales.

No se implementan layering, máscaras o cambios de orden de dibujo. No se infiere
profundidad del jugador, facing o screen-left. Cámara/proyección siguen pendientes
según P08; las relaciones aprobadas deben corresponder a la vista común futura.

El maniquí dual recibe ambos Character Specs/instancias P08, pose, emparejamiento
y observaciones mecánicas. Cada actor conserva su celda; la escena de control no
necesita encajar a los dos actores en una única celda `320×352`.

Outputs/overlays especificados en JSON, todavía no generados:

- roots/pivots y referencias de pelvis;
- skeletons y 22 landmarks por actor;
- superficies, anchors y vínculos activos;
- vectores/errores de cada contacto;
- separación mecánica observada y rango factible cuando haya evidencia;
- contactos de suelo, facing y lateralidad;
- profundidad/oclusiones y `requiresLayering`.

La matriz conceptual cubre alto→bajo, bajo→alto, torsos anchos/estrechos, brazos
largos/cortos, víctima de pie/agachada, ambos facing y variantes laterales. No se
fijan estaturas. Tres bitmaps fijos no garantizan contacto perfecto en todas las
parejas: un caso que exija nueva articulación, capas o recursos de víctima debe
quedar como incompatibilidad/necesidad futura, sin añadir IDs en P09.

## Temporalidad, víctima y evidencia legacy

Clasificación conceptual, independiente de los estados implementados:

`attempt/reach → capture → hold → pre-release → release → flight → impact/cancel`.

La cancelación puede cerrar una interacción antes del impacto. `grab_02` cubre
capture/hold/pre-release; `grab_03` comienza semánticamente después del release y
puede mantenerse durante la continuación del atacante. No define la duración del
vuelo de la víctima ni su impacto. Una discrepancia entre pose y fase observada se
reporta como incompatibilidad, sin corregir el estado mecánico.

La víctima conserva su pose antes de captura; durante hold recibe restricciones
propias, incluso si estaba agachada. Tras release no está vinculada a manos;
durante flight no tiene contactos con suelo. La postura local no incorpora una
segunda trayectoria. No se añade un resource ID de víctima.

Compatibilidad legacy, no autoridad artística:

- `hurt/base_13` durante la captura.
- `fall/base_14` durante vuelo. P08 define base_14 como tumbada con contactos de
  suelo; **no es una pose aérea canónica**. P09 no redefine sus contactos.
- Separación de referencia 100 u en la simulación. Las posiciones finales también
  pasan por resolución de separación/pared; no debe copiarse solo la asignación
  intermedia del hold.
- `grab_03` aparece entre 1 y 3 ticks antes del release según capture. En las
  trazas revisadas: capture 7/release 17 o capture 9/release 19, mientras el primer
  throw visual aparece en tick 16. Son observaciones, no timings nuevos.
- `attack.hit` no prueba capture: los agarres simultáneos pueden mostrar hold y
  throw sin vínculo efectivo.

P07 conserva fuente, hash, recortes, tamaños `700/600/642×809`, pivotes históricos,
escala y alfa de Laura. Es evidencia referenciada, no un estándar. No se heredan
pivotes por alfa, proximidad de manos, ausencia de víctima, escala, timing ni orden
de dibujo. Se conserva todo `alpha>0`; no se limpia ni reexporta ningún asset.

P17/P18 deberán consumir identidad de interacción/ataque y roles, confirmación y
tick de capture, release, impact, motivo de cancelación, roots/facing finales,
postura recibida y tiempo desde capture. La selección debe ser reproducible bajo
pausa y avance de simulación. P09 no cambia capture, release, timings ni selección.

## Validación y estado de salida

```sh
npm run validate:grab-template
node docs/characters/validate-grab-template.mjs --template docs/characters/grab-visual-template.json
# Para una composición futura del esquema P09:
node docs/characters/validate-grab-template.mjs --composition path/to/composition.json
```

CLI de solo lectura, compilación TypeScript en memoria. Devuelve `errors` para
configuración inválida, `pending` para datos/revisiones legítimamente pendientes,
e `incompatibilities` para una pareja o fase que no satisface el contrato. Termina
con código distinto de cero si hay errores o incompatibilidades. Siempre informa
`productionReady: false`: P09 no publica paquetes ni aprueba personajes.

Las pruebas incluyen fixtures válidos e inválidos, geometría sintética (nunca
medidas reales de Laura), mirror, errores independientes, layering y ausencia de
mutaciones en inputs/archivos. Los valores numéricos sintéticos de pruebas no son
tolerancias o proporciones aprobadas del pipeline.

Pendientes: superficies/anchors concretos, revisión del emparejamiento, geometría
real de ambos personajes, cámara, tolerancias mano–torso, rangos por pareja,
controles visuales y resolución de incompatibilidades. El siguiente ticket P10
puede consumir este contrato junto con P08 para autoría/validación posterior;
P09 no presupone ni implementa su solución, y no asigna significado a los tickets
Txx de la propuesta histórica. La sincronización mecánica queda en P17/P18.
