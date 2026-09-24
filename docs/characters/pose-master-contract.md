# P03 · Semántica artística y contrato de poses maestras

La semántica de las 24 poses base está aprobada. La geometría de sus futuras plantillas todavía no ha sido medida ni aprobada.

## Tres fuentes de verdad

- Identidad: los IDs base_01–base_24 permanecen estables; son la clave de unión entre documentos.
- Arte: [pose-semantics.json](pose-semantics.json) contiene exclusivamente resourceId, label y reserve por pose. Los nombres corresponden literalmente a la aprobación de P03.
- Uso del juego: [laura/engine-map.json](laura/engine-map.json) conserva las claves, fuentes y estados de uso de P02. Su enlace artisticCatalog solo permite consultar la semántica externa; no selecciona animaciones.

Las reservas base_03, base_06, base_09 y base_12 siguen sin asignación. Una reserva no se elimina ni se convierte en un recurso obligatorio del motor por aparecer en el catálogo. No se ha creado una correspondencia automática con otros personajes ni cambiado los tres recursos grab.

## Contrato conceptual

[pose-master-contract.ts](pose-master-contract.ts) define PoseMasterDraft, un constructor de borradores sin mediciones y una validación de coherencia para autoría. Es una herramienta fuera de src y no es importada por el juego.

| Campo                          | Significado                                                                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| resourceId                     | Referencia a uno de los 24 IDs del catálogo; no es una clave de animación.                                                                                                                                                                                         |
| status                         | draft. Un borrador válido no equivale a una plantilla aprobada ni exportable.                                                                                                                                                                                      |
| coordinateSpace                | null hasta identificar la imagen de referencia y sus dimensiones. Cuando se mida: imagePath, width, height, units=pixels y origin=top-left. X crece a la derecha e Y hacia abajo. Es el espacio de la imagen anotada, no una decisión sobre celdas de exportación. |
| landmarks                      | Puntos de cabeza, cuello, esternón, pelvis y, por cada lado anatómico, hombro, codo, muñeca, palma, cadera, rodilla, tobillo, talón y punta del pie. Cada entrada tiene position y visibility.                                                                     |
| position                       | null mientras no haya medición. Una posición medida será {x, y}, finita y dentro de la imagen identificada. No se usan ceros como sustituto de valores desconocidos.                                                                                               |
| visibility                     | unreviewed, visible u occluded. Los puntos ocultos o sin revisar mantienen position=null; no se infiere una articulación escondida. visible con position=null significa visible pero todavía no medida.                                                            |
| attributes.facing              | left, right o null: dirección en la imagen. No cambia el significado de izquierda/derecha anatómica.                                                                                                                                                               |
| attributes.laterality          | anatomical: left/right siempre son los lados del personaje, nunca el lado de la pantalla.                                                                                                                                                                          |
| attributes.lateralityConfirmed | false hasta revisar esa identificación. No asignar una pierna de apoyo izquierda/derecha mientras siga sin confirmar.                                                                                                                                              |
| attributes.hands               | Estado independiente de cada mano anatómica: open, fist, relaxed o null si está pendiente. Una mano oculta no se completa por simetría supuesta.                                                                                                                   |
| attributes.supportLeg          | left, right, both, none o null. Indica piernas que soportan peso a través de pie o rodilla. none no significa necesariamente airborne: un cuerpo tumbado puede apoyarse en espalda/pelvis.                                                                         |
| attributes.airborne            | true, false o null, referido a la intención de la pose maestra. No se obtiene del estado actual de la simulación.                                                                                                                                                  |
| groundContacts                 | null = contactos sin revisar; [] = ausencia confirmada de contacto. Cada contacto identifica site, position y supportsWeight (true, false o null). Tocar el suelo y soportar peso son atributos distintos.                                                         |

Los sitios de contacto admiten pies, rodillas y palmas anatómicos, espalda, pelvis y cabeza. Esto permite describir tanto posturas de pie como base_14 o base_20 sin forzar todos los apoyos a los pies. Sus coordenadas pueden seguir pendientes aunque el contacto esté identificado.

El constructor crea todos los landmarks con position=null y visibility=unreviewed; coordinateSpace, contactos y atributos aún desconocidos quedan en null. No hay coordenadas de producción ni mediciones asignadas a las 24 poses en P03.

## Coherencia exigida

- Un borrador debe referenciar un ID existente y contener los 22 landmarks esperados.
- Una coordenada necesita un espacio de referencia explícito; no puede ser infinita, estar fuera de la imagen o atribuirse a un landmark oculto.
- Los sitios de contacto no pueden duplicarse ni inventarse fuera del vocabulario del contrato.
- airborne=true exige groundContacts=[] y supportLeg=none. airborne=false no admite una lista confirmada vacía; null permite conservar contactos pendientes.
- La pierna de apoyo debe ser coherente con los contactos que soportan peso cuando estos ya están determinados. Los apoyos de mano y cuerpo se registran aparte.
- Estos controles no certifican anatomía, mediciones, calidad visual ni preparación para producción. No hay importador, exportador, perfil geométrico o integración nueva con el motor.

## Intención para futuras plantillas

- 01–03 y 15: variantes de guardia neutral. No se asignan fases respiratorias ni carga de ataque. Las diferencias exactas de torso/manos quedan por diseñar.
- 04–06: variantes de marcha. Quedan pendientes fase, alternancia de piernas y contactos de cada variante; el orden numérico no prueba una secuencia.
- 07: salto recogido, sin contactos. Debe distinguirse del rodillazo de 22.
- 08: agachado abierto. No declarar automáticamente que representa aterrizaje o descenso.
- 09: alcance bajo de reserva. La mano cercana al suelo no implica apoyo de carga.
- 11–12: definir la barrera del antebrazo y la guardia alta unilateral, respectivamente, incluyendo el brazo secundario.
- 14: cuerpo tumbado boca arriba con apoyos corporales; no redefinirlo como pose aérea porque el motor lo muestre durante un lanzamiento.
- 17: rodilla elevada como preparación de patada, con pierna de apoyo declarada. No etiquetarla como impacto de rodilla.
- 20: patada baja con apoyo de mano. Queda por identificar la mano y la pierna anatómicas.
- 21 y 24: empujes de palmas de pie/agachado; no son bloqueos ni implican energía o proyectiles por defecto.
- 22: rodillazo aéreo con rodilla dirigida al objetivo y puños recogidos; se requiere una silueta distinguible de 07.
- 23: patada aérea extendida, sin contactos.

## Discordancias conservadas

El motor mantiene land → base_08, punch-wind/special-wind → base_15, special-hit → base_21 (también en el aire), air-punch → base_22, low-special → base_24 y fall → base_14. Estos hechos de P02 no redefinen las etiquetas artísticas aprobadas. Cualquier revisión de esas asignaciones requiere un ticket posterior autorizado.

## Pendientes para P04

Antes de producir plantillas medidas, decidir la imagen de referencia de cada plantilla, perfil geométrico, escala, coordenadas y tolerancias; definir lateralidad, apoyos y estados de manos que hoy no estén confirmados; y precisar diferencias entre variantes de guardia/marcha y entre 07/22. Medir y revisar landmarks será trabajo posterior; este contrato no proporciona sus valores.

La aprobación artística de P03 no aprueba pivotes, hitboxes, timings ni cambios del motor. El roadmap Txx del documento inicial es una propuesta histórica; P03 aquí corresponde exclusivamente a la decisión artística solicitada y aprobada por el usuario.

## Validación

Ejecutar npm test y npm run build. Las pruebas de P03 verifican etiquetas, cobertura, reservas, separación del catálogo respecto al uso del motor y coherencia del contrato; P02 sigue contrastando las asignaciones reales. Los ejemplos numéricos en pruebas son fixtures sintéticos, nunca mediciones de Laura.

El contrato TypeScript está fuera del build del juego. Para comprobar sus tipos: `./node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler docs/characters/pose-master-contract.ts`.
