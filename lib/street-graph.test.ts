import { describe, expect, it } from "vitest";
import {
  getEdge,
  getNode,
  getOtherNode,
  getPlayableEdgesFrom,
  getStreetGraph,
  getStreetLabels,
  isFeaturedStreetName,
  readableStreetLabelAngle,
  streetLabelNudge,
  oppositeDirection,
  assignExitsToDirections,
  pickEdgeForDirection,
  scoreEdgeForDirection,
  pickRandomSpawn,
  getTravelerFacing,
  isDeadEndEdge,
  isDeadEndSpurEdge,
  setActiveMap,
  stitchNearbyNodes,
} from "@/lib/street-graph";

describe("street-graph", () => {
  it("loads downtown seed graph", () => {
    setActiveMap("downtown-santa-barbara");
    const g = getStreetGraph();
    expect(g.nodes.length).toBeGreaterThan(100);
    expect(g.edges.some((e) => e.playable)).toBe(true);
    expect(g.edges.some((e) => !e.playable)).toBe(true);
  });

  it("exposes street labels", () => {
    const labels = getStreetLabels();
    const first = labels[0]!;
    const last = labels[labels.length - 1]!;
    expect(labels.some((l) => l.name.length > 0)).toBe(true);
    expect(first.lengthM).toBeGreaterThanOrEqual(last.lengthM);
    expect(first.fromLat !== first.toLat || first.fromLon !== first.toLon).toBe(true);
  });

  it("keeps street-sign text upright", () => {
    expect(readableStreetLabelAngle(10, 0)).toBeCloseTo(0);
    expect(readableStreetLabelAngle(-10, 0) % 360).toBeCloseTo(0);
    expect(readableStreetLabelAngle(0, 10)).toBeCloseTo(90);
    expect(readableStreetLabelAngle(0, -10)).toBeCloseTo(-90);
  });

  it("nudges street names off the pavement", () => {
    const beside = streetLabelNudge(10, 0, 16);
    expect(beside.x).toBeCloseTo(0);
    expect(beside.y).toBeCloseTo(-16);
    expect(isFeaturedStreetName("State Street")).toBe(true);
    expect(isFeaturedStreetName("Cliff Drive")).toBe(false);
  });

  it("pins State Street first on downtown", () => {
    setActiveMap("downtown-santa-barbara");
    const labels = getStreetLabels();
    expect(labels[0]?.name).toBe("State Street");
  });

  it("picks random spawn on playable edge", () => {
    const spawn = pickRandomSpawn(() => 0.25);
    const edge = getStreetGraph().edges.find((e) => e.id === spawn.edgeId);
    expect(edge?.playable).toBe(true);
  });

  it("connects playable exits from nodes", () => {
    const node = getStreetGraph().nodes[0]!;
    const exits = getPlayableEdgesFrom(node.id);
    expect(Array.isArray(exits)).toBe(true);
  });

  it("gets node and edge by id", () => {
    const edge = getStreetGraph().edges[0]!;
    expect(getEdge(edge.id)?.id).toBe(edge.id);
    expect(getNode(edge.from)?.id).toBe(edge.from);
  });

  it("gets other node on edge", () => {
    const edge = getStreetGraph().edges[0]!;
    expect(getOtherNode(edge, edge.from)).toBe(edge.to);
  });

  it("assigns each leaving street its own map arrow", () => {
    setActiveMap("isla-vista");
    const node = getStreetGraph().nodes.find(
      (n) => getPlayableEdgesFrom(n.id).length >= 3
    );
    if (!node) return;
    const exits = getPlayableEdgesFrom(node.id);
    const assigned = assignExitsToDirections(node.id, exits);
    const ids = Object.values(assigned).map((e) => e!.id);
    expect(ids.length).toBe(Math.min(4, exits.length));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("scores a street against a map arrow", () => {
    setActiveMap("isla-vista");
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const score = scoreEdgeForDirection(edge.from, edge, "right");
    expect(Number.isFinite(score)).toBe(true);
  });

  it("picks edge for direction at intersection", () => {
    const node = getStreetGraph().nodes.find((n) => getPlayableEdgesFrom(n.id).length >= 2);
    if (!node) return;
    const picked = pickEdgeForDirection(node.id, "right") ?? pickEdgeForDirection(node.id, "up");
    expect(picked?.playable).toBe(true);
  });

  it("returns traveler facing along an edge", () => {
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const facing = getTravelerFacing(edge.from, edge.id);
    expect(["up", "down", "left", "right"]).toContain(facing);
  });

  it("marks cul-de-sac spurs as no-pellet roads", () => {
    const spurIds = getStreetGraph().edges
      .filter((e) => e.playable && isDeadEndSpurEdge(e.id))
      .map((e) => e.id);
    expect(spurIds.length).toBeGreaterThan(0);
  });

  it("detects dead-end streets", () => {
    const deadNode = getStreetGraph().nodes.find((n) => getPlayableEdgesFrom(n.id).length === 1);
    if (!deadNode) return;
    const only = getPlayableEdgesFrom(deadNode.id)[0]!;
    expect(isDeadEndEdge(only.id)).toBe(true);
  });

  it("maps opposite map directions", () => {
    expect(oppositeDirection("up")).toBe("down");
    expect(oppositeDirection("down")).toBe("up");
    expect(oppositeDirection("left")).toBe("right");
    expect(oppositeDirection("right")).toBe("left");
  });

  it("allows reversing at a dead end when the map direction matches", () => {
    const node = getStreetGraph().nodes.find((n) => getPlayableEdgesFrom(n.id).length === 1);
    if (!node) return;
    const only = getPlayableEdgesFrom(node.id)[0]!;
    const other = getNode(getOtherNode(only, node.id))!;
    const backDir = getTravelerFacing(node.id, only.id);
    const picked = pickEdgeForDirection(node.id, backDir, only.id);
    expect(picked?.id).toBe(only.id);
  });

  it("joins two nodes that sit a meter apart", () => {
    const stitched = stitchNearbyNodes({
      bbox: { south: 0, west: 0, north: 1, east: 1 },
      nodes: [
        { id: "a", lat: 34.40978, lon: -119.8627126 },
        { id: "b", lat: 34.40978, lon: -119.8627031 },
        { id: "c", lat: 34.41, lon: -119.86 },
      ],
      edges: [
        {
          id: "e1",
          from: "a",
          to: "c",
          streetName: "Del Playa Drive",
          highway: "residential",
          playable: true,
          lengthM: 200,
        },
        {
          id: "e2",
          from: "b",
          to: "c",
          streetName: "Del Playa Drive",
          highway: "residential",
          playable: true,
          lengthM: 200,
        },
      ],
    });
    expect(stitched.nodes.length).toBe(2);
    expect(stitched.edges.length).toBe(1);
  });

  it("keeps Del Playa Drive as one street from west to east", () => {
    setActiveMap("isla-vista");
    const delPlaya = getStreetGraph().edges.filter(
      (e) => e.playable && e.streetName === "Del Playa Drive"
    );
    expect(delPlaya.length).toBeGreaterThan(2);
    const nodes = new Set(delPlaya.flatMap((e) => [e.from, e.to]));
    const start = [...nodes][0]!;
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const id = queue.pop()!;
      for (const edge of delPlaya) {
        const next = edge.from === id ? edge.to : edge.to === id ? edge.from : null;
        if (next && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    expect(seen.size).toBe(nodes.size);
  });

  it("returns null when no forward edge matches the map direction", () => {
    const node = getStreetGraph().nodes.find((n) => getPlayableEdgesFrom(n.id).length === 1);
    if (!node) return;
    const only = getPlayableEdgesFrom(node.id)[0]!;
    const other = getNode(getOtherNode(only, node.id))!;
    const opposite =
      other.lon > node.lon ? "left" : other.lon < node.lon ? "right" : other.lat > node.lat ? "down" : "up";
    const picked = pickEdgeForDirection(node.id, opposite as "up", only.id);
    expect(picked === null || picked.id === only.id).toBe(true);
  });
});
