# Mariana

`source-sheet.png` y `source-avatar.png` conservan los PNG originales entregados por la persona usuaria.

## Assets de producción

- `public/art/characters/mariana/animation-atlas.png`: atlas de producción 1280 × 1920; sus 21 poses están aisladas en celdas de 320 × 320.
- `public/art/characters/mariana/avatar.png`: avatar para selección, torneo y HUD.

La hoja actual es RGBA y conserva transparencia real. El atlas de producción se reconstruye determinísticamente desde `source-sheet.png`: cada componente alfa principal se copia a una celda independiente. Esto evita que patadas, especiales u otras poses compartan píxeles con fotogramas vecinos.
