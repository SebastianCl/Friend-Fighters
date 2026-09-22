# Fighter Friends — Distrito Neón

Juego de pelea 2D para dos personas en un mismo computador, con pixel art detallado basado en la ilustración aprobada. Incluye versus local, práctica, teclado reasignable, mandos estándar, sonido y pantalla completa.

La versión jugable usa **Luchadora 01** y **Espejo**, dos jugadores con el mismo personaje. Los rostros y cuerpos de otros amigos se incorporarán después; esta versión no necesita cuentas ni servidor de aplicación.

## Ejecutar

Requiere Node.js 22 y npm.

```sh
npm install
npm run dev
```

Abrir la dirección que muestra Vite, normalmente `http://localhost:5173/`. La referencia artística estática permanece en `/visual-preview.html`.

```sh
npm run build
npm run preview
```

`dist/` contiene ambas páginas y todos los recursos de arte. El juego actual no requiere fuentes ni imágenes de servicios externos en tiempo de ejecución.

## Controles

| Acción    | Jugador 1 | Jugador 2 |
| --------- | --------- | --------- |
| Moverse   | A / D     | ← / →     |
| Saltar    | W         | ↑         |
| Agacharse | S         | ↓         |
| Puño      | F         | J         |
| Patada    | G         | K         |
| Especial  | H         | L         |

- Mantén la dirección contraria al rival para bloquear en el suelo. No hay daño al bloquear. Agacharse evita los puños altos; los ataques bajos y aéreos tienen poses propias.
- Suelta y vuelve a pulsar para repetir un ataque. El especial recarga durante tres segundos.
- **Esc** o **Start** pausa. **R** reinicia la práctica. Cambiar de pestaña/ventana o desconectar un mando asignado pausa el juego.
- **Guía de controles** permite cambiar y guardar teclas en este navegador. Escape, R, Tab, Enter y Espacio están reservados; no se admiten duplicados.
- Mandos estándar: cruceta/stick para moverse; A/✕ para puño, B/○ para patada, X/□ para especial. Pulsa un botón para que el navegador detecte el mando y asígnalo en la selección. Los menús se operan con ratón/teclado.
- Admitidos: teclado compartido, dos mandos, teclado + mando. Las pulsaciones simultáneas en teclado dependen de su capacidad física.
- El icono de la esquina superior derecha activa la pantalla completa.

Versus: 100 de vida, rounds de 60 segundos, gana quien consigue dos rounds. Un empate repite el mismo round sin conceder puntos. Práctica: rival inmóvil, sin reloj ni victoria, vida restaurada al agotarse y botón de reinicio de posiciones.

## Arquitectura

- `src/combat.ts`: simulación independiente a 60 pasos por segundo, ataques, colisiones, rounds y `combatSpace` para la geometría.
- `src/animation.ts`: atlas de 21 poses y selección de fotograma según el estado y la fase real del ataque.
- `src/arena-renderer.ts`: carga de ilustraciones, anclajes, cámara, efectos y presentación en Phaser Canvas 2D.
- `src/input.ts`: teclado, mandos y preferencias de teclas.
- `src/main.ts` y `src/game.css`: flujo de menús, interfaz y conexión con el motor.
- `src/visual-assets.ts`: referencias de la dirección artística aprobada.

La apariencia se mantiene separada de daño y tiempos. Las hojas de futuros personajes deberán registrar regiones, anclajes y altura anatómica, y conservar los mismos estados de animación. El motor no debe deducir las cajas de daño a partir de los píxeles del traje.

Arte, prompts y decisiones: [integración jugable](docs/combat-v2/README.md) y [prueba visual aprobada](docs/visual-v1/README.md).

## Verificar

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

En Linux, Chromium puede requerir dependencias del sistema (`npx playwright install --with-deps chromium`). Las pruebas de motor cubren también diez partidas simuladas consecutivas; las de navegador recorren una partida por teclado hasta el resultado y la revancha, práctica, controles, mandos simulados y las nuevas animaciones.

### Validación manual pendiente

- [ ] Dos jugadores con teclado físico, probando saltos y ataques simultáneos.
- [ ] Dos mandos físicos y teclado + mando, con desconexión y reconexión.
- [ ] Rendimiento y legibilidad en Chrome y Edge del equipo donde se jugará.
- [ ] Diez partidas humanas seguidas sin bloqueos ni puntuaciones incorrectas.
- [ ] Sesión con amigos para ajustar alcance, respuesta y claridad de las poses.

Las pruebas automatizadas no sustituyen estas comprobaciones. No incluye todavía online, controles táctiles, rival con IA ni personajes adicionales basados en fotos.
