import { describe, expect, it } from "vitest";
import { getStreetGraph, isDeadEndSpurEdge } from "@/lib/street-graph";
import { setActiveMap } from "@/lib/street-graph";
import {
  buildPelletSlots,
  pelletCountOnEdge,
  PELLET_SPACING_M,
  eatPellet,
  findPelletNear,
  pelletFromNodeId,
  placeAllPellets,
  placePelletsForCount,
  placePelletsOnEdge,
  slotsToPellets,
} from "@/lib/pellets";
import { getMapById } from "@/lib/maps";

describe("pellets", () => {
  const playable = getStreetGraph().edges.find((e) => e.playable && e.lengthM > 120)!;

  it("places one pellet in the middle of a long street", () => {
    const pellets = placePelletsOnEdge(playable.id, PELLET_SPACING_M);
    expect(pellets).toHaveLength(1);
    expect(pellets[0]!.distanceM).toBeCloseTo(playable.lengthM / 2);
  });

  it("removes eaten pellet", () => {
    const pellets = placePelletsOnEdge(playable.id, PELLET_SPACING_M);
    const remaining = eatPellet(pellets, pellets[0]!.id);
    expect(remaining).toHaveLength(pellets.length - 1);
  });

  it("finds pellet near player position", () => {
    const pellets = placePelletsOnEdge(playable.id, PELLET_SPACING_M);
    const hit = findPelletNear(pellets, playable.id, pellets[0]!.distanceM);
    expect(hit?.id).toBe(pellets[0]!.id);
  });

  it("places pellets on through-streets only", () => {
    const ids = getStreetGraph().edges.filter((e) => e.playable).map((e) => e.id);
    const pellets = placeAllPellets(ids);
    expect(pellets.length).toBeGreaterThan(0);
    expect(pellets.length).toBeLessThan(ids.length * 3);
  });

  it("returns from-node id for pellet placement", () => {
    expect(pelletFromNodeId(playable.id)).toBe(playable.from);
    expect(pelletFromNodeId("missing")).toBe("");
  });

  it("skips short or closed edges", () => {
    const closed = getStreetGraph().edges.find((e) => !e.playable)!;
    expect(placePelletsOnEdge(closed.id)).toEqual([]);
    const short = { ...getStreetGraph().edges.find((e) => e.playable)!, lengthM: 10 };
    expect(placePelletsOnEdge(short.id).length).toBeGreaterThanOrEqual(0);
  });

  it("skips dead-end spur streets", () => {
    const deadEnd = getStreetGraph().edges.find(
      (e) => e.playable && isDeadEndSpurEdge(e.id)
    );
    if (!deadEnd) return;
    expect(placePelletsOnEdge(deadEnd.id)).toEqual([]);
  });

  it("returns zero pellets for non-positive targets", () => {
    expect(placePelletsForCount([], 0)).toEqual([]);
    expect(placePelletsForCount([], -3)).toEqual([]);
  });

  it("samples down when the map has more slots than the target", () => {
    const ids = getStreetGraph().edges.filter((e) => e.playable).map((e) => e.id);
    const slots = buildPelletSlots(ids, 40);
    expect(slots.length).toBeGreaterThan(10);
    const pellets = placePelletsForCount(ids, 8, 40);
    expect(pellets).toHaveLength(8);
  });

  it("builds slots and pellets without a fixed target", () => {
    const ids = getStreetGraph().edges.filter((e) => e.playable).map((e) => e.id);
    const slots = buildPelletSlots(ids, PELLET_SPACING_M);
    expect(slotsToPellets(slots).length).toBe(slots.length);
    expect(placeAllPellets(ids, PELLET_SPACING_M).length).toBe(slots.length);
  });

  it("ignores edges that are too short for a pellet", () => {
    expect(pelletCountOnEdge(10, PELLET_SPACING_M)).toBe(0);
    expect(pelletCountOnEdge(200, PELLET_SPACING_M)).toBeGreaterThan(0);
  });

  it("fills toward the target when spacing leaves too few slots", () => {
    setActiveMap("isla-vista");
    const ids = getStreetGraph().edges.filter((e) => e.playable).map((e) => e.id);
    const baseline = buildPelletSlots(ids, 800);
    const pellets = placePelletsForCount(ids, baseline.length + 1, 800);
    expect(pellets.length).toBeGreaterThan(baseline.length);
  });

  it("places exact pellet counts per map catalog", () => {
    for (const mapId of [
      "isla-vista",
      "solvang",
      "downtown-santa-barbara",
    ] as const) {
      setActiveMap(mapId);
      const map = getMapById(mapId);
      const ids = getStreetGraph().edges.filter((e) => e.playable).map((e) => e.id);
      const pellets = placePelletsForCount(
        ids,
        map.pelletCount,
        map.pelletSpacingM
      );
      expect(pellets).toHaveLength(map.pelletCount);
    }
  });

  it("places no pellets on any spur edge", () => {
    const ids = getStreetGraph().edges.filter((e) => e.playable).map((e) => e.id);
    const pellets = placeAllPellets(ids);
    for (const p of pellets) {
      expect(isDeadEndSpurEdge(p.edgeId)).toBe(false);
    }
  });
});
