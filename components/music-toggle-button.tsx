"use client";

import { Button } from "@/components/ui/button";
import { useGameMusic } from "@/components/game-music-provider";

export function MusicToggleButton() {
  const { muted, toggleMuted, unlock } = useGameMusic();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-music-toggle
      className="border-white/70 bg-white/90 text-foreground font-semibold"
      onClick={() => {
        if (muted) {
          toggleMuted();
          unlock();
          return;
        }
        toggleMuted();
      }}
      aria-pressed={!muted}
      aria-label={muted ? "Music off" : "Music on"}
    >
      {muted ? "Music off" : "Music on"}
    </Button>
  );
}
