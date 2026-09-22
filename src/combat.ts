export type Action =
  "left" | "right" | "up" | "down" | "punch" | "kick" | "special" | "block";
export type InputFrame = Record<Action, boolean>;
export const idle = (): InputFrame => ({
  left: false,
  right: false,
  up: false,
  down: false,
  punch: false,
  kick: false,
  special: false,
  block: false,
});
export type Pose =
  "idle" | "walk" | "jump" | "crouch" | "attack" | "block" | "hurt" | "fall";
export interface FighterDefinition {
  id: string;
  name: string;
  title: string;
  color: number;
  light: number;
  skin: number;
  hair: number;
  animations: Record<Pose, string>;
}
const animations = {
  idle: "guard",
  walk: "stride",
  jump: "leap",
  crouch: "duck",
  attack: "strike",
  block: "guardHigh",
  hurt: "recoil",
  fall: "knockdown",
};
export const fighters: FighterDefinition[] = [
  {
    id: "laura",
    name: "LAURA",
    title: "La primera contendiente",
    color: 0xeb6841,
    light: 0xffbc82,
    skin: 0xd9976c,
    hair: 0x28232d,
    animations,
  },
  {
    id: "sebastian",
    name: "SEBASTIAN",
    title: "Tinta y determinación",
    color: 0x69c6ba,
    light: 0xc3ead6,
    skin: 0xaf795d,
    hair: 0x182c39,
    animations,
  },
];
export type AttackType = "high" | "mid" | "low" | "overhead" | "unblockable";
export type Stance = "standing" | "crouching";
export type AttackContext = Stance | "airborne";
export const guardCompatibility: Record<AttackType, readonly Stance[]> = {
  high: ["standing"],
  mid: ["standing", "crouching"],
  low: ["crouching"],
  overhead: ["standing"],
  unblockable: [],
};
export interface Move {
  attackType: AttackType;
  contactHeight: number;
  chipDamage: number;
  guardStunFrames: number;
  chipCanKO: boolean;
  damage: number;
  startup: number;
  active: number;
  recovery: number;
  reach: number;
  hitStun: number;
  /** Optional shorter continuation window; never extends hit stun. */
  comboWindowFrames?: number;
  push: number;
  cooldown: number;
}
export interface MoveDefinition extends Move {
  variants: Record<AttackContext, Partial<Move>>;
}
export type MoveSetDefinition = Record<
  "punch" | "kick" | "special",
  MoveDefinition
>;
export function resolveMove(
  definition: MoveDefinition,
  context: AttackContext,
): Move {
  const { variants, ...base } = definition;
  return { ...base, ...variants[context] };
}
export const moves: MoveSetDefinition = {
  punch: {
    attackType: "high",
    contactHeight: 155,
    chipDamage: 0,
    guardStunFrames: 8,
    chipCanKO: false,
    variants: {
      standing: {},
      crouching: { attackType: "mid", contactHeight: 90 },
      airborne: { attackType: "overhead", contactHeight: 155 },
    },
    damage: 7,
    startup: 6,
    active: 4,
    recovery: 13,
    reach: 84,
    hitStun: 30,
    push: 7,
    cooldown: 0,
  },
  kick: {
    attackType: "mid",
    contactHeight: 135,
    chipDamage: 0,
    guardStunFrames: 12,
    chipCanKO: false,
    variants: {
      standing: {},
      crouching: { attackType: "low", contactHeight: 90 },
      airborne: { attackType: "overhead", contactHeight: 135 },
    },
    damage: 11,
    startup: 11,
    active: 5,
    recovery: 19,
    reach: 114,
    hitStun: 44,
    push: 12,
    cooldown: 0,
  },
  special: {
    attackType: "mid",
    contactHeight: 135,
    chipDamage: 2,
    guardStunFrames: 18,
    chipCanKO: false,
    variants: {
      standing: {},
      crouching: { attackType: "low", contactHeight: 90 },
      airborne: { attackType: "overhead", contactHeight: 155 },
    },
    damage: 18,
    startup: 17,
    active: 7,
    recovery: 30,
    reach: 120,
    hitStun: 26,
    push: 22,
    cooldown: 180,
  },
};
export const combatSpace = {
  minX: 90,
  maxX: 550,
  separation: 100,
  bodyHalfWidth: 30,
  standingHeight: 210,
  crouchingHeight: 144,
  punchHeight: 155,
  kickHeight: 135,
  lowHeight: 90,
  startX: [180, 460] as const,
};
export function hitHeight(f: Fighter): number {
  return f.y + (f.attack?.move.contactHeight ?? combatSpace.punchHeight);
}
export interface Fighter {
  x: number;
  y: number;
  vy: number;
  hp: number;
  facing: 1 | -1;
  pose: Pose;
  cooldown: number;
  hitStun: number;
  guardStun: number;
  stance: Stance;
  attack: null | {
    id: number;
    kind: keyof MoveSetDefinition;
    frame: number;
    hit: boolean;
    crouched: boolean;
    move: Move;
  };
  previous: InputFrame;
}
export interface ComboState {
  id: number;
  defender: number;
  hits: number;
  remaining: number;
  active: boolean;
  displayHits: number;
  displayFrames: number;
}
export const comboDisplayFrames = 60;
const makeCombo = (defender: number): ComboState => ({
  id: 0,
  defender,
  hits: 0,
  remaining: 0,
  active: false,
  displayHits: 0,
  displayFrames: 0,
});

export interface Hit {
  attacker: number;
  defender: number;
  attackId: number;
  attackKind: keyof MoveSetDefinition;
  x: number;
  y: number;
  blocked: boolean;
  special: boolean;
}
/** Guard is input-driven even during guard stun; presentation never decides defense. */
export function guardFor(
  f: Fighter,
  input: InputFrame,
  hitStunned = f.hitStun > 0,
): Stance | null {
  if (
    f.hp <= 0 ||
    f.y > 0 ||
    f.vy > 0 ||
    f.attack ||
    hitStunned ||
    !input.block
  )
    return null;
  return input.down ? "crouching" : "standing";
}
export function canBlock(type: AttackType, guard: Stance | null): boolean {
  return guard !== null && guardCompatibility[type].includes(guard);
}
export function resolveContact(move: Move, hp: number, guard: Stance | null) {
  const blocked = canBlock(move.attackType, guard);
  const minimum = blocked && !move.chipCanKO && hp > 0 ? 1 : 0;
  return {
    blocked,
    hp: Math.max(minimum, hp - (blocked ? move.chipDamage : move.damage)),
    hitStun: blocked ? 0 : move.hitStun,
    guardStun: blocked ? move.guardStunFrames : 0,
    push: blocked ? move.push / 2 : move.push,
  };
}
const makeFighter = (x: number, facing: 1 | -1): Fighter => ({
  x,
  y: 0,
  vy: 0,
  hp: 100,
  facing,
  pose: "idle",
  cooldown: 0,
  hitStun: 0,
  guardStun: 0,
  stance: "standing",
  attack: null,
  previous: idle(),
});
export class Combat {
  fighters: [Fighter, Fighter] = [
    makeFighter(combatSpace.startX[0], 1),
    makeFighter(combatSpace.startX[1], -1),
  ];
  wins = [0, 0];
  ticks = 3600;
  phase: "fight" | "round" | "over" = "fight";
  transition = 0;
  round = 1;
  roundWinner = -1;
  message = "";
  hits: Hit[] = [];
  combos: [ComboState, ComboState] = [makeCombo(1), makeCombo(0)];
  private nextAttackId = 1;
  private nextComboId = 1;

  clearCombos() {
    this.combos = [makeCombo(1), makeCombo(0)];
  }
  private endCombo(i: number) {
    const combo = this.combos[i];
    if (!combo.active) return;
    combo.active = false;
    combo.remaining = 0;
    if (combo.hits >= 2) combo.displayFrames = comboDisplayFrames;
  }
  private registerComboHit(i: number, move: Move, continues: boolean) {
    const combo = this.combos[i];
    if (!continues) {
      this.endCombo(i);
      combo.id = this.nextComboId++;
      combo.defender = 1 - i;
      combo.hits = 0;
    }
    combo.active = true;
    combo.hits++;
    combo.remaining = Math.max(
      0,
      Math.min(move.hitStun, move.comboWindowFrames ?? move.hitStun),
    );
    if (combo.hits >= 2) {
      combo.displayHits = combo.hits;
      combo.displayFrames = 0;
    }
  }
  constructor(
    public practice = false,
    public moveSet: MoveSetDefinition = moves,
  ) {}
  resetPositions() {
    this.clearCombos();
    this.fighters = [
      makeFighter(combatSpace.startX[0], 1),
      makeFighter(combatSpace.startX[1], -1),
    ];
    this.ticks = 3600;
    this.phase = "fight";
    this.hits = [];
    this.transition = 0;
  }
  step(inputs: [InputFrame, InputFrame]) {
    this.hits = [];
    for (const combo of this.combos) {
      if (combo.displayFrames > 0 && --combo.displayFrames === 0)
        combo.displayHits = 0;
    }
    if (this.phase !== "fight") {
      if (this.phase === "round" && --this.transition <= 0) {
        this.resetPositions();
        if (this.roundWinner >= 0) this.round++;
      }
      return;
    }
    const wasStunned = this.fighters.map((f) => f.hitStun > 0);
    // Eligibility belongs to the start of the tick, just like guard eligibility.
    const continues = this.combos.map(
      (combo, i) =>
        combo.active &&
        combo.defender === 1 - i &&
        combo.remaining > 0 &&
        wasStunned[1 - i] &&
        this.fighters[1 - i].hp > 0,
    );
    this.combos.forEach((combo, i) => {
      if (!continues[i]) this.endCombo(i);
      if (combo.active) combo.remaining--;
    });
    for (let i = 0; i < 2; i++) {
      const f = this.fighters[i],
        opponent = this.fighters[1 - i],
        input = inputs[i];
      f.cooldown = Math.max(0, f.cooldown - 1);
      if (!f.attack && f.hitStun === 0) f.facing = opponent.x >= f.x ? 1 : -1;
      if (f.hp <= 0) {
        f.pose = "fall";
        f.hitStun = f.guardStun = 0;
        f.stance = "standing";
        f.attack = null;
        f.previous = { ...input };
        continue;
      }
      if (f.hitStun > 0) {
        f.hitStun--;
      } else if (f.guardStun > 0) {
        f.guardStun--;
        f.stance = input.down ? "crouching" : "standing";
        f.pose = "block";
      } else if (!f.attack) {
        f.stance = input.down && f.y === 0 ? "crouching" : "standing";
        f.pose =
          f.y > 0
            ? "jump"
            : input.block
              ? "block"
              : input.down
                ? "crouch"
                : "idle";
        if (input.up && !f.previous.up && f.y === 0) {
          f.vy = 7.6;
          f.stance = "standing";
          f.pose = "jump";
        }
        if (!input.down || f.y > 0) {
          const d = Number(input.right) - Number(input.left);
          f.x += d * (f.y > 0 ? 4 : 2.25);
          if (d && f.y === 0 && !input.block) f.pose = "walk";
        }
        for (const kind of ["special", "kick", "punch"] as const) {
          if (!input[kind] || f.previous[kind]) continue;
          const context: AttackContext =
            f.y > 0 || f.vy > 0 ? "airborne" : f.stance;
          const move = resolveMove(this.moveSet[kind], context);
          if (move.cooldown === 0 || f.cooldown === 0) {
            f.attack = {
              id: this.nextAttackId++,
              kind,
              frame: 0,
              hit: false,
              crouched: context === "crouching",
              move,
            };
            f.pose = "attack";
            if (move.cooldown > 0) f.cooldown = move.cooldown;
            break;
          }
        }
      }
      if (f.y > 0 || f.vy > 0) {
        f.y = Math.max(0, f.y + f.vy);
        f.vy -= 0.38;
        if (f.y === 0) f.vy = 0;
      }
      f.x = Math.max(combatSpace.minX, Math.min(combatSpace.maxX, f.x));
      f.previous = { ...input };
    }
    const [a, b] = this.fighters;
    if (
      Math.abs(a.x - b.x) < combatSpace.separation &&
      a.y === 0 &&
      b.y === 0
    ) {
      const [left, right] = a.x <= b.x ? [a, b] : [b, a];
      const push = (combatSpace.separation - (right.x - left.x)) / 2;
      left.x = Math.max(
        combatSpace.minX,
        Math.min(combatSpace.maxX - combatSpace.separation, left.x - push),
      );
      right.x = Math.max(
        left.x + combatSpace.separation,
        Math.min(combatSpace.maxX, right.x + push),
      );
    }
    // Collect both contacts before applying damage so simultaneous hits are symmetric.
    // Snapshot eligibility before advancing attacks: neither player may guard on
    // their last recovery/hit-stun tick due to iteration order.
    const guards = this.fighters.map((f, i) =>
      guardFor(f, inputs[i], wasStunned[i]),
    );
    const contacts: {
      i: number;
      result: ReturnType<typeof resolveContact>;
      special: boolean;
      hitY: number;
      attackId: number;
      attackKind: keyof MoveSetDefinition;
      move: Move;
    }[] = [];
    this.fighters.forEach((f, i) => {
      const attack = f.attack;
      if (!attack || wasStunned[i]) return;
      const move = attack.move,
        target = this.fighters[1 - i];
      const attackY = hitHeight(f);
      const targetHeight =
        target.stance === "crouching"
          ? combatSpace.crouchingHeight
          : combatSpace.standingHeight;
      if (
        !attack.hit &&
        attack.frame >= move.startup &&
        attack.frame < move.startup + move.active &&
        (target.x - f.x) * f.facing > 0 &&
        Math.abs(target.x - f.x) <= move.reach + combatSpace.bodyHalfWidth &&
        attackY >= target.y - 5 &&
        attackY <= target.y + targetHeight
      ) {
        contacts.push({
          i,
          result: resolveContact(move, target.hp, guards[1 - i]),
          special: attack.kind === "special",
          hitY: attackY,
          attackId: attack.id,
          attackKind: attack.kind,
          move,
        });
        attack.hit = true;
      }
      attack.frame++;
      if (attack.frame >= move.startup + move.active + move.recovery) {
        f.attack = null;
        if (f.y > 0) {
          f.pose = "jump";
        } else {
          f.stance = inputs[i].down ? "crouching" : "standing";
          f.pose = inputs[i].down ? "crouch" : "idle";
        }
      }
    });
    for (const {
      i,
      result,
      special,
      hitY,
      attackId,
      attackKind,
      move,
    } of contacts) {
      const f = this.fighters[i],
        t = this.fighters[1 - i];
      const { blocked } = result;
      if (!blocked) this.registerComboHit(i, move, continues[i]);
      t.hp = result.hp;
      t.hitStun = result.hitStun;
      t.guardStun = blocked ? Math.max(t.guardStun, result.guardStun) : 0;
      t.pose = t.hp === 0 ? "fall" : blocked ? "block" : "hurt";
      if (t.hp === 0) {
        t.hitStun = t.guardStun = 0;
        t.stance = "standing";
      }
      t.attack = null;
      t.x = Math.max(
        combatSpace.minX,
        Math.min(combatSpace.maxX, t.x + f.facing * result.push),
      );
      this.hits.push({
        attacker: i,
        defender: 1 - i,
        attackId,
        attackKind,
        x: t.x - f.facing * combatSpace.bodyHalfWidth,
        y: hitY,
        blocked,
        special,
      });
    }
    // Resolve interruptions only after both contacts have been credited.
    this.combos.forEach((combo, i) => {
      if (
        combo.remaining <= 0 ||
        this.fighters[1 - i].hitStun === 0 ||
        this.fighters.some((f) => f.hp === 0) ||
        contacts.some(
          (contact) => contact.i === 1 - i && !contact.result.blocked,
        )
      ) {
        this.endCombo(i);
      }
    });
    if (this.practice) {
      this.fighters.forEach((f) => {
        if (f.hp === 0) {
          f.hp = 100;
          f.hitStun = f.guardStun = 0;
          f.stance = "standing";
          f.attack = null;
          f.pose = "idle";
        }
      });
      return;
    }
    this.ticks = Math.max(0, this.ticks - 1);
    if (a.hp === 0 || b.hp === 0 || this.ticks === 0) {
      this.combos.forEach((_, i) => this.endCombo(i));
      const winner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
      this.roundWinner = winner;
      if (winner >= 0) this.wins[winner]++;
      this.message =
        winner < 0 ? "EMPATE · REPETIMOS" : `JUGADOR ${winner + 1} GANA`;
      this.phase = this.wins.some((w) => w === 2) ? "over" : "round";
      this.transition = 150;
    }
  }
}
