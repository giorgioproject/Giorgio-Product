import { flattenGraphForCardinalPlay } from "@/lib/flatten-graph";
import { directionPickMinScore } from "@/lib/map-play";
import { getGraphDataForMap, DEFAULT_MAP_ID, type MapId } from "@/lib/maps";
import { edgeScreenUnit, mapDirectionUnit } from "@/lib/projection";

export type Direction = "up" | "down" | "left" | "right";

export function oppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

export type GraphNode = {
  id: string;
  lat: number;
  lon: number;
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  streetName: string;
  highway: string;
  playable: boolean;
  lengthM: number;
};

export type GraphBbox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type StreetGraphData = {
  bbox: GraphBbox;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type LandmarkKind =
  | "restaurant"
  | "building"
  | "monument"
  | "shop"
  | "theater"
  | "museum"
  | "park"
  | "beach"
  | "windmill";

export type Landmark = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  blurb: string;
  kind: LandmarkKind;
  /** Photo shown in the pause card (`public/landmarks/`). */
  imageUrl: string;
};

/** OSM often leaves two nodes a meter apart on the same street — stitch them. */
export const STITCH_NODE_M = 4;

function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const r = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const h =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function playableDegree(nodeId: string, data: StreetGraphData): number {
  return data.edges.filter(
    (e) => e.playable && (e.from === nodeId || e.to === nodeId)
  ).length;
}

/** Join nodes that sit on top of each other so a named street stays one path. */
export function stitchNearbyNodes(
  data: StreetGraphData,
  maxDistM = STITCH_NODE_M
): StreetGraphData {
  const parent = new Map<string, string>();
  for (const node of data.nodes) parent.set(node.id, node.id);

  const find = (id: string): string => {
    let cur = parent.get(id) ?? id;
    while (cur !== (parent.get(cur) ?? cur)) {
      const next = parent.get(cur) ?? cur;
      parent.set(cur, parent.get(next) ?? next);
      cur = next;
    }
    return cur;
  };
  const union = (a: string, b: string) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent.set(pa, pb);
  };

  for (let i = 0; i < data.nodes.length; i += 1) {
    const a = data.nodes[i]!;
    for (let j = i + 1; j < data.nodes.length; j += 1) {
      const b = data.nodes[j]!;
      if (haversineM(a.lat, a.lon, b.lat, b.lon) <= maxDistM) {
        union(a.id, b.id);
      }
    }
  }

  const groups = new Map<string, string[]>();
  for (const node of data.nodes) {
    const root = find(node.id);
    const list = groups.get(root) ?? [];
    list.push(node.id);
    groups.set(root, list);
  }

  const remap = new Map<string, string>();
  const keep = new Set<string>();
  for (const members of groups.values()) {
    let best = members[0]!;
    let bestDeg = playableDegree(best, data);
    for (const id of members) {
      const deg = playableDegree(id, data);
      if (deg > bestDeg || (deg === bestDeg && id < best)) {
        best = id;
        bestDeg = deg;
      }
    }
    keep.add(best);
    for (const id of members) remap.set(id, best);
  }

  const nodes = data.nodes.filter((n) => keep.has(n.id));
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const edge of data.edges) {
    const from = remap.get(edge.from) ?? edge.from;
    const to = remap.get(edge.to) ?? edge.to;
    if (from === to) continue;
    const pairKey = [from, to].sort().join("|") + "|" + edge.streetName;
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);
    const a = data.nodes.find((n) => n.id === from);
    const b = data.nodes.find((n) => n.id === to);
    const lengthM =
      a && b ? Math.max(edge.lengthM, haversineM(a.lat, a.lon, b.lat, b.lon)) : edge.lengthM;
    edges.push({ ...edge, from, to, lengthM });
  }

  return { bbox: data.bbox, nodes, edges };
}

const stitchedByMap = new Map<MapId, StreetGraphData>();

function rawGraphForPlay(mapId: MapId): StreetGraphData {
  const raw = getGraphDataForMap(mapId);
  if (mapId === "downtown-santa-barbara") {
    return flattenGraphForCardinalPlay(raw);
  }
  return raw;
}

function graphForMap(mapId: MapId): StreetGraphData {
  const cached = stitchedByMap.get(mapId);
  if (cached) return cached;
  const stitched = stitchNearbyNodes(rawGraphForPlay(mapId));
  stitchedByMap.set(mapId, stitched);
  return stitched;
}

let activeMapId: MapId = DEFAULT_MAP_ID;
let activeData: StreetGraphData = graphForMap(DEFAULT_MAP_ID);

const nodeMap = new Map<string, GraphNode>();
const edgeMap = new Map<string, GraphEdge>();
const adjacency = new Map<string, GraphEdge[]>();
const deadEndSpurEdges = new Set<string>();

function computeDeadEndSpurEdges(data: StreetGraphData): Set<string> {
  const spur = new Set<string>();
  const playableNodes = data.nodes.filter(
    (n) => getPlayableEdgesFromNode(n.id, data).length > 0
  );

  for (const terminal of playableNodes) {
    if (getPlayableEdgesFromNode(terminal.id, data).length !== 1) continue;

    let nodeId = terminal.id;
    let incomingEdgeId: string | undefined;

    while (true) {
      const exits = getPlayableEdgesFromNode(nodeId, data);
      const nextEdge =
        exits.length === 1
          ? exits[0]
          : exits.find((e) => e.id !== incomingEdgeId);
      if (!nextEdge) break;

      spur.add(nextEdge.id);
      const otherId = nextEdge.from === nodeId ? nextEdge.to : nextEdge.from;
      const otherDegree = getPlayableEdgesFromNode(otherId, data).length;

      if (otherDegree >= 3) break;

      incomingEdgeId = nextEdge.id;
      nodeId = otherId;
    }
  }

  return spur;
}

function getPlayableEdgesFromNode(nodeId: string, graphData: StreetGraphData) {
  return graphData.edges.filter(
    (e) => e.playable && (e.from === nodeId || e.to === nodeId)
  );
}

function buildIndexes(data: StreetGraphData) {
  nodeMap.clear();
  edgeMap.clear();
  adjacency.clear();
  deadEndSpurEdges.clear();
  for (const n of data.nodes) nodeMap.set(n.id, n);
  for (const e of data.edges) {
    edgeMap.set(e.id, e);
    for (const nodeId of [e.from, e.to]) {
      const list = adjacency.get(nodeId) ?? [];
      list.push(e);
      adjacency.set(nodeId, list);
    }
  }
  for (const id of computeDeadEndSpurEdges(data)) {
    deadEndSpurEdges.add(id);
  }
}

buildIndexes(activeData);

export function setActiveMap(mapId: MapId): void {
  activeMapId = mapId;
  activeData = graphForMap(mapId);
  buildIndexes(activeData);
}

export function getActiveMapId(): MapId {
  return activeMapId;
}

export function getStreetGraph(): StreetGraphData {
  return activeData;
}

export function getNode(id: string): GraphNode | undefined {
  return nodeMap.get(id);
}

export function getEdge(id: string): GraphEdge | undefined {
  return edgeMap.get(id);
}

export function getPlayableEdgesFrom(nodeId: string): GraphEdge[] {
  return (adjacency.get(nodeId) ?? []).filter((e) => e.playable);
}

/** Single edge touching a terminal node (degree 1). */
export function isDeadEndEdge(edgeId: string): boolean {
  const edge = getEdge(edgeId);
  if (!edge?.playable) return true;
  const fromExits = getPlayableEdgesFrom(edge.from).length;
  const toExits = getPlayableEdgesFrom(edge.to).length;
  return fromExits <= 1 || toExits <= 1;
}

/** Whole cul-de-sac / end-road spur — no pellets on these segments. */
export function isDeadEndSpurEdge(edgeId: string): boolean {
  return deadEndSpurEdges.has(edgeId);
}

export function getOtherNode(edge: GraphEdge, nodeId: string): string {
  return edge.from === nodeId ? edge.to : edge.from;
}

/** Closest map arrow for how an edge looks on screen (up = top of map). */
export function edgeBearing(from: GraphNode, to: GraphNode): Direction {
  const bbox = getStreetGraph().bbox;
  const { dx, dy } = edgeScreenUnit(from, to, bbox);
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy < 0 ? "up" : "down";
}

/** @deprecated use mapDirectionUnit from projection */
export function directionToBearing(dir: Direction): { dx: number; dy: number } {
  return mapDirectionUnit(dir);
}

/** How well a street leaving `nodeId` matches a map arrow (−1…1). */
export function scoreEdgeForDirection(
  nodeId: string,
  edge: GraphEdge,
  direction: Direction
): number {
  const node = getNode(nodeId);
  const other = getNode(getOtherNode(edge, nodeId));
  if (!node || !other) return Number.NEGATIVE_INFINITY;
  const vec = edgeScreenUnit(node, other, getStreetGraph().bbox);
  const target = mapDirectionUnit(direction);
  return vec.dx * target.dx + vec.dy * target.dy;
}

const CARDINAL_DIRS: Direction[] = ["up", "down", "left", "right"];

/** Give each leaving street its own arrow so diagonal roads stay enterable. */
export function assignExitsToDirections(
  nodeId: string,
  edges: GraphEdge[]
): Partial<Record<Direction, GraphEdge>> {
  const ranked = edges
    .map((edge) => {
      const scores = {} as Record<Direction, number>;
      let best = Number.NEGATIVE_INFINITY;
      for (const dir of CARDINAL_DIRS) {
        const score = scoreEdgeForDirection(nodeId, edge, dir);
        scores[dir] = score;
        if (score > best) best = score;
      }
      return { edge, scores, best };
    })
    .sort((a, b) => b.best - a.best);

  const claimed: Partial<Record<Direction, GraphEdge>> = {};
  for (const item of ranked) {
    const prefs = CARDINAL_DIRS.slice().sort(
      (a, b) => item.scores[b] - item.scores[a]
    );
    for (const dir of prefs) {
      if (!claimed[dir]) {
        claimed[dir] = item.edge;
        break;
      }
    }
  }
  return claimed;
}

export function bestEdgeForDirection(
  nodeId: string,
  direction: Direction,
  edges: GraphEdge[]
): { edge: GraphEdge; score: number } | null {
  let best: GraphEdge | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const edge of edges) {
    const score = scoreEdgeForDirection(nodeId, edge, direction);
    if (score > bestScore) {
      bestScore = score;
      best = edge;
    }
  }
  return best ? { edge: best, score: bestScore } : null;
}

export function pickEdgeForDirection(
  nodeId: string,
  direction: Direction,
  excludeEdgeId?: string,
  allowReverse = false
): GraphEdge | null {
  let exits = getPlayableEdgesFrom(nodeId);
  if (!allowReverse && excludeEdgeId) {
    exits = exits.filter((e) => e.id !== excludeEdgeId);
  }
  if (exits.length === 0) {
    if (excludeEdgeId && !allowReverse) {
      return pickEdgeForDirection(nodeId, direction, undefined, true);
    }
    return null;
  }

  const best = bestEdgeForDirection(nodeId, direction, exits);
  const minScore = directionPickMinScore(getActiveMapId());
  if (best && best.score > minScore) return best.edge;

  if (excludeEdgeId && !allowReverse) {
    return pickEdgeForDirection(nodeId, direction, undefined, true);
  }

  return null;
}

export function getTravelerFacing(
  fromNodeId: string,
  edgeId: string
): Direction {
  const edge = getEdge(edgeId);
  const from = getNode(fromNodeId);
  if (!edge || !from) return "right";
  const to = getNode(getOtherNode(edge, fromNodeId));
  if (!to) return "right";
  return edgeBearing(from, to);
}

export type StreetLabel = {
  name: string;
  lat: number;
  lon: number;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  lengthM: number;
};

/** Keep painted names right-side-up along a street. */
export function readableStreetLabelAngle(dx: number, dy: number): number {
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg > 90 || deg < -90) deg += 180;
  return deg;
}

export function isFeaturedStreetName(name: string): boolean {
  return name.trim().toLowerCase() === "state street";
}

/** Shift a sign off the pavement, preferring the upward side of the screen. */
export function streetLabelNudge(
  dx: number,
  dy: number,
  distance: number
): { x: number; y: number } {
  let nx = -dy;
  let ny = dx;
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: nx * distance, y: ny * distance };
}

/** One sign per street, on that street’s longest playable stretch. */
export function getStreetLabels(): StreetLabel[] {
  const best = new Map<string, GraphEdge>();
  for (const edge of activeData.edges) {
    if (!edge.playable || !edge.streetName) continue;
    const current = best.get(edge.streetName);
    if (!current || edge.lengthM > current.lengthM) {
      best.set(edge.streetName, edge);
    }
  }

  const labels: StreetLabel[] = [];
  for (const edge of best.values()) {
    const a = getNode(edge.from);
    const b = getNode(edge.to);
    if (!a || !b) continue;
    labels.push({
      name: edge.streetName,
      lat: (a.lat + b.lat) / 2,
      lon: (a.lon + b.lon) / 2,
      fromLat: a.lat,
      fromLon: a.lon,
      toLat: b.lat,
      toLon: b.lon,
      lengthM: edge.lengthM,
    });
  }

  return labels.sort((left, right) => {
    const leftFeatured = isFeaturedStreetName(left.name) ? 1 : 0;
    const rightFeatured = isFeaturedStreetName(right.name) ? 1 : 0;
    if (leftFeatured !== rightFeatured) return rightFeatured - leftFeatured;
    return right.lengthM - left.lengthM;
  });
}

export function pickRandomSpawn(rng: () => number = Math.random): {
  edgeId: string;
  fromNodeId: string;
  distanceM: number;
} {
  const playable = activeData.edges.filter((e) => e.playable);
  const edge = playable[Math.floor(rng() * playable.length)]!;
  return {
    edgeId: edge.id,
    fromNodeId: edge.from,
    distanceM: edge.lengthM * 0.5,
  };
}
