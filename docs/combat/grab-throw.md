# Agarre y lanzamiento

El agarre compartido se inicia en el suelo, de pie. Tiene 6 ticks de anticipación, 3 activos y 20 de recuperación. Conecta a 110 unidades entre centros, vence la guardia y falla si el rival salta o se aleja antes del contacto. La sujeción dura 10 ticks; el rival sale hacia delante con velocidad vertical inicial de 8,5 y horizontal de 3 unidades por tick. La caída causa 16 de daño una sola vez, cierra el combo y deja 12 ticks de recuperación. El vuelo no admite golpes de seguimiento.

Se activa con C para el jugador 1, M para el jugador 2 o RB/R1 en mando. Las teclas se pueden cambiar en la guía de controles.

## Arte

Las hojas PNG transparentes de Sebastian, Rata y Mariana están en `public/art/throws/`. La hoja nueva de Laura está en `public/art/characters/laura/grab-sheet.png`, generada con ImageGen integrado a partir de la hoja enviada por el usuario. Cada hoja contiene, de izquierda a derecha, alcance, sujeción y lanzamiento, con la misma línea de suelo. Prompt de producción: «Conserva el aspecto, ropa, proporciones y estilo del personaje de referencia; crea tres figuras completas mirando a la derecha: mano extendida para agarrar, postura firme sujetando a un rival invisible y lanzamiento ascendente hacia delante. Fondo transparente, columnas separadas, sin texto ni otro personaje». Los recortes y anclajes se definen en `src/visual-assets.ts`.
