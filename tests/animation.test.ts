import { describe, it, expect } from "vitest";
import { Combat, idle, moves, combatSpace } from "../src/combat";
import { animationFor, animationRegions, attackPhase } from "../src/animation";

describe("animaciones sincronizadas con el combate", () => {
  it("distingue anticipación, impacto y recuperación sin adelantar el contacto", () => {
    const c = new Combat();
    const f = c.fighters[0];
    f.attack = {
      id: 1,
      kind: "punch",
      frame: 1,
      hit: false,
      crouched: false,
      move: moves.punch,
    };
    f.pose = "attack";
    expect(attackPhase(f)).toBe("startup");
    expect(animationFor(f, 0)).toBe("punch-wind");
    f.attack.frame = moves.punch.startup + 1;
    expect(attackPhase(f)).toBe("active");
    expect(animationFor(f, 0)).toBe("punch-hit");
    f.attack.frame = moves.punch.startup + moves.punch.active + 1;
    expect(attackPhase(f)).toBe("recovery");
    f.attack.frame = 22;
    expect(animationFor(f, 0)).toBe("guard");
  });
  it("usa poses propias para ataques bajos y aéreos", () => {
    const f = new Combat().fighters[0];
    for (const [kind, low, air] of [
      ["punch", "low-punch", "air-punch"],
      ["kick", "low-kick", "air-kick"],
      ["special", "low-special", "special-hit"],
    ] as const) {
      f.attack = {
        id: 1,
        kind,
        frame: moves[kind].startup + 1,
        hit: false,
        crouched: true,
        move: moves[kind],
      };
      f.y = 0;
      expect(animationFor(f, 0)).toBe(low);
      f.y = 20;
      f.attack.crouched = false;
      expect(animationFor(f, 0)).toBe(air);
    }
  });
  it("anima paso, guardia y caída sin depender del refresco de pantalla", () => {
    const f = new Combat().fighters[0];
    expect(animationFor(f, 0)).toBe("guard");
    expect(animationFor(f, 40)).toBe("breathe");
    f.pose = "walk";
    expect(animationFor(f, 0)).toBe("walk-a");
    expect(animationFor(f, 9)).toBe("walk-b");
    f.hp = 0;
    expect(animationFor(f, 10, 0)).toBe("hurt");
    expect(animationFor(f, 20, 10)).toBe("fall");
  });
  it("tiene regiones válidas para todas las poses nuevas", () => {
    expect(new Set(animationRegions.map((r) => r.key)).size).toBe(21);
    for (const r of animationRegions) {
      const w = r.sheet === "guard" ? 1024 : 1254,
        h = r.sheet === "guard" ? 1536 : 1254;
      expect(r.x + r.width).toBeLessThanOrEqual(w);
      expect(r.y + r.height).toBeLessThanOrEqual(h);
      expect(r.anchorX).toBeGreaterThan(0);
      expect(r.anchorX).toBeLessThan(r.width);
    }
  });
});
describe("geometría de la luchadora detallada", () => {
  it("no daña fuera del alcance visible pero sí al entrar en él", () => {
    const c = new Combat();
    c.fighters[0].x = 200;
    c.fighters[1].x = 200 + moves.punch.reach + combatSpace.bodyHalfWidth + 3;
    for (let i = 0; i < 30; i++)
      c.step([{ ...idle(), punch: i === 0 }, idle()]);
    expect(c.fighters[1].hp).toBe(100);
    c.fighters[1].x -= 5;
    for (let i = 0; i < 7; i++) c.step([{ ...idle(), punch: i === 0 }, idle()]);
    expect(c.fighters[1].hp).toBe(93);
  });
  it("permite saltar por encima, aterrizar separado y cambiar orientación", () => {
    const c = new Combat();
    c.fighters[0].x = 270;
    c.fighters[1].x = 370;
    for (let i = 0; i < 50; i++)
      c.step([{ ...idle(), right: true, up: i === 0 }, idle()]);
    expect(c.fighters[0].x).toBeGreaterThan(c.fighters[1].x);
    expect(c.fighters[0].y).toBe(0);
    expect(c.fighters[0].facing).toBe(-1);
    expect(Math.abs(c.fighters[0].x - c.fighters[1].x)).toBeGreaterThanOrEqual(
      combatSpace.separation,
    );
  });
  it("los golpes altos pasan sobre la guardia agachada", () => {
    const c = new Combat();
    c.fighters[0].x = 220;
    c.fighters[1].x = 320;
    for (let i = 0; i < 8; i++)
      c.step([
        { ...idle(), punch: i === 0 },
        { ...idle(), down: true },
      ]);
    expect(c.fighters[1].hp).toBe(100);
  });
});
