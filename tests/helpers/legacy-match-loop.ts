import { Combat, type InputFrame } from "../../src/combat";
import {
  captureCombatSoundState,
  combatTransitionCues,
  hitCue,
} from "../../src/audio";
import { landedThisStep } from "../../src/effects/landing-dust";

// Frozen characterization of main.ts before the MatchSession extraction.
// Keep this independent of the new session and presentation adapter.
export function legacyMatchLoop(
  combat: Combat,
  inputs: (combat: Combat, player: 0 | 1) => InputFrame,
  record: (event: unknown) => void,
) {
  let accumulator = 0;
  return (delta: number) => {
    accumulator += delta;
    while (accumulator >= 1000 / 60) {
      const before = captureCombatSoundState(combat);
      combat.step([inputs(combat, 0), inputs(combat, 1)]);
      const after = captureCombatSoundState(combat);
      combatTransitionCues(before, after).forEach((cue) =>
        record(["sound", cue]),
      );
      combat.fighters.forEach((fighter, index) => {
        if (landedThisStep(before.fighters[index].airborne, fighter.y)) {
          record(["spawn", "landing-dust", { x: fighter.x * 2, y: 612 }]);
        }
      });
      for (const hit of combat.hits) {
        record(["sound", hitCue(hit)]);
        if (!hit.blocked) {
          const type =
            hit.attackKind === "special" || hit.attackKind === "grab"
              ? "heavyHit"
              : hit.attackKind === "kick"
                ? "mediumHit"
                : "lightHit";
          record(["spawn", type, { x: hit.x * 2, y: 612 - hit.y * 2 }]);
        }
        record(["flash", structuredClone(hit)]);
        record(["impact", structuredClone(hit)]);
      }
      record(["update", 1000 / 60]);
      accumulator -= 1000 / 60;
      if (combat.phase === "over") break;
    }
  };
}
