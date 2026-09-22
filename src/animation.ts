import { type Fighter } from "./combat";
export type AnimationKey =
  | "guard"
  | "breathe"
  | "walk-a"
  | "walk-b"
  | "rise"
  | "land"
  | "crouch"
  | "block"
  | "hurt"
  | "fall"
  | "punch-wind"
  | "punch-hit"
  | "kick-wind"
  | "kick-hit"
  | "low-punch"
  | "low-kick"
  | "special-wind"
  | "special-hit"
  | "air-punch"
  | "air-kick"
  | "low-special";
export interface AnimationRegion {
  key: AnimationKey;
  sheet: "motion" | "air" | "guard";
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  referenceHeight: number;
}
/** Nonuniform source regions measured from the generated sheets; no clipping to an assumed grid. */
export const animationRegions: AnimationRegion[] = [
  {
    key: "guard",
    sheet: "guard",
    x: 0,
    y: 0,
    width: 1024,
    height: 1536,
    anchorX: 512,
    referenceHeight: 1388,
  },
  {
    key: "walk-a",
    sheet: "motion",
    x: 0,
    y: 0,
    width: 314,
    height: 350,
    anchorX: 160,
    referenceHeight: 309,
  },
  {
    key: "walk-b",
    sheet: "motion",
    x: 314,
    y: 0,
    width: 321,
    height: 350,
    anchorX: 163,
    referenceHeight: 309,
  },
  {
    key: "rise",
    sheet: "motion",
    x: 635,
    y: 0,
    width: 290,
    height: 350,
    anchorX: 155,
    referenceHeight: 309,
  },
  {
    key: "land",
    sheet: "motion",
    x: 925,
    y: 0,
    width: 329,
    height: 350,
    anchorX: 185,
    referenceHeight: 309,
  },
  {
    key: "crouch",
    sheet: "motion",
    x: 0,
    y: 350,
    width: 314,
    height: 320,
    anchorX: 155,
    referenceHeight: 309,
  },
  {
    key: "block",
    sheet: "motion",
    x: 314,
    y: 350,
    width: 321,
    height: 320,
    anchorX: 163,
    referenceHeight: 309,
  },
  {
    key: "hurt",
    sheet: "motion",
    x: 635,
    y: 350,
    width: 279,
    height: 320,
    anchorX: 150,
    referenceHeight: 309,
  },
  {
    key: "fall",
    sheet: "motion",
    x: 914,
    y: 350,
    width: 340,
    height: 320,
    anchorX: 170,
    referenceHeight: 309,
  },
  {
    key: "punch-wind",
    sheet: "motion",
    x: 0,
    y: 670,
    width: 318,
    height: 308,
    anchorX: 154,
    referenceHeight: 309,
  },
  {
    key: "punch-hit",
    sheet: "motion",
    x: 318,
    y: 670,
    width: 322,
    height: 308,
    anchorX: 160,
    referenceHeight: 309,
  },
  {
    key: "kick-wind",
    sheet: "motion",
    x: 640,
    y: 670,
    width: 274,
    height: 308,
    anchorX: 134,
    referenceHeight: 309,
  },
  {
    key: "kick-hit",
    sheet: "motion",
    x: 914,
    y: 670,
    width: 340,
    height: 308,
    anchorX: 151,
    referenceHeight: 309,
  },
  {
    key: "low-punch",
    sheet: "motion",
    x: 0,
    y: 978,
    width: 318,
    height: 276,
    anchorX: 152,
    referenceHeight: 309,
  },
  {
    key: "low-kick",
    sheet: "motion",
    x: 318,
    y: 978,
    width: 322,
    height: 276,
    anchorX: 133,
    referenceHeight: 309,
  },
  {
    key: "special-wind",
    sheet: "motion",
    x: 640,
    y: 978,
    width: 287,
    height: 276,
    anchorX: 148,
    referenceHeight: 309,
  },
  {
    key: "special-hit",
    sheet: "motion",
    x: 927,
    y: 978,
    width: 327,
    height: 276,
    anchorX: 150,
    referenceHeight: 309,
  },
  {
    key: "breathe",
    sheet: "air",
    x: 0,
    y: 0,
    width: 627,
    height: 627,
    anchorX: 320,
    referenceHeight: 434,
  },
  {
    key: "air-punch",
    sheet: "air",
    x: 627,
    y: 0,
    width: 627,
    height: 627,
    anchorX: 315,
    referenceHeight: 434,
  },
  {
    key: "air-kick",
    sheet: "air",
    x: 0,
    y: 627,
    width: 627,
    height: 627,
    anchorX: 270,
    referenceHeight: 434,
  },
  {
    key: "low-special",
    sheet: "air",
    x: 627,
    y: 627,
    width: 627,
    height: 627,
    anchorX: 270,
    referenceHeight: 434,
  },
];

export function attackPhase(
  f: Fighter,
): "startup" | "active" | "recovery" | null {
  if (!f.attack) return null;
  const elapsed = Math.max(0, f.attack.frame - 1),
    move = f.attack.move;
  return elapsed < move.startup
    ? "startup"
    : elapsed < move.startup + move.active
      ? "active"
      : "recovery";
}
/** Fixed simulation ticks drive all poses. Pausing freezes both motion and animation. */
export function animationFor(
  f: Fighter,
  tick: number,
  poseAge = 100,
): AnimationKey {
  if (f.hp === 0) return poseAge < 7 ? "hurt" : "fall";
  if (f.pose === "block") return f.stance === "crouching" ? "crouch" : "block";
  if (f.pose === "hurt") return "hurt";
  if (f.attack) {
    const phase = attackPhase(f),
      kind = f.attack.kind;
    const contact =
      phase === "active" ||
      (phase === "recovery" &&
        f.attack.frame < f.attack.move.startup + f.attack.move.active + 5);
    if (f.y > 0)
      return contact
        ? kind === "kick"
          ? "air-kick"
          : kind === "special"
            ? "special-hit"
            : "air-punch"
        : f.vy > 0
          ? "rise"
          : "land";
    if (f.attack.crouched)
      return contact
        ? kind === "punch"
          ? "low-punch"
          : kind === "kick"
            ? "low-kick"
            : "low-special"
        : "crouch";
    if (contact)
      return kind === "punch"
        ? "punch-hit"
        : kind === "kick"
          ? "kick-hit"
          : "special-hit";
    if (
      phase === "recovery" &&
      f.attack.frame > f.attack.move.startup + f.attack.move.active + 10
    )
      return "guard";
    return kind === "punch"
      ? "punch-wind"
      : kind === "kick"
        ? "kick-wind"
        : "special-wind";
  }
  if (f.y > 0) return f.vy > 0 ? "rise" : "land";
  if (f.pose === "walk")
    return Math.floor(tick / 9) % 2 === 0 ? "walk-a" : "walk-b";
  if (f.pose === "crouch") return "crouch";
  return Math.floor(tick / 40) % 2 === 0 ? "guard" : "breathe";
}
