import {
  type Direction,
  type GraphEdge,
  type GraphNode,
  edgeBearing,
  getActiveMapId,
  getEdge,
  getNode,
  getOtherNode,
  getPlayableEdgesFrom,
  getStreetGraph,
  getTravelerFacing,
  assignExitsToDirections,
  bestEdgeForDirection,
  pickEdgeForDirection,
  scoreEdgeForDirection,
} from "@/lib/street-graph";
import { pickGhostTurnEdge } from "@/lib/ghost-ai";
import {
  cornerInputEpsM,
  directionPickMinScore,
  mapUsesFlattenedPlay,
  playerTurnScoreFloor,
} from "@/lib/map-play";
import { edgeScreenUnit, mapDirectionUnit } from "@/lib/projection";

export type Traveler = {
  edgeId: string;
  fromNodeId: string;
  distanceM: number;
  queuedDirection: Direction | null;
  facing: Direction;
};

const NODE_EPS_MAX_M = 2;
/** How close a keypress can be to a corner and still take that turn. */
export const INPUT_NODE_EPS_M = 28;

/** Short blocks use a smaller snap so the whole street is not treated as a corner. */
export function nodeEpsM(lengthM: number): number {
  if (lengthM <= 0) return 0.2;
  return Math.min(NODE_EPS_MAX_M, lengthM / 3, Math.max(0.25, lengthM * 0.15));
}

/** Nearby corner a keypress can turn at — wider than movement snap so arrows are not skipped. */
export function inputNodeForPress(player: Traveler): string | null {
  const edge = getEdge(player.edgeId);
  if (!edge) return null;
  const other = getOtherNode(edge, player.fromNodeId);
  const distStart = player.distanceM;
  const distEnd = Math.max(0, edge.lengthM - player.distanceM);
  const snap = Math.min(
    cornerInputEpsM(getActiveMapId()),
    Math.max(edge.lengthM * 0.48, nodeEpsM(edge.lengthM))
  );
  const startIn = distStart <= snap;
  const endIn = distEnd <= snap;
  if (startIn && endIn) {
    return distStart <= distEnd ? player.fromNodeId : other;
  }
  if (startIn) return player.fromNodeId;
  if (endIn) return other;
  return null;
}

export function travelerAtNode(traveler: Traveler): string | null {
  const edge = getEdge(traveler.edgeId);
  if (!edge) return null;
  const eps = nodeEpsM(edge.lengthM);
  if (traveler.distanceM >= edge.lengthM - eps) {
    return getOtherNode(edge, traveler.fromNodeId);
  }
  if (traveler.distanceM <= eps) {
    return traveler.fromNodeId;
  }
  return null;
}

export function reverseEdgeId(edge: GraphEdge, atNodeId: string): {
  edgeId: string;
  fromNodeId: string;
  distanceM: number;
} {
  const other = getOtherNode(edge, atNodeId);
  return { edgeId: edge.id, fromNodeId: other, distanceM: 0 };
}

function directionMatchScore(from: GraphNode, to: GraphNode, dir: Direction): number {
  const bbox = getStreetGraph().bbox;
  const travel = edgeScreenUnit(from, to, bbox);
  const want = mapDirectionUnit(dir);
  return travel.dx * want.dx + travel.dy * want.dy;
}

/** Apply a map arrow: lock direction until the next press; turn when the street allows. */
export function applyPlayerDirection(player: Traveler, dir: Direction): Traveler {
  const edge = getEdge(player.edgeId);
  if (!edge) return { ...player, queuedDirection: dir };

  const atNodeId = inputNodeForPress(player);
  if (atNodeId) {
    const atStart = atNodeId === player.fromNodeId;
    const picked = pickPlayerNextEdge(
      atNodeId,
      atStart ? "" : player.edgeId,
      dir,
      player.facing
    );
    if (picked) {
      if (picked.id === edge.id && atStart) {
        return {
          ...player,
          queuedDirection: dir,
          facing: getTravelerFacing(atNodeId, edge.id),
        };
      }
      return {
        edgeId: picked.id,
        fromNodeId: atNodeId,
        distanceM: 0,
        queuedDirection: dir,
        facing: getTravelerFacing(atNodeId, picked.id),
      };
    }
  }

  const from = getNode(player.fromNodeId);
  const toId = getOtherNode(edge, player.fromNodeId);
  const to = getNode(toId);
  if (!from || !to) return { ...player, queuedDirection: dir, facing: dir };

  const align = directionMatchScore(from, to, dir);
  if (align > 0.28) {
    return {
      ...player,
      queuedDirection: dir,
      facing: edgeBearing(from, to),
    };
  }
  if (align < -0.28) {
    return {
      edgeId: edge.id,
      fromNodeId: toId,
      distanceM: Math.max(0, edge.lengthM - player.distanceM),
      queuedDirection: dir,
      facing: edgeBearing(to, from),
    };
  }

  return { ...player, queuedDirection: dir };
}

function pickAnyExit(atNodeId: string, avoidEdgeId?: string): GraphEdge | null {
  const exits = getPlayableEdgesFrom(atNodeId).filter((e) => e.id !== avoidEdgeId);
  return exits[0] ?? getPlayableEdgesFrom(atNodeId)[0] ?? null;
}

/** Follow the locked arrow at corners. Never freeze when a playable street exists. */
export function pickPlayerNextEdge(
  atNodeId: string,
  cameFromEdgeId: string,
  queuedDirection: Direction | null,
  facing: Direction
): GraphEdge | null {
  const exits = getPlayableEdgesFrom(atNodeId);
  if (exits.length === 0) return null;
  const forward = cameFromEdgeId
    ? exits.filter((e) => e.id !== cameFromEdgeId)
    : exits;
  const pool = forward.length > 0 ? forward : exits;

  if (forward.length === 1) {
    const only = forward[0]!;
    if (queuedDirection && cameFromEdgeId) {
      const back = getEdge(cameFromEdgeId);
      if (back) {
        const contScore = scoreEdgeForDirection(atNodeId, only, queuedDirection);
        const backScore = scoreEdgeForDirection(atNodeId, back, queuedDirection);
        if (backScore > contScore + 0.25 && backScore > 0.15) return back;
      }
    }
    return only;
  }

  if (queuedDirection) {
    const came = cameFromEdgeId ? getEdge(cameFromEdgeId) : null;
    if (came?.streetName) {
      const sameStreet = exits.filter((e) => e.streetName === came.streetName);
      const bestSame = bestEdgeForDirection(atNodeId, queuedDirection, sameStreet);
      if (bestSame && bestSame.score > 0.55) return bestSame.edge;
    }
  }

  const assigned = assignExitsToDirections(atNodeId, pool);

  if (queuedDirection) {
    if (queuedDirection !== facing && pool.length > 1) {
      const continuation = bestEdgeForDirection(atNodeId, facing, pool);
      const turns = continuation
        ? pool.filter((e) => e.id !== continuation.edge.id)
        : pool;
      const bestTurn = bestEdgeForDirection(atNodeId, queuedDirection, turns);
      const turnCutoff = mapUsesFlattenedPlay(getActiveMapId()) ? -0.08 : 0.05;
      if (bestTurn && bestTurn.score > turnCutoff) return bestTurn.edge;
    }
    const best = bestEdgeForDirection(atNodeId, queuedDirection, pool);
    const forwardCutoff = mapUsesFlattenedPlay(getActiveMapId()) ? -0.15 : 0;
    if (best && best.score > forwardCutoff) return best.edge;
    const byArrow = assigned[queuedDirection];
    if (byArrow) return byArrow;
    const turnFloor = playerTurnScoreFloor(getActiveMapId());
    if (best && best.score > turnFloor) return best.edge;
    const reverse = pickEdgeForDirection(
      atNodeId,
      queuedDirection,
      undefined,
      true
    );
    if (reverse) return reverse;
  }

  const keep = bestEdgeForDirection(atNodeId, facing, pool);
  if (keep && keep.score > 0) return keep.edge;
  const keepAssigned = assigned[facing];
  if (keepAssigned) return keepAssigned;
  const turnFloor = playerTurnScoreFloor(getActiveMapId());
  if (keep && keep.score > turnFloor) return keep.edge;

  return pickAnyExit(atNodeId, cameFromEdgeId || undefined) ?? exits[0]!;
}

const CARDINAL_DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

/** Map arrows that actually leave this corner (for highlighting the direction pad). */
export function directionsOpenAtNode(nodeId: string): Direction[] {
  const exits = getPlayableEdgesFrom(nodeId);
  if (exits.length === 0) return [];
  const minScore = directionPickMinScore(getActiveMapId());
  return CARDINAL_DIRECTIONS.filter((dir) => {
    const best = bestEdgeForDirection(nodeId, dir, exits);
    return best !== null && best.score > minScore;
  });
}

function applyTurn(
  atNodeId: string,
  cameFromEdgeId: string,
  traveler: Traveler,
  isGhost: boolean,
  playerTarget?: Traveler,
  ghostRng?: () => number
): { edgeId: string; fromNodeId: string; facing: Direction } | null {
  let next: GraphEdge | null = null;
  if (isGhost) {
    next = pickGhostTurnEdge(
      atNodeId,
      cameFromEdgeId,
      playerTarget,
      ghostRng ?? Math.random
    );
  } else {
    next = pickPlayerNextEdge(
      atNodeId,
      cameFromEdgeId,
      traveler.queuedDirection,
      traveler.facing
    );
  }

  if (!next) {
    next = pickAnyExit(atNodeId, cameFromEdgeId);
  }
  if (!next) return null;

  return {
    edgeId: next.id,
    fromNodeId: atNodeId,
    facing: getTravelerFacing(atNodeId, next.id),
  };
}

export function advanceTraveler(
  traveler: Traveler,
  speedMps: number,
  deltaSec: number,
  isGhost: boolean,
  playerTarget?: Traveler,
  ghostRng?: () => number
): Traveler {
  let currentEdge = getEdge(traveler.edgeId);
  if (!currentEdge) return traveler;

  let distanceM = traveler.distanceM;
  let edgeId = traveler.edgeId;
  let fromNodeId = traveler.fromNodeId;
  let queuedDirection = traveler.queuedDirection;
  let facing = traveler.facing;

  distanceM += speedMps * deltaSec;

  let cornerSteps = 0;
  const maxCornerSteps = 64;

  while (
    currentEdge &&
    distanceM >= currentEdge.lengthM - nodeEpsM(currentEdge.lengthM)
  ) {
    cornerSteps += 1;
    if (cornerSteps > maxCornerSteps) {
      distanceM = Math.max(
        0,
        currentEdge.lengthM - nodeEpsM(currentEdge.lengthM)
      );
      break;
    }

    const overflow = Math.max(0, distanceM - currentEdge.lengthM);
    const atNode = getOtherNode(currentEdge, fromNodeId);
    const snapshot: Traveler = {
      edgeId,
      fromNodeId,
      distanceM,
      queuedDirection,
      facing,
    };
    const turn = applyTurn(
      atNode,
      edgeId,
      snapshot,
      isGhost,
      playerTarget,
      ghostRng
    );

    if (!turn) {
      const forced = pickAnyExit(atNode, edgeId);
      if (!forced) {
        distanceM = Math.max(0, currentEdge.lengthM - nodeEpsM(currentEdge.lengthM));
        break;
      }
      fromNodeId = atNode;
      edgeId = forced.id;
      facing = getTravelerFacing(atNode, forced.id);
      distanceM = overflow;
      currentEdge = getEdge(edgeId);
      continue;
    }

    fromNodeId = turn.fromNodeId;
    edgeId = turn.edgeId;
    facing = turn.facing;
    distanceM = overflow;
    currentEdge = getEdge(edgeId);
    if (!currentEdge) break;
  }

  if (currentEdge && distanceM >= currentEdge.lengthM) {
    distanceM = Math.max(
      0,
      currentEdge.lengthM - nodeEpsM(currentEdge.lengthM) * 0.5
    );
  }

  if (!facing) {
    facing = getTravelerFacing(fromNodeId, edgeId);
  }

  return { edgeId, fromNodeId, distanceM, queuedDirection, facing };
}

export function lerpLatLon(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
  t: number
): { lat: number; lon: number } {
  const clamp = Math.min(1, Math.max(0, t));
  return {
    lat: a.lat + (b.lat - a.lat) * clamp,
    lon: a.lon + (b.lon - a.lon) * clamp,
  };
}

export function getTravelerLatLon(traveler: Traveler): { lat: number; lon: number } | null {
  const edge = getEdge(traveler.edgeId);
  if (!edge) return null;
  const from = getNode(traveler.fromNodeId);
  const toId = getOtherNode(edge, traveler.fromNodeId);
  const to = getNode(toId);
  if (!from || !to) return null;
  const t = Math.min(1, Math.max(0, traveler.distanceM / edge.lengthM));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lon: from.lon + (to.lon - from.lon) * t,
  };
}

export function latLonDistanceM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return distanceM(lat1, lon1, lat2, lon2);
}

function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const h =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/** Match on-screen sprite overlap (~22 SVG units ≈ 32 m on focus maps). */
export const COLLISION_THRESHOLD_M = 32;

/** Distance along one edge, even when the two travelers entered from opposite ends. */
export function distanceAlongSameEdge(
  a: Traveler,
  b: Traveler,
  edge: GraphEdge
): number {
  const posA = a.fromNodeId === edge.from ? a.distanceM : edge.lengthM - a.distanceM;
  const posB = b.fromNodeId === edge.from ? b.distanceM : edge.lengthM - b.distanceM;
  return Math.abs(posA - posB);
}

export function travelersCollide(
  a: Traveler,
  b: Traveler,
  thresholdM = COLLISION_THRESHOLD_M
): boolean {
  const aPos = getTravelerLatLon(a);
  const bPos = getTravelerLatLon(b);

  if (a.edgeId === b.edgeId) {
    const edge = getEdge(a.edgeId);
    if (edge && distanceAlongSameEdge(a, b, edge) <= thresholdM) return true;
    const aNode = travelerAtNode(a);
    const bNode = travelerAtNode(b);
    return !!(aNode && bNode && aNode === bNode);
  }

  if (!aPos || !bPos) {
    const aNode = travelerAtNode(a);
    const bNode = travelerAtNode(b);
    return !!(aNode && bNode && aNode === bNode);
  }

  const dist = distanceM(aPos.lat, aPos.lon, bPos.lat, bPos.lon);
  if (dist > thresholdM) return false;

  const edgeA = getEdge(a.edgeId);
  const edgeB = getEdge(b.edgeId);
  if (!edgeA || !edgeB) return false;

  const aNode = travelerAtNode(a);
  const bNode = travelerAtNode(b);
  if (aNode && bNode && aNode === bNode) return true;

  const shares =
    edgeA.from === edgeB.from ||
    edgeA.from === edgeB.to ||
    edgeA.to === edgeB.from ||
    edgeA.to === edgeB.to;
  return shares;
}

export function keyToDirection(key: string): Direction | null {
  switch (key) {
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    default:
      return null;
  }
}

/** Random street when a ghost is not hunting. */
export function pickGhostNextEdge(
  atNodeId: string,
  cameFromEdgeId: string,
  rng: () => number = Math.random
): GraphEdge | null {
  return pickGhostTurnEdge(atNodeId, cameFromEdgeId, undefined, rng);
}
