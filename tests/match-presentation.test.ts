import { expect, it } from "vitest";
import { Combat, type Hit } from "../src/combat";
import { createMatchPresentation } from "../src/adapters/match-presentation";

it("presents simultaneous hits in order with blocked, kick, special and grab effects", () => {
  const events: unknown[] = [];
  const adapter = createMatchPresentation(
    {
      play: (cue) => events.push(["sound", cue]),
      spawn: (type, position) => events.push(["spawn", type, position]),
      flashForHit: (hit) => events.push(["flash", hit.attackId]),
      impact: (hit) => events.push(["impact", hit.attackId]),
      update: (ms) => events.push(["update", ms]),
    },
    { unit: 3, groundY: 500 },
  );
  const combat = new Combat();
  adapter.beforeStep(combat);
  combat.hits = ["punch", "kick", "special", "grab"].map((kind, i): Hit => ({
    attacker: 0,
    defender: 1,
    attackId: i,
    attackKind: kind as Hit["attackKind"],
    blocked: i === 0,
    x: 10,
    y: 20,
    special: kind === "special",
  }));
  adapter.afterStep(combat, 1000 / 60);
  expect(events).toEqual([
    ["sound", "block"],
    ["flash", 0],
    ["impact", 0],
    ["sound", "hit-medium"],
    ["spawn", "mediumHit", { x: 30, y: 440 }],
    ["flash", 1],
    ["impact", 1],
    ["sound", "hit-heavy"],
    ["spawn", "heavyHit", { x: 30, y: 440 }],
    ["flash", 2],
    ["impact", 2],
    ["sound", "hit-throw"],
    ["spawn", "heavyHit", { x: 30, y: 440 }],
    ["flash", 3],
    ["impact", 3],
    ["update", 1000 / 60],
  ]);
});
