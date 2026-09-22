import { describe, it, expect } from "vitest";
import {
  Combat,
  combatSpace,
  idle,
  moves,
  type InputFrame,
} from "../src/combat";
const frame = (patch: Partial<InputFrame> = {}) => ({ ...idle(), ...patch });
function advance(c: Combat, n: number, a = idle(), b = idle()) {
  for (let i = 0; i < n; i++) c.step([a, b]);
}
function close(c: Combat) {
  c.fighters[0].x = 290;
  c.fighters[1].x = 334;
}
describe("motor de combate", () => {
  it("respeta anticipación, impacto único y recuperación incluso manteniendo el botón", () => {
    const c = new Combat();
    close(c);
    advance(c, moves.punch.startup, frame({ punch: true }));
    expect(c.fighters[1].hp).toBe(100);
    advance(c, 1, frame({ punch: true }));
    expect(c.fighters[1].hp).toBe(93);
    advance(c, 50, frame({ punch: true }));
    expect(c.fighters[1].hp).toBe(93);
    expect(c.fighters[0].attack).toBeNull();
  });
  it("impide iniciar otro movimiento durante recuperación", () => {
    const c = new Combat();
    c.step([frame({ punch: true }), idle()]);
    advance(c, 12);
    c.step([frame({ kick: true }), idle()]);
    expect(c.fighters[0].attack?.kind).toBe("punch");
  });
  it("bloquea al retroceder, sin daño", () => {
    const c = new Combat();
    close(c);
    c.fighters[1].x = 325;
    advance(c, 7, frame({ punch: true }), frame({ right: true }));
    expect(c.fighters[1].hp).toBe(100);
    expect(c.fighters[1].pose).toBe("block");
  });
  it("no permite bloquear en el aire", () => {
    const c = new Combat();
    close(c);
    c.fighters[1].x = 320;
    c.fighters[1].y = 20;
    advance(c, 7, frame({ punch: true }), frame({ right: true, down: true }));
    expect(c.fighters[1].hp).toBeLessThan(100);
  });
  it("el especial exige recarga", () => {
    const c = new Combat();
    c.step([frame({ special: true }), idle()]);
    expect(c.fighters[0].cooldown).toBe(180);
    advance(c, 60);
    c.step([frame({ special: true }), idle()]);
    expect(c.fighters[0].attack).toBeNull();
    advance(c, 180);
    c.step([frame({ special: true }), idle()]);
    expect(c.fighters[0].attack?.kind).toBe("special");
  });
  it("limita el escenario y separa cuerpos", () => {
    const c = new Combat();
    advance(c, 300, frame({ left: true }), frame({ right: true }));
    expect(c.fighters.map((f) => f.x)).toEqual([
      combatSpace.minX,
      combatSpace.maxX,
    ]);
    advance(c, 300, frame({ right: true }), frame({ left: true }));
    expect(c.fighters[1].x - c.fighters[0].x).toBeGreaterThanOrEqual(
      combatSpace.separation,
    );
  });
  it("cambia orientación cuando cambia el lado del rival", () => {
    const c = new Combat();
    c.fighters[0].x = 460;
    c.fighters[1].x = 180;
    advance(c, 1);
    expect(c.fighters[0].facing).toBe(-1);
    expect(c.fighters[1].facing).toBe(1);
  });
  it("salta y vuelve al suelo", () => {
    const c = new Combat();
    c.step([frame({ up: true }), idle()]);
    expect(c.fighters[0].y).toBeGreaterThan(0);
    advance(c, 80);
    expect(c.fighters[0].y).toBe(0);
  });
  it("incluye ataques agachados y aéreos", () => {
    const c = new Combat();
    close(c);
    advance(c, 7, frame({ punch: true, down: true }));
    expect(c.fighters[0].attack?.crouched).toBe(true);
    expect(c.fighters[1].hp).toBe(93);
    const a = new Combat();
    close(a);
    a.fighters[0].y = 20;
    advance(a, 7, frame({ punch: true }));
    expect(a.fighters[1].hp).toBe(93);
  });
  it("no golpea un rival fuera de altura o alcance", () => {
    const c = new Combat();
    close(c);
    c.fighters[0].y = 120;
    advance(c, 12, frame({ punch: true }));
    expect(c.fighters[1].hp).toBe(100);
  });
  it("resuelve golpes simultáneos simétricamente", () => {
    const c = new Combat();
    close(c);
    advance(c, 7, frame({ punch: true }), frame({ punch: true }));
    expect(c.fighters.map((f) => f.hp)).toEqual([93, 93]);
  });
  it("el cronómetro concede round a quien conserve más vida", () => {
    const c = new Combat();
    c.fighters[1].hp = 90;
    c.ticks = 1;
    advance(c, 1);
    expect(c.phase).toBe("round");
    expect(c.wins).toEqual([1, 0]);
    advance(c, 150);
    expect(c.phase).toBe("fight");
    expect(c.round).toBe(2);
    expect(c.ticks).toBe(3600);
    expect(c.fighters.map((f) => f.hp)).toEqual([100, 100]);
  });
  it("repite empate sin conceder puntos", () => {
    const c = new Combat();
    c.ticks = 1;
    advance(c, 1);
    expect(c.message).toContain("EMPATE");
    expect(c.wins).toEqual([0, 0]);
    advance(c, 150);
    expect(c.phase).toBe("fight");
    expect(c.round).toBe(1);
  });
  it("termina al ganar dos rounds", () => {
    const c = new Combat();
    c.wins = [1, 1];
    c.fighters[1].hp = 0;
    advance(c, 1);
    expect(c.phase).toBe("over");
    expect(c.wins).toEqual([2, 1]);
    advance(c, 300);
    expect(c.phase).toBe("over");
  });
  it("práctica no tiene reloj ni victoria y reinicia vida y posición", () => {
    const c = new Combat(true);
    close(c);
    advance(c, 7, frame({ punch: true }));
    expect(c.ticks).toBe(3600);
    expect(c.fighters[1].hp).toBe(93);
    c.fighters[1].hp = 0;
    advance(c, 1);
    expect(c.fighters[1].hp).toBe(100);
    expect(c.phase).toBe("fight");
    c.resetPositions();
    expect(c.fighters.map((f) => f.x)).toEqual([...combatSpace.startX]);
  });
  it("completa diez partidas consecutivas de dos rounds sin errores de puntuación", () => {
    for (let n = 0; n < 10; n++) {
      const c = new Combat();
      for (let round = 0; round < 2; round++) {
        let steps = 0;
        while (c.phase === "fight" && steps < 20000) {
          const attack = steps % 60 === 0;
          c.step([
            frame({
              right: c.fighters[1].x - c.fighters[0].x > 40,
              punch: attack,
            }),
            idle(),
          ]);
          steps++;
        }
        expect(steps).toBeLessThan(20000);
        if (round === 0) advance(c, 150);
      }
      expect(c.wins).toEqual([2, 0]);
      expect(c.phase).toBe("over");
    }
  });
});
it("mantiene separación corporal al llegar a las paredes", () => {
  for (const positions of [
    [combatSpace.maxX - 12, combatSpace.maxX],
    [combatSpace.minX, combatSpace.minX + 12],
  ]) {
    const c = new Combat();
    c.fighters[0].x = positions[0];
    c.fighters[1].x = positions[1];
    c.step([idle(), idle()]);
    expect(c.fighters[1].x - c.fighters[0].x).toBe(combatSpace.separation);
    expect(c.fighters[0].x).toBeGreaterThanOrEqual(combatSpace.minX);
    expect(c.fighters[1].x).toBeLessThanOrEqual(combatSpace.maxX);
  }
});
