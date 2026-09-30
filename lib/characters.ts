export type PlayerCharacter = "boy" | "girl" | "dolphin";

export const PLAYER_CHARACTERS: {
  id: PlayerCharacter;
  label: string;
  hint: string;
}[] = [
  { id: "boy", label: "Boy", hint: "Ready to chase the streets" },
  { id: "girl", label: "Girl", hint: "Ready to chase the streets" },
  { id: "dolphin", label: "Dolphin", hint: "Swimming the streets of SB" },
];
