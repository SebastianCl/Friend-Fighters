#!/usr/bin/env node
// P06 Laura base importer. Regenerates metadata and isolated frames; never writes public/.
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { reconstructLegacyBase } from "./legacy-base-runner.mjs";
import {
  baseIds,
  validateLegacyCrops,
  validateLegacyManifest,
} from "./legacy-base-contract.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const check = process.argv.slice(2).includes("--check");
if (process.argv.slice(2).some((arg) => arg !== "--check"))
  throw new Error(
    "Usage: node docs/characters/laura/import-legacy-base.mjs [--check]",
  );
const at = (path) => {
  const full = resolve(root, path),
    diff = relative(root, full);
  if (isAbsolute(path) || diff.startsWith("..") || isAbsolute(diff))
    throw new Error(`Path outside repository: ${path}`);
  return full;
};
const json = async (path) => JSON.parse(await readFile(at(path), "utf8"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stable = (value) => JSON.stringify(value, null, 2) + "\n";
const crops = await json("docs/characters/laura/legacy-base-crops.json");
const inventory = await json("docs/characters/source-inventory.json");
const global = await json("docs/characters/pipeline-config.json");
const sourceBytes = await readFile(at(crops.sourcePath));
const atlasPath = "public/art/characters/laura/atlas.png";
const atlasBytes = await readFile(at(atlasPath));
const productionDir = at("public/art/characters/laura");
const productionBefore = Object.fromEntries(
  await Promise.all(
    (await readdir(productionDir)).map(async (name) => [
      name,
      sha(await readFile(resolve(productionDir, name))),
    ]),
  ),
);
const errors = validateLegacyCrops(crops, inventory, {
  source: sha(sourceBytes),
  atlas: sha(atlasBytes),
});
if (errors.length) throw new Error(errors.join("\n"));
const rebuilt = await reconstructLegacyBase(
  sourceBytes,
  crops.cropBoxes,
  atlasBytes,
);
if (rebuilt.frames.length !== 24 || rebuilt.measurements.length !== 24)
  throw new Error("Reconstruction did not yield exactly 24 frames");
const atlasRebuilt = Buffer.from(rebuilt.atlas, "base64");
const atlasByteEqual = atlasRebuilt.equals(atlasBytes);
const generatedRoot = "pipeline/generated/legacy/laura";
const resources = rebuilt.measurements.map((measurement, i) => {
  const id = baseIds[i],
    [left, top, right, bottom] = crops.cropBoxes[i];
  const png = Buffer.from(rebuilt.frames[i].png, "base64");
  return {
    resourceId: id,
    status: "draft",
    review: { status: "pending", reviewedBy: null },
    sourcePath: crops.sourcePath,
    sourceSha256: crops.sourceSha256,
    sourceDimensions: crops.sourceSize,
    sourceRect: { left, top, right, bottom },
    originalCropDimensions: { width: right - left, height: bottom - top },
    extraction: { winningInkPixels: measurement.ink },
    sourceAlphaBounds: measurement.sourceAlphaBounds,
    cutoutToLegacy: {
      uniformScale: 1,
      translation: {
        x:
          measurement.legacyPlacement.x -
          (measurement.sourceAlphaBounds.left - left),
        y:
          measurement.legacyPlacement.y -
          (measurement.sourceAlphaBounds.top - top),
      },
    },
    sourceToLegacy: {
      uniformScale: 1,
      translation: measurement.legacyTranslation,
    },
    legacyFrame: {
      width: 300,
      height: 320,
      anchor: crops.legacyFrame.historicalAnchor,
    },
    legacyAtlasRect: {
      x: measurement.column * 300,
      y: measurement.row * 320,
      width: 300,
      height: 320,
    },
    legacyPlacement: measurement.legacyPlacement,
    alpha: rebuilt.frames[i].alpha,
    canonical: {
      status: "pending",
      profileId: global.geometryProfile.id,
      sourceTransform: null,
    },
    generatedFrame: {
      path: `${generatedRoot}/${id}.png`,
      sha256: sha(png),
      bytes: png.length,
    },
  };
});
const manifest = {
  schemaVersion: 1,
  pipelineVersion: global.pipelineVersion,
  geometryProfileId: global.geometryProfile.id,
  characterId: "laura",
  source: {
    path: crops.sourcePath,
    sha256: crops.sourceSha256,
    ...crops.sourceSize,
  },
  productionAtlas: {
    path: atlasPath,
    sha256: sha(atlasBytes),
    width: 1800,
    height: 1280,
  },
  legacyFrame: crops.legacyFrame,
  extractionAlgorithm: {
    decodedWith: "Chromium HTML canvas",
    inkCriterion: "min(R,G,B) < 232",
    foregroundSelection:
      "largest 8-connected ink component; minimum 800 pixels",
    exteriorRemoval:
      "4-connected flood from crop border excluding selected component",
    retainedAlpha: "255 for non-exterior pixels; 0 elsewhere",
    placement:
      "center selected alpha bounds horizontally with Math.round; bottom at y=310",
    resampling: "drawImage 1:1; no scale",
  },
  resources,
};
errors.push(...validateLegacyManifest(manifest, crops));
const poseCompiled = await build({
  entryPoints: [at("docs/characters/pose-master-contract.ts")],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const { createUnmeasuredPoseDraft } = await import(
  "data:text/javascript;base64," +
    Buffer.from(poseCompiled.outputFiles[0].contents).toString("base64")
);
const frameConfigs = resources.map((resource) => ({
  schemaVersion: 1,
  pipelineVersion: global.pipelineVersion,
  geometryProfileId: global.geometryProfile.id,
  characterId: "laura",
  resourceId: resource.resourceId,
  status: "draft",
  review: { status: "pending", reviewedBy: null },
  sourcePath: crops.sourcePath,
  sourceTransform: null,
  poseDraft: {
    ...createUnmeasuredPoseDraft(resource.resourceId),
    coordinateSpace: {
      imagePath: crops.sourcePath,
      width: crops.sourceSize.width,
      height: crops.sourceSize.height,
      units: "pixels",
      origin: "top-left",
    },
  },
  canonical: null,
  output: null,
}));
const spec = {
  schemaVersion: 1,
  pipelineVersion: global.pipelineVersion,
  geometryProfileId: global.geometryProfile.id,
  status: "draft",
  identity: { id: "laura", displayName: "Laura", revision: 1 },
  review: { status: "pending", reviewedBy: null },
  sources: [{ path: crops.sourcePath, role: "legacy" }],
  visual: {
    designReferencePath: null,
    masterReferencePath: null,
    statureGameUnits: null,
    proportions: null,
    appearanceNotes: null,
  },
  resources: resources.map((resource) => ({
    id: resource.resourceId,
    status: "pending",
    framePath: `docs/characters/laura/legacy-frames/${resource.resourceId}.json`,
  })),
};
// Reuse the P05 validator in the CLI, with generated documents in memory.
const compiled = await build({
  entryPoints: [at("docs/characters/config-contract.ts")],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const { validateCharacterPackage } = await import(
  "data:text/javascript;base64," +
    Buffer.from(compiled.outputFiles[0].contents).toString("base64")
);
const generatedDocs = new Map([
  ...frameConfigs.map((frame) => [
    `docs/characters/laura/legacy-frames/${frame.resourceId}.json`,
    frame,
  ]),
]);
const hashes = new Map();
const resolver = {
  readJson(path) {
    if (generatedDocs.has(path)) return generatedDocs.get(path);
    try {
      return JSON.parse(requireRead(path));
    } catch {
      return undefined;
    }
  },
  sha256(path) {
    if (!hashes.has(path)) {
      try {
        hashes.set(path, sha(requireBytes(path)));
      } catch {
        hashes.set(path, null);
      }
    }
    return hashes.get(path);
  },
};
// Synchronous resolver is required by the P05 pure validator.
const { readFileSync } = await import("node:fs");
function requireBytes(path) {
  return readFileSync(at(path));
}
function requireRead(path) {
  return requireBytes(path).toString("utf8");
}
const validation = validateCharacterPackage(global, spec, resolver, "draft");
errors.push(...validation.errors);
if (validation.productionReady)
  errors.push("Draft unexpectedly production-ready");
const comparison = rebuilt.comparison;
const alphaDifferences = comparison.frames.reduce(
  (sum, frame) => sum + frame.alphaPixelDifferences,
  0,
);
const rgbaDifferences = comparison.frames.reduce(
  (sum, frame) => sum + frame.rgbaPixelDifferences,
  0,
);
const placementDifferences = comparison.frames
  .filter(
    (frame) =>
      JSON.stringify(frame.reconstructedAlpha) !==
      JSON.stringify(frame.productionAlpha),
  )
  .map((frame) => frame.resourceId);
const report = {
  schemaVersion: 1,
  source: manifest.source,
  reconstructedAtlasSha256: sha(atlasRebuilt),
  productionAtlasSha256: sha(atlasBytes),
  atlasByteEqual,
  atlasDimensionsEqual: comparison.dimensionsEqual,
  rgbaPixelDifferences: rgbaDifferences,
  alphaPixelDifferences: alphaDifferences,
  alphaBoundsOrCountDifferences: placementDifferences,
  frames: comparison.frames.map((frame) => ({
    resourceId: frame.resourceId,
    rgbaPixelDifferences: frame.rgbaPixelDifferences,
    alphaPixelDifferences: frame.alphaPixelDifferences,
    reconstructedAlpha: frame.reconstructedAlpha,
    productionAlpha: frame.productionAlpha,
  })),
  p05: {
    errors: validation.errors,
    pendingCount: validation.pending.length,
    productionReady: validation.productionReady,
  },
  errors,
};
if (
  !comparison.dimensionsEqual ||
  rgbaDifferences ||
  alphaDifferences ||
  placementDifferences.length
)
  errors.push("Reconstruction differs from current production atlas");
const metadata = [
  ["docs/characters/laura/legacy-base-manifest.json", manifest],
  ["docs/characters/laura/character-spec.json", spec],
  ...frameConfigs.map((frame) => [
    `docs/characters/laura/legacy-frames/${frame.resourceId}.json`,
    frame,
  ]),
];
if (check) {
  for (const [path, expected] of metadata) {
    try {
      if ((await readFile(at(path), "utf8")) !== stable(expected))
        errors.push(`Metadata drift: ${path}`);
    } catch {
      errors.push(`Missing metadata: ${path}`);
    }
  }
} else if (errors.length === 0) {
  for (const [path, value] of metadata) {
    await mkdir(resolve(at(path), ".."), { recursive: true });
    await writeFile(at(path), stable(value));
  }
  await mkdir(at(generatedRoot), { recursive: true });
  for (let i = 0; i < 24; i++)
    await writeFile(
      at(resources[i].generatedFrame.path),
      Buffer.from(rebuilt.frames[i].png, "base64"),
    );
  await writeFile(
    at(`${generatedRoot}/difference-report.json`),
    stable(report),
  );
}
const productionAfter = Object.fromEntries(
  await Promise.all(
    (await readdir(productionDir)).map(async (name) => [
      name,
      sha(await readFile(resolve(productionDir, name))),
    ]),
  ),
);
if (JSON.stringify(productionBefore) !== JSON.stringify(productionAfter))
  errors.push("Production Laura asset changed during P06 import");
console.log(
  JSON.stringify(
    { mode: check ? "check" : "import", ...report, errors },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;
