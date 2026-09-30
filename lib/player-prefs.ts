import type { PlayerCharacter } from "@/lib/characters";
import { DEFAULT_MAP_ID, isMapId, type MapId } from "@/lib/maps";

export const PREFS_MAP_KEY = "barbara-chase:lastMapId";
export const PREFS_CHARACTER_KEY = "barbara-chase:lastCharacterId";

export type PlayerPrefs = {
  mapId: MapId;
  characterId: PlayerCharacter | null;
};

const CHARACTERS = new Set<PlayerCharacter>(["boy", "girl", "dolphin"]);

export function parseStoredMapId(raw: string | null): MapId {
  if (raw && isMapId(raw)) return raw;
  return DEFAULT_MAP_ID;
}

export function parseStoredCharacter(raw: string | null): PlayerCharacter | null {
  if (raw && CHARACTERS.has(raw as PlayerCharacter)) {
    return raw as PlayerCharacter;
  }
  return null;
}

/** Browser-only read; safe default when `window` is missing (tests / SSR). */
export function readPlayerPrefs(storage?: Storage | null): PlayerPrefs {
  if (!storage) {
    return { mapId: DEFAULT_MAP_ID, characterId: null };
  }
  return {
    mapId: parseStoredMapId(storage.getItem(PREFS_MAP_KEY)),
    characterId: parseStoredCharacter(storage.getItem(PREFS_CHARACTER_KEY)),
  };
}

export function writePlayerPrefs(
  prefs: Partial<PlayerPrefs>,
  storage?: Storage | null
): void {
  if (!storage) return;
  if (prefs.mapId !== undefined) {
    storage.setItem(PREFS_MAP_KEY, prefs.mapId);
  }
  if (prefs.characterId !== undefined) {
    if (prefs.characterId === null) {
      storage.removeItem(PREFS_CHARACTER_KEY);
    } else {
      storage.setItem(PREFS_CHARACTER_KEY, prefs.characterId);
    }
  }
}

export function pelletScore(initialCount: number, remaining: number): number {
  return Math.max(0, initialCount - remaining);
}

/** Collected vs total pellets at run start (per map). */
export function pelletProgressLabel(
  initialCount: number,
  remaining: number
): string {
  const total = Math.max(0, initialCount);
  const collected = pelletScore(initialCount, remaining);
  return `${collected}/${total}`;
}
