import { describe, expect, it } from "vitest";
import { createTournament } from "../src/tournament";

const participants = [
  { id: "player-1", character: "laura" },
  { id: "player-2", character: "laura" },
  { id: "player-3", character: "sebastian" },
  { id: "player-4", character: "sebastian" },
];

describe("torneo de eliminación directa", () => {
  it("genera semifinales en orden y avanza hasta el campeón aunque se repitan personajes", () => {
    const tournament = createTournament(participants);

    expect(tournament.rounds).toHaveLength(1);
    expect(
      tournament.rounds[0].map((match) =>
        match.participants.map((entry) => entry.id),
      ),
    ).toEqual([
      ["player-1", "player-2"],
      ["player-3", "player-4"],
    ]);
    expect(tournament.getCurrentMatch()?.id).toBe("1-1");
    expect(tournament.getChampion()).toBeNull();

    tournament.recordWinner("player-2");
    expect(tournament.getCurrentMatch()?.id).toBe("1-2");
    expect(tournament.rounds[0][0].winnerId).toBe("player-2");
    expect(tournament.rounds).toHaveLength(1);

    tournament.recordWinner("player-4");
    expect(tournament.rounds).toHaveLength(2);
    expect(tournament.getCurrentMatch()).toMatchObject({
      id: "2-1",
      round: 2,
      winnerId: null,
      participants: [participants[1], participants[3]],
    });

    tournament.recordWinner("player-4");
    expect(tournament.getCurrentMatch()).toBeNull();
    expect(tournament.getChampion()).toEqual(participants[3]);
    expect(tournament.rounds[1][0].winnerId).toBe("player-4");
  });

  it("admite ocho participantes sin cambiar la progresión de rondas", () => {
    const entries = Array.from({ length: 8 }, (_, index) => ({
      id: `entry-${index + 1}`,
      character: index % 2 === 0 ? "laura" : "sebastian",
    }));
    const tournament = createTournament(entries);

    expect(tournament.rounds.map((round) => round.length)).toEqual([4]);
    for (const winner of ["entry-2", "entry-3", "entry-6", "entry-7"]) {
      tournament.recordWinner(winner);
    }
    expect(tournament.rounds.map((round) => round.length)).toEqual([4, 2]);
    expect(
      tournament.rounds[1].map((match) =>
        match.participants.map(({ id }) => id),
      ),
    ).toEqual([
      ["entry-2", "entry-3"],
      ["entry-6", "entry-7"],
    ]);

    tournament.recordWinner("entry-3");
    tournament.recordWinner("entry-6");
    expect(tournament.rounds.map((round) => round.length)).toEqual([4, 2, 1]);
    expect(
      tournament.getCurrentMatch()?.participants.map(({ id }) => id),
    ).toEqual(["entry-3", "entry-6"]);
    tournament.recordWinner("entry-3");
    expect(tournament.getChampion()).toEqual(entries[2]);
  });

  it("rechaza tamaños inválidos e IDs duplicados", () => {
    expect(() => createTournament([])).toThrow(/power of two/);
    expect(() => createTournament([participants[0]])).toThrow(/power of two/);
    expect(() => createTournament(participants.slice(0, 3))).toThrow(
      /power of two/,
    );
    expect(() => createTournament([participants[0], participants[0]])).toThrow(
      /unique/,
    );
    expect(() => createTournament(participants)).not.toThrow();
  });

  it("solo acepta al participante del enfrentamiento actual y no altera el estado tras un error", () => {
    const tournament = createTournament(participants);
    expect(() => tournament.recordWinner("player-3")).toThrow(/current match/);
    expect(() => tournament.recordWinner("unknown")).toThrow(/current match/);
    expect(tournament.getCurrentMatch()?.id).toBe("1-1");
    expect(tournament.rounds[0][0].winnerId).toBeNull();

    tournament.recordWinner("player-1");
    tournament.recordWinner("player-3");
    expect(() => tournament.recordWinner("player-2")).toThrow(/current match/);
    expect(tournament.getCurrentMatch()?.id).toBe("2-1");

    tournament.recordWinner("player-1");
    expect(() => tournament.recordWinner("player-1")).toThrow(
      /already complete/,
    );
  });

  it("devuelve instantáneas que no permiten alterar el cuadro desde fuera", () => {
    const tournament = createTournament(participants);
    const rounds = tournament.rounds as { winnerId: string | null }[][];
    rounds[0][0].winnerId = "player-2";
    rounds.pop();
    expect(tournament.getCurrentMatch()?.winnerId).toBeNull();
    expect(tournament.rounds).toHaveLength(1);
  });
});
