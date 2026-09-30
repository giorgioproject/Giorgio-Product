import {
  getNode,
  getOtherNode,
  getPlayableEdgesFrom,
  getTravelerFacing,
  pickRandomSpawn,
  type GraphEdge,
} from "@/lib/street-graph";
import { getTravelerLatLon, type Traveler } from "@/lib/movement";

function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

/** Chance a ghost hunts at a corner. Otherwise it wanders a random street. */
export const GHOST_CHASE_CHANCE = 0.5;

/** Random forward street — ghosts use this when they are not hunting. */
export function pickGhostWanderEdge(
  atNodeId: string,
  cameFromEdgeId: string,
  rng: () => number = Math.random
): GraphEdge | null {
  const exits = getPlayableEdgesFrom(atNodeId);
  const forward = exits.filter((e) => e.id !== cameFromEdgeId);
  const choices = forward.length > 0 ? forward : exits;
  if (choices.length === 0) return null;
  return choices[Math.floor(rng() * choices.length)]!;
}

/** At each corner: hunt toward the player, or wander. */
export function pickGhostTurnEdge(
  atNodeId: string,
  cameFromEdgeId: string,
  player: Traveler | undefined,
  rng: () => number = Math.random
): GraphEdge | null {
  if (player && rng() < GHOST_CHASE_CHANCE) {
    return (
      pickGhostChaseEdge(atNodeId, cameFromEdgeId, player) ??
      pickGhostWanderEdge(atNodeId, cameFromEdgeId, rng)
    );
  }
  return pickGhostWanderEdge(atNodeId, cameFromEdgeId, rng);
}

/** Greedy chase: at each corner pick the exit that gets closest to the player. */
export function pickGhostChaseEdge(
  atNodeId: string,
  cameFromEdgeId: string,
  player: Traveler
): GraphEdge | null {
  const playerPos = getTravelerLatLon(player);
  if (!playerPos) return null;

  const forward = getPlayableEdgesFrom(atNodeId).filter(
    (e) => !cameFromEdgeId || e.id !== cameFromEdgeId
  );
  const choices = forward.length > 0 ? forward : getPlayableEdgesFrom(atNodeId);
  if (choices.length === 0) return null;

  let best: GraphEdge | null = null;
  let bestDist = Infinity;

  for (const edge of choices) {
    const otherId = getOtherNode(edge, atNodeId);
    const other = getNode(otherId);
    if (!other) continue;
    const d = distanceM(other.lat, other.lon, playerPos.lat, playerPos.lon);
    if (d < bestDist) {
      bestDist = d;
      best = edge;
    }
  }

  return best;
}

const DEFAULT_CHASE_SPAWN_MAX_M = 750;

/** Spawn on a node and first exit that moves toward the player (Downtown chase from second one). */
export function spawnGhostChasingPlayer(
  player: Traveler,
  rng: () => number = Math.random,
  maxDistanceM = DEFAULT_CHASE_SPAWN_MAX_M
): Traveler {
  const playerPos = getTravelerLatLon(player);
  if (!playerPos) {
    const fallback = pickRandomSpawn(rng);
    return {
      ...fallback,
      queuedDirection: null,
      facing: getTravelerFacing(fallback.fromNodeId, fallback.edgeId),
    };
  }

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const spawn = pickRandomSpawn(rng);
    const ghostProbe: Traveler = {
      ...spawn,
      queuedDirection: null,
      facing: getTravelerFacing(spawn.fromNodeId, spawn.edgeId),
    };
    const ghostPos = getTravelerLatLon(ghostProbe);
    if (!ghostPos) continue;
    if (distanceM(ghostPos.lat, ghostPos.lon, playerPos.lat, playerPos.lon) > maxDistanceM) {
      continue;
    }

    const atNodeId = spawn.fromNodeId;
    const chaseEdge =
      pickGhostChaseEdge(atNodeId, spawn.edgeId, player) ??
      pickGhostChaseEdge(atNodeId, "", player);

    if (!chaseEdge) continue;

    return {
      edgeId: chaseEdge.id,
      fromNodeId: atNodeId,
      distanceM: 0,
      queuedDirection: null,
      facing: getTravelerFacing(atNodeId, chaseEdge.id),
    };
  }

  const fallback = pickRandomSpawn(rng);
  const nodeId = fallback.fromNodeId;
  const chaseEdge =
    pickGhostChaseEdge(nodeId, fallback.edgeId, player) ??
    pickGhostChaseEdge(nodeId, "", player);
  if (chaseEdge) {
    return {
      edgeId: chaseEdge.id,
      fromNodeId: nodeId,
      distanceM: 0,
      queuedDirection: null,
      facing: getTravelerFacing(nodeId, chaseEdge.id),
    };
  }

  return {
    ...fallback,
    queuedDirection: null,
    facing: getTravelerFacing(fallback.fromNodeId, fallback.edgeId),
  };
}
