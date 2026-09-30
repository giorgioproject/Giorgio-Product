import { describe, expect, it } from "vitest";
import { getGraphDataForMap } from "@/lib/maps";
import { getStreetGraph, setActiveMap } from "@/lib/street-graph";
import {
  edgeScreenUnit,
  lerpViewBox,
  mapDirectionUnit,
  projectPoint,
  viewBoxAroundPoint,
  viewBoxForBbox,
} from "@/lib/projection";

describe("projection", () => {
  setActiveMap("downtown-santa-barbara");
  const bbox = getGraphDataForMap("downtown-santa-barbara").bbox;

  it("projects a point with pan and scale", () => {
    const base = projectPoint(-119.7, 34.42, bbox, 900, 640);
    const p = projectPoint(-119.7, 34.42, bbox, 900, 640, 10, 20, 1.5);
    expect(p.x).not.toBe(base.x);
    expect(p.y).not.toBe(base.y);
  });

  it("projects a point inside the map", () => {
    const p = projectPoint(-119.7, 34.42, bbox, 900, 640);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(900);
    expect(p.y).toBeLessThan(640);
  });

  it("builds overview view box", () => {
    const vb = viewBoxForBbox(bbox, 900, 640);
    expect(vb.width).toBeGreaterThan(900);
  });

  it("lerps between view boxes", () => {
    const a = viewBoxForBbox(bbox, 900, 640);
    const b = { minX: 100, minY: 100, width: 200, height: 200 };
    const mid = lerpViewBox(a, b, 0.5);
    expect(mid.width).toBeLessThan(a.width);
    expect(mid.width).toBeGreaterThan(b.width);
  });

  it("builds a focus view box around a point", () => {
    const vb = viewBoxAroundPoint(450, 320, 420, 320);
    expect(vb.minX).toBe(240);
    expect(vb.minY).toBe(160);
  });

  it("clamps lerp factor", () => {
    const a = viewBoxForBbox(bbox, 900, 640);
    const b = viewBoxAroundPoint(100, 100, 200, 200);
    expect(lerpViewBox(a, b, 2)).toEqual(b);
    expect(lerpViewBox(a, b, -1)).toEqual(a);
  });

  it("returns screen unit vectors for map directions", () => {
    expect(mapDirectionUnit("up")).toEqual({ dx: 0, dy: -1 });
    expect(mapDirectionUnit("down")).toEqual({ dx: 0, dy: 1 });
    expect(mapDirectionUnit("left")).toEqual({ dx: -1, dy: 0 });
    expect(mapDirectionUnit("right")).toEqual({ dx: 1, dy: 0 });
  });

  it("returns a screen unit vector along an edge", () => {
    const graph = getStreetGraph();
    const edge = graph.edges.find((e) => e.playable)!;
    const from = graph.nodes.find((n) => n.id === edge.from)!;
    const to = graph.nodes.find((n) => n.id === edge.to)!;
    const vec = edgeScreenUnit(from, to, bbox);
    expect(Math.hypot(vec.dx, vec.dy)).toBeCloseTo(1, 5);
  });
});
