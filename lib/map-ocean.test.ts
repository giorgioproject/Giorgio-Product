import { describe, expect, it } from "vitest";
import { getGraphDataForMap } from "@/lib/maps";
import { projectPoint } from "@/lib/projection";
import { getStreetGraph, setActiveMap } from "@/lib/street-graph";
import {
  buildOceanLayer,
  coastLatThreshold,
  playableRoadsClearOfOcean,
  shoreYAtX,
} from "@/lib/map-ocean";

describe("map-ocean", () => {
  it("builds a full-width southern ocean for downtown", () => {
    setActiveMap("downtown-santa-barbara");
    const graph = getStreetGraph();
    const layer = buildOceanLayer(graph, 900, 640, "downtown-santa-barbara");
    expect(layer).not.toBeNull();
    expect(layer!.fillPoints.split(" ").length).toBeGreaterThanOrEqual(4);
    expect(layer!.wavePoints.length).toBeGreaterThan(0);

    const coords = layer!.fillPoints.split(" ").map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    });
    expect(coords[0]?.x).toBe(0);
    expect(coords.at(-2)).toEqual({ x: 900, y: 640 });
    expect(coords.at(-1)).toEqual({ x: 0, y: 640 });
    for (const c of coords.slice(0, -2)) {
      expect(c.y).toBeLessThanOrEqual(640);
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(900);
    }
    const shoreYs = coords.slice(0, -2).map((c) => Math.round(c.y));
    expect(new Set(shoreYs).size).toBeGreaterThan(3);
  });

  it("keeps East Cabrillo and every playable downtown street north of the ocean", () => {
    setActiveMap("downtown-santa-barbara");
    const graph = getStreetGraph();
    const layer = buildOceanLayer(graph, 900, 640, "downtown-santa-barbara");
    expect(layer).not.toBeNull();
    expect(
      playableRoadsClearOfOcean(graph, layer!.coast, graph.bbox, 900, 640, 1)
    ).toBe(true);

    const cabrillo = graph.edges.filter(
      (e) => e.playable && /east cabrillo/i.test(e.streetName ?? "")
    );
    expect(cabrillo.length).toBeGreaterThan(0);
    const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
    for (const edge of cabrillo) {
      const a = nodes.get(edge.from);
      const b = nodes.get(edge.to);
      if (!a || !b) continue;
      const p1 = projectPoint(a.lon, a.lat, graph.bbox, 900, 640);
      const p2 = projectPoint(b.lon, b.lat, graph.bbox, 900, 640);
      expect(p1.y).toBeLessThan(shoreYAtX(layer!.coast, p1.x));
      expect(p2.y).toBeLessThan(shoreYAtX(layer!.coast, p2.x));
    }
  });

  it("builds a southern ocean for Isla Vista", () => {
    const graph = getGraphDataForMap("isla-vista");
    const layer = buildOceanLayer(graph, 900, 640, "isla-vista");
    expect(layer).not.toBeNull();
    const coords = layer!.fillPoints.split(" ").map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    });
    expect(coords.at(-2)).toEqual({ x: 900, y: 640 });
    expect(coords.at(-1)).toEqual({ x: 0, y: 640 });
    const shoreYs = coords.slice(0, -2).map((c) => c.y);
    expect(Math.min(...shoreYs)).toBeGreaterThan(640 * 0.45);
  });

  it("uses a bbox-relative coast threshold per map", () => {
    const iv = getGraphDataForMap("isla-vista").bbox;
    const dt = getGraphDataForMap("downtown-santa-barbara").bbox;
    expect(coastLatThreshold(iv, "isla-vista")).toBeGreaterThan(iv.south);
    expect(coastLatThreshold(iv, "isla-vista")).toBeLessThan(iv.north);
    expect(coastLatThreshold(dt, "downtown-santa-barbara")).toBeGreaterThan(
      dt.south
    );
  });

  it("returns null when there is no land grid", () => {
    const layer = buildOceanLayer(
      { bbox: { south: 0, west: 0, north: 1, east: 1 }, nodes: [], edges: [] },
      900,
      640,
      "downtown-santa-barbara"
    );
    expect(layer).toBeNull();
  });

  it("checks playable samples against the ocean top", () => {
    const graph = getGraphDataForMap("isla-vista");
    const layer = buildOceanLayer(graph, 900, 640, "isla-vista");
    expect(layer).not.toBeNull();
    const clear = playableRoadsClearOfOcean(
      graph,
      layer!.coast,
      graph.bbox,
      900,
      640,
      3
    );
    expect(typeof clear).toBe("boolean");
  });

  it("interpolates shore height along the coast polyline", () => {
    const coast = [
      { x: 0, y: 400 },
      { x: 900, y: 500 },
    ];
    expect(shoreYAtX(coast, 0)).toBe(400);
    expect(shoreYAtX(coast, 900)).toBe(500);
    expect(shoreYAtX(coast, 450)).toBe(450);
    expect(shoreYAtX([], 100)).toBe(0);
  });

  it("skips ocean on inland maps", () => {
    setActiveMap("solvang");
    const graph = getGraphDataForMap("solvang");
    expect(buildOceanLayer(graph, 900, 640, "solvang")).toBeNull();
  });
});
