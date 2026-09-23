# Mariana

`source-sheet.png` y `source-avatar.png` conservan los PNG originales entregados por la persona usuaria.

## Assets de producción

- `public/art/characters/mariana/animation-atlas.png`: hoja de 21 poses, usada por las hojas lógicas `guard`, `breathe`, `motion` y `air`.
- `public/art/characters/mariana/avatar.png`: avatar para selección, torneo y HUD.

La hoja actual es RGBA y conserva transparencia real. Las 21 regiones se miden individualmente en `src/visual-assets.ts`, con margen transparente alrededor de cada figura. No se usa una cuadrícula uniforme porque varias poses atraviesan los límites nominales de columna.
