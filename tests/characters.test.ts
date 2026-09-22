import { describe, expect, it } from "vitest";
import { animationRegions } from "../src/animation";
import { visualCharacter, visualCharacters } from "../src/visual-assets";

describe("catálogo visual de personajes", () => {
  it("registra a Laura y Sebastian con IDs, nombres y retratos únicos", () => {
    expect(visualCharacters.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: "laura", name: "LAURA" },
      { id: "sebastian", name: "SEBASTIAN" },
    ]);
    expect(
      new Set(visualCharacters.map((character) => character.id)).size,
    ).toBe(visualCharacters.length);
    expect(
      new Set(visualCharacters.map((character) => character.portrait)).size,
    ).toBe(visualCharacters.length);
  });

  it("ofrece las 21 poses y las tres fuentes visuales para cada personaje", () => {
    const expectedKeys = animationRegions
      .map((region) => region.key)
      .sort((a, b) => a.localeCompare(b));
    for (const character of visualCharacters) {
      expect(Object.keys(character.sheets).sort()).toEqual([
        "air",
        "guard",
        "motion",
      ]);
      expect(character.regions.map((region) => region.key).sort()).toEqual(
        expectedKeys,
      );
    }
  });

  it("mantiene todas las regiones dentro de sus hojas y con anclajes válidos", () => {
    for (const character of visualCharacters) {
      for (const region of character.regions) {
        const isLauraGuard =
          character.id === "laura" && region.sheet === "guard";
        const width =
          character.id === "sebastian" || isLauraGuard ? 1024 : 1254;
        const height =
          character.id === "sebastian" || isLauraGuard ? 1536 : 1254;
        expect(region.x).toBeGreaterThanOrEqual(0);
        expect(region.y).toBeGreaterThanOrEqual(0);
        expect(region.x + region.width).toBeLessThanOrEqual(width);
        expect(region.y + region.height).toBeLessThanOrEqual(height);
        expect(region.anchorX).toBeGreaterThan(0);
        expect(region.anchorX).toBeLessThan(region.width);
        expect(region.referenceHeight).toBeGreaterThan(0);
      }
    }
    expect(visualCharacter("sebastian").regions).toHaveLength(21);
  });
});
