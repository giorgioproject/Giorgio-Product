import { describe, expect, it } from "vitest";
import downtownRaw from "@/data/graph-downtown-santa-barbara.json";
import {
  cardinalPlayableEdgeRatio,
  flattenGraphForCardinalPlay,
  padBboxSouth,
} from "@/lib/flatten-graph";
import type { StreetGraphData } from "@/lib/street-graph";
import { getStreetGraph, setActiveMap } from "@/lib/street-graph";

describe("flatten-graph", () => {
  it("aligns downtown streets with map up/down/left/right", () => {
    const raw = downtownRaw as StreetGraphData;
    expect(cardinalPlayableEdgeRatio(raw)).toBeLessThan(0.2);
    expect(cardinalPlayableEdgeRatio(flattenGraphForCardinalPlay(raw))).toBeGreaterThan(
      0.85
    );
  });

  it("loads a kid-friendly downtown graph in the game", () => {
    setActiveMap("downtown-santa-barbara");
    const graph = getStreetGraph();
    const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
    let cardinal = 0;
    let playable = 0;
    for (const edge of graph.edges) {
      if (!edge.playable) continue;
      playable += 1;
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) continue;
      const mapW = graph.bbox.east - graph.bbox.west;
      const mapH = graph.bbox.north - graph.bbox.south;
      const dx = (to.lon - from.lon) / mapW;
      const dy = (-(to.lat - from.lat)) / mapH;
      if (Math.abs(dx) > Math.abs(dy) * 2 || Math.abs(dy) > Math.abs(dx) * 2) {
        cardinal += 1;
      }
    }
    expect(cardinal / playable).toBeGreaterThan(0.85);
  });

  it("leaves a south strip under downtown streets for the ocean", () => {
    const bbox = { south: 34.4, west: -119.72, north: 34.43, east: -119.68 };
    expect(padBboxSouth(bbox, 0).south).toBe(bbox.south);
    expect(padBboxSouth(bbox, 0.16).south).toBeLessThan(bbox.south);
    const flattened = flattenGraphForCardinalPlay(downtownRaw as StreetGraphData);
    expect(flattened.bbox.south).toBeLessThan(
      (downtownRaw as StreetGraphData).bbox.south
    );
  });
});
