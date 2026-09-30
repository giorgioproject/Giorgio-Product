import mapsCatalog from "@/data/maps.json";
import downtownGraph from "@/data/graph-downtown-santa-barbara.json";
import solvangGraph from "@/data/graph-solvang.json";
import islaVistaGraph from "@/data/graph-isla-vista.json";
import downtownLandmarks from "@/data/landmarks-downtown-santa-barbara.json";
import solvangLandmarks from "@/data/landmarks-solvang.json";
import islaVistaLandmarks from "@/data/landmarks-isla-vista.json";
import {
  bboxCenter,
  findBestCardinalRotationDeg,
  flattenGraphForCardinalPlay,
  rotateLatLonAboutCenter,
} from "@/lib/flatten-graph";
import { filterLandmarksInBbox } from "@/lib/landmarks";
import { mapUsesFlattenedPlay } from "@/lib/map-play";
import type { Landmark, StreetGraphData } from "@/lib/street-graph";

export type MapId = "downtown-santa-barbara" | "solvang" | "isla-vista";

export type MapDefinition = {
  id: MapId;
  name: string;
  difficulty: string;
  ghostCount: number;
  graphFile: string;
  landmarksFile: string;
  previewImage: string;
  landscapeImage: string;
  pelletCount: number;
  pelletSpacingM: number;
  /** Simulation speed; ghost uses {@link GHOST_PLAYER_SPEED_RATIO} of player. */
  playerSpeedMps: number;
};

const GRAPHS: Record<MapId, StreetGraphData> = {
  "downtown-santa-barbara": downtownGraph as StreetGraphData,
  solvang: solvangGraph as StreetGraphData,
  "isla-vista": islaVistaGraph as StreetGraphData,
};

const LANDMARKS: Record<MapId, Landmark[]> = {
  "downtown-santa-barbara": downtownLandmarks as Landmark[],
  solvang: solvangLandmarks as Landmark[],
  "isla-vista": islaVistaLandmarks as Landmark[],
};

export const MAP_IDS: MapId[] = [
  "isla-vista",
  "solvang",
  "downtown-santa-barbara",
];

export const DEFAULT_MAP_ID: MapId = "isla-vista";

export function getMapCatalog(): MapDefinition[] {
  return mapsCatalog as MapDefinition[];
}

export function isMapId(value: string): value is MapId {
  return MAP_IDS.includes(value as MapId);
}

export function getMapById(mapId: MapId): MapDefinition {
  const found = getMapCatalog().find((m) => m.id === mapId);
  if (!found) throw new Error(`Unknown map: ${mapId}`);
  return found;
}

export function getGraphDataForMap(mapId: MapId): StreetGraphData {
  return GRAPHS[mapId];
}

/** Graph as drawn in play (downtown is rotated so streets sit square on screen). */
export function getPlayGraphForMap(mapId: MapId): StreetGraphData {
  if (mapUsesFlattenedPlay(mapId)) {
    return flattenGraphForCardinalPlay(GRAPHS[mapId]);
  }
  return GRAPHS[mapId];
}

let downtownPlayRotation: {
  deg: number;
  center: { lat: number; lon: number };
} | null = null;

function downtownRotationMeta(): { deg: number; center: { lat: number; lon: number } } {
  if (!downtownPlayRotation) {
    const raw = GRAPHS["downtown-santa-barbara"];
    downtownPlayRotation = {
      deg: findBestCardinalRotationDeg(raw),
      center: bboxCenter(raw.bbox),
    };
  }
  return downtownPlayRotation;
}

export function mapDisplayLatLon(
  mapId: MapId,
  lat: number,
  lon: number
): { lat: number; lon: number } {
  if (!mapUsesFlattenedPlay(mapId)) return { lat, lon };
  const { deg, center } = downtownRotationMeta();
  return rotateLatLonAboutCenter(lat, lon, center, deg);
}

export function getLandmarksForMap(mapId: MapId): Landmark[] {
  const playGraph = mapUsesFlattenedPlay(mapId)
    ? flattenGraphForCardinalPlay(GRAPHS[mapId])
    : getGraphDataForMap(mapId);
  const catalog = LANDMARKS[mapId].map((lm) => {
    const pos = mapDisplayLatLon(mapId, lm.lat, lm.lon);
    return { ...lm, lat: pos.lat, lon: pos.lon };
  });
  return filterLandmarksInBbox(catalog, playGraph.bbox);
}

/** Pacific ocean strip along the south edge (coastal maps only). */
export function mapHasOceanLayer(mapId: MapId): boolean {
  return mapId === "downtown-santa-barbara" || mapId === "isla-vista";
}

/** Full-map intro, zoom-to-player, drag pan, on-screen arrows. */
export function mapUsesFocusCamera(_mapId: MapId): boolean {
  return true;
}

/** @deprecated use mapUsesFocusCamera */
export function mapUsesDowntownCamera(mapId: MapId): boolean {
  return mapUsesFocusCamera(mapId);
}

/**
 * Default when a map entry omits speed. Tuned to ~340 workshop pace (classic
 * arcade: Pac crosses a lane in ~1–2 s; ghosts chase below player speed).
 */
export const PLAYER_SPEED_MPS = 340;

/** Ghost movement speed on every map, as a fraction of the player. */
export const GHOST_PLAYER_SPEED_RATIO = 0.7;

export function getPlayerSpeedForMap(mapId: MapId): number {
  return getMapById(mapId).playerSpeedMps ?? PLAYER_SPEED_MPS;
}

export function getGhostCountForMap(mapId: MapId): number {
  return getMapById(mapId).ghostCount;
}

export function getPelletCountForMap(mapId: MapId): number {
  return getMapById(mapId).pelletCount;
}

/** Finer simulation steps for smoother corners at high speed. */
export function getSimSubstepsForMap(_mapId: MapId): number {
  return 48;
}

export const DOWNTOWN_FOCUS_ZOOM_STEP = 0.09;
export const SIM_FIXED_DT_MS = 1000 / 60;
