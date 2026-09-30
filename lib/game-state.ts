import {
  getEdge,
  getNode,
  getOtherNode,
  getStreetGraph,
  getTravelerFacing,
  type Direction,
} from "@/lib/street-graph";
import {
  eatPellet,
  findPelletNear,
  placeAllPellets,
  type Pellet,
} from "@/lib/pellets";
import { buildMapStartSpawns, respawnGhostsSpread } from "@/lib/spawn";
import {
  GHOST_PLAYER_SPEED_RATIO,
  PLAYER_SPEED_MPS as MAP_PLAYER_SPEED_MPS,
} from "@/lib/maps";
import {
  advanceTraveler,
  applyPlayerDirection,
  getTravelerLatLon,
  travelersCollide,
  type Traveler,
} from "@/lib/movement";
import {
  emptyRunLog,
  noteLandmarkOpened,
  notePlayerEdge,
  type RunLog,
} from "@/lib/recap";

export type GamePhase = "welcome" | "overview" | "playing" | "caught" | "won";

export type GameCreateOptions = {
  pelletCount?: number;
  pelletSpacingM?: number;
  startingLives?: number;
  startWithOverview?: boolean;
  playerSpeedMps?: number;
  ghostCount?: number;
  simSubsteps?: number;
};

export type GameState = {
  phase: GamePhase;
  player: Traveler;
  ghosts: Traveler[];
  ghostCount: number;
  pellets: Pellet[];
  overviewStartedAt: number | null;
  lastSpawnKey: string;
  initialPelletCount: number;
  lives: number;
  playerSpeedMps: number;
  simSubsteps: number;
  playerSpawn: Traveler;
  invulnerableUntil: number | null;
  runLog: RunLog;
};

export const PLAYER_SPEED_MPS = MAP_PLAYER_SPEED_MPS;
export const GHOST_SPEED_MPS = PLAYER_SPEED_MPS * GHOST_PLAYER_SPEED_RATIO;
export const OVERVIEW_MS = 2000;
export const STARTING_LIVES = 3;
/** After losing a life, ghosts cannot tag the player (ms). */
export const INVULNERABLE_MS = 2500;

export function isInvulnerable(state: GameState, now: number): boolean {
  return state.invulnerableUntil !== null && now < state.invulnerableUntil;
}

function anyGhostHitsPlayer(player: Traveler, ghosts: Traveler[]): boolean {
  return ghosts.some((ghost) => travelersCollide(player, ghost));
}

function buildFreshTravelers(rng: () => number, ghostCount: number) {
  const { player, ghosts, playerSpawnEdgeId } = buildMapStartSpawns(
    rng,
    ghostCount
  );
  return {
    spawn: {
      edgeId: playerSpawnEdgeId,
      fromNodeId: player.fromNodeId,
      distanceM: player.distanceM,
    },
    player,
    ghosts,
  };
}

export function createInitialGame(
  rng: () => number = Math.random,
  options: GameCreateOptions = {}
): GameState {
  const spacing = options.pelletSpacingM ?? 110;
  const pelletCount = options.pelletCount;
  const lives = options.startingLives ?? STARTING_LIVES;
  const ghostCount = options.ghostCount ?? 1;
  const graph = getStreetGraph();
  const playableIds = graph.edges.filter((e) => e.playable).map((e) => e.id);
  const pellets = placeAllPellets(playableIds, spacing, pelletCount);
  const { spawn, player, ghosts } = buildFreshTravelers(rng, ghostCount);
  const withOverview = options.startWithOverview === true;
  const playerSpeedMps = options.playerSpeedMps ?? PLAYER_SPEED_MPS;
  const simSubsteps = options.simSubsteps ?? 12;

  return {
    phase: withOverview ? "overview" : "playing",
    player,
    ghosts,
    ghostCount,
    pellets,
    overviewStartedAt: withOverview ? Date.now() : null,
    lastSpawnKey: spawn.edgeId,
    initialPelletCount: pellets.length,
    lives,
    playerSpeedMps,
    simSubsteps,
    playerSpawn: { ...player },
    invulnerableUntil: null,
    runLog: notePlayerEdge(emptyRunLog(), player.edgeId),
  };
}

export function noteLandmarkOpenedOnState(
  state: GameState,
  landmarkId: string
): GameState {
  return { ...state, runLog: noteLandmarkOpened(state.runLog, landmarkId) };
}

export function setPlayerDirection(state: GameState, dir: Direction): GameState {
  if (state.phase !== "playing" && state.phase !== "overview") return state;
  const player = applyPlayerDirection(state.player, dir);
  return {
    ...state,
    player,
    runLog: notePlayerEdge(state.runLog, player.edgeId),
  };
}

export function endOverviewIfReady(state: GameState, now: number): GameState {
  if (state.phase === "overview" && state.overviewStartedAt !== null) {
    if (now - state.overviewStartedAt >= OVERVIEW_MS) {
      return { ...state, phase: "playing", overviewStartedAt: null };
    }
  }
  return state;
}

export function tickGame(
  state: GameState,
  now: number,
  rng: () => number = Math.random
): GameState {
  const afterOverview = endOverviewIfReady(state, now);
  if (afterOverview.phase !== state.phase) {
    return afterOverview;
  }

  if (afterOverview.phase !== "playing") return afterOverview;

  const steps = afterOverview.simSubsteps;
  const deltaSec = 1 / 60 / steps;
  let player = afterOverview.player;
  let ghosts = [...afterOverview.ghosts];
  let pellets = afterOverview.pellets;
  let runLog = afterOverview.runLog;

  const ghostSpeed = afterOverview.playerSpeedMps * GHOST_PLAYER_SPEED_RATIO;

  for (let i = 0; i < steps; i += 1) {
    player = advanceTraveler(player, afterOverview.playerSpeedMps, deltaSec, false);
    ghosts = ghosts.map((ghost, idx) =>
      advanceTraveler(ghost, ghostSpeed, deltaSec, true, player, () =>
        rng() + idx * 0.017
      )
    );

    const near = findPelletNear(pellets, player.edgeId, player.distanceM);
    if (near) {
      pellets = eatPellet(pellets, near.id);
      runLog = notePlayerEdge(runLog, player.edgeId);
      if (pellets.length === 0 && afterOverview.initialPelletCount > 0) {
        return {
          ...afterOverview,
          phase: "won",
          player,
          ghosts,
          pellets,
          runLog,
        };
      }
    }

    const canBeTagged = !isInvulnerable(afterOverview, now);
    if (canBeTagged && anyGhostHitsPlayer(player, ghosts)) {
      const resetPlayer: Traveler = { ...afterOverview.playerSpawn };
      const respawnAnchor = resetPlayer;
      runLog = notePlayerEdge(runLog, player.edgeId);
      if (afterOverview.lives > 1) {
        return {
          ...afterOverview,
          player: resetPlayer,
          ghosts: respawnGhostsSpread(
            respawnAnchor,
            afterOverview.ghostCount,
            rng
          ),
          lives: afterOverview.lives - 1,
          invulnerableUntil: now + INVULNERABLE_MS,
          runLog,
        };
      }
      return {
        ...afterOverview,
        phase: "caught",
        player: resetPlayer,
        ghosts,
        pellets,
        invulnerableUntil: null,
        runLog,
      };
    }
  }

  runLog = notePlayerEdge(runLog, player.edgeId);

  if (pellets.length === 0 && afterOverview.initialPelletCount > 0) {
    return { ...afterOverview, phase: "won", player, ghosts, pellets, runLog };
  }

  return { ...afterOverview, player, ghosts, pellets, runLog };
}

export function restartChase(
  state: GameState,
  rng: () => number = Math.random,
  options: GameCreateOptions = {}
): GameState {
  const spacing = options.pelletSpacingM ?? 110;
  const pelletCount = options.pelletCount;

  const graph = getStreetGraph();
  const playableIds = graph.edges.filter((e) => e.playable).map((e) => e.id);
  const pellets = placeAllPellets(
    playableIds,
    spacing,
    pelletCount ?? state.initialPelletCount
  );
  const ghostCount = options.ghostCount ?? state.ghostCount;
  const { player, ghosts, playerSpawnEdgeId } = buildMapStartSpawns(
    rng,
    ghostCount
  );

  return {
    phase: "playing",
    player,
    ghosts,
    ghostCount,
    pellets,
    overviewStartedAt: null,
    lastSpawnKey: playerSpawnEdgeId,
    initialPelletCount: pellets.length,
    lives: options.startingLives ?? state.lives,
    playerSpeedMps: options.playerSpeedMps ?? state.playerSpeedMps,
    simSubsteps: state.simSubsteps,
    playerSpawn: { ...player },
    invulnerableUntil: null,
    runLog: notePlayerEdge(emptyRunLog(), player.edgeId),
  };
}

export function getEntityPosition(state: GameState, who: "player"): {
  lat: number;
  lon: number;
} | null;
export function getEntityPosition(
  state: GameState,
  who: "ghost",
  index?: number
): { lat: number; lon: number } | null;
export function getEntityPosition(
  state: GameState,
  who: "player" | "ghost",
  index = 0
): { lat: number; lon: number } | null {
  if (who === "player") {
    return getTravelerLatLon(state.player);
  }
  const ghost = state.ghosts[index];
  return ghost ? getTravelerLatLon(ghost) : null;
}

export function positionOnEdge(
  edgeId: string,
  fromNodeId: string,
  distanceM: number
): { lat: number; lon: number } | null {
  const edge = getEdge(edgeId);
  if (!edge) return null;
  const from = getNode(fromNodeId);
  const toId = getOtherNode(edge, fromNodeId);
  const to = getNode(toId);
  if (!from || !to) return null;
  const t = Math.min(1, Math.max(0, distanceM / edge.lengthM));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lon: from.lon + (to.lon - from.lon) * t,
  };
}
