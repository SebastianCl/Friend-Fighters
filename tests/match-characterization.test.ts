import { expect, it } from "vitest";
import { Combat, idle } from "../src/combat";
import { legacyMatchLoop } from "./helpers/legacy-match-loop";

it("characterizes fixed steps, attack sound before impact, and terminal victory", () => {
  const combat = new Combat();
  combat.fighters[0].x = 290;
  combat.fighters[1].x = 334;
  combat.fighters[1].hp = 1;
  combat.wins[0] = 1;
  const events: unknown[] = [];
  const advance = legacyMatchLoop(
    combat,
    (_, player) => ({ ...idle(), punch: player === 0 }),
    (event) => events.push(event),
  );
  advance(8);
  expect(combat.ticks).toBe(3600);
  advance(9);
  expect(events).toEqual([
    ["sound", "attack-punch"],
    ["update", 1000 / 60],
  ]);
  for (let i = 0; i < 20 && combat.phase !== "over"; i++) advance(1000 / 60);
  expect(combat.phase).toBe("over");
  expect(events).toContainEqual(["sound", "victory"]);
  expect(events).toContainEqual(["sound", "hit-light"]);
  expect(events.at(-1)).toEqual(["update", 1000 / 60]);
});
