import { BarbaraChaseGame } from "@/components/barbara-chase-game";
import { GameMusicProvider } from "@/components/game-music-provider";

export default function Home() {
  return (
    <GameMusicProvider>
      <BarbaraChaseGame />
    </GameMusicProvider>
  );
}
