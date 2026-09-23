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
  | "low-special"
  | "grab-reach"
  | "grab-hold"
  | "grab-throw";
export interface AnimationRegion {
  key: AnimationKey;
  sheet: "motion" | "air" | "guard" | "breathe" | "grab";
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  referenceHeight: number;
}
/** Laura's supplied 6 × 4 sheet, extracted into 300 × 320 transparent cells. */
const lauraFrames: readonly [AnimationKey, number][] = [
  ["guard", 1], ["breathe", 2], ["walk-a", 4], ["walk-b", 5],
  ["rise", 7], ["land", 8], ["crouch", 10], ["block", 11],
  ["hurt", 13], ["fall", 14], ["punch-wind", 15], ["punch-hit", 16],
  ["kick-wind", 17], ["kick-hit", 18], ["low-punch", 19],
  ["low-kick", 20], ["special-wind", 15], ["special-hit", 21],
  ["air-punch", 22], ["air-kick", 23], ["low-special", 24],
];
export const animationRegions: AnimationRegion[] = lauraFrames.map(
  ([key, frame]): AnimationRegion => ({
    key,
    sheet: key === "guard" ? "guard" : key === "breathe" ? "breathe" :
      key.startsWith("air-") || key === "low-special" ? "air" : "motion",
    x: ((frame - 1) % 6) * 300,
    y: Math.floor((frame - 1) / 6) * 320,
    width: 300,
    height: 320,
    anchorX: 150,
    referenceHeight: 280,
  }),
);

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
  if (f.grabbedBy !== null) return "hurt";
  if (f.throwFlight) return "fall";
  if (f.pose === "fall") return "fall";
  if (f.pose === "hurt") return "hurt";
  if (f.attack?.kind === "grab")
    return f.attack.hit
      ? f.attack.frame < f.attack.move.startup + 10
        ? "grab-hold"
        : "grab-throw"
      : "grab-reach";
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
