import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import engineMap from "../docs/characters/laura/engine-map.json";
import sourceInventory from "../docs/characters/source-inventory.json";
import { animationRegions } from "../src/animation";
import { lauraRegions, visualFighter } from "../src/visual-assets";

type Resource = (typeof engineMap.resources)[number];
type Assignment = { id: string; key: string };

const baseSource = "public/art/characters/laura/source-sheet.jpg";
const grabSource = "public/art/characters/laura/grab-sheet.png";
const baseRuntime = "public/art/characters/laura/atlas.png";
const expectedIds = [
  ...Array.from(
    { length: 24 },
    (_, i) => "base_" + String(i + 1).padStart(2, "0"),
  ),
  ...Array.from(
    { length: 3 },
    (_, i) => "grab_" + String(i + 1).padStart(2, "0"),
  ),
];

function currentAssignments(): Assignment[] {
  const base = animationRegions.map((region) => {
    if (
      region.x % 300 !== 0 ||
      region.y % 320 !== 0 ||
      region.width !== 300 ||
      region.height !== 320
    ) {
      throw new Error(
        "Laura's base region no longer matches the 6 x 4 atlas cells",
      );
    }
    const frame = (region.y / 320) * 6 + region.x / 300 + 1;
    return { id: "base_" + String(frame).padStart(2, "0"), key: region.key };
  });
  const grab = lauraRegions
    .filter((region) => region.sheet === "grab")
    .toSorted((a, b) => a.x - b.x)
    .map((region, i) => ({
      id: "grab_" + String(i + 1).padStart(2, "0"),
      key: region.key,
    }));
  return [...base, ...grab];
}

function validate(resources: Resource[], assignments: Assignment[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const expected = new Set(expectedIds);
  const inventoryPaths = new Set(
    sourceInventory.files.map((file) => file.path),
  );
  const declaredKeys = new Set<string>();
  const actualById = new Map<string, string[]>();

  for (const resource of resources) {
    if (ids.has(resource.id)) errors.push("duplicate ID: " + resource.id);
    ids.add(resource.id);
    if (!expected.has(resource.id))
      errors.push("unexpected ID: " + resource.id);
    const category = resource.id.startsWith("base_") ? "base" : "grab";
    if (resource.category !== category)
      errors.push("wrong category: " + resource.id);
    const sourcePath = category === "base" ? baseSource : grabSource;
    if (
      resource.sourcePath !== sourcePath ||
      !inventoryPaths.has(resource.sourcePath)
    )
      errors.push("source absent from P01: " + resource.id);
    if (resource.used !== resource.engineKeys.length > 0)
      errors.push("wrong used flag: " + resource.id);
    if (resource.reused !== resource.engineKeys.length > 1)
      errors.push("undeclared reuse: " + resource.id);
    for (const key of resource.engineKeys) {
      if (declaredKeys.has(key)) errors.push("key claimed twice: " + key);
      declaredKeys.add(key);
    }
  }

  for (const id of expectedIds)
    if (!ids.has(id)) errors.push("missing ID: " + id);
  for (const { id, key } of assignments) {
    if (!ids.has(id)) errors.push("engine references absent resource: " + id);
    actualById.set(id, [...(actualById.get(id) ?? []), key]);
  }
  for (const resource of resources) {
    const declared = [...resource.engineKeys].sort();
    const actual = [...(actualById.get(resource.id) ?? [])].sort();
    if (JSON.stringify(declared) !== JSON.stringify(actual))
      errors.push("engine mapping changed: " + resource.id);
  }
  return errors;
}

describe("P02: mapa de los 27 recursos de Laura", () => {
  it("conserva IDs únicos, fuentes de P01, estados de uso y mapeo actual del motor", () => {
    expect(engineMap.schemaVersion).toBe(1);
    expect(engineMap.character).toBe("laura");
    expect(engineMap.meaning).toBe("engine-usage-only");
    expect(engineMap.artisticInterpretation).toBe("external-catalog");
    expect(engineMap.artisticCatalog).toBe(
      "docs/characters/pose-semantics.json",
    );
    expect(engineMap.resources.map((resource) => resource.id)).toEqual(
      expectedIds,
    );
    expect(lauraRegions.filter((region) => region.sheet !== "grab")).toEqual(
      animationRegions,
    );
    expect(currentAssignments()).toHaveLength(24);
    expect(validate(engineMap.resources, currentAssignments())).toEqual([]);
    expect(
      engineMap.resources
        .filter((resource) => !resource.used)
        .map((resource) => resource.id),
    ).toEqual(["base_03", "base_06", "base_09", "base_12"]);
    expect(
      engineMap.resources
        .filter((resource) => resource.reused)
        .map((resource) => ({
          id: resource.id,
          keys: resource.engineKeys,
        })),
    ).toEqual([{ id: "base_15", keys: ["punch-wind", "special-wind"] }]);
  });

  it("verifica que las rutas y hashes de las dos fuentes coinciden con P01", () => {
    for (const path of [baseSource, grabSource, baseRuntime]) {
      const entry = sourceInventory.files.find((file) => file.path === path);
      expect(entry, path).toBeDefined();
      const hash = createHash("sha256")
        .update(readFileSync(path))
        .digest("hex");
      expect(hash).toBe(entry!.sha256);
    }
    for (const sheet of ["guard", "breathe", "motion", "air"] as const)
      expect(visualFighter.sheets[sheet]).toBe("/" + baseRuntime.slice(7));
    expect(visualFighter.sheets.grab).toBe("/" + grabSource.slice(7));
  });

  it("detecta duplicados, ausencias, referencias rotas, cambios de motor y reutilización oculta", () => {
    const resources = structuredClone(engineMap.resources);
    const assignments = currentAssignments();
    expect(validate([...resources, resources[0]], assignments)).toContain(
      "duplicate ID: base_01",
    );
    expect(validate(resources.slice(1), assignments)).toContain(
      "missing ID: base_01",
    );
    expect(
      validate(resources, [
        { id: "base_25", key: "guard" },
        ...assignments.slice(1),
      ]),
    ).toContain("engine references absent resource: base_25");
    expect(
      validate(resources, [
        { id: "base_02", key: "guard" },
        ...assignments.slice(1),
      ]),
    ).toContain("engine mapping changed: base_01");
    resources[14].reused = false;
    expect(validate(resources, assignments)).toContain(
      "undeclared reuse: base_15",
    );
  });
});
