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
    id: "rio",
    name: "RIO",
    title: "Fuego del barrio",
    color: 0xeb6841,
    light: 0xffbc82,
    skin: 0xd9976c,
    hair: 0x28232d,
    animations,
  },
  {
    id: "nox",
    name: "NOX",
    title: "Calma antes del golpe",
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
    reach: 42,
    stun: 14,
    push: 7,
    cooldown: 0,
  },
  kick: {
    damage: 11,
    startup: 11,
    active: 5,
    recovery: 19,
    reach: 58,
    stun: 20,
    push: 12,
    cooldown: 0,
  },
  special: {
    damage: 18,
    startup: 17,
    active: 7,
    recovery: 30,
    reach: 73,
    stun: 26,
    push: 22,
    cooldown: 180,
  },
};
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
  fighters: [Fighter, Fighter] = [makeFighter(220, 1), makeFighter(420, -1)];
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
    this.fighters = [makeFighter(220, 1), makeFighter(420, -1)];
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
          f.x += d * 2.25;
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
      f.x = Math.max(28, Math.min(612, f.x));
      f.previous = { ...input };
    }
    const [a, b] = this.fighters;
    if (Math.abs(a.x - b.x) < 30 && Math.abs(a.y - b.y) < 60) {
      const [left, right] = a.x <= b.x ? [a, b] : [b, a];
      const push = (30 - (right.x - left.x)) / 2;
      left.x = Math.max(28, Math.min(582, left.x - push));
      right.x = Math.max(left.x + 30, Math.min(612, right.x + push));
    }
    // Collect both contacts before applying damage so simultaneous hits are symmetric.
    const contacts: {
      i: number;
      blocked: boolean;
      move: Move;
      special: boolean;
    }[] = [];
    this.fighters.forEach((f, i) => {
      const attack = f.attack;
      if (!attack || wasStunned[i]) return;
      const move = moves[attack.kind],
        target = this.fighters[1 - i];
      const attackY =
        f.y + (attack.crouched ? 21 : attack.kind === "kick" ? 34 : 43);
      const targetHeight = target.pose === "crouch" ? 37 : 66;
      if (
        !attack.hit &&
        attack.frame >= move.startup &&
        attack.frame < move.startup + move.active &&
        (target.x - f.x) * f.facing > 0 &&
        Math.abs(target.x - f.x) <= move.reach + 14 &&
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
        });
        attack.hit = true;
      }
      attack.frame++;
      if (attack.frame >= move.startup + move.active + move.recovery) {
        f.attack = null;
        f.pose = f.y > 0 ? "jump" : "idle";
      }
    });
    for (const { i, blocked, move, special } of contacts) {
      const f = this.fighters[i],
        t = this.fighters[1 - i];
      t.hp = Math.max(0, t.hp - (blocked ? 0 : move.damage));
      t.stun = blocked ? 8 : move.stun;
      t.pose = blocked ? "block" : t.hp === 0 ? "fall" : "hurt";
      t.attack = null;
      t.x = Math.max(
        28,
        Math.min(612, t.x + f.facing * (blocked ? move.push / 2 : move.push)),
      );
      this.hits.push({
        x: (f.x + t.x) / 2,
        y: 284 - f.y - 40,
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
