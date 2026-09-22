# Combos

El motor decide los combos en `Combat.step`, a 60 ticks por segundo. El HUD solo lee `Combat.combos`, indexado por atacante (0 = P1, 1 = P2). No hay secuencias de botones ni condiciones por personaje.

## Contratos de combate

- `Move.hitStun` y `Fighter.hitStun` sustituyen a `stun`; `guardStun` continúa separado.
- Cada ataque creado por el motor recibe un `id` único dentro de la instancia de `Combat`. `Hit` identifica `attacker`, `defender` y `attackId`. `attack.hit` consume el contacto, bloqueado o no, para impedir duplicados durante los frames activos. Los ataques actuales son de un solo impacto.
- `resolveMove` congela los datos y las variantes al iniciar el ataque. `comboWindowFrames` es opcional y se hereda/resuelve igual que las demás propiedades. Por defecto equivale a `hitStun`; puede acortarlo, pero nunca ampliar la elegibilidad más allá de la recuperación del defensor. Cero permite contabilizar el golpe y cerrar inmediatamente la cadena.
- `ComboState` contiene `id`, `defender`, `hits`, `remaining` y `active`. `displayHits` y `displayFrames` conservan por separado la presentación del último resultado de al menos dos golpes. Los identificadores siguen creciendo a través de los reinicios de posiciones.

## Orden y continuidad

Al comenzar el paso se captura si el defensor continúa en hit stun y la cadena tiene ventana restante. Luego se descuentan los temporizadores y se recogen ambos contactos antes de aplicar resultados. Un contacto en el último tick de stun o ventana todavía es válido. En el primer tick recuperado, el contacto inicia una cadena distinta.

Solo un contacto no bloqueado inicia o incrementa el contador. El bloqueo y el chip no lo hacen, aunque cambie la vida. Un golpe válido renueva la ventana con sus propios datos; un fallo no la renueva. La guardia mantenida durante hit stun no protege hasta que el defensor se recupere.

Después de acreditar ambos contactos, el motor finaliza las cadenas por expiración, recuperación, golpe recibido por el atacante, KO o final de round. Los intercambios cuentan los impactos y cierran ambas cadenas simétricamente. La restauración automática de vida en práctica no conserva una cadena activa; el reinicio explícito borra también su presentación.

## Tiempos y presentación

El hit stun es de 30 frames para puño, 44 para patada y 26 para especial. Startup, frames activos, recuperación, daño, alcance, empuje y guard stun conservan sus valores anteriores. Estos datos permiten enlazar puño → patada → especial a distancia de contacto, iniciando cada movimiento después de completar la recuperación del anterior. El input sigue requiriendo nuevas pulsaciones y no tiene buffer ni cancelaciones.

El HUD muestra `2 HITS`, `3 HITS`, etc. bajo el jugador atacante, independientemente de su posición física. Tras terminar la cadena, conserva el resultado durante 60 ticks. Una nueva cadena no reemplaza el resultado anterior hasta llegar a dos golpes. La pausa congela ambos temporizadores; la transición entre rounds permite consumir la duración visual. Menú, resultado final y reinicios limpian el contador.

## Extensiones

Los datos resueltos de `Move` son el lugar para futuras propiedades por ataque. La resolución de contacto es el punto para aplicar damage scaling antes de descontar vida; el estado de combo permite consultar longitud e identidad. Las cancel windows deben integrarse con la elegibilidad de inicio de ataques, y los command/motion inputs deben resolver intenciones antes de ese inicio. Para ataques multi-hit habrá que ampliar explícitamente el consumo de contactos con identificadores de impacto dentro de una instancia, sin retirar la protección contra duplicados.

No se implementan scaling, cancelaciones, inputs de movimiento ni límites. Por ello, en una esquina pueden existir cadenas largas al repetir ataques mientras sus tiempos y alcance lo permitan; el balance futuro queda en datos/reglas del combate.

## Validación

`tests/combo.test.ts` cubre cadenas con inputs de producción, simetría y cambio de lados, límites de frames, ventanas, recuperación, duplicados, bloqueo/chip, intercambios, KO, práctica y reinicios. `tests/browser/combo.spec.ts` usa teclado y reloj controlado en Chromium para comprobar texto, jugador, pausa, desaparición y bloqueo/chip, con capturas en escritorio y vista estrecha.
