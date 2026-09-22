# Corrección de márgenes — image_gen integrada

La primera hoja complementaria tenía límites superpuestos entre las poses inferiores. La versión usada en el juego es `air-sheet-v2.png`.

```text
Use case: identity-preserve, technical spritesheet layout repair.
Edit the supplied 2x2 four-pose spritesheet. Preserve EXACT character art, identity, costume and these four actions: top left quiet standing guard; top right airborne punch; bottom left airborne side kick; bottom right crouching two-palm special.
The current bottom-left kick and bottom-right crouching pose have overlapping rectangular bounds, making them impossible to slice independently. FIX THE LAYOUT ONLY by scaling ALL four drawings proportionally to about 75 percent of their current size and centering each independently in its OWN exact quadrant. Add WIDE EMPTY TRANSPARENT GUTTERS between every pose.
STRICT square canvas, 2 columns x 2 rows. Each of the four equal square cells contains exactly ONE complete character, with AT LEAST 45 pixels of transparent padding on all four sides at 1254x1254 output size. In particular, the airborne boot must stop well before the center vertical dividing line, and the crouching character's left boot must stay well to the right of that line. No limbs or hair may cross quadrant boundaries.
Consistent anatomical scale across all four. Same pixel art quality and details; no new features; same facing right. GENUINE alpha transparency. NO numbers, no text, no grid lines, no shadows, no colored halo. Keep all four poses complete.
```
