import { describe, expect, it } from "vitest";
import { Combat, idle } from "../src/combat";
import { CpuController } from "../src/cpu-controller";

function positioned(distance: number) {
  const combat = new Combat();
  combat.fighters[0].x = 250;
  combat.fighters[1].x = 250 + distance;
  return combat;
}

function sequence(...values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("CpuController", () => {
  it("se acerca o se aleja según la posición del rival", () => {
    const cpu = new CpuController(() => 0.5);
    const combat = positioned(220);
    expect(cpu.frame(combat, 1).left).toBe(true);
    cpu.reset();
    combat.fighters[1].x = 30;
    expect(cpu.frame(combat, 1).right).toBe(true);
    const retreat = new CpuController(() => 0);
    combat.fighters[1].x = 350;
    expect(retreat.frame(combat, 1).right).toBe(true);
  });

  it("mantiene la decisión durante varios ticks y pulsa ataques una sola vez", () => {
    const combat = positioned(130);
    const cpu = new CpuController(() => 0.5);
    expect(cpu.frame(combat, 1).kick).toBe(true);
    for (let tick = 0; tick < 15; tick++) {
      expect(cpu.frame(combat, 1).kick).toBe(false);
    }
    expect(cpu.frame(combat, 1).kick).toBe(true);
  });

  it("usa especial disponible y puño cercano según la oportunidad", () => {
    const combat = positioned(130);
    expect(
      new CpuController(sequence(0.5, 0.5, 0.1)).frame(combat, 1).special,
    ).toBe(true);
    combat.fighters[1].x = 360;
    expect(new CpuController(() => 0.9).frame(combat, 1).punch).toBe(true);
  });

  it("responde a ataque bajo con guardia baja y puede agacharse o saltar", () => {
    const combat = positioned(125);
    combat.fighters[0].attack = {
      id: 1,
      kind: "kick",
      frame: 0,
      hit: false,
      crouched: true,
      move: { ...combat.moveSet.kick, attackType: "low" },
    };
    const guard = new CpuController(() => 0.5).frame(combat, 1);
    expect(guard.block).toBe(true);
    expect(guard.down).toBe(true);
    combat.fighters[0].attack = null;
    expect(
      new CpuController(sequence(0.5, 0.1, 0.5, 0.5)).frame(combat, 1).down,
    ).toBe(true);
    combat.fighters[1].x = 430;
    expect(new CpuController(() => 0).frame(combat, 1).up).toBe(true);
  });

  it("puede agarrar cerca y responde a un agarre rival", () => {
    const combat = positioned(100);
    expect(
      new CpuController(sequence(0.5, 0.5, 0.1)).frame(combat, 1).grab,
    ).toBe(true);
    combat.fighters[0].attack = {
      id: 1,
      kind: "grab",
      frame: 0,
      hit: false,
      crouched: false,
      move: combat.moveSet.grab,
    };
    const evasion = new CpuController(() => 0.1).frame(combat, 1);
    expect(evasion.right).toBe(true);
    expect(evasion.up).toBe(true);
  });

  it("devuelve reposo fuera de combate y reinicia la decisión en el siguiente round", () => {
    const combat = positioned(220);
    const cpu = new CpuController(() => 0.5);
    expect(cpu.frame(combat, 1).left).toBe(true);
    combat.phase = "round";
    expect(cpu.frame(combat, 1)).toEqual(idle());
    combat.phase = "fight";
    combat.fighters[1].x = 30;
    expect(cpu.frame(combat, 1).right).toBe(true);
  });
});
