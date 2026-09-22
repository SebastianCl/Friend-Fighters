# Sebastian · arte de combate

`reference.jpg` es la hoja entregada por el usuario. Se utilizó como referencia de identidad para conservar el rostro, el cabello rizado, la camiseta negra, el pantalón gris, los tenis blancos y la manga tatuada del brazo izquierdo.

## Assets de producción

- `public/art/characters/sebastian/animation-atlas.png`: atlas RGBA de 1024 × 1536 con 21 poses aisladas. Las regiones no son una cuadrícula rígida; sus coordenadas se registran en `src/visual-assets.ts` para evitar recortar patadas y caídas.
- `public/art/characters/sebastian/portrait.png`: retrato RGBA para la selección de personaje.

## Prompt del atlas

Se pidió a ImageGen reorganizar la referencia en un atlas 4 × 6 con fondo transparente y completar estas poses, en orden: guardia, respiración, dos pasos, ascenso, aterrizaje, agachado, bloqueo, daño, caída, anticipación e impacto de puño, anticipación e impacto de patada, puño y patada bajos, anticipación e impacto de especial, puño aéreo, patada aérea y especial agachado. Las tres últimas celdas debían quedar vacías.

Invariantes: misma identidad, ropa, proporciones, paleta y estilo pixel art; tatuaje siempre en el brazo izquierdo; sin texto, marcas de agua, escenario, armas, accesorios ni efectos añadidos. Una segunda pasada se limitó a extraer el fondo como transparencia real.

## Prompt del retrato

Se pidió un retrato cuadrado de cabeza y torso, ligeramente orientado a la derecha, con expresión concentrada y puños en guardia. Se mantuvieron los mismos invariantes de identidad y se exigió transparencia real, sin fondo, marco, texto ni efectos.
