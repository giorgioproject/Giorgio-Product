import { describe, expect, it } from "vitest";
import {
  formatStreetLabelName,
  layoutStreetLabelsForMap,
} from "@/lib/street-label-layout";
import { getStreetGraph, getStreetLabels, setActiveMap } from "@/lib/street-graph";

describe("street-label-layout", () => {
  it("shortens downtown street names for map chips", () => {
    expect(formatStreetLabelName("State Street", "downtown-santa-barbara")).toBe(
      "State St"
    );
    expect(
      formatStreetLabelName("East Cabrillo Boulevard", "downtown-santa-barbara")
    ).toBe("East Cabrillo Blvd");
    expect(formatStreetLabelName("State Street", "isla-vista")).toBe("State Street");
  });

  it("avoids overlapping downtown labels in the south-east cluster", () => {
    setActiveMap("downtown-santa-barbara");
    const graph = getStreetGraph();
    const raw = getStreetLabels();
    const placed = layoutStreetLabelsForMap(
      "downtown-santa-barbara",
      raw,
      graph.bbox,
      900,
      640
    );
    expect(placed.length).toBeGreaterThan(4);
    expect(placed.length).toBeLessThanOrEqual(10);

    const pad = 8;
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i]!;
        const b = placed[j]!;
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        expect(dx + dy).toBeGreaterThan(pad);
      }
    }

    const southEast = placed.filter((p) => p.x >= 450 && p.y >= 320);
    expect(southEast.length).toBeLessThanOrEqual(3);
  });

  it("keeps State Street on downtown", () => {
    setActiveMap("downtown-santa-barbara");
    const graph = getStreetGraph();
    const placed = layoutStreetLabelsForMap(
      "downtown-santa-barbara",
      getStreetLabels(),
      graph.bbox,
      900,
      640
    );
    expect(placed.some((p) => p.key === "State Street")).toBe(true);
    expect(placed[0]?.key).toBe("State Street");
  });
});
