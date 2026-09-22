import { describe, expect, it } from "vitest";
import { createTournamentParticipants } from "../src/tournament-setup";

describe("participantes del torneo", () => {
  it("crea una plaza PLAYER y tres CPU rotando por todo el catálogo", () => {
    expect(
      createTournamentParticipants("sebastian", ["laura", "sebastian"]),
    ).toEqual([
      { id: "PLAYER", character: "sebastian" },
      { id: "CPU 1", character: "laura" },
      { id: "CPU 2", character: "sebastian" },
      { id: "CPU 3", character: "laura" },
    ]);
  });

  it("usa personajes nuevos del catálogo sin cambiar la generación de CPU", () => {
    const catalog = ["laura", "sebastian", "new-fighter-a", "new-fighter-b"];
    const participants = createTournamentParticipants("new-fighter-a", catalog);

    expect(participants).toEqual([
      { id: "PLAYER", character: "new-fighter-a" },
      { id: "CPU 1", character: "new-fighter-b" },
      { id: "CPU 2", character: "laura" },
      { id: "CPU 3", character: "sebastian" },
    ]);
  });

  it("repite el único personaje disponible para completar las plazas", () => {
    expect(
      createTournamentParticipants("only-fighter", ["only-fighter"]),
    ).toEqual([
      { id: "PLAYER", character: "only-fighter" },
      { id: "CPU 1", character: "only-fighter" },
      { id: "CPU 2", character: "only-fighter" },
      { id: "CPU 3", character: "only-fighter" },
    ]);
  });

  it("rechaza una selección que no existe en el catálogo", () => {
    expect(() =>
      createTournamentParticipants("missing", ["laura", "sebastian"]),
    ).toThrow(/character catalog/);
  });
});
