import { describe, expect, it } from "vitest";
import { createTournament } from "../src/tournament";
import { renderTournamentBracket } from "../src/tournament-view";
import type { CharacterId } from "../src/visual-assets";

const entries: { id: string; character: CharacterId }[] = [
  { id: "JUGADOR 1", character: "laura" },
  { id: "JUGADOR 2", character: "sebastian" },
  { id: "JUGADOR 3", character: "laura" },
  { id: "JUGADOR 4", character: "sebastian" },
];

describe("vista del torneo", () => {
  it("muestra semifinales, final pendiente, participantes y personajes", () => {
    const markup = renderTournamentBracket(createTournament(entries));

    expect(markup.match(/class="tournament-match"/g)).toHaveLength(3);
    expect(markup).toContain('aria-label="SEMIFINALES"');
    expect(markup).toContain('aria-label="FINAL"');
    expect(markup).toContain("JUGADOR 1");
    expect(markup).toContain("JUGADOR 4");
    expect(markup).toContain("LAURA");
    expect(markup).toContain("SEBASTIAN");
    expect(markup.match(/POR DEFINIR/g)).toHaveLength(3);
    expect(markup).not.toContain("tournament-slot-winner");
    expect(markup).toContain('id="tournament-start"');
  });

  it("refleja los ganadores y el campeón del Tournament al volver a renderizar", () => {
    const tournament = createTournament(entries);
    tournament.recordWinner("JUGADOR 2");
    let markup = renderTournamentBracket(tournament);
    expect(markup.match(/tournament-slot-winner/g)).toHaveLength(1);
    expect(markup).toContain("GANADOR");
    expect(markup.match(/POR DEFINIR/g)).toHaveLength(3);

    tournament.recordWinner("JUGADOR 3");
    markup = renderTournamentBracket(tournament);
    expect(markup.match(/tournament-slot-winner/g)).toHaveLength(2);
    expect(markup.match(/JUGADOR 2/g)?.length).toBeGreaterThan(1);
    expect(markup.match(/JUGADOR 3/g)?.length).toBeGreaterThan(1);
    expect(markup.match(/POR DEFINIR/g)).toHaveLength(1);

    tournament.recordWinner("JUGADOR 3");
    markup = renderTournamentBracket(tournament);
    expect(markup.match(/tournament-slot-winner/g)).toHaveLength(3);
    expect(markup).toContain("<strong>JUGADOR 3 · LAURA</strong>");
    expect(markup).not.toContain("POR DEFINIR");
    expect(markup).not.toContain('id="tournament-start"');
  });

  it("proyecta columnas pendientes para un cuadro de ocho sin inventar resultados", () => {
    const tournament = createTournament(
      Array.from({ length: 8 }, (_, index) => ({
        id: `P${index + 1}`,
        character: entries[index % entries.length].character,
      })),
    );
    const markup = renderTournamentBracket(tournament);
    expect(markup.match(/class="tournament-match"/g)).toHaveLength(7);
    expect(markup).toContain('aria-label="CUARTOS DE FINAL"');
    expect(markup).toContain('aria-label="SEMIFINALES"');
    expect(markup).toContain('aria-label="FINAL"');
    expect(markup).not.toContain("tournament-slot-winner");
  });

  it("escapa IDs de participantes antes de insertarlos en HTML", () => {
    const tournament = createTournament([
      { id: '<img src=x onerror="alert(1)">', character: "laura" as const },
      { id: "P2", character: "sebastian" as const },
    ]);
    expect(renderTournamentBracket(tournament)).toContain(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });
});
