import { describe, expect, it } from "vitest";
import {
  Combat,
  idle,
  moves,
  resolveMove,
  type InputFrame,
  type Move,
} from "../src/combat";
import { animationFor } from "../src/animation";
const advance = (c: Combat, n: number) => {
  for (let i = 0; i < n; i++) c.step([idle(), idle()]);
};
function setup(attacker = 0, reversed = false) {
  const c = new Combat();
  c.fighters[0].x = reversed ? 390 : 290;
  c.fighters[1].x = reversed ? 290 : 390;
  c.step([idle(), idle()]);
  return { c, target: c.fighters[1 - attacker] };
}
function contact(
  c: Combat,
  attacker: number,
  patch: Partial<Move> = {},
  block = false,
) {
  const move = { ...resolveMove(moves.punch, "standing"), push: 0, ...patch };
  c.fighters[attacker].attack = {
    id: 100 + c.combos[attacker].hits,
    kind: "punch",
    frame: move.startup,
    hit: false,
    crouched: false,
    move,
  };
  const inputs: [InputFrame, InputFrame] = [idle(), idle()];
  inputs[1 - attacker].block = block;
  c.step(inputs);
}
describe.each([0, 1])("combos de P%i", (attacker) => {
  describe.each([false, true])("lados invertidos=%s", (reversed) => {
    it("encadena puño, patada y especial con inputs y datos reales", () => {
      const { c, target } = setup(attacker, reversed);
      const chain = ["punch", "kick", "special"] as const;
      let next = 0;
      const ids: number[] = [];
      let comboId = 0;
      for (let tick = 0; tick < 76; tick++) {
        const input: [InputFrame, InputFrame] = [idle(), idle()];
        if (!c.fighters[attacker].attack && next < chain.length)
          input[attacker][chain[next++]] = true;
        // Even holding guard cannot escape uninterrupted hit stun.
        input[1 - attacker].block = tick > 6;
        c.step(input);
        if (c.hits.length) {
          const hit = c.hits[0];
          ids.push(hit.attackId);
          expect(hit.attacker).toBe(attacker);
          expect(hit.defender).toBe(1 - attacker);
          expect(hit.blocked).toBe(false);
          expect(c.combos[attacker].hits).toBe(ids.length);
          expect(c.combos[attacker].displayHits).toBe(
            ids.length < 2 ? 0 : ids.length,
          );
          if (!comboId) comboId = c.combos[attacker].id;
          expect(c.combos[attacker].id).toBe(comboId);
          expect(animationFor(target, tick)).toBe("hurt");
        }
      }
      expect(new Set(ids).size).toBe(3);
      expect(target.hp).toBe(64);
      expect(c.hits[0].special).toBe(true);
      expect(c.combos[1 - attacker].hits).toBe(0);
      advance(c, 26);
      expect(c.combos[attacker].active).toBe(false);
      expect(c.combos[attacker].displayHits).toBe(3);
      advance(c, 59);
      expect(c.combos[attacker].displayHits).toBe(3);
      advance(c, 1);
      expect(c.combos[attacker].displayHits).toBe(0);
    });
    it.each([0, 2])(
      "bloqueo con chip=%i no inicia ni incrementa",
      (chipDamage) => {
        const { c, target } = setup(attacker, reversed);
        contact(c, attacker, { chipDamage }, true);
        expect(target.hp).toBe(100 - chipDamage);
        expect(c.combos[attacker].hits).toBe(0);
        expect(c.combos[attacker].displayHits).toBe(0);
        target.guardStun = 0;
        contact(c, attacker, { hitStun: 2 });
        contact(c, attacker, { hitStun: 2 });
        advance(c, 2);
        contact(c, attacker, { chipDamage }, true);
        expect(c.combos[attacker].hits).toBe(2);
        expect(c.combos[attacker].active).toBe(false);
      },
    );
    it("no repite contactos aunque la hitbox siga superpuesta", () => {
      const { c, target } = setup(attacker, reversed);
      contact(c, attacker, { active: 20, hitStun: 40 });
      advance(c, 19);
      expect(c.combos[attacker].hits).toBe(1);
      expect(target.hp).toBe(93);
    });
    it("incluye el último tick de stun y separa el primer tick recuperado", () => {
      const { c, target } = setup(attacker, reversed);
      contact(c, attacker, { hitStun: 2 });
      advance(c, 1);
      expect(target.hitStun).toBe(1);
      contact(c, attacker, { hitStun: 2 });
      const id = c.combos[attacker].id;
      expect(c.combos[attacker].hits).toBe(2);
      advance(c, 2);
      expect(target.hitStun).toBe(0);
      contact(c, attacker, { hitStun: 2 });
      expect(c.combos[attacker].hits).toBe(1);
      expect(c.combos[attacker].id).not.toBe(id);
      expect(c.combos[attacker].displayHits).toBe(2);
    });
    it("ventana corta expira aun con hit stun restante y no se extiende al fallar", () => {
      const { c, target } = setup(attacker, reversed);
      contact(c, attacker, { hitStun: 20, comboWindowFrames: 2 });
      advance(c, 2);
      expect(target.hitStun).toBe(18);
      expect(c.combos[attacker].active).toBe(false);
      contact(c, attacker);
      expect(c.combos[attacker].hits).toBe(1);
      const remaining = c.combos[attacker].remaining;
      contact(c, attacker, { reach: 0 });
      expect(c.hits).toEqual([]);
      expect(c.combos[attacker].remaining).toBe(remaining - 1);
    });
    it("una ventana larga nunca sobrevive a la recuperación", () => {
      const { c } = setup(attacker, reversed);
      contact(c, attacker, { hitStun: 2, comboWindowFrames: 100 });
      advance(c, 2);
      expect(c.combos[attacker].active).toBe(false);
    });
  });
});
it("registra intercambios antes de cerrar ambas cadenas", () => {
  const { c } = setup();
  for (const f of c.fighters)
    f.attack = {
      id: f.facing === 1 ? 1 : 2,
      kind: "punch",
      frame: moves.punch.startup,
      hit: false,
      crouched: false,
      move: moves.punch,
    };
  c.step([idle(), idle()]);
  expect(c.hits).toHaveLength(2);
  expect(c.combos.map((c) => [c.hits, c.active])).toEqual([
    [1, false],
    [1, false],
  ]);
});
it.each([false, true])("KO cierra el combo, práctica=%s", (practice) => {
  const { c, target } = setup();
  c.practice = practice;
  contact(c, 0);
  target.hp = 7;
  contact(c, 0);
  expect(c.combos[0].hits).toBe(2);
  expect(c.combos[0].active).toBe(false);
  expect(target.hp).toBe(practice ? 100 : 0);
  advance(c, 60);
  expect(c.combos[0].displayHits).toBe(0);
  if (practice) {
    contact(c, 0);
    expect(c.combos[0].hits).toBe(1);
  }
  c.resetPositions();
  expect(
    c.combos.every((c) => !c.active && c.hits === 0 && c.displayHits === 0),
  ).toBe(true);
});
it("el límite de round cierra cadenas aunque siga el stun", () => {
  const { c } = setup();
  contact(c, 0);
  c.ticks = 1;
  contact(c, 0);
  expect(c.phase).toBe("round");
  expect(c.combos[0].active).toBe(false);
  expect(c.combos[0].displayHits).toBe(2);
});

it("el último tick de una ventana corta permite renovar con datos del siguiente ataque", () => {
  const { c } = setup();
  contact(c, 0, { hitStun: 20, comboWindowFrames: 2 });
  advance(c, 1);
  contact(c, 0, { hitStun: 15, comboWindowFrames: 5 });
  expect(c.combos[0].hits).toBe(2);
  expect(c.combos[0].remaining).toBe(5);
  advance(c, 5);
  expect(c.combos[0].active).toBe(false);
});

it("una nueva cadena reemplaza el resultado anterior solo desde su segundo impacto", () => {
  const { c } = setup();
  for (let n = 0; n < 3; n++) contact(c, 0, { hitStun: 1 });
  advance(c, 1);
  const oldId = c.combos[0].id;
  contact(c, 0, { hitStun: 2 });
  expect(c.combos[0].id).not.toBe(oldId);
  expect(c.combos[0].hits).toBe(1);
  expect(c.combos[0].displayHits).toBe(3);
  contact(c, 0, { hitStun: 2 });
  expect(c.combos[0].displayHits).toBe(2);
  advance(c, 2);
  expect(c.combos[0].displayFrames).toBe(60);
  advance(c, 60);
  expect(c.combos[0].displayHits).toBe(0);
});

it("la ventana de la variante queda congelada al iniciar el ataque", () => {
  const custom = structuredClone(moves);
  custom.punch.variants.crouching = { comboWindowFrames: 3 };
  const c = new Combat(false, custom);
  c.fighters[0].x = 290;
  c.fighters[1].x = 390;
  c.step([{ ...idle(), punch: true, down: true }, idle()]);
  custom.punch.variants.crouching.comboWindowFrames = 20;
  advance(c, moves.punch.startup);
  expect(c.combos[0].hits).toBe(1);
  expect(c.combos[0].remaining).toBe(3);
});
