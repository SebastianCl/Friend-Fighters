import type { TournamentParticipant } from "./tournament";

export function createTournamentParticipants<T extends string>(
  playerCharacter: T,
  availableCharacters: readonly T[],
): TournamentParticipant<T>[] {
  const playerIndex = availableCharacters.indexOf(playerCharacter);
  if (playerIndex < 0) {
    throw new Error(
      "The selected character must exist in the character catalog.",
    );
  }

  return [
    { id: "PLAYER", character: playerCharacter },
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `CPU ${index + 1}`,
      character:
        availableCharacters[
          (playerIndex + index + 1) % availableCharacters.length
        ],
    })),
  ];
}
