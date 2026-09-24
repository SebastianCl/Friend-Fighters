#!/usr/bin/env node
// P07 Laura grab importer: isolated copies/metadata; production sheet and runtime stay untouched.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
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
import { baseIds } from "./legacy-base-contract.mjs";
import {
  grabIds,
  validateGrabRegions,
  validateGrabManifest,
} from "./legacy-grab-contract.mjs";
import { reconstructLegacyGrabs } from "./legacy-grab-runner.mjs";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--check"))
  throw new Error(
    "Usage: node docs/characters/laura/import-legacy-grab.mjs [--check]",
  );
const check = args.includes("--check");
const regions = await json("docs/characters/laura/legacy-grab-regions.json");
const inventory = await json("docs/characters/source-inventory.json");
const global = await json("docs/characters/pipeline-config.json");
const engineMap = await json("docs/characters/laura/engine-map.json");
const originalSpec = await json("docs/characters/laura/character-spec.json");
const baseManifest = await json(
  "docs/characters/laura/legacy-base-manifest.json",
);
const baseFramePaths = baseIds.map(
  (id) => `docs/characters/laura/legacy-frames/${id}.json`,
);
const baseFrames = await Promise.all(baseFramePaths.map(json));
const baseMetadataPaths = [
  "docs/characters/laura/legacy-base-manifest.json",
  ...baseFramePaths,
];
const baseHashesBefore = await Promise.all(
  baseMetadataPaths.map(async (path) => sha(await readFile(at(path)))),
);
const productionBefore = await snapshotProduction();
const sourceBytes = await readFile(at(regions.sourcePath));
const errors = [];
if (
  baseManifest.resources.map((resource) => resource.resourceId).join(",") !==
  baseIds.join(",")
)
  errors.push("P06 base manifest no longer contains exactly 24 base resources");
const source = inventory.files.find((file) => file.path === regions.sourcePath);
const runtimeCompiled = await build({
  entryPoints: [at("src/visual-assets.ts")],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const { lauraRegions, visualFighter } = await import(
  "data:text/javascript;base64," +
    Buffer.from(runtimeCompiled.outputFiles[0].contents).toString("base64")
);
if (visualFighter.sheets.grab !== "/art/characters/laura/grab-sheet.png")
  errors.push("Current Laura grab sheet path changed");
errors.push(
  ...validateGrabRegions(
    regions,
    inventory,
    sha(sourceBytes),
    lauraRegions,
    engineMap,
  ),
);
if (errors.length) throw new Error(errors.join("\n"));
const rebuilt = await reconstructLegacyGrabs(sourceBytes, regions.regions);
if (
  rebuilt.sourceDimensions.width !== source.width ||
  rebuilt.sourceDimensions.height !== source.height
)
  throw new Error("Decoded grab source dimensions differ from P01");
const generatedRoot = "pipeline/generated/legacy/laura/grab";
const resources = rebuilt.frames.map((frame, i) => {
  const region = regions.regions[i],
    rect = region.sourceRect;
  const png = Buffer.from(frame.png, "base64");
  return {
    resourceId: region.resourceId,
    status: "draft",
    review: { status: "pending", reviewedBy: null },
    sourcePath: regions.sourcePath,
    sourceSha256: regions.sourceSha256,
    sourceDimensions: regions.sourceSize,
    sourceFormat: regions.format,
    sourceRect: rect,
    legacyFrame: { width: rect.width, height: rect.height },
    sourceToLegacy: {
      uniformScale: 1,
      translation: { x: -rect.x, y: -rect.y },
    },
    historicalPivot: {
      x: region.anchorX,
      y: frame.alpha.gt128.bounds.bottom,
      referenceHeight: region.referenceHeight,
      xRule: "round(region width / 2) from P02 region",
      yRule: "alpha > 128 bounds bottom from current renderer",
    },
    alpha: frame.alpha,
    alpha1To128Count: frame.alpha1To128Count,
    partialAlphaCount: frame.partialAlphaCount,
    canonical: {
      status: "pending",
      profileId: global.geometryProfile.id,
      sourceTransform: null,
    },
    generatedFrame: {
      path: `${generatedRoot}/${region.resourceId}.png`,
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
    path: regions.sourcePath,
    sha256: regions.sourceSha256,
    width: regions.sourceSize.width,
    height: regions.sourceSize.height,
    format: regions.format,
  },
  extractionAlgorithm: {
    decodedWith: "Chromium HTML canvas",
    operation:
      "copy each P02 source rectangle to its own same-size RGBA frame via putImageData",
    trim: false,
    resampling: false,
    alphaCleanup: false,
    sourceToLegacyScale: 1,
  },
  currentRuntimePresentation: {
    fighterHeightScenePixels: 420,
    grabReferenceHeightSourcePixels: 650,
    scenePixelsPerLegacyPixel: 420 / 650,
    note: "Renderer presentation scale only; import/source-to-legacy scale remains 1",
  },
  resources,
};
errors.push(...validateGrabManifest(manifest, regions));
const { createUnmeasuredPoseDraft } = await loadAuthoringContracts();
const grabFrames = resources.map((resource) =>
  makeDraftFrame(
    resource.resourceId,
    { path: regions.sourcePath, ...regions.sourceSize },
    global,
    createUnmeasuredPoseDraft,
  ),
);
const baseEntries = originalSpec.resources.filter((resource) =>
  resource.id.startsWith("base_"),
);
if (baseEntries.map((resource) => resource.id).join(",") !== baseIds.join(","))
  errors.push("Character Spec base resources differ from P06");
const spec = {
  ...originalSpec,
  identity: { ...originalSpec.identity, revision: 2 },
  sources: [
    ...originalSpec.sources.filter(
      (entry) => entry.path !== regions.sourcePath,
    ),
    { path: regions.sourcePath, role: "legacy" },
  ],
  resources: [
    ...baseEntries,
    ...grabIds.map((id) => ({
      id,
      status: "pending",
      framePath: `docs/characters/laura/legacy-frames/${id}.json`,
    })),
  ],
};
if (spec.status !== "draft" || spec.review.status !== "pending")
  errors.push("Laura Character Spec must remain draft/pending");
const validation = await validateDraftPackage(global, spec, [
  ...baseFrames,
  ...grabFrames,
]);
errors.push(...validation.errors);
if (validation.productionReady)
  errors.push("Draft unexpectedly production-ready");
const comparison = rebuilt.frames.map((frame) => ({
  resourceId: frame.resourceId,
  productionFrameBytesAvailable: false,
  byteEqualityWithProductionFrame: null,
  sourceSheetSha256MatchesP01: sha(sourceBytes) === source.sha256,
  dimensionsEqual: frame.comparison.dimensionsEqual,
  rgbaPixelDifferences: frame.comparison.rgbaPixelDifferences,
  rgbaChannelDifferences: frame.comparison.rgbaChannelDifferences,
  alphaPixelDifferences: frame.comparison.alphaPixelDifferences,
  boundsEqual: frame.comparison.boundsEqual,
  historicalPivotEqual: frame.comparison.historicalPivotEqual,
  placementEqual: (() => {
    const resource = resources.find(
      (entry) => entry.resourceId === frame.resourceId,
    );
    return (
      resource.sourceToLegacy.translation.x === -resource.sourceRect.x &&
      resource.sourceToLegacy.translation.y === -resource.sourceRect.y
    );
  })(),
  sourceAlpha: frame.comparison.productionAlpha,
  reconstructedAlpha: frame.comparison.reconstructedAlpha,
  sourceToLegacyTranslation: resources.find(
    (resource) => resource.resourceId === frame.resourceId,
  ).sourceToLegacy.translation,
  generatedFrameSha256: resources.find(
    (resource) => resource.resourceId === frame.resourceId,
  ).generatedFrame.sha256,
}));
for (const item of comparison)
  if (
    !item.sourceSheetSha256MatchesP01 ||
    !item.dimensionsEqual ||
    item.rgbaPixelDifferences ||
    item.alphaPixelDifferences ||
    !item.boundsEqual ||
    !item.historicalPivotEqual ||
    !item.placementEqual
  )
    errors.push(
      `Reconstructed grab differs from production region: ${item.resourceId}`,
    );
const report = {
  schemaVersion: 1,
  source: manifest.source,
  sourceSheetHashMatchesP01: sha(sourceBytes) === source.sha256,
  sourceSheetSha256: sha(sourceBytes),
  frameByteEqualityApplicable: false,
  frameByteEqualityReason:
    "Production stores these resources as regions of one PNG, not standalone PNG files",
  frames: comparison,
  p05: {
    errors: validation.errors,
    pendingCount: validation.pending.length,
    productionReady: validation.productionReady,
  },
  errors,
};
const metadata = [
  ["docs/characters/laura/legacy-grab-manifest.json", manifest],
  ["docs/characters/laura/character-spec.json", spec],
  ...grabFrames.map((frame) => [
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
  for (let i = 0; i < 3; i++)
    await writeFile(
      at(resources[i].generatedFrame.path),
      Buffer.from(rebuilt.frames[i].png, "base64"),
    );
  await writeFile(
    at(`${generatedRoot}/difference-report.json`),
    stable(report),
  );
}
const baseHashesAfter = await Promise.all(
  baseMetadataPaths.map(async (path) => sha(await readFile(at(path)))),
);
if (JSON.stringify(baseHashesBefore) !== JSON.stringify(baseHashesAfter))
  errors.push("P06 base metadata changed during P07 import");
if (
  JSON.stringify(productionBefore) !==
  JSON.stringify(await snapshotProduction())
)
  errors.push("Production Laura asset changed during P07 import");
console.log(
  JSON.stringify(
    { mode: check ? "check" : "import", ...report, errors },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;
