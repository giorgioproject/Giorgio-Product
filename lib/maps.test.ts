import { describe, expect, it } from "vitest";
import { createInitialGame } from "@/lib/game-state";
import {
  DEFAULT_MAP_ID,
  getGhostCountForMap,
  getGraphDataForMap,
  getLandmarksForMap,
  getMapById,
  getMapCatalog,
  getPelletCountForMap,
  getPlayGraphForMap,
  getPlayerSpeedForMap,
  getSimSubstepsForMap,
  isMapId,
  mapUsesFocusCamera,
} from "@/lib/maps";
import { setActiveMap, getStreetGraph } from "@/lib/street-graph";

describe("maps", () => {
  it("lists three playable maps", () => {
    expect(getMapCatalog()).toHaveLength(3);
  });

  it("lists maps from easiest to hardest", () => {
    expect(getMapCatalog().map((m) => m.difficulty)).toEqual([
      "Easy",
      "Medium",
      "Hard",
    ]);
  });

  it("validates map ids", () => {
    expect(isMapId("solvang")).toBe(true);
    expect(isMapId("nope")).toBe(false);
  });

  it("loads graph data per map", () => {
    const downtown = getGraphDataForMap("downtown-santa-barbara");
    const solvang = getGraphDataForMap("solvang");
    expect(downtown.nodes.length).toBeGreaterThan(100);
    expect(solvang.nodes.length).toBeGreaterThan(200);
    expect(getGraphDataForMap("isla-vista").nodes.length).toBeGreaterThan(100);
    expect(downtown.nodes.length).not.toBe(solvang.nodes.length);
    expect(getPlayGraphForMap("isla-vista").nodes.length).toBe(
      getGraphDataForMap("isla-vista").nodes.length
    );
    expect(getPlayGraphForMap("downtown-santa-barbara").bbox).not.toEqual(
      downtown.bbox
    );
  });

  it("switches active street graph by map id", () => {
    setActiveMap(DEFAULT_MAP_ID);
    const before = getStreetGraph().nodes.length;
    setActiveMap("solvang");
    expect(getStreetGraph().nodes.length).not.toBe(before);
    setActiveMap(DEFAULT_MAP_ID);
  });

  it("returns landmarks for each map", () => {
    expect(getLandmarksForMap("downtown-santa-barbara").length).toBeGreaterThanOrEqual(5);
    expect(getLandmarksForMap("solvang").length).toBeGreaterThanOrEqual(5);
    expect(getLandmarksForMap("isla-vista").length).toBeGreaterThanOrEqual(5);
  });

  it("resolves catalog entry by id", () => {
    const map = getMapById("isla-vista");
    expect(map.name).toMatch(/Isla Vista/i);
    expect(map.pelletSpacingM).toBeGreaterThan(0);
    expect(map.pelletCount).toBeGreaterThan(0);
    expect(map.difficulty).toBe("Easy");
    expect(map.ghostCount).toBe(1);
    expect(map.landscapeImage).toMatch(/\/maps\/landscape-isla-vista\.jpg$/);
    expect(getMapById("solvang").landscapeImage).toMatch(/landscape-solvang/);
    expect(getMapById("downtown-santa-barbara").landscapeImage).toMatch(
      /landscape-downtown-waterfront/
    );
    expect(getMapById("solvang").ghostCount).toBe(2);
    expect(getMapById("downtown-santa-barbara").ghostCount).toBe(4);
  });

  it("uses map-specific player speed", () => {
    expect(getPlayerSpeedForMap("downtown-santa-barbara")).toBe(460);
    expect(getPlayerSpeedForMap("solvang")).toBe(320);
    expect(getPlayerSpeedForMap("isla-vista")).toBe(300);
    expect(getPlayerSpeedForMap("solvang")).toBeLessThan(
      getPlayerSpeedForMap("downtown-santa-barbara")
    );
  });

  it("uses the same sim substeps on every map", () => {
    expect(getSimSubstepsForMap("downtown-santa-barbara")).toBe(48);
    expect(getSimSubstepsForMap("solvang")).toBe(48);
    expect(getSimSubstepsForMap("isla-vista")).toBe(48);
  });

  it("assigns ghost counts by difficulty", () => {
    expect(getGhostCountForMap("isla-vista")).toBe(1);
    expect(getGhostCountForMap("solvang")).toBe(2);
    expect(getGhostCountForMap("downtown-santa-barbara")).toBe(4);
  });

  it("uses focus camera on every map", () => {
    expect(mapUsesFocusCamera("solvang")).toBe(true);
    expect(mapUsesFocusCamera("isla-vista")).toBe(true);
  });

  it("places the configured pellet count on every map", () => {
    expect(getPelletCountForMap("isla-vista")).toBe(35);
    expect(getPelletCountForMap("solvang")).toBe(45);
    expect(getPelletCountForMap("downtown-santa-barbara")).toBe(60);

    for (const mapId of [
      "downtown-santa-barbara",
      "solvang",
      "isla-vista",
    ] as const) {
      setActiveMap(mapId);
      const map = getMapById(mapId);
      const game = createInitialGame(() => 0.5, {
        pelletCount: map.pelletCount,
        pelletSpacingM: map.pelletSpacingM,
        startWithOverview: true,
        ghostCount: getMapById(mapId).ghostCount,
        simSubsteps: 48,
      });
      expect(game.pellets.length).toBe(map.pelletCount);
      expect(game.initialPelletCount).toBe(map.pelletCount);
    }
  });
});
