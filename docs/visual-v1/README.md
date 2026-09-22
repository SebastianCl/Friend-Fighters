# Prueba visual · Distrito Neón

Abrir **http://localhost:5173/visual-preview.html** después de ejecutar `npm run dev`. La portada original contiene el enlace **Nuevo estilo visual**. La compilación estática incluye ambas páginas.

Esta entrega es una composición estática: las barras, energía y reloj muestran valores demostrativos. El combate original sigue en `/`. No se han incorporado animaciones nuevas ni cambios de reglas de combate.

## Arte y referencia

Los tres recursos se generaron con la herramienta integrada **image_gen**, usando la ilustración suministrada. Se copiaron al proyecto sin sustituirlos por dibujos programáticos ni modificar el original:

- `public/art/visual-v1/fighter-guard.png`: guardia completa en RGBA, 1024 × 1536, con fondo realmente transparente. La cabeza, las manos y ambas botas están dentro de la imagen.
- `public/art/visual-v1/fighter-portrait.png`: primer plano del mismo diseño, con fondo índigo opaco.
- `public/art/visual-v1/neon-street.png`: escenario horizontal independiente de los personajes y la interfaz.
- `public/art/visual-v1/reference.jpg`: copia de la ilustración aportada; no es la fotografía original de la persona.

Los prompts exactos y las funciones de cada imagen están en `prompts.md`. No se crearon imágenes de nuevos amigos ni un segundo diseño de personaje.

## Escala e integración

La escena mide 1280 × 720 unidades visuales y se escala uniformemente, sin recortar el escenario. Los personajes tienen 420 unidades de altura visible, con los pies en Y=612. La segunda luchadora usa exactamente la misma textura reflejada. El fondo, los indicadores y los controles son capas independientes.

`src/visual-assets.ts` define `VisualCharacterAsset`: rutas de sprite y retrato, dimensiones originales, límites visibles, punto de apoyo, orientación y altura de presentación. Los límites alfa del sprite se midieron en navegador: izquierda 133, arriba 84, derecha 912, abajo 1472 (límites superiores exclusivos). El anclaje al suelo usa (512, 1472). Esto permite reemplazar imágenes o añadir frames conservando escala y posición, sin acoplar el arte a las unidades del motor de combate.

La ruta visual no importa Phaser ni el motor de combate. La prueba usa HTML/CSS para componer el arte, la interfaz y los diálogos accesibles. La futura integración jugable deberá mapear las unidades de combate a esta escala de presentación y alinear el impacto visual con cada ataque; no basta con reemplazar una textura.

## Revisión

- **Retrato**: rostro grande para evaluar peinado, expresión y proporciones.
- **Comparar referencia**: original, cuerpo completo sobre cuadrícula de transparencia y retrato, juntos.
- **Menú**: acceso a las vistas y vuelta al prototipo jugable.
- **Pantalla completa**: expande toda la escena, incluidos los diálogos; si el navegador lo rechaza se muestra una alternativa.

El parecido se evalúa respecto de la ilustración recibida. Para evaluar parecido con la persona real se necesitará su fotografía original. La aprobación artística de esta composición precede a la producción de animaciones.

## Verificación reproducible

```sh
npm run build
npm test
npm run test:e2e
```

Los recorridos visuales comprueban 1280 × 720 y 1920 × 1080, escala, márgenes, alfa, orientación, diálogos, retorno de foco, pantalla completa y enlace desde el juego. Guardan capturas en esta carpeta: `arena-1280.png`, `arena-1920.png`, `portrait-view.png` y `comparison.png`.

## Resultado de esta entrega

Compilación de producción correcta; 22 pruebas del motor y entradas aprobadas, y 10 pruebas de navegador aprobadas en Chromium (cinco del juego original y cinco de la prueba visual). Se revisaron las capturas a ambas resoluciones, la comparación y el retrato. La valoración final del parecido y la dirección artística queda para tu revisión antes de crear las animaciones.
