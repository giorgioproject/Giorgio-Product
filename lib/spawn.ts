import {
  getTravelerLatLon,
  latLonDistanceM,
  type Traveler,
} from "@/lib/movement";
import {
  getStreetGraph,
  getTravelerFacing,
  pickRandomSpawn,
  type GraphEdge,
} from "@/lib/street-graph";

export type MapCorner = "southwest" | "northeast";

/** Ghosts stay at least this fraction of map diagonal from Pac-Man at start / respawn. */
export const MIN_GHOST_PLAYER_SEPARATION_RATIO = 0.32;

function makeTraveler(
  edgeId: string,
  fromNodeId: string,
  distanceM: number
): Traveler {
  const facing = getTravelerFacing(fromNodeId, edgeId);
  return {
    edgeId,
    fromNodeId,
    distanceM,
    queuedDirection: facing,
    facing,
  };
}

function cornerTarget(corner: MapCorner): { lat: number; lon: number } {
  const bbox = getStreetGraph().bbox;
  if (corner === "southwest") {
    return { lat: bbox.south, lon: bbox.west };
  }
  return { lat: bbox.north, lon: bbox.east };
}

function spawnSamplesForEdge(edge: GraphEdge): Array<{
  edgeId: string;
  fromNodeId: string;
  distanceM: number;
}> {
  return [
    { edgeId: edge.id, fromNodeId: edge.from, distanceM: 0 },
    {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: Math.max(0, edge.lengthM * 0.5),
    },
    {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: Math.max(0, edge.lengthM - 2),
    },
    { edgeId: edge.id, fromNodeId: edge.to, distanceM: 0 },
    {
      edgeId: edge.id,
      fromNodeId: edge.to,
      distanceM: Math.max(0, edge.lengthM * 0.5),
    },
  ];
}

/** Playable spawn closest to a map corner (SW vs NE diagonal). */
export function pickSpawnAtMapCorner(
  corner: MapCorner,
  rng: () => number = Math.random
): { edgeId: string; fromNodeId: string; distanceM: number } {
  const target = cornerTarget(corner);
  let playable = getStreetGraph().edges.filter((e) => e.playable);
  if (playable.length > 100) {
    const sample: GraphEdge[] = [];
    for (let i = 0; i < 100; i += 1) {
      sample.push(playable[Math.floor(rng() * playable.length)]!);
    }
    playable = sample;
  }

  type Scored = {
    edgeId: string;
    fromNodeId: string;
    distanceM: number;
    score: number;
  };

  const scored: Scored[] = [];
  for (const edge of playable) {
    for (const sample of spawnSamplesForEdge(edge)) {
      const probe = makeTraveler(
        sample.edgeId,
        sample.fromNodeId,
        sample.distanceM
      );
      const pos = getTravelerLatLon(probe);
      if (!pos) continue;
      scored.push({
        ...sample,
        score: latLonDistanceM(pos.lat, pos.lon, target.lat, target.lon),
      });
    }
  }

  if (scored.length === 0) {
    return pickRandomSpawn(rng);
  }

  scored.sort((a, b) => a.score - b.score);
  const poolSize = Math.min(12, scored.length);
  const pick = scored[Math.floor(rng() * poolSize)]!;
  return {
    edgeId: pick.edgeId,
    fromNodeId: pick.fromNodeId,
    distanceM: pick.distanceM,
  };
}

function oppositeCorner(corner: MapCorner): MapCorner {
  return corner === "southwest" ? "northeast" : "southwest";
}

function isFarEnoughFrom(
  ghost: Traveler,
  playerPos: { lat: number; lon: number },
  others: Traveler[],
  minFromPlayerM: number,
  minFromGhostM: number
): boolean {
  const gPos = getTravelerLatLon(ghost);
  if (!gPos) return false;
  if (
    latLonDistanceM(gPos.lat, gPos.lon, playerPos.lat, playerPos.lon) <
    minFromPlayerM
  ) {
    return false;
  }
  for (const other of others) {
    const oPos = getTravelerLatLon(other);
    if (!oPos) continue;
    if (
      latLonDistanceM(gPos.lat, gPos.lon, oPos.lat, oPos.lon) < minFromGhostM
    ) {
      return false;
    }
  }
  return true;
}

function pickGhostSpawnFarFromPlayer(
  player: Traveler,
  playerPos: { lat: number; lon: number },
  existing: Traveler[],
  rng: () => number,
  minFromPlayerM: number,
  ghostIndex: number
): Traveler {
  const localRng = () => (rng() + ghostIndex * 0.173) % 1;
  const corners: MapCorner[] = ["southwest", "northeast"];
  const playerCornerGuess =
    latLonDistanceM(
      playerPos.lat,
      playerPos.lon,
      cornerTarget("southwest").lat,
      cornerTarget("southwest").lon
    ) <
    latLonDistanceM(
      playerPos.lat,
      playerPos.lon,
      cornerTarget("northeast").lat,
      cornerTarget("northeast").lon
    )
      ? "southwest"
      : "northeast";

  const preferredCorners: MapCorner[] = [
    oppositeCorner(playerCornerGuess),
    corners[ghostIndex % 2]!,
  ];

  for (const corner of preferredCorners) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const pick = pickSpawnAtMapCorner(corner, localRng);
      const ghost = makeTraveler(pick.edgeId, pick.fromNodeId, pick.distanceM);
      if (
        isFarEnoughFrom(
          ghost,
          playerPos,
          existing,
          Math.min(minFromPlayerM, 350),
          60
        )
      ) {
        return ghost;
      }
    }
  }

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const pick = pickRandomSpawn(localRng);
    const ghost = makeTraveler(pick.edgeId, pick.fromNodeId, pick.distanceM);
    if (
      isFarEnoughFrom(ghost, playerPos, existing, Math.min(minFromPlayerM, 350), 40)
    ) {
      return ghost;
    }
  }

  let bestGhost: Traveler | null = null;
  let bestDist = -1;
  const playable = getStreetGraph().edges.filter((e) => e.playable);
  const sampleEdges =
    playable.length > 120
      ? Array.from({ length: 120 }, () => playable[Math.floor(localRng() * playable.length)]!)
      : playable;
  for (const edge of sampleEdges) {
    for (const sample of spawnSamplesForEdge(edge)) {
      const ghost = makeTraveler(
        sample.edgeId,
        sample.fromNodeId,
        sample.distanceM
      );
      if (
        !isFarEnoughFrom(
          ghost,
          playerPos,
          existing,
          Math.min(minFromPlayerM, 350),
          40
        )
      ) {
        continue;
      }
      const gPos = getTravelerLatLon(ghost);
      if (!gPos) continue;
      const d = latLonDistanceM(
        gPos.lat,
        gPos.lon,
        playerPos.lat,
        playerPos.lon
      );
      if (d > bestDist) {
        bestDist = d;
        bestGhost = ghost;
      }
    }
  }
  if (bestGhost) return bestGhost;

  const fallback = pickSpawnAtMapCorner(
    oppositeCorner(playerCornerGuess),
    () => (localRng() + 0.41) % 1
  );
  return makeTraveler(
    fallback.edgeId,
    fallback.fromNodeId,
    fallback.distanceM
  );
}

/** Player on one corner; ghosts spread on the map, not near Pac-Man. */
export function buildMapStartSpawns(
  rng: () => number = Math.random,
  ghostCount: number
): {
  player: Traveler;
  ghosts: Traveler[];
  playerSpawnEdgeId: string;
} {
  const playerCorner: MapCorner = rng() < 0.5 ? "southwest" : "northeast";
  const playerPick = pickSpawnAtMapCorner(playerCorner, rng);
  const player = makeTraveler(
    playerPick.edgeId,
    playerPick.fromNodeId,
    playerPick.distanceM
  );
  const playerPos = getTravelerLatLon(player);
  const minFromPlayerM =
    mapDiagonalM() * MIN_GHOST_PLAYER_SEPARATION_RATIO;

  const ghosts: Traveler[] = [];
  if (playerPos) {
    for (let i = 0; i < ghostCount; i += 1) {
      ghosts.push(
        pickGhostSpawnFarFromPlayer(
          player,
          playerPos,
          ghosts,
          rng,
          minFromPlayerM,
          i
        )
      );
    }
  }

  return { player, ghosts, playerSpawnEdgeId: playerPick.edgeId };
}

/** @deprecated use buildMapStartSpawns */
export function buildOpposingCornerSpawns(
  rng: () => number = Math.random,
  _chaseGhost = false
): {
  player: Traveler;
  ghost: Traveler;
  playerSpawnEdgeId: string;
} {
  const { player, ghosts, playerSpawnEdgeId } = buildMapStartSpawns(rng, 1);
  return {
    player,
    ghost:
      ghosts[0] ??
      (() => {
        const pick = pickRandomSpawn(rng);
        return makeTraveler(pick.edgeId, pick.fromNodeId, pick.distanceM);
      })(),
    playerSpawnEdgeId,
  };
}

export function respawnGhostsSpread(
  player: Traveler,
  ghostCount: number,
  rng: () => number = Math.random
): Traveler[] {
  const playerPos = getTravelerLatLon(player);
  if (!playerPos) {
    return Array.from({ length: ghostCount }, () => {
      const pick = pickRandomSpawn(rng);
      return makeTraveler(pick.edgeId, pick.fromNodeId, pick.distanceM);
    });
  }
  const minFromPlayerM =
    mapDiagonalM() * MIN_GHOST_PLAYER_SEPARATION_RATIO;
  const ghosts: Traveler[] = [];
  for (let i = 0; i < ghostCount; i += 1) {
    ghosts.push(
      pickGhostSpawnFarFromPlayer(
        player,
        playerPos,
        ghosts,
        rng,
        minFromPlayerM,
        i
      )
    );
  }
  return ghosts;
}

export function spawnSeparationM(player: Traveler, ghost: Traveler): number {
  const p = getTravelerLatLon(player);
  const g = getTravelerLatLon(ghost);
  if (!p || !g) return Infinity;
  return latLonDistanceM(p.lat, p.lon, g.lat, g.lon);
}

export function mapDiagonalM(): number {
  const bbox = getStreetGraph().bbox;
  return latLonDistanceM(bbox.south, bbox.west, bbox.north, bbox.east);
}
