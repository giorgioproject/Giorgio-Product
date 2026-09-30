import type { MapId } from "@/lib/maps";
import { projectPoint } from "@/lib/projection";
import {
  isFeaturedStreetName,
  readableStreetLabelAngle,
  streetLabelNudge,
  type GraphBbox,
  type StreetLabel,
} from "@/lib/street-graph";

export type PlacedStreetLabel = {
  key: string;
  displayName: string;
  x: number;
  y: number;
  angle: number;
  featured: boolean;
};

type Rect = { minX: number; minY: number; maxX: number; maxY: number };

const DOWNTOWN_LABEL_PRIORITY: string[] = [
  "State Street",
  "East Cabrillo Boulevard",
  "West Cabrillo Boulevard",
  "Chapala Street",
  "Castillo Street",
  "Garden Street",
  "Anacapa Street",
  "De La Vina Street",
  "East Carrillo Street",
  "West Carrillo Street",
  "East Montecito Street",
  "West Montecito Street",
  "North Milpas Street",
  "Santa Barbara Street",
  "Shoreline Drive",
  "Cliff Drive",
  "East Haley Street",
  "West Haley Street",
];

function downtownLabelRank(name: string): number {
  const idx = DOWNTOWN_LABEL_PRIORITY.indexOf(name);
  return idx === -1 ? 500 + name.length : idx;
}

function sortLabelsForMap(mapId: MapId, labels: StreetLabel[]): StreetLabel[] {
  const copy = [...labels];
  if (mapId !== "downtown-santa-barbara") {
    return copy.sort((a, b) => {
      const lf = isFeaturedStreetName(a.name) ? 1 : 0;
      const rf = isFeaturedStreetName(b.name) ? 1 : 0;
      if (lf !== rf) return rf - lf;
      return b.lengthM - a.lengthM;
    });
  }
  return copy.sort((a, b) => {
    const rank = downtownLabelRank(a.name) - downtownLabelRank(b.name);
    if (rank !== 0) return rank;
    return b.lengthM - a.lengthM;
  });
}

/** Shorter chip text on dense downtown grid. */
export function formatStreetLabelName(name: string, mapId: MapId): string {
  if (mapId !== "downtown-santa-barbara") return name.trim();
  let s = name.replace(/\s+/g, " ").trim();
  s = s.replace(/\bEast de la Guerra Street\b/i, "E de la Guerra St");
  s = s.replace(/\bWest de la Guerra Street\b/i, "W de la Guerra St");
  s = s.replace(/\bDe La Vina Street\b/i, "De la Vina St");
  const suffixes: [RegExp, string][] = [
    [/\bBoulevard\b/i, "Blvd"],
    [/\bAvenue\b/i, "Ave"],
    [/\bStreet\b/i, "St"],
    [/\bDrive\b/i, "Dr"],
    [/\bPlace\b/i, "Pl"],
    [/\bLane\b/i, "Ln"],
  ];
  for (const [re, rep] of suffixes) s = s.replace(re, rep);
  return s;
}

function labelIsFeatured(name: string, mapId: MapId): boolean {
  if (isFeaturedStreetName(name)) return true;
  if (mapId === "downtown-santa-barbara") {
    const lower = name.toLowerCase();
    return lower.includes("cabrillo") && lower.includes("boulevard");
  }
  return false;
}

function estimateLabelSize(displayName: string, featured: boolean) {
  const fontSize = featured ? 18 : 12;
  const padX = featured ? 10 : 7;
  const padY = featured ? 5 : 3;
  const width = Math.max(44, displayName.length * fontSize * 0.62 + padX * 2);
  const height = fontSize + padY * 2;
  return { width, height };
}

function axisAlignedBounds(
  cx: number,
  cy: number,
  width: number,
  height: number,
  angleDeg: number
): Rect {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = width * cos + height * sin;
  const h = width * sin + height * cos;
  return {
    minX: cx - w / 2,
    maxX: cx + w / 2,
    minY: cy - h / 2,
    maxY: cy + h / 2,
  };
}

function rectsOverlap(a: Rect, b: Rect, pad: number): boolean {
  return !(
    a.maxX + pad < b.minX ||
    b.maxX + pad < a.minX ||
    a.maxY + pad < b.minY ||
    b.maxY + pad < a.minY
  );
}

function quadrantIndex(x: number, y: number, mapW: number, mapH: number): number {
  const right = x >= mapW / 2 ? 1 : 0;
  const bottom = y >= mapH / 2 ? 2 : 0;
  return right + bottom;
}

function coastalLandwardNudge(x: number, y: number, mapW: number, mapH: number) {
  if (y < mapH * 0.68) return { x: 0, y: 0 };
  const t = Math.min(1, (y - mapH * 0.68) / (mapH * 0.32));
  const towardCenterX = (mapW / 2 - x) * 0.08 * t;
  return { x: towardCenterX, y: -10 - 18 * t };
}

function placementCandidates(
  label: StreetLabel,
  project: (lon: number, lat: number) => { x: number; y: number },
  featured: boolean,
  mapId: MapId
): Array<{ x: number; y: number; angle: number }> {
  const mid = project(label.lon, label.lat);
  const a = project(label.fromLon, label.fromLat);
  const b = project(label.toLon, label.toLat);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const angle = readableStreetLabelAngle(dx, dy);
  const distances =
    mapId === "downtown-santa-barbara"
      ? featured
        ? [34, 42, 50, 58]
        : [24, 32, 40, 48, 56]
      : featured
        ? [22, 28, 34]
        : [16, 22, 28];

  const out: Array<{ x: number; y: number; angle: number }> = [];
  for (const d of distances) {
    for (const sign of [1, -1]) {
      const n = streetLabelNudge(dx, dy, d * sign);
      out.push({ x: mid.x + n.x, y: mid.y + n.y, angle });
    }
  }
  return out;
}

export function layoutStreetLabelsForMap(
  mapId: MapId,
  labels: StreetLabel[],
  bbox: GraphBbox,
  mapW: number,
  mapH: number
): PlacedStreetLabel[] {
  const maxLabels = mapId === "downtown-santa-barbara" ? 10 : 16;
  const maxPerQuadrant = mapId === "downtown-santa-barbara" ? 3 : 6;
  const collisionPad = mapId === "downtown-santa-barbara" ? 10 : 6;

  const project = (lon: number, lat: number) =>
    projectPoint(lon, lat, bbox, mapW, mapH);

  const ordered = sortLabelsForMap(mapId, labels);
  const placed: PlacedStreetLabel[] = [];
  const occupied: Rect[] = [];
  const quadrantCounts = [0, 0, 0, 0];

  for (const label of ordered) {
    if (placed.length >= maxLabels) break;

    const displayName = formatStreetLabelName(label.name, mapId);
    const featured = labelIsFeatured(label.name, mapId);
    const { width, height } = estimateLabelSize(displayName, featured);
    const candidates = placementCandidates(label, project, featured, mapId);

    let chosen: { x: number; y: number; angle: number } | null = null;

    for (const candidate of candidates) {
      const land = coastalLandwardNudge(candidate.x, candidate.y, mapW, mapH);
      const x = candidate.x + land.x;
      const y = candidate.y + land.y;
      const q = quadrantIndex(x, y, mapW, mapH);
      if (quadrantCounts[q]! >= maxPerQuadrant && !featured) continue;

      const bounds = axisAlignedBounds(x, y, width, height, candidate.angle);
      if (occupied.some((rect) => rectsOverlap(bounds, rect, collisionPad))) {
        continue;
      }
      chosen = { x, y, angle: candidate.angle };
      occupied.push(bounds);
      quadrantCounts[q]! += 1;
      break;
    }

    if (!chosen && featured) {
      const mid = project(label.lon, label.lat);
      const a = project(label.fromLon, label.fromLat);
      const b = project(label.toLon, label.toLat);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const n = streetLabelNudge(dx, dy, 52);
      const land = coastalLandwardNudge(mid.x + n.x, mid.y + n.y, mapW, mapH);
      chosen = {
        x: mid.x + n.x + land.x,
        y: mid.y + n.y + land.y,
        angle: readableStreetLabelAngle(dx, dy),
      };
      occupied.push(
        axisAlignedBounds(
          chosen.x,
          chosen.y,
          width,
          height,
          chosen.angle
        )
      );
    }

    if (!chosen) continue;

    placed.push({
      key: label.name,
      displayName,
      x: chosen.x,
      y: chosen.y,
      angle: chosen.angle,
      featured,
    });
  }

  return placed;
}
