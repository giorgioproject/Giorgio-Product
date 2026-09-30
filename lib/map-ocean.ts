import type { MapId } from "@/lib/maps";
import { mapHasOceanLayer } from "@/lib/maps";
import type { GraphBbox, StreetGraphData } from "@/lib/street-graph";
import { projectPoint } from "@/lib/projection";

type ScreenPoint = { x: number; y: number };

/** Gap between the southernmost road ink and where the ocean fill starts. */
const OCEAN_BELOW_ROADS_PX = 8;

/** Northern edge of the southern waterfront band (coastal maps). */
export function coastLatThreshold(bbox: GraphBbox, mapId: MapId): number {
  const span = bbox.north - bbox.south;
  const ratio = mapId === "isla-vista" ? 0.48 : 0.36;
  return bbox.south + span * ratio;
}

function interpolateShoreLine(shoreY: number[], width: number): ScreenPoint[] {
  const columns = shoreY.length - 1;
  const filled = [...shoreY];

  for (let i = 1; i <= columns; i += 1) {
    if (Number.isNaN(filled[i]!) && !Number.isNaN(filled[i - 1]!)) {
      filled[i] = filled[i - 1]!;
    }
  }
  for (let i = columns - 1; i >= 0; i -= 1) {
    if (Number.isNaN(filled[i]!) && !Number.isNaN(filled[i + 1]!)) {
      filled[i] = filled[i + 1]!;
    }
  }

  const fallback =
    filled.find((y) => !Number.isNaN(y)) ??
    shoreY.find((y) => !Number.isNaN(y)) ??
    0;

  return Array.from({ length: columns + 1 }, (_, i) => ({
    x: (i / columns) * width,
    y: Number.isNaN(filled[i]!) ? fallback : filled[i]!,
  }));
}

function collectPlayableScreenPoints(
  graph: StreetGraphData,
  bbox: GraphBbox,
  width: number,
  height: number,
  steps = 3
): ScreenPoint[] {
  const points: ScreenPoint[] = [];
  const samples = Math.max(2, steps);
  for (const edge of graph.edges) {
    if (!edge.playable) continue;
    const a = graph.nodes.find((n) => n.id === edge.from);
    const b = graph.nodes.find((n) => n.id === edge.to);
    if (!a || !b) continue;
    const p1 = projectPoint(a.lon, a.lat, bbox, width, height);
    const p2 = projectPoint(b.lon, b.lat, bbox, width, height);
    for (let i = 0; i < samples; i += 1) {
      const t = i / (samples - 1);
      points.push({
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
      });
    }
  }
  return points;
}

function smoothShorePoints(coast: ScreenPoint[], radius = 2): ScreenPoint[] {
  if (coast.length < 3) return coast;
  return coast.map((point, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i - radius; j <= i + radius; j += 1) {
      const sample = coast[Math.max(0, Math.min(coast.length - 1, j))]!;
      sum += sample.y;
      count += 1;
    }
    return { x: point.x, y: sum / count };
  });
}

/** Small coves south of the street envelope — never pulls water onto the grid. */
function naturalizeShoreSouth(
  coast: ScreenPoint[],
  envelope: ScreenPoint[],
  width: number,
  height: number
): ScreenPoint[] {
  return coast.map((point, i) => {
    const floor = envelope[i]?.y ?? point.y;
    const t = width === 0 ? 0 : point.x / width;
    const cove = 7 * (0.55 + 0.45 * Math.sin(t * Math.PI * 3.2));
    return {
      x: point.x,
      y: Math.min(height, Math.max(floor, point.y + cove)),
    };
  });
}

function shoreYFromColumns(
  samples: ScreenPoint[],
  width: number,
  height: number
): number[] {
  const columns = 48;
  const shoreY = new Array<number>(columns + 1).fill(NaN);
  const halfBand = (width / columns) * 0.65;

  for (let i = 0; i <= columns; i += 1) {
    const cx = (i / columns) * width;
    const band = samples.filter((n) => n.x >= cx - halfBand && n.x <= cx + halfBand);
    if (band.length === 0) continue;
    shoreY[i] = Math.min(
      height,
      Math.max(...band.map((n) => n.y)) + OCEAN_BELOW_ROADS_PX
    );
  }

  return shoreY;
}

/** Linear interpolate shore Y at x along the coast polyline. */
export function shoreYAtX(coast: ScreenPoint[], x: number): number {
  if (coast.length === 0) return 0;
  if (x <= coast[0]!.x) return coast[0]!.y;
  const last = coast.at(-1)!;
  if (x >= last.x) return last.y;
  for (let i = 0; i < coast.length - 1; i += 1) {
    const a = coast[i]!;
    const b = coast[i + 1]!;
    if (x >= a.x && x <= b.x) {
      if (a.y === b.y) return a.y;
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.y + t * (b.y - a.y);
    }
  }
  return last.y;
}

function liftCoastAboveRoads(
  coast: ScreenPoint[],
  roads: ScreenPoint[],
  width: number,
  height: number,
  gap: number
): ScreenPoint[] {
  const halfBand = (width / 48) * 1.35;
  return coast.map((c) => {
    let y = c.y;
    for (const p of roads) {
      if (Math.abs(p.x - c.x) <= halfBand) {
        y = Math.max(y, Math.min(height, p.y + gap));
      }
    }
    return { x: c.x, y };
  });
}

function maxShoreYNearX(
  coast: ScreenPoint[],
  x: number,
  width: number
): number {
  const halfBand = (width / 48) * 1.1;
  let max = 0;
  for (const c of coast) {
    if (Math.abs(c.x - x) <= halfBand) max = Math.max(max, c.y);
  }
  return max;
}

/**
 * Pacific Ocean south of the playable grid (Downtown SB + Isla Vista).
 */
export function buildOceanLayer(
  graph: StreetGraphData,
  width: number,
  height: number,
  mapId: MapId
): { fillPoints: string; wavePoints: string; coast: ScreenPoint[] } | null {
  if (!mapHasOceanLayer(mapId)) return null;

  const { bbox, nodes, edges } = graph;
  const landIds = new Set<string>();
  for (const edge of edges) {
    if (!edge.playable) continue;
    landIds.add(edge.from);
    landIds.add(edge.to);
  }

  const landNodes = nodes
    .filter((n) => landIds.has(n.id))
    .map((n) => {
      const p = projectPoint(n.lon, n.lat, bbox, width, height);
      return { x: p.x, y: p.y, lat: n.lat };
    });

  if (landNodes.length === 0) return null;

  let coast: ScreenPoint[];

  if (mapId === "downtown-santa-barbara") {
    const playablePts = collectPlayableScreenPoints(
      graph,
      bbox,
      width,
      height,
      5
    );
    if (playablePts.length === 0) return null;
    const envelopeY = shoreYFromColumns(playablePts, width, height);
    const envelope = interpolateShoreLine(envelopeY, width);
    if (envelope.length < 2) return null;
    coast = liftCoastAboveRoads(
      naturalizeShoreSouth(
        smoothShorePoints(envelope, 3),
        envelope,
        width,
        height
      ),
      playablePts,
      width,
      height,
      OCEAN_BELOW_ROADS_PX
    );
  } else {
    const coastLat = coastLatThreshold(bbox, mapId);
    const waterfront = landNodes.filter((n) => n.lat <= coastLat);
    if (waterfront.length === 0) return null;

    const shoreY = shoreYFromColumns(waterfront, width, height);
    coast = interpolateShoreLine(shoreY, width);
    if (coast.length < 2) return null;
  }

  coast = coast.map((p) => ({
    x: p.x,
    y: Math.min(height, p.y),
  }));

  const fillPoints = [
    ...coast.map((p) => `${p.x},${p.y}`),
    `${width},${height}`,
    `0,${height}`,
  ].join(" ");

  return {
    fillPoints,
    wavePoints: coast.map((p) => `${p.x},${p.y}`).join(" "),
    coast,
  };
}

/** True when every playable street sample lies on land (above the ocean top). */
export function playableRoadsClearOfOcean(
  graph: StreetGraphData,
  coast: ScreenPoint[],
  bbox: GraphBbox,
  width: number,
  height: number,
  tolerancePx = 1
): boolean {
  const playablePts = collectPlayableScreenPoints(graph, bbox, width, height);
  for (const p of playablePts) {
    const shore = maxShoreYNearX(coast, p.x, width);
    if (shore > 0 && p.y + tolerancePx > shore) return false;
  }
  return true;
}
