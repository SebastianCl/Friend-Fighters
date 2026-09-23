import {
  animationRegions,
  type AnimationKey,
  type AnimationRegion,
} from "./animation";

export type CharacterId = "laura" | "sebastian" | "rata" | "mariana";
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

const rataAtlas = "/art/characters/rata/animation-atlas.png";
const rataRegion = (
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

/** Regions follow Rata's supplied transparent atlas instead of a uniform grid. */
export const rataRegions: readonly AnimationRegion[] = [
  rataRegion("guard", "guard", 41, 21, 170, 263),
  rataRegion("breathe", "breathe", 301, 22, 171, 263),
  rataRegion("walk-a", "motion", 568, 20, 175, 268),
  rataRegion("walk-b", "motion", 813, 21, 188, 264, 3),
  rataRegion("rise", "motion", 39, 305, 177, 243),
  rataRegion("land", "motion", 295, 377, 213, 199),
  rataRegion("crouch", "motion", 562, 395, 160, 182),
  rataRegion("block", "motion", 814, 309, 178, 268),
  rataRegion("hurt", "motion", 45, 589, 159, 250),
  rataRegion("fall", "motion", 267, 766, 259, 67),
  rataRegion("punch-wind", "motion", 551, 596, 185, 244),
  rataRegion("punch-hit", "motion", 781, 597, 223, 243),
  rataRegion("kick-wind", "motion", 54, 854, 132, 247),
  rataRegion("kick-hit", "motion", 280, 855, 228, 246),
  rataRegion("low-punch", "motion", 533, 924, 217, 173),
  rataRegion("low-kick", "motion", 775, 954, 242, 145, 7),
  rataRegion("special-wind", "motion", 26, 1112, 181, 231),
  rataRegion("special-hit", "motion", 268, 1117, 200, 226),
  rataRegion("air-punch", "air", 562, 1114, 173, 190),
  rataRegion("air-kick", "air", 799, 1111, 207, 191, 8),
  rataRegion("low-special", "air", 24, 1362, 193, 162),
];

const marianaAtlas = "/art/characters/mariana/animation-atlas.png";
const marianaRegion = (
  key: AnimationKey,
  sheet: VisualSheetKey,
  x: number,
  y: number,
  width: number,
  height: number,
): AnimationRegion => ({
  key,
  sheet,
  x,
  y,
  width,
  height,
  anchorX: Math.round(width / 2),
  referenceHeight: 289,
});

/** Measured transparent bounds keep neighbouring poses out of every frame. */
export const marianaRegions: readonly AnimationRegion[] = [
  marianaRegion("guard", "guard", 17, 22, 224, 301),
  marianaRegion("breathe", "breathe", 276, 22, 220, 302),
  marianaRegion("walk-a", "motion", 533, 22, 216, 304),
  marianaRegion("walk-b", "motion", 785, 20, 232, 306),
  marianaRegion("rise", "motion", 35, 323, 183, 271),
  marianaRegion("land", "motion", 277, 369, 250, 229),
  marianaRegion("crouch", "motion", 552, 396, 180, 212),
  marianaRegion("block", "motion", 786, 323, 220, 297),
  marianaRegion("hurt", "motion", 34, 604, 193, 284),
  marianaRegion("fall", "motion", 236, 740, 294, 111),
  marianaRegion("punch-wind", "motion", 526, 608, 219, 284),
  marianaRegion("punch-hit", "motion", 752, 613, 261, 279),
  marianaRegion("kick-wind", "motion", 40, 873, 190, 263),
  marianaRegion("kick-hit", "motion", 268, 864, 250, 272),
  marianaRegion("low-punch", "motion", 519, 924, 246, 195),
  marianaRegion("low-kick", "motion", 751, 948, 273, 181),
  marianaRegion("special-wind", "motion", 12, 1120, 217, 260),
  marianaRegion("special-hit", "motion", 258, 1127, 233, 253),
  marianaRegion("air-punch", "air", 551, 1117, 212, 226),
  marianaRegion("air-kick", "air", 791, 1115, 225, 226),
  marianaRegion("low-special", "air", 16, 1355, 213, 180),
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
  {
    id: "rata",
    name: "RATA",
    title: "Rápida y astuta",
    sprite: rataAtlas,
    portrait: "/art/characters/rata/avatar.png",
    sheets: {
      guard: rataAtlas,
      breathe: rataAtlas,
      motion: rataAtlas,
      air: rataAtlas,
    },
    regions: rataRegions,
    sourceSize: { width: 1024, height: 1536 },
    visibleBounds: { left: 41, top: 21, right: 211, bottom: 284 },
    groundAnchor: { x: 126, y: 284 },
    displayHeight: 420,
    facing: "right",
  },
  {
    id: "mariana",
    name: "MARIANA",
    title: "Fuerza serena",
    sprite: marianaAtlas,
    portrait: "/art/characters/mariana/avatar.png",
    sheets: {
      guard: marianaAtlas,
      breathe: marianaAtlas,
      motion: marianaAtlas,
      air: marianaAtlas,
    },
    regions: marianaRegions,
    sourceSize: { width: 1024, height: 1536 },
    visibleBounds: { left: 41, top: 21, right: 211, bottom: 284 },
    groundAnchor: { x: 126, y: 284 },
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
