# Rata

\`source-sheet.png\` es la hoja RGBA entregada por la persona usuaria. Contiene las 21 poses que necesita el sistema actual: guardia, respiración, caminar, salto, aterrizaje, defensa, daño, caída y ataques de pie, agachados y aéreos.

## Assets de producción

- \`public/art/characters/rata/animation-atlas.png\`: copia sin modificaciones de la hoja fuente, usada para las cuatro hojas lógicas (\`guard\`, \`breathe\`, \`motion\` y \`air\`).
- \`public/art/characters/rata/portrait.svg\`: recorte transparente de la pose de guardia para la selección. Se usa SVG solamente como ventana de recorte; el arte visible sigue siendo el PNG RGBA proporcionado.

Las regiones se declaran explícitamente en \`src/visual-assets.ts\`, con ocho píxeles transparentes de margen. Esto evita que cada pose roce el borde de su región y conserva el apoyo de los pies al cambiar de animación.
