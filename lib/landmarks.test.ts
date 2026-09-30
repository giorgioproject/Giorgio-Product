import { describe, expect, it } from "vitest";
import {
  filterLandmarksInBbox,
  isLandmarkInBbox,
  landmarkKindLabel,
  MIN_LANDMARKS_PER_MAP,
} from "@/lib/landmarks";
import { getGraphDataForMap, getLandmarksForMap, MAP_IDS } from "@/lib/maps";
import { getStreetGraph, setActiveMap } from "@/lib/street-graph";

describe("landmarks", () => {
  it("has at least five places on every map", () => {
    for (const mapId of MAP_IDS) {
      expect(getLandmarksForMap(mapId).length).toBeGreaterThanOrEqual(
        MIN_LANDMARKS_PER_MAP
      );
    }
  });

  it("keeps only landmarks inside the playable map box", () => {
    for (const mapId of MAP_IDS) {
      setActiveMap(mapId);
      const bbox = getStreetGraph().bbox;
      for (const lm of getLandmarksForMap(mapId)) {
        expect(isLandmarkInBbox(lm, bbox)).toBe(true);
      }
    }
  });

  it("labels landmark kinds for the info card", () => {
    expect(landmarkKindLabel("restaurant")).toBe("Restaurant");
    expect(landmarkKindLabel("windmill")).toBe("Windmill");
  });

  it("filters out-of-bbox entries", () => {
    const bbox = getGraphDataForMap("isla-vista").bbox;
    const sample = getLandmarksForMap("isla-vista");
    const outside = { ...sample[0]!, lat: bbox.north + 0.05 };
    expect(
      filterLandmarksInBbox([...sample, outside], bbox).length
    ).toBe(sample.length);
  });

  it("includes Freebirds on Isla Vista", () => {
    const names = getLandmarksForMap("isla-vista").map((lm) => lm.name);
    expect(names.some((n) => /freebirds/i.test(n))).toBe(true);
  });

  it("includes a photo path for each landmark", () => {
    for (const mapId of [
      "isla-vista",
      "solvang",
      "downtown-santa-barbara",
    ] as const) {
      for (const lm of getLandmarksForMap(mapId)) {
        expect(lm.imageUrl.length).toBeGreaterThan(0);
      }
    }
  });

  it("places Isla Vista pins on OpenStreetMap coordinates (879 Embarcadero Freebirds)", () => {
    const freebirds = getLandmarksForMap("isla-vista").find((lm) => lm.id === "iv-freebirds");
    expect(freebirds?.lat).toBeCloseTo(34.4132715, 5);
    expect(freebirds?.lon).toBeCloseTo(-119.8555834, 5);
  });
});
