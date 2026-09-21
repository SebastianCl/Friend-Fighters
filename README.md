# Fighter Friends — Arcade Club

Juego de pelea 2D original, para dos amigos en un mismo computador. Primera versión con Rio y Nox, dos personajes genéricos que comparten movimientos. Incluye práctica individual, teclado reasignable, mandos estándar y sonidos sintetizados.

## Ejecutar

Requiere Node.js 22 y npm.

```sh
npm install
npm run dev
```

Abrir la dirección que muestra Vite (normalmente http://localhost:5173). Para generar la versión estática:

```sh
npm run build
npm run preview
```

El resultado está en `dist/`. No requiere servidor de aplicación ni cuentas. La tipografía Barlow se solicita a Google Fonts; sin conexión utiliza fuentes del sistema. El juego y sus ilustraciones no dependen de servicios externos.

## Jugar

- Jugador 1: **A/D** para moverse, **W** para saltar, **S** para agacharse; **F/G/H** para puño, patada y especial.
- Jugador 2: **flechas** para moverse; **J/K/L** para puño, patada y especial.
- Mantener la dirección opuesta al rival bloquea en el suelo. Agacharse reduce la caja de daño; los puños altos pueden pasar por encima. No hay bloqueo aéreo ni daño al bloquear.
- Mantener un ataque no lo repite: soltar y pulsar para atacar de nuevo. El especial recarga durante 3 segundos.
- **Esc** o **Start** pausa; **R** reinicia la práctica. La pérdida de foco o desconexión de un mando asignado pausa automáticamente.
- En **Guía de controles** puedes cambiar teclas. Se guardan localmente. Escape, R, Tab, Enter y Espacio están reservados para la interfaz; no se permiten teclas duplicadas.
- Mandos estándar: cruceta/stick para moverse, botón inferior (A/✕) puño, derecho (B/○) patada e izquierdo (X/□) especial. Pulsa un botón para que el navegador lo detecte y asígnalo en selección. La navegación por menús usa ratón/teclado.
- Pueden jugar dos personas compartiendo un teclado físico, con dos mandos o con teclado + mando. Algunos teclados tienen límites físicos de pulsaciones simultáneas.

Versus: 100 de vida, rounds de 60 segundos, gana quien consigue dos rounds. Un empate no concede puntos y repite el round. Práctica: rival inmóvil, sin reloj; su vida se restaura al agotarse. El reinicio también restaura posiciones.

## Arquitectura y futuros personajes

- `src/combat.ts`: simulación pura a 60 Hz, sin dependencias gráficas. `FighterDefinition` describe apariencia/animaciones; `MoveSetDefinition` describe alcance, daño y tiempos; `InputFrame` contiene las acciones de un jugador.
- `src/art.ts`: escenario y sprites originales dibujados en una cuadrícula de píxeles, convertidos en texturas Phaser una vez. Hay dos frames por pose. Sustituir estas texturas por sprites de los amigos conservando los nombres de animación y el punto de apoyo no requiere cambiar las reglas de combate.
- `src/input.ts`: teclado y Gamepad API, asignaciones y persistencia.
- `src/main.ts`: presentación, escenas, acumulador de pasos fijos, sonido y flujo de menús. La lógica de combate determina el resultado; la frecuencia de render no determina daño ni duración.

El render usa una superficie 640 × 360 con escala proporcional y suavizado desactivado. Las cajas de daño son independientes del arte. Para personalizaciones con proporciones de cuerpo diferentes, primero conservar las cajas comunes para no cambiar el balance accidentalmente.

## Verificación

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Las pruebas del motor cubren daño, anticipación, recuperación, impacto único, bloqueo, ataques aéreos/agachados, separación, orientación, saltos, especial, empate, cronómetro, resultado y diez partidas simuladas completas. Las de navegador recorren práctica, reasignación persistente, pausa, selección, versus real por teclado, resultado y revancha. Las capturas se guardan en `test-results/`.

### Validación manual antes de declarar estable

- [ ] Dos jugadores con teclado físico, incluyendo movimientos y golpes simultáneos.
- [ ] Dos mandos físicos y teclado + mando; asignación, reconexión y Start.
- [ ] Chrome y Edge de escritorio en el equipo de uso real, con rendimiento fluido.
- [ ] Diez partidas humanas consecutivas sin bloqueos ni puntuaciones incorrectas.
- [ ] Sesión con amigos para evaluar respuesta, alcance, tiempos y legibilidad.

Las pruebas automatizadas y los mandos simulados no sustituyen esta validación. Todavía no incluye multijugador online, controles táctiles, IA ni personajes personalizados.

### Resultado de la verificación de esta entrega

- Compilación TypeScript + Vite completada.
- 22 pruebas de motor/entradas aprobadas, incluyendo diez partidas simuladas.
- 5 recorridos de navegador aprobados en Chromium: práctica y controles persistentes, partida completa y revancha, asignación de mando, vista estrecha y desconexión/pausa.
- Revisión visual de menú, vista estrecha y resultado.
- Mandos físicos, Chrome/Edge instalados en el equipo de uso y pruebas humanas: pendientes. Esta entrega es una primera versión jugable; la estabilidad final requiere completar la lista manual anterior.
