# Friend Fighters · Combate neón

La dirección visual aprobada ya está integrada en `/`, con versus local y práctica. `/visual-preview.html` conserva la prueba estática como referencia artística.

## Arte y animaciones

Se conservaron el escenario, el sprite de guardia y el retrato de `public/art/visual-v1/`. Se generaron dos hojas adicionales con la herramienta integrada **image_gen**:

- `public/art/combat-v2/movement-sheet.png`: caminar (dos pasos), ascenso y descenso del salto, agacharse, bloqueo, reacción al daño, caída, anticipación e impacto de puño/patada/especial, puño y patada agachados.
- `public/art/combat-v2/air-sheet-v2.png`: guardia alternativa de respiración, puño aéreo, patada aérea y especial agachado.

Ambas hojas tienen 1254 × 1254 píxeles y transparencia real. Los prompts originales están en `animation-prompt.md` y `supplement-prompt.md`. Las imágenes se copiaron del resultado de image_gen sin reemplazar el dibujo por figuras programáticas.

Hay 21 poses/regiones en total, incluida la guardia aprobada. Las regiones se declaran en `src/animation.ts`; se usan recortes de textura durante el renderizado, no se supone una cuadrícula perfecta del generador. Cada región tiene anclaje horizontal y altura anatómica de referencia. El borde inferior de su alfa define el apoyo de los pies, evitando que el personaje flote cuando cambia de pose.

`animationFor` usa el estado real del motor y el fotograma del ataque: anticipación, contacto y recuperación. Los ataques bajos y aéreos tienen poses diferenciadas. El golpe mortal muestra reacción y caída; la caída aterriza incluso cuando el golpe ocurrió durante un salto. La pausa congela simulación y animación.

## Integración

- La escena de Phaser usa Canvas 2D y una composición lógica 1280 × 720. El fondo es una capa CSS independiente, y la interfaz es HTML accesible. El personaje de pie mide aproximadamente 420 píxeles.
- Cada unidad del combate equivale a dos píxeles de presentación. La cámara se aleja suavemente durante los saltos para conservar la figura dentro de la escena; barras, menús y controles no se alejan.
- `combatSpace` centraliza límites, separación y alturas de los cuerpos. Los alcances y alturas de ataque corresponden a la nueva anatomía. Los cuerpos en el suelo se separan, mientras el salto permite cruzar al rival y cambiar de orientación al aterrizar.
- Se conservan los valores de daño, anticipación, actividad, recuperación, recarga, vida, reloj y puntuación. El movimiento aéreo se ajustó para permitir cruzar al rival con la nueva separación corporal.
- La selección configura personaje y dispositivo por esquina. **Laura** y **Sebastian** comparten las mismas reglas de combate y admiten cualquier combinación, incluidos combates espejo. Indicadores P1 cian y P2 magenta distinguen a los jugadores sin recolorear su rostro o ropa.
- Los recursos deben cargar antes de habilitar el inicio. Un fallo de carga muestra una opción para reintentar.

## Verificación

```sh
npm test
npm run test:e2e
npm run build
```

Las pruebas incluyen todos los casos originales de combate y controles, más sincronización de poses, cobertura de regiones, alcance, golpes altos frente a agachado, cruce aéreo, alfa y márgenes de las hojas, ataques visibles, cámara, pantalla completa y congelación de la pose al pausar.

Capturas de la entrega: `menu.png`, `selection.png`, `guard.png`, `kick.png`, `crouch.png`, `jump.png` y `special.png`. Los tests de navegador actualizan estas capturas al ejecutarse.

La validación con mandos físicos y la sesión de partidas con amigos siguen siendo comprobaciones manuales. Las animaciones son una primera secuencia de poses de combate; esta entrega no afirma disponer de interpolación dibujada entre todos los fotogramas ni de los personajes de nuevos amigos.
