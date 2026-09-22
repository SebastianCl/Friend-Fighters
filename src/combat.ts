export type Action =
  "left" | "right" | "up" | "down" | "punch" | "kick" | "special";
export type InputFrame = Record<Action, boolean>;
export const idle = (): InputFrame => ({
  left: false,
  right: false,
  up: false,
  down: false,
  punch: false,
  kick: false,
  special: false,
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
    id: "fighter-01",
    name: "LUCHADORA 01",
    title: "Personaje de referencia",
    color: 0xeb6841,
    light: 0xffbc82,
    skin: 0xd9976c,
    hair: 0x28232d,
    animations,
  },
  {
    id: "mirror-01",
    name: "ESPEJO",
    title: "Mismo personaje · otra esquina",
    color: 0x69c6ba,
    light: 0xc3ead6,
    skin: 0xaf795d,
    hair: 0x182c39,
    animations,
  },
];
export interface Move {
  damage: number;
  startup: number;
  active: number;
  recovery: number;
  reach: number;
  stun: number;
  push: number;
  cooldown: number;
}
export type MoveSetDefinition = Record<"punch" | "kick" | "special", Move>;
export const moves: MoveSetDefinition = {
  punch: {
    damage: 7,
    startup: 6,
    active: 4,
    recovery: 13,
    reach: 84,
    stun: 14,
    push: 7,
    cooldown: 0,
  },
  kick: {
    damage: 11,
    startup: 11,
    active: 5,
    recovery: 19,
    reach: 114,
    stun: 20,
    push: 12,
    cooldown: 0,
  },
  special: {
    damage: 18,
    startup: 17,
    active: 7,
    recovery: 30,
    reach: 120,
    stun: 26,
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
  return (
    f.y +
    (f.attack?.crouched
      ? combatSpace.lowHeight
      : f.attack?.kind === "kick"
        ? combatSpace.kickHeight
        : combatSpace.punchHeight)
  );
}
export interface Fighter {
  x: number;
  y: number;
  vy: number;
  hp: number;
  facing: 1 | -1;
  pose: Pose;
  cooldown: number;
  stun: number;
  attack: null | {
    kind: keyof MoveSetDefinition;
    frame: number;
    hit: boolean;
    crouched: boolean;
  };
  previous: InputFrame;
}
export interface Hit {
  x: number;
  y: number;
  blocked: boolean;
  special: boolean;
}
const makeFighter = (x: number, facing: 1 | -1): Fighter => ({
  x,
  y: 0,
  vy: 0,
  hp: 100,
  facing,
  pose: "idle",
  cooldown: 0,
  stun: 0,
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
  constructor(public practice = false) {}
  resetPositions() {
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
    if (this.phase !== "fight") {
      if (this.phase === "round" && --this.transition <= 0) {
        this.resetPositions();
        if (this.roundWinner >= 0) this.round++;
      }
      return;
    }
    const wasStunned = this.fighters.map((f) => f.stun > 0);
    for (let i = 0; i < 2; i++) {
      const f = this.fighters[i],
        opponent = this.fighters[1 - i],
        input = inputs[i];
      f.cooldown = Math.max(0, f.cooldown - 1);
      if (!f.attack && f.stun === 0) f.facing = opponent.x >= f.x ? 1 : -1;
      if (f.hp <= 0) {
        f.pose = "fall";
        continue;
      }
      if (f.stun > 0) {
        f.stun--;
      } else if (!f.attack) {
        f.pose = f.y > 0 ? "jump" : input.down ? "crouch" : "idle";
        if (input.up && !f.previous.up && f.y === 0) {
          f.vy = 7.6;
          f.pose = "jump";
        }
        if (!input.down || f.y > 0) {
          const d = Number(input.right) - Number(input.left);
          f.x += d * (f.y > 0 ? 4 : 2.25);
          if (d && f.y === 0) f.pose = "walk";
        }
        for (const kind of ["special", "kick", "punch"] as const) {
          if (
            input[kind] &&
            !f.previous[kind] &&
            (kind !== "special" || f.cooldown === 0)
          ) {
            f.attack = {
              kind,
              frame: 0,
              hit: false,
              crouched: input.down && f.y === 0,
            };
            f.pose = "attack";
            if (kind === "special") f.cooldown = moves.special.cooldown;
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
    const contacts: {
      i: number;
      blocked: boolean;
      move: Move;
      special: boolean;
      hitY: number;
    }[] = [];
    this.fighters.forEach((f, i) => {
      const attack = f.attack;
      if (!attack || wasStunned[i]) return;
      const move = moves[attack.kind],
        target = this.fighters[1 - i];
      const attackY = hitHeight(f);
      const targetHeight =
        target.pose === "crouch" || target.attack?.crouched
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
        const back =
          target.facing === 1 ? inputs[1 - i].left : inputs[1 - i].right;
        contacts.push({
          i,
          blocked:
            back && target.y === 0 && !target.attack && target.stun === 0,
          move,
          special: attack.kind === "special",
          hitY: attackY,
        });
        attack.hit = true;
      }
      attack.frame++;
      if (attack.frame >= move.startup + move.active + move.recovery) {
        f.attack = null;
        f.pose = f.y > 0 ? "jump" : "idle";
      }
    });
    for (const { i, blocked, move, special, hitY } of contacts) {
      const f = this.fighters[i],
        t = this.fighters[1 - i];
      t.hp = Math.max(0, t.hp - (blocked ? 0 : move.damage));
      t.stun = blocked ? 8 : move.stun;
      t.pose = blocked ? "block" : t.hp === 0 ? "fall" : "hurt";
      t.attack = null;
      t.x = Math.max(
        combatSpace.minX,
        Math.min(
          combatSpace.maxX,
          t.x + f.facing * (blocked ? move.push / 2 : move.push),
        ),
      );
      this.hits.push({
        x: t.x - f.facing * combatSpace.bodyHalfWidth,
        y: hitY,
        blocked,
        special,
      });
    }
    if (this.practice) {
      this.fighters.forEach((f) => {
        if (f.hp === 0) {
          f.hp = 100;
          f.stun = 0;
          f.pose = "idle";
        }
      });
      return;
    }
    this.ticks = Math.max(0, this.ticks - 1);
    if (a.hp === 0 || b.hp === 0 || this.ticks === 0) {
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
