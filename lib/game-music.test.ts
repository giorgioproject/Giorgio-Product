import { describe, expect, it } from "vitest";
import {
  MUSIC_LOOP_SEC,
  MUSIC_THEMES,
  canUnlockMusic,
  musicTrackForScene,
  readMusicMuted,
  shouldRestartMainTrackFromStart,
  shouldStartMusic,
  shouldKeepExistingTrack,
  resolveMusicScene,
  writeMusicMuted,
} from "@/lib/game-music";

describe("game-music", () => {
  it("maps UI state to a music scene", () => {
    expect(
      resolveMusicScene({ screen: "welcome", phase: null, landmarkOpen: false })
    ).toBe("welcome");
    expect(
      resolveMusicScene({
        screen: "game",
        phase: "playing",
        landmarkOpen: false,
      })
    ).toBe("chase");
    expect(
      resolveMusicScene({
        screen: "game",
        phase: "overview",
        landmarkOpen: false,
      })
    ).toBe("chase");
    expect(
      resolveMusicScene({
        screen: "game",
        phase: "playing",
        landmarkOpen: true,
      })
    ).toBe("landmark");
    expect(
      resolveMusicScene({
        screen: "game",
        phase: "caught",
        landmarkOpen: false,
      })
    ).toBe("caught");
    expect(
      resolveMusicScene({
        screen: "game",
        phase: "won",
        landmarkOpen: false,
      })
    ).toBe("won");
  });

  it("keeps every theme inside the loop length", () => {
    for (const scene of Object.keys(MUSIC_THEMES) as Array<
      keyof typeof MUSIC_THEMES
    >) {
      const theme = MUSIC_THEMES[scene];
      expect(theme.length).toBeGreaterThan(0);
      for (const note of theme) {
        expect(note.at).toBeGreaterThanOrEqual(0);
        expect(note.at + note.dur).toBeLessThanOrEqual(MUSIC_LOOP_SEC + 0.5);
      }
    }
  });

  it("returns null when game screen has no phase yet", () => {
    expect(
      resolveMusicScene({
        screen: "game",
        phase: null,
        landmarkOpen: false,
      })
    ).toBeNull();
  });

  it("restarts the main song from the beginning on welcome and caught", () => {
    expect(shouldRestartMainTrackFromStart("welcome")).toBe(true);
    expect(shouldRestartMainTrackFromStart("caught")).toBe(true);
    expect(shouldRestartMainTrackFromStart("chase")).toBe(false);
    expect(shouldRestartMainTrackFromStart("won")).toBe(false);
  });

  it("uses the same song file on welcome and chase", () => {
    expect(musicTrackForScene("welcome")).toBe("/music/barbara-chase-song.m4a");
    expect(musicTrackForScene("chase")).toBe("/music/barbara-chase-song.m4a");
    expect(musicTrackForScene("caught")).toBeNull();
    expect(musicTrackForScene(null)).toBeNull();
  });

  it("does not keep the song going after music is turned off", () => {
    expect(
      shouldKeepExistingTrack({
        muted: true,
        prevTrack: "/music/barbara-chase-song.m4a",
        nextTrack: "/music/barbara-chase-song.m4a",
        restartFromStart: false,
        isPlaying: true,
      })
    ).toBe(false);
    expect(
      shouldKeepExistingTrack({
        muted: false,
        prevTrack: "/music/barbara-chase-song.m4a",
        nextTrack: "/music/barbara-chase-song.m4a",
        restartFromStart: false,
        isPlaying: true,
      })
    ).toBe(true);
  });

  it("does not start music when the player turned it off", () => {
    expect(shouldStartMusic(true, true, "chase")).toBe(false);
    expect(shouldStartMusic(true, true, "welcome")).toBe(false);
    expect(shouldStartMusic(false, true, "chase")).toBe(true);
    expect(shouldStartMusic(false, false, "chase")).toBe(false);
    expect(shouldStartMusic(false, true, null)).toBe(false);
  });

  it("does not unlock music until the saved mute setting is known", () => {
    expect(canUnlockMusic(false, false)).toBe(false);
    expect(canUnlockMusic(true, true)).toBe(false);
    expect(canUnlockMusic(true, false)).toBe(true);
  });

  it("defaults mute to off without storage", () => {
    expect(readMusicMuted(null)).toBe(false);
    expect(readMusicMuted(undefined)).toBe(false);
  });

  it("persists mute preference", () => {
    const data: Record<string, string> = {};
    const storage = {
      get length() {
        return Object.keys(data).length;
      },
      clear() {
        for (const key of Object.keys(data)) delete data[key];
      },
      key(index: number) {
        return Object.keys(data)[index] ?? null;
      },
      getItem(key: string) {
        return data[key] ?? null;
      },
      setItem(key: string, value: string) {
        data[key] = value;
      },
      removeItem(key: string) {
        delete data[key];
      },
    } satisfies Storage;
    expect(readMusicMuted(storage)).toBe(false);
    writeMusicMuted(true, storage);
    expect(readMusicMuted(storage)).toBe(true);
    writeMusicMuted(false, storage);
    expect(readMusicMuted(storage)).toBe(false);
  });
});
