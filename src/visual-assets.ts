import {
  animationRegions,
  type AnimationKey,
  type AnimationRegion,
} from "./animation";

export type CharacterId = "laura" | "sebastian";
export type VisualSheetKey = AnimationRegion["sheet"];

/** Visual-only contract. Coordinates are source pixels, independent of combat units. */
export interface VisualCharacterAsset {
  id: CharacterId;
  name: string;
  title: string;
  sprite: string;
  portrait: string;
  sheets: Record<VisualSheetKey, string>;
  regions: readonly AnimationRegion[];
  sourceSize: { width: number; height: number };
  visibleBounds: { left: number; top: number; right: number; bottom: number };
  /** Ground anchor in the untrimmed texture. Kept stable for future animation frames. */
  groundAnchor: { x: number; y: number };
  displayHeight: number;
  facing: "right" | "left";
}
export const visualFighter: VisualCharacterAsset = {
  id: "laura",
  name: "LAURA",
  title: "La primera contendiente",
  sprite: "/art/visual-v1/fighter-guard.png",
  portrait: "/art/visual-v1/fighter-portrait.png",
  sheets: {
    guard: "/art/visual-v1/fighter-guard.png",
    breathe: "/art/combat-v2/laura-idle-breathe.png",
    motion: "/art/combat-v2/movement-sheet.png",
    air: "/art/combat-v2/air-sheet-v2.png",
  },
  regions: animationRegions,
  sourceSize: { width: 1024, height: 1536 },
  visibleBounds: { left: 133, top: 84, right: 912, bottom: 1472 },
  groundAnchor: { x: 512, y: 1472 },
  displayHeight: 420,
  facing: "right",
};

const sebastianAtlas = "/art/characters/sebastian/animation-atlas.png";
const sebastianRegion = (
  key: AnimationKey,
  sheet: VisualSheetKey,
  x: number,
  y: number,
  width: number,
  height: number,
  rightPadding = 8,
): AnimationRegion => ({
  key,
  sheet,
  x: x - 8,
  y: y - 8,
  width: width + 8 + rightPadding,
  height: height + 16,
  anchorX: Math.round((width + 8 + rightPadding) / 2),
  referenceHeight: 263,
});

/** Regions follow the generated figures instead of assuming a uniform grid. */
export const sebastianRegions: readonly AnimationRegion[] = [
  sebastianRegion("guard", "guard", 57, 25, 166, 263),
  sebastianRegion("breathe", "breathe", 312, 25, 164, 262),
  sebastianRegion("walk-a", "motion", 568, 25, 162, 262),
  sebastianRegion("walk-b", "motion", 812, 25, 181, 261),
  sebastianRegion("rise", "motion", 48, 303, 183, 235),
  sebastianRegion("land", "motion", 299, 367, 211, 201),
  sebastianRegion("crouch", "motion", 567, 386, 153, 182),
  sebastianRegion("block", "motion", 813, 304, 172, 265),
  sebastianRegion("hurt", "motion", 63, 583, 160, 255),
  sebastianRegion("fall", "motion", 263, 757, 275, 67),
  sebastianRegion("punch-wind", "motion", 555, 589, 183, 249),
  sebastianRegion("punch-hit", "motion", 777, 589, 229, 249),
  sebastianRegion("kick-wind", "motion", 66, 853, 136, 239),
  sebastianRegion("kick-hit", "motion", 282, 853, 245, 239, 7),
  sebastianRegion("low-punch", "motion", 534, 920, 229, 172),
  sebastianRegion("low-kick", "motion", 779, 949, 236, 143),
  sebastianRegion("special-wind", "motion", 42, 1108, 185, 233),
  sebastianRegion("special-hit", "motion", 280, 1110, 200, 228),
  sebastianRegion("air-punch", "air", 566, 1105, 180, 200),
  sebastianRegion("air-kick", "air", 801, 1107, 201, 191),
  sebastianRegion("low-special", "air", 37, 1360, 194, 160),
];

export const visualCharacters: readonly VisualCharacterAsset[] = [
  visualFighter,
  {
    id: "sebastian",
    name: "SEBASTIAN",
    title: "Tinta y determinación",
    sprite: sebastianAtlas,
    portrait: "/art/characters/sebastian/portrait.png",
    sheets: {
      guard: sebastianAtlas,
      breathe: sebastianAtlas,
      motion: sebastianAtlas,
      air: sebastianAtlas,
    },
    regions: sebastianRegions,
    sourceSize: { width: 1024, height: 1536 },
    visibleBounds: { left: 57, top: 25, right: 223, bottom: 288 },
    groundAnchor: { x: 140, y: 288 },
    displayHeight: 420,
    facing: "right",
  },
];

export function visualCharacter(id: CharacterId): VisualCharacterAsset {
  return visualCharacters.find((character) => character.id === id)!;
}
export const visualStage = {
  id: "neon-street-01",
  name: "Distrito Neón",
  background: "/art/visual-v1/neon-street.png",
  reference: "/art/visual-v1/reference.jpg",
  width: 1280,
  height: 720,
  groundY: 612,
} as const;
