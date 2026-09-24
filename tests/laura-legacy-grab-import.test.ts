import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import inventory from "../docs/characters/source-inventory.json";
import regions from "../docs/characters/laura/legacy-grab-regions.json";
import manifest from "../docs/characters/laura/legacy-grab-manifest.json";
import spec from "../docs/characters/laura/character-spec.json";
import engineMap from "../docs/characters/laura/engine-map.json";
import { lauraRegions } from "../src/visual-assets";
import { baseIds } from "../docs/characters/laura/legacy-base-contract.mjs";
import {
  grabIds,
  validateGrabRegions,
  validateGrabManifest,
} from "../docs/characters/laura/legacy-grab-contract.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = (path: string) =>
  createHash("sha256")
    .update(readFileSync(root + path))
    .digest("hex");
const productionPaths = [
  "atlas.png",
  "guard.png",
  "portrait.png",
  "grab-sheet.png",
  "source-sheet.jpg",
].map((name) => `public/art/characters/laura/${name}`);
const basePaths = [
  "docs/characters/laura/legacy-base-manifest.json",
  ...baseIds.map((id) => `docs/characters/laura/legacy-frames/${id}.json`),
];

describe("P07 Laura legacy grab importer", () => {
  it("pins exactly three distinct P01/P02 regions, including their unequal widths", () => {
    const actual = hash(regions.sourcePath);
    expect(
      validateGrabRegions(regions, inventory, actual, lauraRegions, engineMap),
    ).toEqual([]);
    expect(regions.regions.map((region) => region.resourceId)).toEqual(grabIds);
    expect(regions.regions.map((region) => region.sourceRect.width)).toEqual([
      700, 600, 642,
    ]);
    expect(regions.regions.map((region) => region.sourceRect.height)).toEqual([
      809, 809, 809,
    ]);
    expect(
      validateGrabRegions(
        regions,
        inventory,
        "changed",
        lauraRegions,
        engineMap,
      ).join(),
    ).toContain("SHA-256");
    const changed = structuredClone(regions);
    changed.regions[1].sourceRect.width = 601;
    expect(
      validateGrabRegions(
        changed,
        inventory,
        actual,
        lauraRegions,
        engineMap,
      ).join(),
    ).toContain("Runtime region drift");
    const missing = structuredClone(regions);
    missing.regions.pop();
    expect(
      validateGrabRegions(
        missing,
        inventory,
        actual,
        lauraRegions,
        engineMap,
      ).join(),
    ).toContain("Exactly three");
  });

  it("records historical pivots, partial alpha and a pending canonical mapping without scaling", () => {
    expect(validateGrabManifest(manifest, regions)).toEqual([]);
    expect(manifest.resources.map((resource) => resource.resourceId)).toEqual(
      grabIds,
    );
    expect(
      manifest.resources.map((resource) => resource.historicalPivot.x),
    ).toEqual([350, 300, 321]);
    expect(
      manifest.resources.map((resource) => resource.historicalPivot.y),
    ).toEqual([759, 759, 754]);
    expect(
      manifest.resources.every(
        (resource) => resource.sourceToLegacy.uniformScale === 1,
      ),
    ).toBe(true);
    expect(
      manifest.resources.every(
        (resource) =>
          resource.alpha.gt0.count > resource.alpha.gt128.count &&
          resource.partialAlphaCount > 0,
      ),
    ).toBe(true);
    expect(
      manifest.resources.every(
        (resource) =>
          resource.canonical.sourceTransform === null &&
          resource.status === "draft",
      ),
    ).toBe(true);
    const duplicate = structuredClone(manifest);
    duplicate.resources[1].resourceId = "grab_01";
    expect(validateGrabManifest(duplicate, regions).join()).toContain(
      "Duplicate",
    );
    const scaled = structuredClone(manifest);
    scaled.resources[0].sourceToLegacy.uniformScale = 0.9;
    expect(validateGrabManifest(scaled, regions).join()).toContain("scaling");
    const approved = structuredClone(manifest);
    approved.resources[0].canonical.status = "approved";
    expect(validateGrabManifest(approved, regions).join()).toContain(
      "Unapproved",
    );
  });

  it("extends the P05 Laura draft to all 27 IDs without changing P06 base entries", () => {
    expect(spec.identity.id).toBe("laura");
    expect(spec.identity.revision).toBe(2);
    expect(spec.status).toBe("draft");
    expect(spec.review.status).toBe("pending");
    expect(spec.resources.map((resource) => resource.id)).toEqual([
      ...baseIds,
      ...grabIds,
    ]);
    expect(
      spec.resources.every((resource) => resource.status === "pending"),
    ).toBe(true);
    expect(
      spec.sources.find((source) => source.path === regions.sourcePath),
    ).toEqual({ path: regions.sourcePath, role: "legacy" });
    expect(spec.visual.statureGameUnits).toBeNull();
    expect(spec.visual.proportions).toBeNull();
  });

  it("rebuilds all grabs deterministically without modifying production or the 24 base records", () => {
    const productionBefore = productionPaths.map(hash);
    const baseBefore = basePaths.map(hash);
    const raw = execFileSync(
      "node",
      ["docs/characters/laura/import-legacy-grab.mjs", "--check"],
      { cwd: root, encoding: "utf8" },
    );
    const report = JSON.parse(raw);
    expect(report.errors).toEqual([]);
    expect(report.sourceSheetHashMatchesP01).toBe(true);
    expect(report.frameByteEqualityApplicable).toBe(false);
    expect(
      report.frames.map((frame: { resourceId: string }) => frame.resourceId),
    ).toEqual(grabIds);
    expect(
      report.frames.every(
        (frame: {
          dimensionsEqual: boolean;
          rgbaPixelDifferences: number;
          alphaPixelDifferences: number;
          boundsEqual: boolean;
          historicalPivotEqual: boolean;
          placementEqual: boolean;
        }) =>
          frame.dimensionsEqual &&
          frame.rgbaPixelDifferences === 0 &&
          frame.alphaPixelDifferences === 0 &&
          frame.boundsEqual &&
          frame.historicalPivotEqual &&
          frame.placementEqual,
      ),
    ).toBe(true);
    expect(report.p05.errors).toEqual([]);
    expect(report.p05.productionReady).toBe(false);
    expect(productionPaths.map(hash)).toEqual(productionBefore);
    expect(basePaths.map(hash)).toEqual(baseBefore);
  }, 30000);
});
