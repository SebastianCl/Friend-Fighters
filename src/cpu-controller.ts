import { combatSpace, idle, type Combat, type InputFrame } from "./combat";

/** Chooses inputs for an existing fighter; combat rules remain in Combat.step. */
export class CpuController {
  private ticksUntilDecision = 0;
  private held = idle();
  private pulse: Partial<InputFrame> = {};

  constructor(private readonly random: () => number = Math.random) {}

  reset() {
    this.ticksUntilDecision = 0;
    this.held = idle();
    this.pulse = {};
  }

  frame(combat: Combat, index: 0 | 1): InputFrame {
    if (combat.phase !== "fight") {
      this.reset();
      return idle();
    }
    if (this.ticksUntilDecision === 0) {
      this.decide(combat, index);
      this.ticksUntilDecision = 12 + Math.floor(this.random() * 9);
    }
    this.ticksUntilDecision--;
    const frame = { ...this.held, ...this.pulse };
    this.pulse = {};
    return frame;
  }

  private decide(combat: Combat, index: 0 | 1) {
    const self = combat.fighters[index];
    const opponent = combat.fighters[1 - index];
    const distance = Math.abs(opponent.x - self.x);
    const direction = opponent.x >= self.x ? 1 : -1;
    const toward = direction > 0 ? "right" : "left";
    const away = direction > 0 ? "left" : "right";
    this.held = idle();
    this.pulse = {};
    if (
      self.hp <= 0 ||
      self.hitStun > 0 ||
      self.attack ||
      self.grabbedBy !== null ||
      self.throwFlight ||
      self.landingRecovery > 0
    )
      return;

    const threat = opponent.attack;
    if (
      threat &&
      !threat.hit &&
      distance <= threat.move.reach + combatSpace.bodyHalfWidth + 25 &&
      this.random() < 0.55
    ) {
      if (threat.move.attackType === "unblockable") {
        this.held[away] = true;
        if (self.y === 0 && this.random() < 0.6) this.pulse.up = true;
      } else if (threat.move.attackType === "high" && this.random() < 0.35) {
        this.held.down = true;
      } else {
        this.held.block = true;
        this.held.down = threat.move.attackType === "low";
      }
      return;
    }

    if (distance > 145) {
      this.held[toward] = true;
      if (distance < 225 && self.y === 0 && this.random() < 0.1)
        this.pulse.up = true;
      return;
    }
    if (distance < 112 && this.random() < 0.25) {
      this.held[away] = true;
      return;
    }
    if (self.y === 0 && distance > 115 && this.random() < 0.08) {
      this.pulse.up = true;
      return;
    }
    if (this.random() < 0.12) this.held.down = true;
    if (
      self.y === 0 &&
      self.stance === "standing" &&
      distance <= 110 &&
      opponent.y === 0 &&
      this.random() < 0.16
    ) {
      this.pulse.grab = true;
    } else if (self.cooldown === 0 && distance <= 145 && this.random() < 0.16) {
      this.pulse.special = true;
    } else if (distance <= 135 && this.random() < 0.6) {
      this.pulse.kick = true;
    } else if (distance <= 112) {
      this.pulse.punch = true;
    } else {
      this.held[toward] = true;
    }
  }
}
