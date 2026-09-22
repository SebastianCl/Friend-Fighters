import type {
  Tournament,
  TournamentMatch,
  TournamentParticipant,
} from "./tournament";
import { visualCharacter, type CharacterId } from "./visual-assets";

function roundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "FINAL";
  if (round === totalRounds - 1) return "SEMIFINALES";
  if (round === totalRounds - 2) return "CUARTOS DE FINAL";
  return `RONDA ${round}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function participantMarkup(
  participant: TournamentParticipant<CharacterId> | null,
  winnerId: string | null,
): string {
  if (!participant) {
    return '<div class="tournament-slot tournament-slot-pending"><span class="tournament-slot-name">POR DEFINIR</span></div>';
  }

  const character = visualCharacter(participant.character);
  const winner = participant.id === winnerId;
  return `<div class="tournament-slot${winner ? " tournament-slot-winner" : ""}"><img src="${character.portrait}" alt=""/><span class="tournament-slot-text"><strong>${escapeHtml(participant.id)}</strong><small>${character.name}</small></span>${winner ? '<span class="tournament-winner-label">GANADOR</span>' : ""}</div>`;
}

function matchMarkup(
  match: TournamentMatch<CharacterId> | undefined,
  round: number,
  index: number,
): string {
  const participants = match?.participants ?? [null, null];
  const winnerId = match?.winnerId ?? null;
  return `<div class="tournament-match" data-round="${round}" data-match="${index + 1}"><p>COMBATE ${index + 1}</p>${participants.map((participant) => participantMarkup(participant, winnerId)).join("")}</div>`;
}

export function renderTournamentBracket(
  tournament: Tournament<CharacterId>,
): string {
  const rounds = tournament.rounds;
  const totalRounds = Math.log2(rounds[0].length * 2);
  const champion = tournament.getChampion();
  const currentMatch = tournament.getCurrentMatch();
  const championName = champion
    ? `${champion.id} · ${visualCharacter(champion.character).name}`
    : "POR DEFINIR";

  return `<div class="tournament-panel"><div class="tournament-heading"><div><p class="eyebrow">CUADRO DE ELIMINACIÓN DIRECTA</p><h2>TORNEO</h2></div><div class="tournament-champion"><span>CAMPEÓN</span><strong>${escapeHtml(championName)}</strong></div></div><div class="tournament-bracket-scroll"><div class="tournament-bracket" style="--bracket-rounds:${totalRounds}">${Array.from(
    { length: totalRounds },
    (_, index) => {
      const round = index + 1;
      const count = rounds[0].length / 2 ** index;
      return `<section class="tournament-round" aria-label="${roundLabel(round, totalRounds)}"><h3>${roundLabel(round, totalRounds)}</h3><div class="tournament-round-matches">${Array.from({ length: count }, (_, matchIndex) => matchMarkup(rounds[index]?.[matchIndex], round, matchIndex)).join("")}</div></section>`;
    },
  ).join(
    "",
  )}</div></div><div class="tournament-actions"><p>${currentMatch ? `SIGUIENTE COMBATE: RONDA ${currentMatch.round} · ${currentMatch.participants.map(({ id }) => escapeHtml(id)).join(" VS ")}` : "TORNEO FINALIZADO"}</p><div>${currentMatch ? '<button class="primary" id="tournament-start" data-requires-assets>PELEAR SIGUIENTE COMBATE →</button>' : ""}<button class="secondary" id="tournament-back">VOLVER AL MENÚ</button></div></div></div>`;
}
