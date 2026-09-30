import { CharacterPreview } from "@/components/game-sprites";
import { PLAYER_CHARACTERS, type PlayerCharacter } from "@/lib/characters";

type CharacterPickerProps = {
  value: PlayerCharacter | null;
  onChange: (character: PlayerCharacter) => void;
};

export function CharacterPicker({ value, onChange }: CharacterPickerProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-center text-lg font-bold text-white drop-shadow-md">
        Who are you?
      </h2>
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
        {PLAYER_CHARACTERS.map((c) => {
          const selected = value === c.id;
          const ringBg =
            c.id === "girl"
              ? "bg-pink-100"
              : c.id === "dolphin"
                ? "bg-sky-200"
                : "bg-sky-100";
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                selected
                  ? "border-white bg-white shadow-lg scale-105"
                  : "border-white/60 bg-white/80 hover:bg-white hover:border-white"
              }`}
            >
              <div className={`rounded-full p-2 ${ringBg}`}>
                <CharacterPreview character={c.id} size={72} />
              </div>
              <span className="font-bold text-sm text-foreground">{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
