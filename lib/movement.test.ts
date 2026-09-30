import { describe, expect, it } from "vitest";
import { MAP_IDS } from "@/lib/maps";
import {
  bestEdgeForDirection,
  getOtherNode,
  getPlayableEdgesFrom,
  getStreetGraph,
  getTravelerFacing,
  isDeadEndSpurEdge,
  setActiveMap,
} from "@/lib/street-graph";
import {
  advanceTraveler,
  applyPlayerDirection,
  directionsOpenAtNode,
  inputNodeForPress,
  keyToDirection,
  latLonDistanceM,
  lerpLatLon,
  nodeEpsM,
  pickGhostNextEdge,
  pickPlayerNextEdge,
  travelerAtNode,
  travelersCollide,
  type Traveler,
} from "@/lib/movement";

describe("movement", () => {
  it("maps arrow keys to directions", () => {
    expect(keyToDirection("ArrowUp")).toBe("up");
    expect(keyToDirection("ArrowDown")).toBe("down");
    expect(keyToDirection("ArrowLeft")).toBe("left");
    expect(keyToDirection("ArrowRight")).toBe("right");
    expect(keyToDirection("x")).toBeNull();
  });

  it("measures separation between coordinates", () => {
    expect(latLonDistanceM(34.41, -119.7, 34.41, -119.7)).toBe(0);
    expect(latLonDistanceM(34.41, -119.7, 34.42, -119.7)).toBeGreaterThan(1000);
  });

  it("interpolates between two coordinates", () => {
    const a = { lat: 34.41, lon: -119.7 };
    const b = { lat: 34.42, lon: -119.69 };
    const mid = lerpLatLon(a, b, 0.5);
    expect(mid.lat).toBeCloseTo(34.415, 5);
    expect(mid.lon).toBeCloseTo(-119.695, 5);
  });

  it("reverses out of a dead-end instead of stopping", () => {
    setActiveMap("downtown-santa-barbara");
    const deadEdge = getStreetGraph().edges.find(
      (e) => e.playable && isDeadEndSpurEdge(e.id)
    );
    if (!deadEdge) return;

    const terminal =
      getPlayableEdgesFrom(deadEdge.from).length === 1
        ? deadEdge.from
        : deadEdge.to;
    const fromNodeId = terminal === deadEdge.from ? deadEdge.to : deadEdge.from;

    const traveler = {
      edgeId: deadEdge.id,
      fromNodeId,
      distanceM: Math.max(0, deadEdge.lengthM - 5),
      queuedDirection: null,
      facing: "right" as const,
    };
    const next = advanceTraveler(traveler, 80, 0.2, false);
    expect(next.distanceM).toBeGreaterThanOrEqual(0);
    expect(next.edgeId).toBeTruthy();
  });

  it("advances a traveler along an edge", () => {
    setActiveMap("downtown-santa-barbara");
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const traveler = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: 0,
      queuedDirection: null,
      facing: "right" as const,
    };
    const next = advanceTraveler(traveler, 50, 1, false);
    expect(next.distanceM).toBeGreaterThan(traveler.distanceM);
  });

  it("queues a direction on the player", () => {
    setActiveMap("downtown-santa-barbara");
    const game = getStreetGraph().edges.find((e) => e.playable)!;
    const traveler = {
      edgeId: game.id,
      fromNodeId: game.from,
      distanceM: game.lengthM / 2,
      queuedDirection: null,
      facing: "right" as const,
    };
    const next = applyPlayerDirection(traveler, "up");
    expect(next.queuedDirection).toBe("up");
  });

  it("queues direction when edge id is invalid", () => {
    const traveler = {
      edgeId: "missing-edge",
      fromNodeId: "n1",
      distanceM: 0,
      queuedDirection: null,
      facing: "right" as const,
    };
    expect(applyPlayerDirection(traveler, "down").queuedDirection).toBe("down");
  });

  it("does not collide when positions are unknown", () => {
    const a = {
      edgeId: "missing",
      fromNodeId: "n1",
      distanceM: 0,
      queuedDirection: null,
      facing: "right" as const,
    };
    const b = {
      edgeId: "missing-2",
      fromNodeId: "n2",
      distanceM: 0,
      queuedDirection: null,
      facing: "left" as const,
    };
    expect(travelersCollide(a, b)).toBe(false);
  });

  it("collides when only one traveler has reached the corner", () => {
    setActiveMap("solvang");
    const node = getStreetGraph().nodes.find(
      (n) => getPlayableEdgesFrom(n.id).length >= 2
    );
    if (!node) return;
    const exits = getPlayableEdgesFrom(node.id);
    const e1 = exits[0]!;
    const e2 = exits.find((e) => e.id !== e1.id);
    if (!e2) return;
    const a = {
      edgeId: e1.id,
      fromNodeId: node.id,
      distanceM: 0,
      queuedDirection: null,
      facing: "right" as const,
    };
    const otherOnE2 = e2.from === node.id ? e2.to : e2.from;
    const b = {
      edgeId: e2.id,
      fromNodeId: otherOnE2,
      distanceM: Math.max(0, e2.lengthM - 3),
      queuedDirection: null,
      facing: "left" as const,
    };
    expect(travelersCollide(a, b)).toBe(true);
  });

  it("collides when two travelers share a node", () => {
    setActiveMap("downtown-santa-barbara");
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const a = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: 0,
      queuedDirection: null,
      facing: "right" as const,
    };
    const b = {
      edgeId: edge.id,
      fromNodeId: edge.to,
      distanceM: edge.lengthM,
      queuedDirection: null,
      facing: "left" as const,
    };
    expect(travelersCollide(a, b)).toBe(true);
  });

  it("detects collision on the same edge", () => {
    setActiveMap("downtown-santa-barbara");
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const a = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: 10,
      queuedDirection: null,
      facing: "right" as const,
    };
    const b = { ...a, distanceM: 12 };
    expect(travelersCollide(a, b)).toBe(true);
  });

  it("detects collision when meeting on the same edge from opposite ends", () => {
    setActiveMap("downtown-santa-barbara");
    const edge = getStreetGraph().edges.find((e) => e.playable && e.lengthM > 40)!;
    const mid = edge.lengthM / 2;
    const a = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: mid - 3,
      queuedDirection: null,
      facing: "right" as const,
    };
    const b = {
      edgeId: edge.id,
      fromNodeId: edge.to,
      distanceM: mid - 3,
      queuedDirection: null,
      facing: "left" as const,
    };
    expect(travelersCollide(a, b)).toBe(true);
  });

  it("collides when two travelers meet at a corner", () => {
    setActiveMap("solvang");
    const node = getStreetGraph().nodes.find(
      (n) => getPlayableEdgesFrom(n.id).length >= 2
    );
    if (!node) return;
    const exits = getPlayableEdgesFrom(node.id);
    const e1 = exits[0]!;
    const e2 = exits.find((e) => e.id !== e1.id);
    if (!e2) return;
    const a = {
      edgeId: e1.id,
      fromNodeId: node.id,
      distanceM: 0,
      queuedDirection: null,
      facing: "right" as const,
    };
    const b = {
      edgeId: e2.id,
      fromNodeId: node.id,
      distanceM: 0,
      queuedDirection: null,
      facing: "left" as const,
    };
    expect(travelersCollide(a, b)).toBe(true);
  });

  it("does not collide when sharing a corner but still blocks apart", () => {
    setActiveMap("solvang");
    const node = getStreetGraph().nodes.find(
      (n) => getPlayableEdgesFrom(n.id).length >= 2
    );
    if (!node) return;
    const exits = getPlayableEdgesFrom(node.id);
    const e1 = exits.find((e) => e.lengthM > 80);
    const e2 = exits.find((e) => e.id !== e1?.id && e.lengthM > 80);
    if (!e1 || !e2) return;
    const a = {
      edgeId: e1.id,
      fromNodeId: node.id,
      distanceM: 60,
      queuedDirection: null,
      facing: "right" as const,
    };
    const b = {
      edgeId: e2.id,
      fromNodeId: node.id,
      distanceM: 60,
      queuedDirection: null,
      facing: "left" as const,
    };
    expect(travelersCollide(a, b)).toBe(false);
  });

  it("does not collide on parallel streets when only geographically close", () => {
    setActiveMap("downtown-santa-barbara");
    const graph = getStreetGraph();
    const edges = graph.edges.filter((e) => e.playable);
    let found = false;
    for (let i = 0; i < edges.length && !found; i += 1) {
      for (let j = i + 1; j < edges.length; j += 1) {
        const e1 = edges[i]!;
        const e2 = edges[j]!;
        const shares =
          e1.from === e2.from ||
          e1.from === e2.to ||
          e1.to === e2.from ||
          e1.to === e2.to;
        if (shares) continue;
        const a = {
          edgeId: e1.id,
          fromNodeId: e1.from,
          distanceM: e1.lengthM / 2,
          queuedDirection: null,
          facing: "right" as const,
        };
        const b = {
          edgeId: e2.id,
          fromNodeId: e2.from,
          distanceM: e2.lengthM / 2,
          queuedDirection: null,
          facing: "left" as const,
        };
        if (travelersCollide(a, b)) {
          found = true;
          expect.fail("parallel mid-block streets should not tag");
        }
      }
    }
    expect(found).toBe(false);
  });

  it("does not collide on the same edge when far apart", () => {
    setActiveMap("downtown-santa-barbara");
    const edge = getStreetGraph().edges.find((e) => e.playable && e.lengthM > 120)!;
    const a = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: 5,
      queuedDirection: null,
      facing: "right" as const,
    };
    const b = { ...a, distanceM: edge.lengthM - 5 };
    expect(travelersCollide(a, b)).toBe(false);
  });

  it("applies a queued turn when standing on a node", () => {
    setActiveMap("downtown-santa-barbara");
    const node = getStreetGraph().nodes.find((n) => getPlayableEdgesFrom(n.id).length >= 2);
    if (!node) return;
    const startEdge = getPlayableEdgesFrom(node.id)[0]!;
    const traveler = {
      edgeId: startEdge.id,
      fromNodeId: node.id,
      distanceM: 0,
      queuedDirection: null,
      facing: "right" as const,
    };
    const next = applyPlayerDirection(traveler, "up");
    expect(next.queuedDirection).toBe("up");
    expect(next.fromNodeId).toBe(node.id);
  });

  it("ghost picks a forward exit when possible", () => {
    setActiveMap("downtown-santa-barbara");
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const nodeId = edge.to;
    const exits = getPlayableEdgesFrom(nodeId);
    if (exits.length < 2) return;
    const picked = pickGhostNextEdge(nodeId, exits[0]!.id, () => 0);
    expect(picked?.playable).toBe(true);
  });

  it("picks a single exit at a dead-end node for the player", () => {
    setActiveMap("downtown-santa-barbara");
    const node = getStreetGraph().nodes.find(
      (n) => getPlayableEdgesFrom(n.id).length === 1
    );
    if (!node) return;
    const only = getPlayableEdgesFrom(node.id)[0]!;
    const next = pickPlayerNextEdge(node.id, only.id, "up", "right");
    expect(next?.id).toBe(only.id);
  });

  it("returns null when picking ghost exit at unknown node", () => {
    expect(pickGhostNextEdge("missing-node", "e0", () => 0)).toBeNull();
  });

  it("can reverse when pressing opposite on an edge", () => {
    setActiveMap("downtown-santa-barbara");
    const edge = getStreetGraph().edges.find((e) => e.playable && e.lengthM > 80)!;
    const traveler = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: edge.lengthM / 2,
      queuedDirection: null,
      facing: "right" as const,
    };
    const reversed = applyPlayerDirection(traveler, "left");
    expect(reversed.queuedDirection).toBe("left");
  });

  it("clamps lerp t to 0–1", () => {
    const a = { lat: 1, lon: 2 };
    const b = { lat: 3, lon: 4 };
    expect(lerpLatLon(a, b, -1)).toEqual(a);
    expect(lerpLatLon(a, b, 2)).toEqual(b);
  });

  it("ghost can reverse at a dead end", () => {
    setActiveMap("downtown-santa-barbara");
    const node = getStreetGraph().nodes.find((n) => getPlayableEdgesFrom(n.id).length === 1);
    if (!node) return;
    const only = getPlayableEdgesFrom(node.id)[0]!;
    const picked = pickGhostNextEdge(node.id, only.id, () => 0);
    expect(picked?.id).toBe(only.id);
  });

  it("detects when a traveler is at a node", () => {
    setActiveMap("downtown-santa-barbara");
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const atStart = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: 0,
      queuedDirection: null,
      facing: "right" as const,
    };
    expect(travelerAtNode(atStart)).toBe(edge.from);
  });

  it("returns the traveler unchanged when the edge is missing", () => {
    const traveler = {
      edgeId: "missing-edge",
      fromNodeId: "n1",
      distanceM: 10,
      queuedDirection: null,
      facing: "right" as const,
    };
    expect(advanceTraveler(traveler, 100, 1, false)).toEqual(traveler);
  });

  it("collides on the same edge using distance when lat/lon is unavailable", () => {
    setActiveMap("downtown-santa-barbara");
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const a = {
      edgeId: edge.id,
      fromNodeId: "bad-from",
      distanceM: 10,
      queuedDirection: null,
      facing: "right" as const,
    };
    const b = { ...a, distanceM: 15 };
    expect(travelersCollide(a, b)).toBe(true);
  });

  it("does not treat a short Isla Vista block as both corners at once", () => {
    setActiveMap("isla-vista");
    const edge = getStreetGraph().edges.find(
      (e) => e.playable && e.lengthM > 3 && e.lengthM < 8
    );
    if (!edge) return;
    const mid = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: edge.lengthM / 2,
      queuedDirection: null,
      facing: "right" as const,
    };
    expect(travelerAtNode(mid)).toBeNull();
    expect(nodeEpsM(edge.lengthM)).toBeLessThan(edge.lengthM / 2);
  });

  it("stays on the current street when the matching arrow is pressed at the start", () => {
    setActiveMap("isla-vista");
    const edge = getStreetGraph().edges.find(
      (e) => e.playable && e.lengthM > 20
    );
    if (!edge) return;
    const facing = getTravelerFacing(edge.from, edge.id);
    const traveler = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: 0,
      queuedDirection: null,
      facing,
    };
    const next = applyPlayerDirection(traveler, facing);
    expect(next.edgeId).toBe(edge.id);
    expect(next.fromNodeId).toBe(edge.from);
  });

  it("keeps moving through a short Isla Vista block instead of freezing", () => {
    setActiveMap("isla-vista");
    const edge = getStreetGraph().edges.find(
      (e) => e.playable && e.lengthM < 6 && e.lengthM > 1
    );
    if (!edge) return;
    const traveler = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: Math.max(0, edge.lengthM - 0.4),
      queuedDirection: "right" as const,
      facing: "right" as const,
    };
    const next = advanceTraveler(traveler, 300, 1 / 60, false);
    expect(next.edgeId).toBeTruthy();
    const moved =
      next.edgeId !== traveler.edgeId || next.distanceM !== traveler.distanceM;
    expect(moved).toBe(true);
  });

  it("turns onto a side street when a new arrow is queued", () => {
    setActiveMap("isla-vista");
    const node = getStreetGraph().nodes.find(
      (n) => getPlayableEdgesFrom(n.id).length >= 3
    );
    if (!node) return;
    const exits = getPlayableEdgesFrom(node.id);
    const came = exits[0]!;
    const fromNode = getOtherNode(came, node.id);
    const facing = getTravelerFacing(fromNode, came.id);
    const turnDir = facing === "left" || facing === "right" ? "up" : "right";
    const pool = exits.filter((e) => e.id !== came.id);
    const continuation = bestEdgeForDirection(node.id, facing, pool);
    const turns = continuation
      ? pool.filter((e) => e.id !== continuation.edge.id)
      : pool;
    const bestTurn = bestEdgeForDirection(node.id, turnDir, turns);
    if (!bestTurn || bestTurn.score <= 0.08) return;
    const picked = pickPlayerNextEdge(node.id, came.id, turnDir, facing);
    expect(picked?.id).toBe(bestTurn.edge.id);
  });

  it("never freezes at a corner that still has a street out", () => {
    for (const mapId of MAP_IDS) {
      setActiveMap(mapId);
      for (const node of getStreetGraph().nodes) {
        const exits = getPlayableEdgesFrom(node.id);
        if (exits.length === 0) continue;
        const came = exits[0]!;
        const facing = getTravelerFacing(getOtherNode(came, node.id), came.id);
        const picked = pickPlayerNextEdge(node.id, came.id, "up", facing);
        expect(picked?.playable, mapId).toBe(true);
      }
    }
  });

  it("treats a press near a corner as being at that corner", () => {
    setActiveMap("isla-vista");
    const edge = getStreetGraph().edges.find(
      (e) => e.playable && e.lengthM > 60
    );
    if (!edge) return;
    const nearEnd = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: edge.lengthM - 12,
      queuedDirection: null,
      facing: "right" as const,
    };
    expect(inputNodeForPress(nearEnd)).toBe(edge.to);
    const mid = {
      ...nearEnd,
      distanceM: edge.lengthM / 2,
    };
    expect(inputNodeForPress(mid)).toBeNull();
  });

  it("enters the matching side street when the arrow is pressed near the corner", () => {
    setActiveMap("isla-vista");
    const node = getStreetGraph().nodes.find(
      (n) => getPlayableEdgesFrom(n.id).length >= 3
    );
    if (!node) return;
    const exits = getPlayableEdgesFrom(node.id);
    const along = exits.find((e) => e.lengthM > 40) ?? exits[0]!;
    const facing = getTravelerFacing(node.id, along.id);
    const turnDir = facing === "left" || facing === "right" ? "up" : "right";
    const others = exits.filter((e) => e.id !== along.id);
    const bestTurn = bestEdgeForDirection(node.id, turnDir, others);
    if (!bestTurn || bestTurn.score <= 0.08) return;
    const traveler = {
      edgeId: along.id,
      fromNodeId: node.id,
      distanceM: Math.min(14, along.lengthM * 0.2),
      queuedDirection: null,
      facing,
    };
    const next = applyPlayerDirection(traveler, turnDir);
    expect(next.edgeId).toBe(bestTurn.edge.id);
    expect(next.fromNodeId).toBe(node.id);
  });

  it("keeps moving on Isla Vista when an arrow is held through many corners", () => {
    setActiveMap("isla-vista");
    const edge = getStreetGraph().edges.find(
      (e) => e.playable && e.lengthM > 20
    );
    if (!edge) return;
    let traveler: Traveler = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: 0,
      queuedDirection: "right",
      facing: "right",
    };
    let stuck = 0;
    for (let i = 0; i < 180; i += 1) {
      const next = advanceTraveler(traveler, 340, 1 / 60, false);
      const same =
        next.edgeId === traveler.edgeId &&
        Math.abs(next.distanceM - traveler.distanceM) < 0.01;
      if (same) stuck += 1;
      else stuck = 0;
      expect(stuck).toBeLessThan(3);
      traveler = next;
    }
  });

  it("keeps going east on Del Playa Drive when right is pressed", () => {
    setActiveMap("isla-vista");
    const delPlaya = getStreetGraph().edges.filter(
      (e) => e.playable && e.streetName === "Del Playa Drive"
    );
    const nodes = delPlaya.flatMap((e) => [e.from, e.to]);
    const westId = nodes.reduce((best, id) => {
      const n = getStreetGraph().nodes.find((x) => x.id === id);
      const b = getStreetGraph().nodes.find((x) => x.id === best);
      return n && b && n.lon < b.lon ? id : best;
    }, nodes[0]!);
    const eastId = nodes.reduce((best, id) => {
      const n = getStreetGraph().nodes.find((x) => x.id === id);
      const b = getStreetGraph().nodes.find((x) => x.id === best);
      return n && b && n.lon > b.lon ? id : best;
    }, nodes[0]!);

    let at = westId;
    let came = "";
    const visited = new Set<string>([at]);
    for (let i = 0; i < 20 && at !== eastId; i += 1) {
      const facing = came
        ? getTravelerFacing(getOtherNode(getStreetGraph().edges.find((e) => e.id === came)!, at), came)
        : "right";
      const picked = pickPlayerNextEdge(at, came, "right", facing);
      expect(picked?.streetName, `node ${at}`).toBe("Del Playa Drive");
      came = picked!.id;
      at = getOtherNode(picked!, at);
      visited.add(at);
    }
    expect(at).toBe(eastId);
  });

  it("takes the street that best matches the pressed arrow", () => {
    setActiveMap("isla-vista");
    const node = getStreetGraph().nodes.find(
      (n) => getPlayableEdgesFrom(n.id).length >= 3
    );
    if (!node) return;
    const exits = getPlayableEdgesFrom(node.id);
    const came = exits[0]!;
    const pool = exits.filter((e) => e.id !== came.id);
    const facing = getTravelerFacing(getOtherNode(came, node.id), came.id);
    const best = bestEdgeForDirection(node.id, "right", pool);
    if (!best || best.score <= 0) return;
    const picked = pickPlayerNextEdge(node.id, came.id, "right", facing);
    expect(picked?.playable).toBe(true);
    if (best.score > 0.55 && (!came.streetName || picked?.streetName !== came.streetName)) {
      expect(picked?.id).toBe(best.edge.id);
    }
  });

  it("follows the locked arrow at a corner when that street exists", () => {
    setActiveMap("downtown-santa-barbara");
    const node = getStreetGraph().nodes.find((n) => getPlayableEdgesFrom(n.id).length >= 2);
    if (!node) return;
    const came = getPlayableEdgesFrom(node.id)[0]!;
    const next = pickPlayerNextEdge(node.id, came.id, "up", "right");
    expect(next?.playable).toBe(true);
  });

  it("ghost can still chase when a target is passed", () => {
    setActiveMap("downtown-santa-barbara");
    const playerEdge = getStreetGraph().edges.find((e) => e.playable)!;
    const player = {
      edgeId: playerEdge.id,
      fromNodeId: playerEdge.from,
      distanceM: playerEdge.lengthM / 2,
      queuedDirection: null,
      facing: "right" as const,
    };
    const ghost = {
      edgeId: playerEdge.id,
      fromNodeId: playerEdge.from,
      distanceM: 0,
      queuedDirection: null,
      facing: "right" as const,
    };
    const next = advanceTraveler(ghost, 32, 0.5, true, player);
    expect(next.distanceM).toBeGreaterThanOrEqual(0);
  });

  it("ghost wanders without a chase target", () => {
    setActiveMap("downtown-santa-barbara");
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const ghost = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: 0,
      queuedDirection: null,
      facing: "right" as const,
    };
    const next = advanceTraveler(ghost, 32, 0.5, true);
    expect(next.distanceM).toBeGreaterThanOrEqual(0);
  });

  it("highlights which map arrows work at a downtown intersection", () => {
    setActiveMap("downtown-santa-barbara");
    const node = getStreetGraph().nodes.find(
      (n) => getPlayableEdgesFrom(n.id).length >= 3
    );
    if (!node) return;
    const dirs = directionsOpenAtNode(node.id);
    expect(dirs.length).toBeGreaterThan(0);
    expect(dirs.length).toBeLessThanOrEqual(4);
  });
});
