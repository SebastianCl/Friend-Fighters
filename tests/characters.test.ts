import { describe, expect, it } from "vitest";
import { animationRegions } from "../src/animation";
import { visualCharacter, visualCharacters } from "../src/visual-assets";

describe("catálogo visual de personajes", () => {
  it("registra a Laura, Sebastian, Rata y Mariana con IDs, nombres y retratos únicos", () => {
    expect(visualCharacters.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: "laura", name: "LAURA" },
      { id: "sebastian", name: "SEBASTIAN" },
      { id: "rata", name: "RATA" },
      { id: "mariana", name: "MARIANA" },
    ]);
    expect(
      new Set(visualCharacters.map((character) => character.id)).size,
    ).toBe(visualCharacters.length);
    expect(
      new Set(visualCharacters.map((character) => character.portrait)).size,
    ).toBe(visualCharacters.length);
  });

  it("ofrece 24 poses y la hoja de agarre para cada personaje", () => {
    const expectedKeys = [
      ...animationRegions.map((region) => region.key),
      "grab-reach",
      "grab-hold",
      "grab-throw",
    ].sort((a, b) => a.localeCompare(b));
    for (const character of visualCharacters) {
      expect(Object.keys(character.sheets).sort()).toEqual([
        "air",
        "breathe",
        "grab",
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
        const width =
          region.sheet === "grab"
            ? character.id === "laura"
              ? 1942
              : 2400
            : character.id === "laura"
              ? 1800
              : character.id === "mariana"
                ? 1280
                : 1024;
        const height =
          region.sheet === "grab"
            ? character.id === "laura"
              ? 809
              : 800
            : character.id === "laura"
              ? 1280
              : character.id === "mariana"
                ? 1920
                : 1536;
        expect(region.x).toBeGreaterThanOrEqual(0);
        expect(region.y).toBeGreaterThanOrEqual(0);
        expect(region.x + region.width).toBeLessThanOrEqual(width);
        expect(region.y + region.height).toBeLessThanOrEqual(height);
        expect(region.anchorX).toBeGreaterThan(0);
        expect(region.anchorX).toBeLessThan(region.width);
        expect(region.referenceHeight).toBeGreaterThan(0);
      }
    }
    expect(visualCharacter("sebastian").regions).toHaveLength(24);
    expect(visualCharacter("rata").regions).toHaveLength(24);
    expect(visualCharacter("mariana").regions).toHaveLength(24);
  });
});
