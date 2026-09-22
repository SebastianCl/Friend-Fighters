# Prompts de generación — prueba visual v1

Herramienta: image_gen integrada, sin CLI. Referencia original: `public/art/visual-v1/reference.jpg`. Los PNG finales se copiaron sin modificar los originales generados. No se generaron animaciones.

## sprite

```text
Use case: identity-preserve.
Asset type: transparent full-body fighting-game character sprite for Fighter Friends.
Input image: the supplied illustration is the identity, clothing and pixel-art style reference. Extract/recreate ONLY its woman fighter as a polished standalone sprite.
Preserve her specific face shape, warm skin tone, eyes, long dark hair, human body proportions, dark loose short-sleeved T-shirt, beige pleated skirt, black fingerless gloves with red wrist wraps, dark brown lace-up ankle boots. Same grounded fighting guard, three-quarter view facing RIGHT, two raised fists, both boots resting on the same ground baseline. Do not redesign her, make her chibi, muscular or generic anime.
Detailed hand-pixelled arcade art with crisp dark outlines, deliberate visible pixel clusters, stepped shading and restrained highlights, comparable to the reference. Face must remain recognizably the same illustrated person. Full head to both soles, complete hands and boots, centered with 5% clear padding, around 850 pixels tall in a portrait canvas. Feet apart in the reference stance.
Genuinely transparent alpha background, no scenery, no floor, no cast shadow, no checkerboard baked into the image, no UI, no letters, no frame. This is a production sprite, not a poster. Preserve fine facial details.
```

## arena

```text
Use case: stylized-concept. Asset type: wide 16:9 pixel-art fighting game background, 1536x864 or equivalent wide landscape.
Input reference provides the visual style, neon palette and city architecture ONLY. Create an EMPTY nighttime city street fighting arena. NO people, NO characters, NO silhouettes, NO health bars, NO UI, NO logos, NO frame.
Detailed arcade pixel art matching the reference: crisp pixel clusters, hard stepped edges, dark indigo outlines, midnight violet and navy buildings, cyan, hot magenta and warm yellow neon sign panels, restrained block shading. Not a 3D render, not blurry or painted.
Composition for a 1280x720 2D fighting game: side-on horizontal combat plane, consistent pavement ground line for feet at 85% image height. Both fighters will stand in front of this background, each 58% of screen height at 30% and 70% width. Keep their central silhouettes readable with dark uncluttered midground. A broad empty foreground street occupies bottom 30%. Distant alley perspective centered behind them, urban storefronts at far left and right, building signs concentrated along upper sides. Top 18% relatively quiet for overlay HUD. Include vivid but controlled cyan/magenta edge lighting and geometric pavement reflections. Signs use graphic abstract glyphs, not long text. Full-bleed landscape composition.
```

## portrait

```text
Use case: identity-preserve.
Asset type: character selection portrait for the same pixel-art fighter.
Input 1 is the exact final fighter design; input 2 is the original appearance and style reference. Depict exactly this same illustrated woman in a close portrait, head and upper chest, three-quarter view facing slightly right. Preserve her face proportions, warm skin tone, dark expressive eyes, long dark parted hair and navy-black T-shirt. No new accessories, no gloves in front of her face. She has a calm, focused fighting expression.
Detailed crisp pixel art, clean black stepped outline, warm block highlights, dark purple hair shadows, very subtle cyan/magenta rim light. Her face should dominate the image and be immediately comparable with the reference. Keep the whole head and hairstyle inside the frame with margin.
Square image with a simple opaque deep indigo background and a restrained darker geometric border motif. NO writing, NO names, NO logo, NO UI. This is a game character portrait, not photorealistic and not a generic anime redesign.
```
