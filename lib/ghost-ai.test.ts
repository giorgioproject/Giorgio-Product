import { describe, expect, it } from "vitest";
import { getPlayableEdgesFrom, getStreetGraph } from "@/lib/street-graph";
import {
  pickGhostChaseEdge,
  pickGhostTurnEdge,
  pickGhostWanderEdge,
  spawnGhostChasingPlayer,
} from "@/lib/ghost-ai";

describe("ghost-ai", () => {
  it("picks an exit toward the player", () => {
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const player = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: edge.lengthM / 2,
      queuedDirection: null,
      facing: "right" as const,
    };
    const ghostNode = edge.to;
    const exits = getPlayableEdgesFrom(ghostNode);
    if (exits.length === 0) return;
    const picked = pickGhostChaseEdge(ghostNode, exits[0]!.id, player);
    expect(picked?.playable).toBe(true);
  });

  it("returns null when the ghost node has no exits", () => {
    expect(pickGhostChaseEdge("missing-node", "e0", {
      edgeId: getStreetGraph().edges.find((e) => e.playable)!.id,
      fromNodeId: getStreetGraph().edges.find((e) => e.playable)!.from,
      distanceM: 0,
      queuedDirection: null,
      facing: "right",
    })).toBeNull();
  });

  it("returns null when player position is unknown", () => {
    const picked = pickGhostChaseEdge("nope", "e0", {
      edgeId: "missing",
      fromNodeId: "x",
      distanceM: 0,
      queuedDirection: null,
      facing: "right",
    });
    expect(picked).toBeNull();
  });

  it("reverses at a dead end while chasing the player", () => {
    const node = getStreetGraph().nodes.find((n) => getPlayableEdgesFrom(n.id).length === 1);
    if (!node) return;
    const only = getPlayableEdgesFrom(node.id)[0]!;
    const playerEdge = getStreetGraph().edges.find((e) => e.playable && e.id !== only.id);
    if (!playerEdge) return;
    const player = {
      edgeId: playerEdge.id,
      fromNodeId: playerEdge.from,
      distanceM: playerEdge.lengthM / 2,
      queuedDirection: null,
      facing: "right" as const,
    };
    const picked = pickGhostChaseEdge(node.id, only.id, player);
    expect(picked?.id).toBe(only.id);
  });

  it("falls back when player position is unknown", () => {
    const ghost = spawnGhostChasingPlayer(
      {
        edgeId: "missing",
        fromNodeId: "x",
        distanceM: 0,
        queuedDirection: null,
        facing: "right",
      },
      () => 0.2
    );
    expect(ghost.edgeId).toBeTruthy();
  });

  it("spawns the ghost on a chase edge toward the player", () => {
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const player = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: edge.lengthM / 2,
      queuedDirection: null,
      facing: "right" as const,
    };
    const ghost = spawnGhostChasingPlayer(player, () => 0.2);
    expect(ghost.edgeId).toBeTruthy();
    expect(ghost.distanceM).toBe(0);
  });

  it("uses fallback spawn when no ghost is within range", () => {
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const player = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: edge.lengthM / 2,
      queuedDirection: null,
      facing: "right" as const,
    };
    const ghost = spawnGhostChasingPlayer(player, () => 0.99, 1);
    expect(ghost.edgeId).toBeTruthy();
  });

  it("hunts when the chase roll is low", () => {
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const player = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: edge.lengthM / 2,
      queuedDirection: null,
      facing: "right" as const,
    };
    const hunted = pickGhostChaseEdge(edge.to, "", player);
    const rolled = pickGhostTurnEdge(edge.to, "", player, () => 0);
    expect(rolled?.id).toBe(hunted?.id);
  });

  it("wanders when the chase roll is high", () => {
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const player = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: edge.lengthM / 2,
      queuedDirection: null,
      facing: "right" as const,
    };
    const wandered = pickGhostWanderEdge(edge.to, "", () => 0.99);
    const rolled = pickGhostTurnEdge(edge.to, "", player, () => 0.99);
    expect(rolled?.id).toBe(wandered?.id);
  });

  it("wanders when there is no player to chase", () => {
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const rolled = pickGhostTurnEdge(edge.to, "", undefined, () => 0);
    expect(rolled?.playable).toBe(true);
  });

  it("picks among all exits when cameFromEdgeId is empty", () => {
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const player = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      distanceM: edge.lengthM / 2,
      queuedDirection: null,
      facing: "right" as const,
    };
    const picked = pickGhostChaseEdge(edge.to, "", player);
    expect(picked?.playable).toBe(true);
  });
});
