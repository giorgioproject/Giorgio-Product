import type { GraphBbox, GraphNode, StreetGraphData } from "@/lib/street-graph";

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

export function bboxCenter(bbox: GraphBbox): { lat: number; lon: number } {
  return {
    lat: (bbox.south + bbox.north) / 2,
    lon: (bbox.west + bbox.east) / 2,
  };
}

export function rotateLatLonAboutCenter(
  lat: number,
  lon: number,
  center: { lat: number; lon: number },
  rotationDeg: number
): { lat: number; lon: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const x = lon - center.lon;
  const y = lat - center.lat;
  return {
    lon: center.lon + x * cos - y * sin,
    lat: center.lat + x * sin + y * cos,
  };
}

function isCardinalScreenEdge(
  from: GraphNode,
  to: GraphNode,
  bbox: GraphBbox
): boolean {
  const mapW = bbox.east - bbox.west || 1;
  const mapH = bbox.north - bbox.south || 1;
  const dx = (to.lon - from.lon) / mapW;
  const dy = (-(to.lat - from.lat)) / mapH;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  return ax > ay * 2 || ay > ax * 2;
}

export function cardinalPlayableEdgeRatio(data: StreetGraphData): number {
  const nodes = new Map(data.nodes.map((n) => [n.id, n]));
  let cardinal = 0;
  let total = 0;
  for (const edge of data.edges) {
    if (!edge.playable) continue;
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) continue;
    total += 1;
    if (isCardinalScreenEdge(from, to, data.bbox)) cardinal += 1;
  }
  return total === 0 ? 0 : cardinal / total;
}

export function findBestCardinalRotationDeg(
  data: StreetGraphData,
  minDeg = -45,
  maxDeg = 45
): number {
  let bestDeg = 0;
  let bestRatio = cardinalPlayableEdgeRatio(data);
  const center = bboxCenter(data.bbox);

  for (let deg = minDeg; deg <= maxDeg; deg += 1) {
    const rotated = rotateStreetGraph(data, deg, center);
    const ratio = cardinalPlayableEdgeRatio(rotated);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestDeg = deg;
    }
  }
  return bestDeg;
}

export function rotateStreetGraph(
  data: StreetGraphData,
  rotationDeg: number,
  center = bboxCenter(data.bbox)
): StreetGraphData {
  const nodes: GraphNode[] = data.nodes.map((node) => {
    const next = rotateLatLonAboutCenter(node.lat, node.lon, center, rotationDeg);
    return { id: node.id, lat: next.lat, lon: next.lon };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;
  for (const node of nodes) {
    south = Math.min(south, node.lat);
    north = Math.max(north, node.lat);
    west = Math.min(west, node.lon);
    east = Math.max(east, node.lon);
  }

  const bbox: GraphBbox = { south, west, north, east };
  const edges = data.edges.map((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) return edge;
    return {
      ...edge,
      lengthM: haversineM(from.lat, from.lon, to.lat, to.lon),
    };
  });

  return { bbox, nodes, edges };
}

/** Extra south in the bbox so the Pacific can sit below every street. */
export const DOWNTOWN_OCEAN_SOUTH_PAD_RATIO = 0.16;

export function padBboxSouth(bbox: GraphBbox, ratio: number): GraphBbox {
  if (ratio <= 0) return bbox;
  const span = bbox.north - bbox.south;
  return { ...bbox, south: bbox.south - span * ratio };
}

export function flattenGraphForCardinalPlay(data: StreetGraphData): StreetGraphData {
  const rotationDeg = findBestCardinalRotationDeg(data);
  const center = bboxCenter(data.bbox);
  const rotated = rotateStreetGraph(data, rotationDeg, center);
  return {
    ...rotated,
    bbox: padBboxSouth(rotated.bbox, DOWNTOWN_OCEAN_SOUTH_PAD_RATIO),
  };
}
