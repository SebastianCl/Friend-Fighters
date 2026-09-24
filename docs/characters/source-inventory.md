# Inventario reproducible de fuentes de personajes (P01)

Generado con `node docs/characters/inventory-sources.mjs`. Las rutas son relativas a la raíz del repositorio; SHA-256 corresponde a los bytes originales. `--check` verifica que este inventario siga vigente. No se modifica ninguna imagen.

## Archivos locales

| Personaje | Rol | Ruta | Formato / color | Dimensiones | Bytes | SHA-256 |
|---|---|---|---|---:|---:|---|
| sebastian | base reference | `docs/characters/sebastian/reference.jpg` | JPEG 3 components 8-bit | 928 × 1149 | 507235 | `d5039e66dc627fb780babb5933ede9fee2eb60e36ebe27cb3cf7d945daf902d4` |
| laura | runtime derivative | `public/art/characters/laura/atlas.png` | PNG RGBA 8-bit, canal alfa | 1800 × 1280 | 1539078 | `5e3315b2a83747cfddbf28bc3ec381499eaed52328845e535b204156d99f50d7` |
| laura | grab source and runtime | `public/art/characters/laura/grab-sheet.png` | PNG RGBA 8-bit, canal alfa | 1942 × 809 | 1029156 | `427744ee147151b0a41a624b77909f8fce77fef6b5702ff229e701a216303159` |
| laura | runtime derivative | `public/art/characters/laura/guard.png` | PNG RGBA 8-bit, canal alfa | 300 × 320 | 72971 | `3e2280245cf33fc34388cca29534035efb57e5eb566aa8a7feec1cad819ca2be` |
| laura | runtime derivative | `public/art/characters/laura/portrait.png` | PNG RGBA 8-bit, canal alfa | 320 × 320 | 129507 | `c9e8c5e0c647567a694b933d0e8451c039dba2a812046dc39763dbed20ca985b` |
| laura | base source | `public/art/characters/laura/source-sheet.jpg` | JPEG 3 components 8-bit | 1169 × 1280 | 330256 | `f89f959a8c7c1409dce4469b08414e7d37dda61ddf80f8f1c32b02ed72509dea` |
| mariana | runtime derivative | `public/art/characters/mariana/animation-atlas.png` | PNG RGBA 8-bit, canal alfa | 1280 × 1920 | 1705943 | `06b0691c06da7f89ae247f57dc6119f355bf07e2bb28820209768318adc6934e` |
| mariana | runtime derivative | `public/art/characters/mariana/avatar.png` | PNG RGB 8-bit | 1254 × 1254 | 1301709 | `0c9a65ea361f8510b1c1110ae5e780ef3cfbbc756b1b747cc911105d023f555a` |
| mariana | avatar source | `public/art/characters/mariana/source-avatar.png` | PNG RGB 8-bit | 1254 × 1254 | 1301709 | `0c9a65ea361f8510b1c1110ae5e780ef3cfbbc756b1b747cc911105d023f555a` |
| mariana | base source | `public/art/characters/mariana/source-sheet.png` | PNG RGBA 8-bit, canal alfa | 1024 × 1536 | 2370668 | `81c043075dc782d0dac9883d0cb2b6b8f56e5fba52d1b2511fc55208e7950f88` |
| rata | runtime derivative | `public/art/characters/rata/animation-atlas.png` | PNG RGBA 8-bit, canal alfa | 1024 × 1536 | 2175649 | `2ea4861431c2e604b86ebecf0d9ab6cf54678809460403d12515cb992af284ae` |
| rata | runtime derivative | `public/art/characters/rata/avatar.png` | PNG RGB 8-bit | 1254 × 1254 | 1377773 | `d6370cc6873391cfc3179a39cebace80aef44aa1ca3cd9ca01363c4803412865` |
| rata | base source | `public/art/characters/rata/source-sheet.png` | PNG RGBA 8-bit, canal alfa | 1024 × 1536 | 2175649 | `2ea4861431c2e604b86ebecf0d9ab6cf54678809460403d12515cb992af284ae` |
| sebastian | runtime derivative | `public/art/characters/sebastian/animation-atlas.png` | PNG RGBA 8-bit, canal alfa | 1024 × 1536 | 2046990 | `10a9f951acb40c6b69c87cb8ab0f6aefd5c753f9dc07b27f34cc86a4e61fbccb` |
| sebastian | runtime derivative | `public/art/characters/sebastian/portrait.png` | PNG RGBA 8-bit, canal alfa | 1254 × 1254 | 1119316 | `92a470f5e9919e7a991790df9f47ca49d8870a883d9b61d500b0f2e6c92f3718` |
| mariana | grab runtime source | `public/art/throws/mariana.png` | PNG RGBA 8-bit, canal alfa | 2400 × 800 | 1003641 | `ced35852f6b3cac42263259d752823236e6304a21f51989c9cdaacb1486c8715` |
| rata | grab runtime source | `public/art/throws/rata.png` | PNG RGBA 8-bit, canal alfa | 2400 × 800 | 1033124 | `7319e5cbb5291d09c5b287b245da83aea5ee871699e828592efcaa32c54bd908` |
| sebastian | grab runtime source | `public/art/throws/sebastian.png` | PNG RGBA 8-bit, canal alfa | 2400 × 800 | 813781 | `777b1c754083140a0efaaa1f0d266d3792a3b43c18f31de9a57b06107ad39dc0` |

## Comparaciones de fuente y asset actual

La igualdad indica bytes idénticos. Una diferencia de hash por sí sola no demuestra qué píxeles o poses cambiaron.

| Relación | Bytes idénticos | Diferencia de formato | Diferencia de tamaño | Diferencia de dimensiones |
|---|---|---|---:|---|
| laura base → atlas | no | JPEG → PNG | 1208822 | 1169 × 1280 → 1800 × 1280 |
| mariana base → atlas | no | ninguna | -664725 | 1024 × 1536 → 1280 × 1920 |
| mariana avatar → runtime | sí | ninguna | 0 | ninguna |
| rata base → atlas | sí | ninguna | 0 | ninguna |
| sebastian reference → atlas | no | JPEG → PNG | 1539755 | 928 × 1149 → 1024 × 1536 |

## Referencias citadas en la propuesta

Los cuatro archivos stripe_sheet_*.png no están disponibles localmente. La comparación usa solo el formato y las dimensiones declaradas frente a candidatos del repositorio; no establece identidad visual ni igualdad de bytes.

| Nombre citado | Dimensiones citadas | Candidato local | Formato y dimensiones locales | Diferencia local − citada |
|---|---:|---|---:|---:|
| stripe_sheet_laura.png | 1199 × 1312 | public/art/characters/laura/source-sheet.jpg | JPEG 1169 × 1280 | -30 × -32 |
| stripe_sheet_mariana.png | 1024 × 1536 | public/art/characters/mariana/source-sheet.png | PNG 1024 × 1536 | +0 × +0 |
| stripe_sheet_rata.png | 1024 × 1536 | public/art/characters/rata/source-sheet.png | PNG 1024 × 1536 | +0 × +0 |
| stripe_sheet_sebastian.png | 1024 × 1536 | docs/characters/sebastian/reference.jpg | JPEG 928 × 1149 | -96 × -387 |

## Hallazgos y límites

- Los JPG de Laura y Sebastián no contienen canal alfa; las hojas PNG declaran su modo de color en la tabla. La presencia de un canal alfa no prueba que haya píxeles transparentes: esto requiere una inspección de píxeles posterior.
- La hoja de agarre de Laura es tanto entrada visual disponible como asset cargado por el juego. Los PNG de `public/art/throws/` son las únicas hojas de agarre locales de los otros tres personajes; aquí no se les atribuye un original externo.
- No se pueden calcular hashes de los cuatro stripe_sheet_*.png citados ni demostrar que equivalgan a los candidatos locales. Laura y Sebastián tienen además distinta geometría declarada; Mariana y Rata comparten dimensiones declaradas, pero eso tampoco prueba equivalencia.
- `public/art/characters/rata/portrait.svg` se excluye porque P01 inventaría fuentes PNG/JPG. La tabla tampoco asigna poses, recortes, pivotes ni equivalencias semánticas entre hojas; esas decisiones corresponden a P02 o tickets posteriores.
