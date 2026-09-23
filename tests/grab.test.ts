import { describe, expect, it } from "vitest";
import { Combat, idle, moves, type InputFrame } from "../src/combat";
import { animationFor } from "../src/animation";

const frame = (patch: Partial<InputFrame> = {}) => ({ ...idle(), ...patch });
const close = (combat: Combat, distance = 100) => {
  combat.fighters[0].x = 250;
  combat.fighters[1].x = 250 + distance;
};
const advance = (combat: Combat, ticks: number, a = idle(), b = idle()) => {
  for (let i = 0; i < ticks; i++) combat.step([a, b]);
};
const catchAndLand = (combat: Combat, defender = idle()) => {
  advance(combat, moves.grab.startup + 1, frame({ grab: true }), defender);
  expect(combat.fighters[1].grabbedBy).toBe(0);
  let landingHits = 0;
  for (let i = 0; i < 80; i++) {
    combat.step([idle(), defender]);
    landingHits += combat.hits.filter(
      (hit) => hit.attackKind === "grab",
    ).length;
    if (landingHits) break;
  }
  return landingHits;
};

describe("agarre y lanzamiento", () => {
  it("respeta anticipación, alcance y recuperación al fallar", () => {
    const combat = new Combat();
    close(combat, 110);
    advance(combat, 6, frame({ grab: true }));
    expect(combat.fighters[1].grabbedBy).toBeNull();
    combat.step([frame({ grab: true }), idle()]);
    expect(combat.fighters[1].grabbedBy).toBe(0);
    const missed = new Combat();
    close(missed, 115);
    advance(missed, 9, frame({ grab: true }));
    expect(missed.fighters[1].grabbedBy).toBeNull();
    expect(missed.fighters[0].attack?.kind).toBe("grab");
    advance(missed, 21);
    expect(missed.fighters[0].attack).toBeNull();
  });

  it("vence la guardia incluso agachada, pero falla ante salto o retirada", () => {
    const guarded = new Combat();
    close(guarded);
    expect(catchAndLand(guarded, frame({ block: true, down: true }))).toBe(1);
    expect(guarded.fighters[1].hp).toBe(84);
    for (const evade of [frame({ up: true }), frame({ right: true })]) {
      const combat = new Combat();
      close(combat, 110);
      advance(combat, 9, frame({ grab: true }), evade);
      expect(combat.fighters[1].grabbedBy).toBeNull();
      expect(combat.fighters[1].hp).toBe(100);
    }
  });

  it("sujeta 10 ticks, proyecta en arco y daña una vez al aterrizar", () => {
    const combat = new Combat();
    close(combat);
    advance(combat, 7, frame({ grab: true }));
    expect(animationFor(combat.fighters[0], 0)).toBe("grab-hold");
    expect(combat.fighters[1].hp).toBe(100);
    advance(combat, 9);
    expect(combat.fighters[1].y).toBe(0);
    combat.step([idle(), idle()]);
    expect(combat.fighters[1].y).toBeGreaterThan(0);
    expect(animationFor(combat.fighters[0], 0)).toBe("grab-throw");
    let impacts = 0;
    for (let i = 0; i < 80; i++) {
      combat.step([idle(), frame({ punch: true })]);
      impacts += combat.hits.filter((hit) => hit.attackKind === "grab").length;
    }
    expect(impacts).toBe(1);
    expect(combat.fighters[1].hp).toBe(84);
    expect(combat.fighters[1].y).toBe(0);
  });

  it("limita el vuelo a la pared y bloquea seguimiento y acciones en recuperación", () => {
    const combat = new Combat();
    combat.fighters[0].x = 440;
    combat.fighters[1].x = 540;
    advance(combat, 7, frame({ grab: true }));
    let landed = false;
    for (let i = 0; i < 80 && !landed; i++) {
      combat.step([frame({ punch: i === 20 }), frame({ punch: true })]);
      expect(combat.fighters[1].x).toBeLessThanOrEqual(550);
      landed = combat.hits.some((hit) => hit.attackKind === "grab");
    }
    expect(landed).toBe(true);
    expect(combat.fighters[1].hp).toBe(84);
    combat.step([idle(), idle()]);
    combat.step([idle(), frame({ punch: true })]);
    expect(combat.fighters[1].attack).toBeNull();
    advance(combat, 12);
    combat.step([idle(), frame({ punch: true })]);
    expect(combat.fighters[1].attack?.kind).toBe("punch");
  });

  it("cierra un combo al caer y permite KO y reinicio de ronda", () => {
    const combat = new Combat();
    close(combat);
    combat.fighters[1].hp = 16;
    expect(catchAndLand(combat)).toBe(1);
    expect(combat.fighters[1].hp).toBe(0);
    expect(combat.phase).toBe("round");
    expect(combat.combos[0].active).toBe(false);
    advance(combat, 150);
    expect(combat.fighters[1].hp).toBe(100);
    expect(combat.fighters[1].throwFlight).toBeNull();
  });

  it("remata un combo cercano y lo cierra al aterrizar", () => {
    const combat = new Combat();
    close(combat);
    combat.step([frame({ punch: true }), idle()]);
    for (let i = 0; i < 40 && combat.fighters[0].attack; i++)
      combat.step([idle(), idle()]);
    combat.step([frame({ grab: true }), idle()]);
    for (let i = 0; i < 7; i++) combat.step([idle(), idle()]);
    expect(combat.fighters[1].grabbedBy).toBe(0);
    expect(combat.combos[0].hits).toBe(2);
    let landed = false;
    for (let i = 0; i < 80 && !landed; i++) {
      combat.step([idle(), idle()]);
      landed = combat.hits.some((hit) => hit.attackKind === "grab");
    }
    expect(landed).toBe(true);
    expect(combat.combos[0].active).toBe(false);
    expect(combat.fighters[1].hp).toBe(77);
  });

  it("un golpe simultáneo interrumpe el agarre antes de sujetar", () => {
    const combat = new Combat();
    close(combat);
    advance(combat, 7, frame({ grab: true }), frame({ punch: true }));
    expect(combat.fighters[0].hp).toBe(93);
    expect(combat.fighters[1].grabbedBy).toBeNull();
    expect(combat.fighters[1].hp).toBe(100);
  });

  it("resuelve agarres simultáneos sin resultado dependiente del orden", () => {
    const combat = new Combat();
    close(combat);
    advance(combat, 7, frame({ grab: true }), frame({ grab: true }));
    expect(combat.fighters.map((fighter) => fighter.hp)).toEqual([100, 100]);
    expect(combat.fighters.map((fighter) => fighter.grabbedBy)).toEqual([
      null,
      null,
    ]);
  });

  it("práctica restaura vida tras KO por caída", () => {
    const combat = new Combat(true);
    close(combat);
    combat.fighters[1].hp = 10;
    expect(catchAndLand(combat)).toBe(1);
    expect(combat.fighters[1].hp).toBe(100);
    expect(combat.phase).toBe("fight");
  });
});
