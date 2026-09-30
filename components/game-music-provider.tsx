"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createGameMusicEngine,
  registerGameMusicAudio,
  silenceAllGameMusic,
  type GameMusicEngine,
} from "@/components/game-music-engine";
import {
  canUnlockMusic,
  readMusicMuted,
  writeMusicMuted,
  type MusicScene,
} from "@/lib/game-music";

type GameMusicContextValue = {
  muted: boolean;
  unlocked: boolean;
  prefsReady: boolean;
  toggleMuted: () => void;
  unlock: () => void;
  setScene: (scene: MusicScene | null) => void;
};

const GameMusicContext = createContext<GameMusicContextValue | null>(null);

export function GameMusicProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<GameMusicEngine | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  const prefsReadyRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  mutedRef.current = muted;
  prefsReadyRef.current = prefsReady;

  useEffect(() => {
    engineRef.current = createGameMusicEngine({
      getAudio: () => audioRef.current,
    });
    const storage =
      typeof window !== "undefined" ? window.localStorage : null;
    const initialMuted = readMusicMuted(storage);
    mutedRef.current = initialMuted;
    setMuted(initialMuted);
    engineRef.current?.setMuted(initialMuted);
    if (initialMuted) silenceAllGameMusic();
    prefsReadyRef.current = true;
    setPrefsReady(true);
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
      silenceAllGameMusic();
    };
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    engineRef.current?.setMuted(muted);
    const el = audioRef.current;
    if (muted) {
      silenceAllGameMusic();
      if (el) {
        el.pause();
        el.muted = true;
        el.volume = 0;
      }
      return;
    }
    if (el) {
      el.muted = false;
    }
  }, [muted, prefsReady]);

  useEffect(() => {
    if (!prefsReady || muted || !unlocked) return;
    void engineRef.current?.unlock();
  }, [prefsReady, muted, unlocked]);

  const unlock = useCallback(() => {
    if (!canUnlockMusic(prefsReadyRef.current, mutedRef.current)) {
      silenceAllGameMusic();
      return;
    }
    void engineRef.current?.unlock().then(() => {
      if (canUnlockMusic(prefsReadyRef.current, mutedRef.current)) {
        setUnlocked(true);
      } else {
        silenceAllGameMusic();
      }
    });
  }, []);

  const toggleMuted = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    writeMusicMuted(
      next,
      typeof window !== "undefined" ? window.localStorage : null
    );
    engineRef.current?.setMuted(next);
    if (next) {
      silenceAllGameMusic();
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.muted = true;
        el.volume = 0;
      }
    }
  }, []);

  const setScene = useCallback((scene: MusicScene | null) => {
    engineRef.current?.setScene(scene);
    if (mutedRef.current) silenceAllGameMusic();
  }, []);

  const value = useMemo(
    () => ({ muted, unlocked, prefsReady, toggleMuted, unlock, setScene }),
    [muted, unlocked, prefsReady, toggleMuted, unlock, setScene]
  );

  return (
    <GameMusicContext.Provider value={value}>
      <audio
        ref={(el) => {
          audioRef.current = el;
          registerGameMusicAudio(el);
        }}
        data-game-music="file"
        src="/music/barbara-chase-song.m4a"
        loop
        playsInline
        preload="auto"
        muted={muted}
        className="sr-only"
        aria-hidden
        onPlay={(event) => {
          if (mutedRef.current) {
            event.currentTarget.pause();
            event.currentTarget.muted = true;
            event.currentTarget.volume = 0;
            silenceAllGameMusic();
          }
        }}
      />
      {children}
    </GameMusicContext.Provider>
  );
}

export function useGameMusic() {
  const ctx = useContext(GameMusicContext);
  if (!ctx) {
    throw new Error("useGameMusic must be used within GameMusicProvider");
  }
  return ctx;
}

/** Starts audio after the first tap (browser policy) and switches jingles. */
export function GameMusicController({
  scene,
}: {
  scene: MusicScene | null;
}) {
  const { unlock, unlocked, muted, prefsReady, setScene } = useGameMusic();

  useEffect(() => {
    setScene(scene);
  }, [scene, setScene]);

  useEffect(() => {
    if (unlocked || !canUnlockMusic(prefsReady, muted)) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-music-toggle]")) {
        return;
      }
      unlock();
    };
    window.addEventListener("pointerdown", onPointerDown, { once: true });
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [unlock, unlocked, muted, prefsReady]);

  return null;
}
