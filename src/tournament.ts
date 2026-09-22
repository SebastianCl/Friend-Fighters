export interface TournamentParticipant<T> {
  readonly id: string;
  readonly character: T;
}

export interface TournamentMatch<T> {
  readonly id: string;
  readonly round: number;
  readonly participants: readonly [
    TournamentParticipant<T>,
    TournamentParticipant<T>,
  ];
  readonly winnerId: string | null;
}

export class Tournament<T> {
  private readonly roundResults: TournamentMatch<T>[][];
  private roundIndex = 0;
  private matchIndex = 0;
  private champion: TournamentParticipant<T> | null = null;

  constructor(participants: readonly TournamentParticipant<T>[]) {
    if (
      participants.length < 2 ||
      !Number.isInteger(Math.log2(participants.length))
    ) {
      throw new Error(
        "A tournament requires a power of two participants (at least 2).",
      );
    }
    if (
      new Set(participants.map(({ id }) => id)).size !== participants.length
    ) {
      throw new Error("Tournament participant IDs must be unique.");
    }

    this.roundResults = [
      this.makeRound(
        participants.map((participant) => ({ ...participant })),
        1,
      ),
    ];
  }

  get rounds(): readonly (readonly TournamentMatch<T>[])[] {
    return this.roundResults.map((round) =>
      round.map((match) => this.copyMatch(match)),
    );
  }

  getCurrentMatch(): TournamentMatch<T> | null {
    if (this.champion) return null;
    return this.copyMatch(this.roundResults[this.roundIndex][this.matchIndex]);
  }

  recordWinner(participantId: string): void {
    if (this.champion) throw new Error("The tournament is already complete.");

    const match = this.roundResults[this.roundIndex][this.matchIndex];
    const winner = match.participants.find(
      (participant) => participant.id === participantId,
    );
    if (!winner)
      throw new Error("The winner must belong to the current match.");

    this.roundResults[this.roundIndex][this.matchIndex] = {
      ...match,
      winnerId: participantId,
    };
    this.matchIndex++;
    if (this.matchIndex < this.roundResults[this.roundIndex].length) return;

    const winners = this.roundResults[this.roundIndex].map((completedMatch) =>
      completedMatch.participants.find(
        (participant) => participant.id === completedMatch.winnerId,
      )!,
    );
    if (winners.length === 1) {
      this.champion = winners[0];
      return;
    }

    this.roundIndex++;
    this.matchIndex = 0;
    this.roundResults.push(this.makeRound(winners, this.roundIndex + 1));
  }

  getChampion(): TournamentParticipant<T> | null {
    return this.champion ? { ...this.champion } : null;
  }

  private makeRound(
    participants: readonly TournamentParticipant<T>[],
    round: number,
  ): TournamentMatch<T>[] {
    const matches: TournamentMatch<T>[] = [];
    for (let index = 0; index < participants.length; index += 2) {
      matches.push({
        id: `${round}-${index / 2 + 1}`,
        round,
        participants: [participants[index], participants[index + 1]],
        winnerId: null,
      });
    }
    return matches;
  }

  private copyMatch(match: TournamentMatch<T>): TournamentMatch<T> {
    return {
      ...match,
      participants: [
        { ...match.participants[0] },
        { ...match.participants[1] },
      ],
    };
  }
}

export function createTournament<T>(
  participants: readonly TournamentParticipant<T>[],
): Tournament<T> {
  return new Tournament(participants);
}
