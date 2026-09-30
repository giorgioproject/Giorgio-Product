import type { GamePhase } from "@/lib/game-state";

export const MUSIC_LOOP_SEC = 15;

export type MusicScene = "welcome" | "chase" | "caught" | "won" | "landmark";

export const PREFS_MUSIC_MUTED_KEY = "barbara-chase:musicMuted";

/** File loops for welcome + all three maps. Other moments stay on synth jingles. */
export const MUSIC_TRACKS: Partial<Record<MusicScene, string>> = {
  welcome: "/music/barbara-chase-song.m4a",
  chase: "/music/barbara-chase-song.m4a",
};

export function musicTrackForScene(scene: MusicScene | null): string | null {
  if (!scene) return null;
  return MUSIC_TRACKS[scene] ?? null;
}

/** Saved mute has been read; do not start the song before that. */
export function canUnlockMusic(prefsReady: boolean, muted: boolean): boolean {
  return prefsReady && !muted;
}

export function shouldStartMusic(
  muted: boolean,
  unlocked: boolean,
  scene: MusicScene | null
): boolean {
  return !muted && unlocked && scene !== null;
}

/** Keep the same file playing only when music is on and the song did not change. */
export function shouldKeepExistingTrack(input: {
  muted: boolean;
  prevTrack: string | null;
  nextTrack: string | null;
  restartFromStart: boolean;
  isPlaying: boolean;
}): boolean {
  if (input.muted) return false;
  return (
    !!input.prevTrack &&
    !!input.nextTrack &&
    input.prevTrack === input.nextTrack &&
    !input.restartFromStart &&
    input.isPlaying
  );
}

/** Main song file starts over on welcome and when the run ends in a catch. */
export function shouldRestartMainTrackFromStart(scene: MusicScene | null): boolean {
  return scene === "welcome" || scene === "caught";
}

type MusicNote = {
  at: number;
  freq: number;
  dur: number;
  wave?: OscillatorType;
  vol?: number;
};

export function resolveMusicScene(input: {
  screen: "welcome" | "game";
  phase: GamePhase | null;
  landmarkOpen: boolean;
}): MusicScene | null {
  if (input.screen === "welcome") return "welcome";
  if (input.landmarkOpen) return "landmark";
  if (input.phase === "caught") return "caught";
  if (input.phase === "won") return "won";
  if (
    input.phase === "playing" ||
    input.phase === "overview"
  ) {
    return "chase";
  }
  return null;
}

export function readMusicMuted(storage?: Storage | null): boolean {
  if (!storage) return false;
  return storage.getItem(PREFS_MUSIC_MUTED_KEY) === "1";
}

export function writeMusicMuted(muted: boolean, storage?: Storage | null): void {
  if (!storage) return;
  if (muted) storage.setItem(PREFS_MUSIC_MUTED_KEY, "1");
  else storage.removeItem(PREFS_MUSIC_MUTED_KEY);
}

const WELCOME_THEME: MusicNote[] = [
  { at: 0, freq: 523.25, dur: 0.35, vol: 0.12 },
  { at: 0.5, freq: 659.25, dur: 0.35, vol: 0.11 },
  { at: 1, freq: 783.99, dur: 0.45, vol: 0.12 },
  { at: 2, freq: 659.25, dur: 0.35, vol: 0.1 },
  { at: 2.5, freq: 587.33, dur: 0.35, vol: 0.1 },
  { at: 3, freq: 523.25, dur: 0.6, vol: 0.11 },
  { at: 4.5, freq: 392, dur: 0.35, vol: 0.09, wave: "triangle" },
  { at: 5, freq: 493.88, dur: 0.35, vol: 0.1, wave: "triangle" },
  { at: 5.5, freq: 587.33, dur: 0.5, vol: 0.11, wave: "triangle" },
  { at: 7, freq: 659.25, dur: 0.35, vol: 0.1 },
  { at: 7.5, freq: 783.99, dur: 0.35, vol: 0.11 },
  { at: 8, freq: 987.77, dur: 0.55, vol: 0.1 },
  { at: 10, freq: 783.99, dur: 0.3, vol: 0.09 },
  { at: 10.4, freq: 659.25, dur: 0.3, vol: 0.09 },
  { at: 10.8, freq: 587.33, dur: 0.3, vol: 0.09 },
  { at: 11.2, freq: 523.25, dur: 0.8, vol: 0.1 },
  { at: 13, freq: 261.63, dur: 1.2, vol: 0.06, wave: "sine" },
];

const CHASE_THEME: MusicNote[] = [
  { at: 0, freq: 440, dur: 0.12, vol: 0.09, wave: "square" },
  { at: 0.25, freq: 554.37, dur: 0.12, vol: 0.08, wave: "square" },
  { at: 0.5, freq: 659.25, dur: 0.12, vol: 0.09, wave: "square" },
  { at: 0.75, freq: 880, dur: 0.12, vol: 0.08, wave: "square" },
  { at: 1, freq: 659.25, dur: 0.12, vol: 0.08, wave: "square" },
  { at: 1.25, freq: 554.37, dur: 0.12, vol: 0.08, wave: "square" },
  { at: 1.5, freq: 440, dur: 0.12, vol: 0.09, wave: "square" },
  { at: 2, freq: 493.88, dur: 0.12, vol: 0.08, wave: "triangle" },
  { at: 2.25, freq: 587.33, dur: 0.12, vol: 0.08, wave: "triangle" },
  { at: 2.5, freq: 698.46, dur: 0.12, vol: 0.09, wave: "triangle" },
  { at: 2.75, freq: 880, dur: 0.12, vol: 0.08, wave: "triangle" },
  { at: 3, freq: 698.46, dur: 0.12, vol: 0.08, wave: "triangle" },
  { at: 3.25, freq: 587.33, dur: 0.12, vol: 0.08, wave: "triangle" },
  { at: 3.5, freq: 493.88, dur: 0.12, vol: 0.09, wave: "triangle" },
  { at: 4, freq: 523.25, dur: 0.1, vol: 0.07, wave: "square" },
  { at: 4.2, freq: 523.25, dur: 0.1, vol: 0.07, wave: "square" },
  { at: 4.4, freq: 523.25, dur: 0.1, vol: 0.07, wave: "square" },
  { at: 4.6, freq: 659.25, dur: 0.25, vol: 0.09, wave: "square" },
  { at: 5.5, freq: 440, dur: 0.12, vol: 0.08, wave: "square" },
  { at: 5.75, freq: 554.37, dur: 0.12, vol: 0.08, wave: "square" },
  { at: 6, freq: 659.25, dur: 0.12, vol: 0.09, wave: "square" },
  { at: 6.25, freq: 880, dur: 0.12, vol: 0.08, wave: "square" },
  { at: 8, freq: 392, dur: 0.15, vol: 0.07, wave: "sawtooth" },
  { at: 8.3, freq: 493.88, dur: 0.15, vol: 0.07, wave: "sawtooth" },
  { at: 8.6, freq: 587.33, dur: 0.15, vol: 0.08, wave: "sawtooth" },
  { at: 8.9, freq: 783.99, dur: 0.3, vol: 0.08, wave: "sawtooth" },
  { at: 10, freq: 659.25, dur: 0.12, vol: 0.08, wave: "square" },
  { at: 10.25, freq: 659.25, dur: 0.12, vol: 0.08, wave: "square" },
  { at: 10.5, freq: 698.46, dur: 0.12, vol: 0.08, wave: "square" },
  { at: 10.75, freq: 783.99, dur: 0.35, vol: 0.09, wave: "square" },
  { at: 12, freq: 440, dur: 0.12, vol: 0.07, wave: "triangle" },
  { at: 12.25, freq: 554.37, dur: 0.12, vol: 0.07, wave: "triangle" },
  { at: 12.5, freq: 659.25, dur: 0.12, vol: 0.08, wave: "triangle" },
  { at: 12.75, freq: 880, dur: 0.5, vol: 0.08, wave: "triangle" },
];

const CAUGHT_THEME: MusicNote[] = [
  { at: 0, freq: 392, dur: 0.5, vol: 0.11, wave: "triangle" },
  { at: 0.6, freq: 349.23, dur: 0.5, vol: 0.1, wave: "triangle" },
  { at: 1.2, freq: 311.13, dur: 0.5, vol: 0.1, wave: "triangle" },
  { at: 1.8, freq: 277.18, dur: 0.8, vol: 0.11, wave: "triangle" },
  { at: 3.5, freq: 261.63, dur: 0.4, vol: 0.09, wave: "sine" },
  { at: 4.2, freq: 246.94, dur: 0.4, vol: 0.09, wave: "sine" },
  { at: 4.9, freq: 233.08, dur: 0.6, vol: 0.1, wave: "sine" },
  { at: 7, freq: 220, dur: 0.35, vol: 0.08, wave: "triangle" },
  { at: 7.5, freq: 207.65, dur: 0.35, vol: 0.08, wave: "triangle" },
  { at: 8, freq: 196, dur: 1, vol: 0.09, wave: "triangle" },
  { at: 10, freq: 174.61, dur: 0.5, vol: 0.07, wave: "sine" },
  { at: 11, freq: 164.81, dur: 1.5, vol: 0.08, wave: "sine" },
];

const WON_THEME: MusicNote[] = [
  { at: 0, freq: 523.25, dur: 0.25, vol: 0.11 },
  { at: 0.3, freq: 659.25, dur: 0.25, vol: 0.11 },
  { at: 0.6, freq: 783.99, dur: 0.25, vol: 0.12 },
  { at: 0.9, freq: 1046.5, dur: 0.6, vol: 0.12 },
  { at: 2, freq: 987.77, dur: 0.2, vol: 0.1 },
  { at: 2.3, freq: 783.99, dur: 0.2, vol: 0.1 },
  { at: 2.6, freq: 1046.5, dur: 0.5, vol: 0.11 },
  { at: 4, freq: 659.25, dur: 0.2, vol: 0.09 },
  { at: 4.3, freq: 783.99, dur: 0.2, vol: 0.1 },
  { at: 4.6, freq: 987.77, dur: 0.2, vol: 0.1 },
  { at: 4.9, freq: 1174.66, dur: 0.7, vol: 0.11 },
  { at: 6.5, freq: 1046.5, dur: 0.15, vol: 0.09 },
  { at: 6.8, freq: 1046.5, dur: 0.15, vol: 0.09 },
  { at: 7.1, freq: 1174.66, dur: 0.15, vol: 0.1 },
  { at: 7.4, freq: 1318.51, dur: 0.8, vol: 0.11 },
  { at: 9, freq: 783.99, dur: 0.25, vol: 0.09 },
  { at: 9.4, freq: 987.77, dur: 0.25, vol: 0.1 },
  { at: 9.8, freq: 1174.66, dur: 0.25, vol: 0.1 },
  { at: 10.2, freq: 1567.98, dur: 1.2, vol: 0.1 },
  { at: 12.5, freq: 523.25, dur: 0.8, vol: 0.06, wave: "sine" },
];

const LANDMARK_THEME: MusicNote[] = [
  { at: 0, freq: 659.25, dur: 0.5, vol: 0.08, wave: "sine" },
  { at: 1.5, freq: 783.99, dur: 0.5, vol: 0.08, wave: "sine" },
  { at: 3, freq: 880, dur: 0.6, vol: 0.07, wave: "sine" },
  { at: 5, freq: 783.99, dur: 0.45, vol: 0.07, wave: "triangle" },
  { at: 6.5, freq: 659.25, dur: 0.45, vol: 0.07, wave: "triangle" },
  { at: 8, freq: 587.33, dur: 0.6, vol: 0.07, wave: "triangle" },
  { at: 10, freq: 523.25, dur: 0.5, vol: 0.06, wave: "sine" },
  { at: 12, freq: 659.25, dur: 0.8, vol: 0.07, wave: "sine" },
];

export const MUSIC_THEMES: Record<MusicScene, MusicNote[]> = {
  welcome: WELCOME_THEME,
  chase: CHASE_THEME,
  caught: CAUGHT_THEME,
  won: WON_THEME,
  landmark: LANDMARK_THEME,
};
