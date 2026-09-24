#!/usr/bin/env node
// P06 Laura base importer. Regenerates metadata and isolated frames; never writes public/.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  repoPath as at,
  sha256 as sha,
  stableJson as stable,
  readJson as json,
  snapshotProduction,
  loadAuthoringContracts,
  makeDraftFrame,
  validateDraftPackage,
} from "./legacy-import-common.mjs";
import { reconstructLegacyBase } from "./legacy-base-runner.mjs";
import {
  baseIds,
  validateLegacyCrops,
  validateLegacyManifest,
} from "./legacy-base-contract.mjs";

const check = process.argv.slice(2).includes("--check");
if (process.argv.slice(2).some((arg) => arg !== "--check"))
  throw new Error(
    "Usage: node docs/characters/laura/import-legacy-base.mjs [--check]",
  );
const crops = await json("docs/characters/laura/legacy-base-crops.json");
const inventory = await json("docs/characters/source-inventory.json");
const global = await json("docs/characters/pipeline-config.json");
const sourceBytes = await readFile(at(crops.sourcePath));
const atlasPath = "public/art/characters/laura/atlas.png";
const atlasBytes = await readFile(at(atlasPath));
const productionBefore = await snapshotProduction();
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
const { createUnmeasuredPoseDraft } = await loadAuthoringContracts();
const frameConfigs = resources.map((resource) =>
  makeDraftFrame(
    resource.resourceId,
    { path: crops.sourcePath, ...crops.sourceSize },
    global,
    createUnmeasuredPoseDraft,
  ),
);
let existingSpec = null;
try {
  existingSpec = await json("docs/characters/laura/character-spec.json");
} catch {
  /* The first P06 import creates this draft. */
}
const preservedGrabs =
  existingSpec?.resources?.filter((resource) =>
    resource.id.startsWith("grab_"),
  ) ?? [];
const preservedGrabSources =
  existingSpec?.sources?.filter((source) => source.path !== crops.sourcePath) ??
  [];
const spec = {
  schemaVersion: 1,
  pipelineVersion: global.pipelineVersion,
  geometryProfileId: global.geometryProfile.id,
  status: "draft",
  identity: {
    id: "laura",
    displayName: "Laura",
    revision: existingSpec?.identity?.revision ?? 1,
  },
  review: { status: "pending", reviewedBy: null },
  sources: [
    { path: crops.sourcePath, role: "legacy" },
    ...preservedGrabSources,
  ],
  visual: {
    designReferencePath: null,
    masterReferencePath: null,
    statureGameUnits: null,
    proportions: null,
    appearanceNotes: null,
  },
  resources: resources
    .map((resource) => ({
      id: resource.resourceId,
      status: "pending",
      framePath: `docs/characters/laura/legacy-frames/${resource.resourceId}.json`,
    }))
    .concat(preservedGrabs),
};
// P06 checks its 24 base frames and preserves any P07 grab entries already in the draft.
const preservedGrabFrames = await Promise.all(
  preservedGrabs.map((resource) => json(resource.framePath)),
);
const validation = await validateDraftPackage(global, spec, [
  ...frameConfigs,
  ...preservedGrabFrames,
]);
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
const productionAfter = await snapshotProduction();
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
