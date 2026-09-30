import { describe, expect, it, beforeEach } from "vitest";
import {
  PREFS_CHARACTER_KEY,
  PREFS_MAP_KEY,
  parseStoredCharacter,
  parseStoredMapId,
  pelletProgressLabel,
  pelletScore,
  readPlayerPrefs,
  writePlayerPrefs,
} from "@/lib/player-prefs";

describe("player-prefs", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
      key() {
        return null;
      },
      get length() {
        return Object.keys(this.store).length;
      },
    };
  });

  it("defaults when storage is missing", () => {
    const prefs = readPlayerPrefs(null);
    expect(prefs.mapId).toBe("isla-vista");
    expect(prefs.characterId).toBeNull();
  });

  it("reads and writes map and character", () => {
    writePlayerPrefs({ mapId: "solvang", characterId: "dolphin" }, storage);
    const prefs = readPlayerPrefs(storage);
    expect(prefs.mapId).toBe("solvang");
    expect(prefs.characterId).toBe("dolphin");
    expect(storage.getItem(PREFS_MAP_KEY)).toBe("solvang");
    expect(storage.getItem(PREFS_CHARACTER_KEY)).toBe("dolphin");
  });

  it("parses invalid stored values safely", () => {
    expect(parseStoredMapId("bad")).toBe("isla-vista");
    expect(parseStoredCharacter("alien")).toBeNull();
  });

  it("computes pellet score from initial and remaining counts", () => {
    expect(pelletScore(10, 7)).toBe(3);
    expect(pelletScore(5, 8)).toBe(0);
    expect(pelletProgressLabel(35, 35)).toBe("0/35");
    expect(pelletProgressLabel(35, 34)).toBe("1/35");
    expect(pelletProgressLabel(35, 0)).toBe("35/35");
  });

  it("clears stored character when set to null", () => {
    writePlayerPrefs({ characterId: "boy" }, storage);
    writePlayerPrefs({ characterId: null }, storage);
    expect(readPlayerPrefs(storage).characterId).toBeNull();
    expect(storage.getItem(PREFS_CHARACTER_KEY)).toBeNull();
  });
});
