import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import inventory from "../docs/characters/source-inventory.json";
import crops from "../docs/characters/laura/legacy-base-crops.json";
import manifest from "../docs/characters/laura/legacy-base-manifest.json";
import spec from "../docs/characters/laura/character-spec.json";
import {
  baseIds,
  validateLegacyCrops,
  validateLegacyManifest,
} from "../docs/characters/laura/legacy-base-contract.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = (path: string) =>
  createHash("sha256")
    .update(readFileSync(root + path))
    .digest("hex");
const source = inventory.files.find((file) => file.path === crops.sourcePath)!;
const atlas = inventory.files.find(
  (file) => file.path === "public/art/characters/laura/atlas.png",
)!;
const hashes = { source: hash(source.path), atlas: hash(atlas.path) };

describe("P06 Laura legacy base importer", () => {
  it("pins exactly the 24 P01 base crops inside the JPEG and rejects source drift", () => {
    expect(baseIds).toHaveLength(24);
    expect(validateLegacyCrops(crops, inventory, hashes)).toEqual([]);
    expect(
      validateLegacyCrops(crops, inventory, {
        ...hashes,
        source: "changed",
      }).join(),
    ).toContain("SHA-256");
    const invalid = structuredClone(crops);
    invalid.cropBoxes[0][2] = source.width + 1;
    expect(validateLegacyCrops(invalid, inventory, hashes).join()).toContain(
      "out-of-source",
    );
    expect(
      validateLegacyCrops(
        { ...crops, cropBoxes: crops.cropBoxes.slice(1) },
        inventory,
        hashes,
      ).join(),
    ).toContain("24");
  });

  it("records source-to-legacy translation without scaling, recentering or canonical approval", () => {
    expect(validateLegacyManifest(manifest, crops)).toEqual([]);
    expect(manifest.resources.map((resource) => resource.resourceId)).toEqual(
      baseIds,
    );
    expect(
      manifest.resources.every(
        (resource) => resource.sourceSha256 === source.sha256,
      ),
    ).toBe(true);
    expect(
      manifest.resources.every(
        (resource) =>
          resource.sourceToLegacy.uniformScale === 1 &&
          resource.cutoutToLegacy.uniformScale === 1,
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
    duplicate.resources[1].resourceId = "base_01";
    expect(validateLegacyManifest(duplicate, crops).join()).toContain(
      "Duplicate",
    );
    const scaled = structuredClone(manifest);
    scaled.resources[0].sourceToLegacy.uniformScale = 0.9;
    expect(validateLegacyManifest(scaled, crops).join()).toContain(
      "Accidental scaling",
    );
    const recentered = structuredClone(manifest);
    recentered.resources[0].legacyPlacement.x += 1;
    expect(validateLegacyManifest(recentered, crops).join()).toContain(
      "Historical placement mismatch",
    );
    const grab = structuredClone(manifest);
    grab.resources[0].resourceId = "grab_01";
    expect(validateLegacyManifest(grab, crops).join()).toContain("P07 grab");
  });

  it("keeps Laura pending with P05 frame references for base resources only", () => {
    expect(spec.status).toBe("draft");
    expect(spec.review.status).toBe("pending");
    expect(spec.sources).toEqual([{ path: source.path, role: "legacy" }]);
    expect(spec.resources.map((resource) => resource.id)).toEqual(baseIds);
    expect(
      spec.resources.every(
        (resource) =>
          resource.status === "pending" &&
          resource.framePath?.includes("legacy-frames/"),
      ),
    ).toBe(true);
    expect(spec.visual.statureGameUnits).toBeNull();
    expect(spec.visual.proportions).toBeNull();
  });

  it("rebuilds deterministically and compares all pixels with production without writing production", () => {
    const productionBefore = [
      "atlas.png",
      "guard.png",
      "portrait.png",
      "grab-sheet.png",
      "source-sheet.jpg",
    ].map((name) => hash(`public/art/characters/laura/${name}`));
    const raw = execFileSync(
      "node",
      ["docs/characters/laura/import-legacy-base.mjs", "--check"],
      { cwd: root, encoding: "utf8" },
    );
    const report = JSON.parse(raw);
    expect(report.errors).toEqual([]);
    expect(report.atlasByteEqual).toBe(true);
    expect(report.atlasDimensionsEqual).toBe(true);
    expect(report.frames).toHaveLength(24);
    expect(
      report.frames.every(
        (frame: {
          rgbaPixelDifferences: number;
          alphaPixelDifferences: number;
        }) =>
          frame.rgbaPixelDifferences === 0 && frame.alphaPixelDifferences === 0,
      ),
    ).toBe(true);
    expect(report.p05.errors).toEqual([]);
    expect(report.p05.productionReady).toBe(false);
    const productionAfter = [
      "atlas.png",
      "guard.png",
      "portrait.png",
      "grab-sheet.png",
      "source-sheet.jpg",
    ].map((name) => hash(`public/art/characters/laura/${name}`));
    expect(productionAfter).toEqual(productionBefore);
  }, 30000);
});
