import type { Hit } from "../combat";

export type ImpactLevel = "light" | "medium" | "heavy";

export function impactLevelForHit(
  hit: Pick<Hit, "attackKind" | "blocked">,
): ImpactLevel | null {
  if (hit.blocked) return null;

  return hit.attackKind === "special"
    ? "heavy"
    : hit.attackKind === "kick"
      ? "medium"
      : "light";
}
