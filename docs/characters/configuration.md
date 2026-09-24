# P05 · Esquemas y validación de configuración

P05 formaliza la configuración del Character Pipeline. Los esquemas JSON de [schemas/](schemas/) controlan forma, campos obligatorios, valores `null` permitidos y campos desconocidos. [config-contract.ts](config-contract.ts) resuelve versiones y referencias y reutiliza [P03](pose-master-contract.ts) y [P04](geometry-contract.ts) para las reglas de pose y geometría. El juego no importa estos módulos.

## Fuentes de verdad y límites

| Ámbito          | Archivo/contrato                                                   | Contenido propio                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estándar global | [pipeline-config.json](pipeline-config.json), `global.schema.json` | `schemaVersion=1`, `pipelineVersion=1.0.0-draft.1`, referencias versionadas y hashes de P01, P03 y P04, e IDs de los tres agarres.                                                                                                                        |
| Character Spec  | `character.schema.json`                                            | ID estable, nombre, revisión, estado/revisión humana, fuentes con roles, referencias de diseño y máster, estatura/proporciones futuras, apariencia y avance por recurso.                                                                                  |
| Pose/frame      | `frame.schema.json`                                                | ID de personaje/recurso, estado/revisión, fuente P01, transformación P04, borrador P03 de landmarks/atributos/contactos, frame canónico, diagnósticos de alfa, puntos visuales y artefacto con hash.                                                      |
| Integración     | `integration.schema.json`                                          | Estado y referencia al `engine-map` separado. Se verifica su identidad, versión, coherencia interna y rutas de fuente contra P01. La correspondencia con el código actual continúa bajo las pruebas de P02 y la integración del renderer pertenece a P15. |

El Character Spec no replica etiquetas de P03, datos de P04 ni claves de P02. Une contratos por ID y versión. P03 conserva las 24 etiquetas base; los tres IDs `grab_01`–`grab_03` son parte del conjunto global. `base_03`, `base_06`, `base_09` y `base_12` siguen siendo reservas: no se les asignan claves de motor, aunque pertenezcan al catálogo de 27 recursos. Las decisiones artísticas y la selección actual del motor continúan independientes.

La configuración global aprobada es la única configuración persistente creada por P05. Los Character Specs y frames usados por las pruebas son **sintéticos y se construyen en memoria**. No se declara un Character Spec definitivo de Laura, Mariana, Rata o Sebastián.

## Versionado

`schemaVersion=1` identifica la forma de los documentos nuevos. Cada Character Spec, frame e integración declara exactamente la `pipelineVersion` global; las diferencias se rechazan. El perfil geométrico se identifica por el ID versionado de P04, `canonical-320x352-v1`, y su `schemaVersion=1`. Las referencias globales deben resolver documentos existentes con versión, ID y SHA-256 coincidentes. El hash fija los bytes aprobados bajo esa versión; actualizar un contrato exige revisar su referencia y versionado. Un cambio incompatible requiere nueva versión y migración explícita; cambiar solo la cadena no valida un formato distinto.

`1.0.0-draft.1` es la versión inicial del contrato de pipeline, como indica la propuesta histórica; no afirma que exista un personaje listo para publicar. `production-ready` se refiere a la completitud de un Character Spec validado, no a un cambio automático de esta versión global ni a integración con el motor.

## Borradores y puerta de producción

El esquema exige los campos estructurales incluso en un borrador. Permite valores `null` **solo** en campos declarados: referencias visuales, estatura y proporciones, fuente/transformación/canonical/output de un frame, coordenadas y estados todavía desconocidos de P03, alfa de un frame sin medir y puntos visuales de interacción. El borrador de anotación P03 conserva `status="draft"` incluso dentro de un frame revisado: ese campo identifica el contrato de anotación existente; el estado del frame y su revisión humana se declaran aparte.

La validación de draft acepta recursos faltantes o pendientes y devuelve `pending` sin tratarlos como cifras medidas. Los recursos desconocidos, referencias rotas, estados contradictorios y datos medidos inválidos siempre son errores, también en draft.

La validación de producción exige:

- Character Spec `production-ready`, revisión aprobada con responsable y nombre/identidad completos.
- Referencias de diseño y máster declaradas con sus roles, estatura y proporciones positivas definidas por el futuro Character Spec y descripción visual no vacía. P05 no fija sus valores.
- Los 27 IDs presentes exactamente una vez, incluidos los cuatro IDs de reserva, con estado `approved` y frame del mismo ID/personaje/perfil/versión.
- Cada frame aprobado, revisado, con fuente P01 verificable, transformación explícita, anotación P03 resuelta según visibilidad, coordenadas canónicas válidas, contactos y atributos coherentes, alfa medido en los dos umbrales y salida existente con hash coincidente.
- Ningún valor pendiente en un campo requerido para producción. Un landmark oculto y marcado `occluded` puede permanecer sin coordenadas; P03 prohíbe inventarlo. `interactionPoints` opcionales pueden estar ausentes; si se declaran, sus coordenadas pendientes bloquean la aprobación.

`status` y `review.status` deben concordar. Un recurso `approved` necesita un frame `approved`; un recurso `pending` no puede apuntar a uno aprobado. Los esquemas cerrados rechazan campos extra como `pending:true` y `approved:true` simultáneos. Una integración con motor puede quedar aparte para P15; si se proporciona, sus referencias y estado se validan. Un paquete puede estar listo para el pipeline sin afirmar que el juego ya lo consume.

Este gate comprueba **metadatos y referencias**, no certifica calidad visual ni que el alfa declarado reproduzca los píxeles del PNG. Las verificaciones de imagen/ensamblaje y la revisión humana de arte pertenecen a tickets posteriores. Una salida con hash permite detectar cambio de bytes, pero P05 no genera, remuestrea ni publica esa salida.

## Regla de procedencia y coordenadas

La fuente de un frame debe figurar en el Character Spec y en el inventario P01. Se comprueba su hash real y que `poseDraft.coordinateSpace` coincide con esa imagen y sus dimensiones. `sourceTransform` usa los campos P04 `sourceOrigin`, `uniformScale` y `translation`; su escala debe ser positiva y sus valores finitos. El validador proyecta landmarks/contactos sin añadir coordenadas. P04 comprueba después pivote `(160,328)`, dimensiones `320×352`, margen, puntos, suelo y alfa. Un desbordamiento es error: nunca provoca reducción automática. El alfa no define el pivote.

En los puntos anatómicos, `left/right` siguen refiriéndose al cuerpo, incluso tras mirror. `groundContacts=null` significa sin revisar; `[]` significa ausencia confirmada. `airborne=true` requiere `[]` y `supportLeg=none`. Para una pose apoyada, los contactos medidos usan la tolerancia provisional de P04. Las dimensiones mecánicas del combate no derivan de este esquema.

## Validación reproducible

```sh
node docs/characters/validate-config.mjs
node docs/characters/validate-config.mjs --character ruta/relativa/spec.json
node docs/characters/validate-config.mjs --character ruta/relativa/spec.json --production
node docs/characters/validate-config.mjs --character ruta/relativa/spec.json --integration ruta/relativa/integration.json
```

La CLI emite `errors`, `pending` y `productionReady` en JSON y sale con error ante fallos. Solo acepta rutas dentro del repositorio, lee archivos sin modificarlos y calcula hashes de referencias utilizadas. La primera invocación valida la configuración global actual. Sin Character Spec, `--production` es un error explícito.

También ejecutar P01 (`inventory-sources.mjs --check`), P04 (`geometry-diagnostics.mjs`), `npm test`, comprobación estricta de tipos de los contratos y `npm run build`. La suite conserva las pruebas P02/P03/P04. Para un Character Spec real aún no existe un caso de producción: las pruebas de completitud usan fixtures sintéticos.

## Preparado para P06

P06 puede registrar rectángulos y procedencia legacy por recurso como datos explícitos, vinculados por ID a este estándar, al inventario P01 y al perfil P04. P05 no crea esos manifiestos, no mide recortes nuevos ni produce assets.
