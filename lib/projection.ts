import type { Direction, GraphNode, StreetGraphData } from "@/lib/street-graph";

/** Must match the game map SVG size. */
export const MAP_WIDTH = 900;
export const MAP_HEIGHT = 640;

export type ViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

/** Flat top-down map: lon → x, lat → y (same as Solvang / Isla Vista). */
export function projectPoint(
  lon: number,
  lat: number,
  bbox: StreetGraphData["bbox"],
  width: number,
  height: number,
  panX = 0,
  panY = 0,
  scale = 1
): { x: number; y: number } {
  const mapW = bbox.east - bbox.west || 1;
  const mapH = bbox.north - bbox.south || 1;
  const baseX = ((lon - bbox.west) / mapW) * width;
  const baseY = height - ((lat - bbox.south) / mapH) * height;
  return {
    x: (baseX + panX) * scale,
    y: (baseY + panY) * scale,
  };
}

export function viewBoxForBbox(
  bbox: StreetGraphData["bbox"],
  width: number,
  height: number,
  padding = 40
): ViewBox {
  return {
    minX: -padding,
    minY: -padding,
    width: width + padding * 2,
    height: height + padding * 2,
  };
}

export function viewBoxAroundPoint(
  x: number,
  y: number,
  focusWidth: number,
  focusHeight: number
): ViewBox {
  return {
    minX: x - focusWidth / 2,
    minY: y - focusHeight / 2,
    width: focusWidth,
    height: focusHeight,
  };
}

export function lerpViewBox(a: ViewBox, b: ViewBox, t: number): ViewBox {
  const clamp = Math.min(1, Math.max(0, t));
  return {
    minX: a.minX + (b.minX - a.minX) * clamp,
    minY: a.minY + (b.minY - a.minY) * clamp,
    width: a.width + (b.width - a.width) * clamp,
    height: a.height + (b.height - a.height) * clamp,
  };
}

/** Screen-space unit vector for a map arrow (up = toward top of the map). */
export function mapDirectionUnit(dir: Direction): { dx: number; dy: number } {
  switch (dir) {
    case "up":
      return { dx: 0, dy: -1 };
    case "down":
      return { dx: 0, dy: 1 };
    case "left":
      return { dx: -1, dy: 0 };
    case "right":
      return { dx: 1, dy: 0 };
  }
}

/** Screen-space unit vector along an edge (matches what you see on the map). */
export function edgeScreenUnit(
  from: GraphNode,
  to: GraphNode,
  bbox: StreetGraphData["bbox"]
): { dx: number; dy: number } {
  const p1 = projectPoint(from.lon, from.lat, bbox, MAP_WIDTH, MAP_HEIGHT);
  const p2 = projectPoint(to.lon, to.lat, bbox, MAP_WIDTH, MAP_HEIGHT);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len };
}
