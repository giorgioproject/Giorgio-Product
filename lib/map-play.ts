import type { MapId } from "@/lib/maps";

/** Downtown OSM bbox is ~45° off screen; flatten at load so arrows match the map. */
export function mapUsesFlattenedPlay(mapId: MapId): boolean {
  return mapId === "downtown-santa-barbara";
}

/** Minimum dot-product score to accept a direction at a corner (more negative = more forgiving). */
export function directionPickMinScore(mapId: MapId): number {
  return mapUsesFlattenedPlay(mapId) ? -0.55 : -0.12;
}

/** Wider corner window so kids can press a turn a bit early. */
export function cornerInputEpsM(mapId: MapId): number {
  return mapUsesFlattenedPlay(mapId) ? 40 : 28;
}

export function playerTurnScoreFloor(mapId: MapId): number {
  return mapUsesFlattenedPlay(mapId) ? -0.55 : -0.35;
}
