import { describe, expect, it } from "vitest";
import {
  Combat,
  idle,
  moves,
  resolveMove,
  resolveContact,
  canBlock,
  guardFor,
  type AttackType,
  type InputFrame,
  type Move,
} from "../src/combat";
import { animationFor, attackPhase } from "../src/animation";

const frame = (patch: Partial<InputFrame> = {}) => ({ ...idle(), ...patch });
function setup(defender = 1, reversed = false) {
  const c = new Combat();
  c.fighters[0].x = reversed ? 390 : 290;
  c.fighters[1].x = reversed ? 290 : 390;
  c.step([idle(), idle()]);
  const target = c.fighters[defender];
  return { c, target, attacker: 1 - defender };
}
function contact(c: Combat, attacker: number, move: Move, input = idle()) {
  const f = c.fighters[attacker];
  f.attack = {
    id: 1,
    kind: "punch",
    frame: move.startup,
    hit: false,
    crouched: false,
    move,
  };
  const inputs: [InputFrame, InputFrame] = [idle(), idle()];
  inputs[1 - attacker] = input;
  c.step(inputs);
}
const testMove = (attackType: AttackType, patch: Partial<Move> = {}): Move => ({
  ...resolveMove(moves.kick, "standing"),
  attackType,
  push: 0,
  ...patch,
});

describe.each([0, 1])("defensor P%i", (defender) => {
  describe.each([false, true])("lados invertidos: %s", (reversed) => {
    for (const [type, standing, crouching] of [
      ["high", true, false],
      ["mid", true, true],
      ["low", false, true],
      ["overhead", true, false],
      ["unblockable", false, false],
    ] as const) {
      it.each(["standing", "crouching"] as const)(
        `${type} contra %s`,
        (stance) => {
          const { c, target, attacker } = setup(defender, reversed);
          // Isolate the compatibility rule with an actual contact at both heights.
          contact(
            c,
            attacker,
            testMove(type),
            frame({ block: true, down: stance === "crouching" }),
          );
          const blocked = stance === "standing" ? standing : crouching;
          expect(c.hits[0].blocked).toBe(blocked);
          expect(target.hp).toBe(blocked ? 100 : 89);
          expect(target.guardStun).toBe(blocked ? 12 : 0);
          expect(target.hitStun).toBe(blocked ? 0 : moves.kick.hitStun);
        },
      );
    }
    it("evade un alto sin producir contacto ni chip", () => {
      const { c, target, attacker } = setup(defender, reversed);
      contact(
        c,
        attacker,
        { ...resolveMove(moves.punch, "standing"), chipDamage: 2 },
        frame({ block: true, down: true }),
      );
      expect(c.hits).toEqual([]);
      expect(target.hp).toBe(100);
      expect(target.guardStun).toBe(0);
    });
    it("exige bloqueo y no permite guardia en el aire o hit stun", () => {
      for (const invalid of [
        "no-block",
        "air",
        "hit-stun",
        "recovery",
      ] as const) {
        const { c, target, attacker } = setup(defender, reversed);
        const input = invalid === "no-block" ? idle() : frame({ block: true });
        if (invalid === "air") target.y = 10;
        if (invalid === "hit-stun") target.hitStun = 1;
        if (invalid === "recovery")
          target.attack = {
            id: 2,
            kind: "punch",
            crouched: false,
            hit: true,
            move: moves.punch,
            frame:
              moves.punch.startup +
              moves.punch.active +
              moves.punch.recovery -
              1,
          };
        contact(c, attacker, testMove("mid"), input);
        expect(target.hp, invalid).toBe(89);
        expect(c.hits[0].blocked, invalid).toBe(false);
      }
    });
    it.each(["left", "right"] as const)(
      "%s mueve pero nunca bloquea por sí sola",
      (direction) => {
        const { c, target, attacker } = setup(defender, reversed);
        const x = target.x;
        contact(c, attacker, testMove("mid"), frame({ [direction]: true }));
        expect(target.hp).toBe(89);
        expect(c.hits[0].blocked).toBe(false);
        expect(target.x).not.toBe(x);
      },
    );
  });
});

describe("chip y configuración", () => {
  it.each(["punch", "kick", "special"] as const)(
    "%s reemplaza daño por chip una sola vez",
    (kind) => {
      const { c, attacker, target } = setup();
      const move = resolveMove(moves[kind], "standing");
      contact(c, attacker, move, frame({ block: true }));
      expect(target.hp).toBe(100 - move.chipDamage);
      expect(target.guardStun).toBe(move.guardStunFrames);
      for (let i = 0; i < move.active; i++)
        c.step([idle(), frame({ block: true })]);
      expect(target.hp).toBe(100 - move.chipDamage);
    },
  );
  it.each([1, 2, 3])("chip no letal con %i HP", (hp) => {
    expect(resolveContact(moves.special, hp, "standing").hp).toBe(
      Math.max(1, hp - 2),
    );
  });
  it("chip letal configurable resuelve KO y limpia estados", () => {
    const { c, target, attacker } = setup();
    target.hp = 2;
    contact(
      c,
      attacker,
      { ...moves.special, chipCanKO: true },
      frame({ block: true }),
    );
    expect(target.hp).toBe(0);
    expect(target.pose).toBe("fall");
    expect(target.hitStun).toBe(0);
    expect(target.guardStun).toBe(0);
    expect(c.phase).toBe("round");
  });
  it("declara todas las variantes sin depender de nombres de animación", () => {
    for (const kind of ["punch", "kick", "special"] as const) {
      expect(resolveMove(moves[kind], "airborne").attackType).toBe("overhead");
      expect(resolveMove(moves[kind], "crouching").attackType).toBe(
        kind === "punch" ? "mid" : "low",
      );
    }
    expect(resolveMove(moves.special, "standing").contactHeight).toBe(135);
    expect(canBlock("unblockable", "standing")).toBe(false);
    expect(canBlock("mid", null)).toBe(false);
  });
  it("congela variante aérea y tiempos al iniciar, incluso tras aterrizar", () => {
    const custom = structuredClone(moves);
    custom.punch.variants.airborne = { attackType: "overhead", startup: 20 };
    const c = new Combat(false, custom);
    const f = c.fighters[0];
    f.y = 1;
    f.vy = -2;
    c.step([frame({ punch: true }), idle()]);
    expect(f.y).toBe(0);
    expect(f.attack?.move.attackType).toBe("overhead");
    custom.punch.variants.airborne.startup = 0;
    for (let i = 0; i < 10; i++) c.step([frame({ down: true }), idle()]);
    expect(f.attack?.move.startup).toBe(20);
    expect(attackPhase(f)).toBe("startup");
    expect(f.attack?.crouched).toBe(false);
  });
});

describe("guard stun", () => {
  it("dura N pasos completos, impide acciones y no almacena pulsaciones", () => {
    const { c, target, attacker } = setup();
    contact(
      c,
      attacker,
      testMove("mid", { guardStunFrames: 3 }),
      frame({ block: true }),
    );
    const x = target.x;
    const incompatible = frame({
      block: true,
      right: true,
      up: true,
      punch: true,
      kick: true,
      special: true,
    });
    for (let remaining = 2; remaining >= 0; remaining--) {
      c.step([idle(), incompatible]);
      expect(target.guardStun).toBe(remaining);
      expect(target.x).toBe(x);
      expect(target.y).toBe(0);
      expect(target.attack).toBeNull();
      expect(target.cooldown).toBe(0);
    }
    c.step([idle(), incompatible]);
    expect(target.x).not.toBe(x);
    expect(target.y).toBe(0);
    expect(target.attack).toBeNull();
    c.step([idle(), idle()]);
    c.step([idle(), frame({ up: true, punch: true })]);
    expect(target.y).toBeGreaterThan(0);
    expect(target.attack?.kind).toBe("punch");
  });
  it("permite cambiar postura y requiere bloqueo ante cada contacto", () => {
    const { c, target, attacker } = setup();
    contact(
      c,
      attacker,
      testMove("mid", { guardStunFrames: 18 }),
      frame({ block: true }),
    );
    contact(
      c,
      attacker,
      testMove("low", { guardStunFrames: 8 }),
      frame({ block: true, down: true }),
    );
    expect(target.hp).toBe(100);
    expect(target.guardStun).toBe(17);
    expect(target.stance).toBe("crouching");
    expect(animationFor(target, 0)).toBe("crouch");
    contact(
      c,
      attacker,
      testMove("overhead", { guardStunFrames: 20 }),
      frame({ block: true }),
    );
    expect(target.hp).toBe(100);
    expect(target.guardStun).toBe(20);
    expect(animationFor(target, 0)).toBe("block");
    contact(c, attacker, testMove("mid"), idle());
    expect(target.hp).toBe(89);
    expect(target.guardStun).toBe(0);
    expect(target.hitStun).toBe(moves.kick.hitStun);
  });
  it("mantiene cuerpo agachado durante bloqueo y evade altos posteriores", () => {
    const { c, target, attacker } = setup();
    const input = frame({ block: true, down: true });
    contact(c, attacker, testMove("low"), input);
    contact(c, attacker, resolveMove(moves.punch, "standing"), input);
    expect(c.hits).toEqual([]);
    expect(target.hp).toBe(100);
    expect(target.guardStun).toBe(11);
  });
  it("guardia equivocada durante guard stun recibe daño normal", () => {
    const { c, target, attacker } = setup();
    contact(c, attacker, testMove("mid"), frame({ block: true }));
    contact(c, attacker, testMove("low"), frame({ block: true }));
    expect(target.hp).toBe(89);
    expect(target.guardStun).toBe(0);
  });
  it("mantener bloqueo fuera de guard stun no impide moverse", () => {
    const c = new Combat();
    const x = c.fighters[0].x;
    c.step([frame({ block: true, right: true }), idle()]);
    expect(c.fighters[0].x).toBeGreaterThan(x);
    expect(c.fighters[0].pose).toBe("walk");
  });
  it("restaura guardia y postura en práctica y reinicio", () => {
    const { c, target } = setup();
    c.practice = true;
    target.hp = 0;
    target.guardStun = 9;
    target.stance = "crouching";
    c.step([idle(), idle()]);
    expect(target.hp).toBe(100);
    expect(target.guardStun).toBe(0);
    expect(target.stance).toBe("standing");
    target.guardStun = 9;
    target.stance = "crouching";
    c.resetPositions();
    expect(c.fighters[1].guardStun).toBe(0);
    expect(c.fighters[1].stance).toBe("standing");
  });
});

describe("contratos de estado y variantes", () => {
  it("guardia no depende de la pose y excluye personajes derrotados", () => {
    const { target } = setup();
    target.pose = "hurt";
    expect(guardFor(target, frame({ block: true }))).toBe("standing");
    target.hp = 0;
    expect(guardFor(target, frame({ block: true }))).toBeNull();
  });
  it("conserva la variante agachada aunque se suelte abajo durante el ataque", () => {
    const c = new Combat();
    c.step([frame({ kick: true, down: true }), idle()]);
    c.step([idle(), idle()]);
    expect(c.fighters[0].attack?.move.attackType).toBe("low");
    expect(c.fighters[0].attack?.move.contactHeight).toBe(90);
    expect(c.fighters[0].stance).toBe("crouching");
  });
  it("usa chip, duración y cooldown configurados en la variante resuelta", () => {
    const custom = structuredClone(moves);
    custom.special.variants.crouching = {
      chipDamage: 5,
      guardStunFrames: 30,
      cooldown: 0,
    };
    const c = new Combat(false, custom);
    c.fighters[0].x = 290;
    c.fighters[1].x = 390;
    c.fighters[0].cooldown = 100;
    for (let n = 0; n <= moves.special.startup; n++) {
      c.step([
        frame({ down: true, special: true }),
        frame({ down: true, block: true }),
      ]);
    }
    expect(c.fighters[1].hp).toBe(95);
    expect(c.fighters[1].guardStun).toBe(30);
    expect(c.fighters[0].cooldown).toBe(100 - moves.special.startup - 1);
  });
  it("el empuje bloqueado conserva la mitad del empuje de impacto normal", () => {
    expect(resolveContact(moves.kick, 100, "standing").push).toBe(
      moves.kick.push / 2,
    );
    expect(resolveContact(moves.kick, 100, null).push).toBe(moves.kick.push);
  });
});
