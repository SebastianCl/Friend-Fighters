import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const output = new URL("source-inventory.json", import.meta.url);

// Explicit paths make a missing source a failure instead of silently dropping it.
const assets = [
  ["laura", "base source", "public/art/characters/laura/source-sheet.jpg"],
  [
    "laura",
    "grab source and runtime",
    "public/art/characters/laura/grab-sheet.png",
  ],
  ["laura", "runtime derivative", "public/art/characters/laura/atlas.png"],
  ["laura", "runtime derivative", "public/art/characters/laura/guard.png"],
  ["laura", "runtime derivative", "public/art/characters/laura/portrait.png"],
  ["mariana", "base source", "public/art/characters/mariana/source-sheet.png"],
  [
    "mariana",
    "avatar source",
    "public/art/characters/mariana/source-avatar.png",
  ],
  [
    "mariana",
    "runtime derivative",
    "public/art/characters/mariana/animation-atlas.png",
  ],
  ["mariana", "runtime derivative", "public/art/characters/mariana/avatar.png"],
  ["mariana", "grab runtime source", "public/art/throws/mariana.png"],
  ["rata", "base source", "public/art/characters/rata/source-sheet.png"],
  [
    "rata",
    "runtime derivative",
    "public/art/characters/rata/animation-atlas.png",
  ],
  ["rata", "runtime derivative", "public/art/characters/rata/avatar.png"],
  ["rata", "grab runtime source", "public/art/throws/rata.png"],
  ["sebastian", "base reference", "docs/characters/sebastian/reference.jpg"],
  [
    "sebastian",
    "runtime derivative",
    "public/art/characters/sebastian/animation-atlas.png",
  ],
  [
    "sebastian",
    "runtime derivative",
    "public/art/characters/sebastian/portrait.png",
  ],
  ["sebastian", "grab runtime source", "public/art/throws/sebastian.png"],
];

const comparisons = [
  [
    "laura base → atlas",
    "public/art/characters/laura/source-sheet.jpg",
    "public/art/characters/laura/atlas.png",
  ],
  [
    "mariana base → atlas",
    "public/art/characters/mariana/source-sheet.png",
    "public/art/characters/mariana/animation-atlas.png",
  ],
  [
    "mariana avatar → runtime",
    "public/art/characters/mariana/source-avatar.png",
    "public/art/characters/mariana/avatar.png",
  ],
  [
    "rata base → atlas",
    "public/art/characters/rata/source-sheet.png",
    "public/art/characters/rata/animation-atlas.png",
  ],
  [
    "sebastian reference → atlas",
    "docs/characters/sebastian/reference.jpg",
    "public/art/characters/sebastian/animation-atlas.png",
  ],
];

// These names and dimensions come from docs/character-pipeline.md.
// A local candidate is not a proven copy of an unavailable reference.
const documentedReferences = [
  [
    "stripe_sheet_laura.png",
    1199,
    1312,
    "public/art/characters/laura/source-sheet.jpg",
  ],
  [
    "stripe_sheet_mariana.png",
    1024,
    1536,
    "public/art/characters/mariana/source-sheet.png",
  ],
  [
    "stripe_sheet_rata.png",
    1024,
    1536,
    "public/art/characters/rata/source-sheet.png",
  ],
  [
    "stripe_sheet_sebastian.png",
    1024,
    1536,
    "docs/characters/sebastian/reference.jpg",
  ],
];

function pngMetadata(bytes) {
  if (
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    throw new Error("Invalid PNG signature");
  }
  if (
    bytes.toString("ascii", 12, 16) !== "IHDR" ||
    bytes.readUInt32BE(8) !== 13
  ) {
    throw new Error("Invalid PNG IHDR");
  }
  const colorType = bytes[25];
  const colorNames = {
    0: "grayscale",
    2: "RGB",
    3: "indexed",
    4: "grayscale+alpha",
    6: "RGBA",
  };
  if (!(colorType in colorNames))
    throw new Error(`Unsupported PNG color type ${colorType}`);
  let transparencyChunk = false;
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (offset + 12 + length > bytes.length)
      throw new Error("Truncated PNG chunk");
    if (type === "tRNS") transparencyChunk = true;
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return {
    format: "PNG",
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorMode: colorNames[colorType],
    alphaChannel: colorType === 4 || colorType === 6,
    transparencyChunk,
  };
}

function jpegMetadata(bytes) {
  if (bytes.readUInt16BE(0) !== 0xffd8)
    throw new Error("Invalid JPEG signature");
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("Invalid JPEG marker");
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length)
      throw new Error("Truncated JPEG segment");
    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
        0xcf,
      ].includes(marker)
    ) {
      return {
        format: "JPEG",
        width: bytes.readUInt16BE(offset + 5),
        height: bytes.readUInt16BE(offset + 3),
        bitDepth: bytes[offset + 2],
        colorMode: `${bytes[offset + 7]} components`,
        alphaChannel: false,
        transparencyChunk: false,
      };
    }
    offset += length;
  }
  throw new Error("JPEG frame header not found");
}

async function inspect([character, role, path]) {
  const bytes = await readFile(new URL(path, root));
  const metadata = path.endsWith(".png")
    ? pngMetadata(bytes)
    : jpegMetadata(bytes);
  return {
    character,
    role,
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...metadata,
  };
}

function renderMarkdown(inventory) {
  const lines = [
    "# Inventario reproducible de fuentes de personajes (P01)",
    "",
    "Generado con `node docs/characters/inventory-sources.mjs`. Las rutas son relativas a la raíz del repositorio; SHA-256 corresponde a los bytes originales. `--check` verifica que este inventario siga vigente. No se modifica ninguna imagen.",
    "",
    "## Archivos locales",
    "",
    "| Personaje | Rol | Ruta | Formato / color | Dimensiones | Bytes | SHA-256 |",
    "|---|---|---|---|---:|---:|---|",
  ];
  for (const file of inventory.files) {
    const color = `${file.format} ${file.colorMode} ${file.bitDepth}-bit${file.alphaChannel ? ", canal alfa" : file.transparencyChunk ? ", tRNS" : ""}`;
    lines.push(
      `| ${file.character} | ${file.role} | \`${file.path}\` | ${color} | ${file.width} × ${file.height} | ${file.bytes} | \`${file.sha256}\` |`,
    );
  }
  lines.push(
    "",
    "## Comparaciones de fuente y asset actual",
    "",
    "La igualdad indica bytes idénticos. Una diferencia de hash por sí sola no demuestra qué píxeles o poses cambiaron.",
    "",
    "| Relación | Bytes idénticos | Diferencia de formato | Diferencia de tamaño | Diferencia de dimensiones |",
    "|---|---|---|---:|---|",
  );
  for (const pair of inventory.comparisons) {
    lines.push(
      `| ${pair.label} | ${pair.identicalBytes ? "sí" : "no"} | ${pair.formatDifference} | ${pair.byteDifference} | ${pair.dimensionDifference} |`,
    );
  }
  lines.push(
    "",
    "## Referencias citadas en la propuesta",
    "",
    "Los cuatro archivos stripe_sheet_*.png no están disponibles localmente. La comparación usa solo el formato y las dimensiones declaradas frente a candidatos del repositorio; no establece identidad visual ni igualdad de bytes.",
    "",
    "| Nombre citado | Dimensiones citadas | Candidato local | Formato y dimensiones locales | Diferencia local − citada |",
    "|---|---:|---|---:|---:|",
  );
  for (const reference of inventory.documentedReferences) {
    const deltaWidth =
      (reference.widthDifference >= 0 ? "+" : "") + reference.widthDifference;
    const deltaHeight =
      (reference.heightDifference >= 0 ? "+" : "") + reference.heightDifference;
    lines.push(
      "| " +
        reference.name +
        " | " +
        reference.documentedWidth +
        " × " +
        reference.documentedHeight +
        " | " +
        reference.localPath +
        " | " +
        reference.localFormat +
        " " +
        reference.localWidth +
        " × " +
        reference.localHeight +
        " | " +
        deltaWidth +
        " × " +
        deltaHeight +
        " |",
    );
  }
  lines.push(
    "",
    "## Hallazgos y límites",
    "",
    "- Los JPG de Laura y Sebastián no contienen canal alfa; las hojas PNG declaran su modo de color en la tabla. La presencia de un canal alfa no prueba que haya píxeles transparentes: esto requiere una inspección de píxeles posterior.",
    "- La hoja de agarre de Laura es tanto entrada visual disponible como asset cargado por el juego. Los PNG de `public/art/throws/` son las únicas hojas de agarre locales de los otros tres personajes; aquí no se les atribuye un original externo.",
    "- No se pueden calcular hashes de los cuatro stripe_sheet_*.png citados ni demostrar que equivalgan a los candidatos locales. Laura y Sebastián tienen además distinta geometría declarada; Mariana y Rata comparten dimensiones declaradas, pero eso tampoco prueba equivalencia.",
    "- `public/art/characters/rata/portrait.svg` se excluye porque P01 inventaría fuentes PNG/JPG. La tabla tampoco asigna poses, recortes, pivotes ni equivalencias semánticas entre hojas; esas decisiones corresponden a P02 o tickets posteriores.",
    "",
  );
  return lines.join("\n");
}

const files = (await Promise.all(assets.map(inspect))).sort((a, b) =>
  a.path.localeCompare(b.path, "en"),
);
const byPath = new Map(files.map((file) => [file.path, file]));
const inventory = {
  schemaVersion: 1,
  files,
  documentedReferences: documentedReferences.map(
    ([name, documentedWidth, documentedHeight, localPath]) => {
      const local = byPath.get(localPath);
      return {
        name,
        documentedWidth,
        documentedHeight,
        localPath,
        localFormat: local.format,
        localWidth: local.width,
        localHeight: local.height,
        widthDifference: local.width - documentedWidth,
        heightDifference: local.height - documentedHeight,
      };
    },
  ),
  comparisons: comparisons.map(([label, sourcePath, targetPath]) => {
    const source = byPath.get(sourcePath);
    const target = byPath.get(targetPath);
    return {
      label,
      sourcePath,
      targetPath,
      identicalBytes: source.sha256 === target.sha256,
      formatDifference:
        source.format === target.format
          ? "ninguna"
          : `${source.format} → ${target.format}`,
      byteDifference: target.bytes - source.bytes,
      dimensionDifference:
        source.width === target.width && source.height === target.height
          ? "ninguna"
          : `${source.width} × ${source.height} → ${target.width} × ${target.height}`,
    };
  }),
};

const json = `${JSON.stringify(inventory, null, 2)}\n`;
const markdown = renderMarkdown(inventory);
const report = new URL("source-inventory.md", import.meta.url);
if (process.argv.includes("--check")) {
  const [savedJson, savedMarkdown] = await Promise.all([
    readFile(output, "utf8"),
    readFile(report, "utf8"),
  ]);
  if (savedJson !== json || savedMarkdown !== markdown) {
    throw new Error(
      "Character source inventory is stale; run node docs/characters/inventory-sources.mjs",
    );
  }
  console.log(
    `Verified ${files.length} character images and ${comparisons.length} comparisons.`,
  );
} else {
  await Promise.all([writeFile(output, json), writeFile(report, markdown)]);
  console.log(
    `Inventoried ${files.length} character images and ${comparisons.length} comparisons.`,
  );
}
