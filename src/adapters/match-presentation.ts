import type { StepObserver } from "../application/match-session";
import type { Hit } from "../combat";
import {
  captureCombatSoundState,
  combatTransitionCues,
  hitCue,
  type CombatSoundState,
  type SoundCue,
} from "../audio";
import { LANDING_DUST_TYPE, landedThisStep } from "../effects/landing-dust";

export interface MatchPresentation {
  play(cue: SoundCue): void;
  spawn(type: string, position: { x: number; y: number }): void;
  flashForHit(hit: Readonly<Hit>): void;
  impact(hit: Readonly<Hit>): void;
  update(stepMs: number): void;
}

/** Translates simulation transitions into synchronous presentation effects. */
export function createMatchPresentation(
  output: MatchPresentation,
  coordinates: { unit: number; groundY: number },
): StepObserver {
  let before: CombatSoundState;
  return {
    beforeStep(combat) {
      before = captureCombatSoundState(combat);
    },
    afterStep(combat, stepMs) {
      const after = captureCombatSoundState(combat);
      combatTransitionCues(before, after).forEach((cue) => output.play(cue));
      combat.fighters.forEach((fighter, index) => {
        if (landedThisStep(before.fighters[index].airborne, fighter.y)) {
          output.spawn(LANDING_DUST_TYPE, {
            x: fighter.x * coordinates.unit,
            y: coordinates.groundY,
          });
        }
      });
      for (const hit of combat.hits) {
        output.play(hitCue(hit));
        if (!hit.blocked) {
          const type =
            hit.attackKind === "special" || hit.attackKind === "grab"
              ? "heavyHit"
              : hit.attackKind === "kick"
                ? "mediumHit"
                : "lightHit";
          output.spawn(type, {
            x: hit.x * coordinates.unit,
            y: coordinates.groundY - hit.y * coordinates.unit,
          });
        }
        output.flashForHit(hit);
        output.impact(hit);
      }
      output.update(stepMs);
    },
  };
}
