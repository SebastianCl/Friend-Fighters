import { describe, expect, it, vi } from "vitest";
import { Combat, idle, type InputFrame } from "../src/combat";
import {
  MatchSession,
  MATCH_STEP_MS,
  type PlayerInput,
} from "../src/application/match-session";
import { createMatchPresentation } from "../src/adapters/match-presentation";
import { CpuController } from "../src/cpu-controller";
import { legacyMatchLoop } from "./helpers/legacy-match-loop";

function scripted(): PlayerInput {
  let tick = 0;
  return (combat, player) => {
    if (player === 0) tick++;
    return {
      ...idle(),
      right: player === 0 && combat.fighters[0].x < combat.fighters[1].x,
      left: player === 0 && combat.fighters[0].x > combat.fighters[1].x,
      punch: player === 0 && tick % 30 === 0,
      up: player === 0 && tick % 400 === 1,
      block: player === 1 && tick < 400,
    };
  };
}

function recorder(events: unknown[]) {
  return createMatchPresentation(
    {
      play: (cue) => events.push(["sound", cue]),
      spawn: (type, position) => events.push(["spawn", type, position]),
      flashForHit: (hit) => events.push(["flash", structuredClone(hit)]),
      impact: (hit) => events.push(["impact", structuredClone(hit)]),
      update: (ms) => events.push(["update", ms]),
    },
    { unit: 2, groundY: 612 },
  );
}

describe("MatchSession without browser", () => {
  it("only samples inputs for complete steps and preserves fractions", () => {
    const input = vi.fn(idle);
    const session = new MatchSession();
    session.advance(100);
    expect(session.active).toBe(false);
    session.start({ inputs: [input, input] });
    session.advance(8);
    expect(input).not.toHaveBeenCalled();
    session.advance(9);
    expect(session.combat.ticks).toBe(3599);
    expect(input).toHaveBeenCalledTimes(2);
    session.advance(MATCH_STEP_MS * 3);
    expect(session.combat.ticks).toBe(3596);
    expect(input).toHaveBeenCalledTimes(8);
  });

  it("observes before input sampling and after simulation in player order", () => {
    const log: unknown[] = [];
    const session = new MatchSession({
      beforeStep: (state) => log.push(["before", state.ticks]),
      afterStep: (state, ms) => log.push(["after", state.ticks, ms]),
    });
    const input: PlayerInput = (state, player) => {
      log.push(["input", player, state.ticks]);
      return idle();
    };
    session.start({ inputs: [input, input] });
    session.advance(MATCH_STEP_MS);
    expect(log).toEqual([
      ["before", 3600],
      ["input", 0, 3600],
      ["input", 1, 3600],
      ["after", 3599, MATCH_STEP_MS],
    ]);
  });

  it("discards paused time and fractions, clears held edges only on resume", () => {
    const input = vi.fn(() => ({ ...idle(), punch: true }));
    const session = new MatchSession();
    session.start({ inputs: [input, idle] });
    session.advance(MATCH_STEP_MS + 8);
    expect(session.combat.fighters[0].previous.punch).toBe(true);
    session.pause();
    session.advance(30000);
    expect(input).toHaveBeenCalledTimes(1);
    session.resume();
    expect(session.combat.fighters[0].previous).toEqual(idle());
    session.advance(9);
    expect(input).toHaveBeenCalledTimes(1);
    session.advance(8);
    expect(input).toHaveBeenCalledTimes(2);
  });

  it("starts fresh, resets practice positions, and abandons without victory", () => {
    const finished = vi.fn();
    const session = new MatchSession(undefined, finished);
    session.start({
      practice: true,
      inputs: [() => ({ ...idle(), right: true }), idle],
    });
    session.advance(1000);
    expect(session.combat.fighters[0].x).not.toBe(new Combat().fighters[0].x);
    session.resetPractice();
    expect(session.combat.fighters).toEqual(new Combat(true).fighters);
    session.finish();
    const stopped = structuredClone(session.combat);
    session.advance(1000);
    session.resume();
    expect(session.combat).toEqual(stopped);
    expect(finished).not.toHaveBeenCalled();
    session.start();
    expect(session.paused).toBe(false);
    expect(session.combat.practice).toBe(false);
    session.advance(8);
    expect(session.combat.ticks).toBe(3600);
  });

  it("ignores non-finite and negative elapsed time without poisoning the accumulator", () => {
    const session = new MatchSession();
    session.start();
    for (const delta of [NaN, Infinity, -100]) session.advance(delta);
    session.advance(MATCH_STEP_MS);
    expect(session.combat.ticks).toBe(3599);
  });

  it.each(["local", "practice", "cpu"] as const)(
    "matches original simulation and audiovisual trace: %s",
    (mode) => {
      const legacy = new Combat(mode === "practice");
      const expected: unknown[] = [];
      const actual: unknown[] = [];
      const oldScript = scripted();
      const newScript = scripted();
      const oldCpu = new CpuController(() => 0.5);
      const newCpu = new CpuController(() => 0.5);
      const oldInput = (combat: Combat, player: 0 | 1): InputFrame =>
        player === 0
          ? oldScript(combat, player)
          : mode === "practice"
            ? idle()
            : mode === "cpu"
              ? oldCpu.frame(combat, player)
              : oldScript(combat, player);
      const newOpponent: PlayerInput = (combat, player) =>
        mode === "practice"
          ? idle()
          : mode === "cpu"
            ? newCpu.frame(combat, player)
            : newScript(combat, player);
      const advanceLegacy = legacyMatchLoop(legacy, oldInput, (event) =>
        expected.push(event),
      );
      const finished = vi.fn();
      const session = new MatchSession(recorder(actual), finished);
      session.start({
        practice: mode === "practice",
        inputs: [newScript, newOpponent],
      });
      for (let frame = 0; frame < 12000 && legacy.phase !== "over"; frame++) {
        const delta = [8, 9, 34, 50][frame % 4];
        advanceLegacy(delta);
        session.advance(delta);
        if (legacy.phase === "over") legacy.clearCombos();
        expect(session.combat).toEqual(legacy);
      }
      expect(actual).toEqual(expected);
      expect(actual).toContainEqual(["sound", "land"]);
      expect(actual.some((event) => (event as unknown[])[0] === "impact")).toBe(
        true,
      );
      if (mode === "local") {
        expect(actual).toContainEqual(["sound", "block"]);
        expect(actual).toContainEqual(["sound", "round-start"]);
        expect(actual).toContainEqual(["sound", "victory"]);
        expect(session.active).toBe(false);
        expect(finished).toHaveBeenCalledTimes(1);
        session.advance(10000);
        session.finish();
        expect(finished).toHaveBeenCalledTimes(1);
        session.start();
        expect(session.active).toBe(true);
      }
      if (mode === "practice") expect(finished).not.toHaveBeenCalled();
    },
  );
});
