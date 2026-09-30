import { describe, expect, it } from "vitest";
import { createInitialGame } from "@/lib/game-state";
import { getGhostCountForMap } from "@/lib/maps";
import { getStreetGraph, setActiveMap } from "@/lib/street-graph";
import { getTravelerLatLon } from "@/lib/movement";
import {
  buildMapStartSpawns,
  buildOpposingCornerSpawns,
  mapDiagonalM,
  MIN_GHOST_PLAYER_SEPARATION_RATIO,
  respawnGhostsSpread,
  spawnSeparationM,
} from "@/lib/spawn";

describe("spawn", () => {
  it("keeps ghosts far from the player on every map", () => {
    for (const mapId of [
      "downtown-santa-barbara",
      "solvang",
      "isla-vista",
    ] as const) {
      setActiveMap(mapId);
      const count = getGhostCountForMap(mapId);
      const minSep = mapDiagonalM() * MIN_GHOST_PLAYER_SEPARATION_RATIO;
      const { player, ghosts } = buildMapStartSpawns(
        () => (mapId.length * 0.07 + count * 0.03) % 1,
        count
      );
      expect(ghosts.length).toBe(count);
      for (const ghost of ghosts) {
        expect(spawnSeparationM(player, ghost)).toBeGreaterThan(150);
      }
    }
  });

  it("spawns the correct ghost count per map", () => {
    setActiveMap("downtown-santa-barbara");
    const game = createInitialGame(() => 0.5, { ghostCount: 4 });
    expect(game.ghosts).toHaveLength(4);
    setActiveMap("solvang");
    expect(createInitialGame(() => 0.5, { ghostCount: 2 }).ghosts).toHaveLength(2);
    setActiveMap("isla-vista");
    expect(createInitialGame(() => 0.5, { ghostCount: 1 }).ghosts).toHaveLength(
      1
    );
  });

  it("supports the legacy single-ghost spawn helper", () => {
    setActiveMap("isla-vista");
    const { player, ghost } = buildOpposingCornerSpawns(() => 0.25);
    expect(spawnSeparationM(player, ghost)).toBeGreaterThan(150);
  });

  it("still spreads four ghosts on downtown when corner picks are crowded", () => {
    setActiveMap("downtown-santa-barbara");
    for (let seed = 0; seed < 40; seed += 1) {
      const rng = () => (seed * 0.037 + 0.991) % 1;
      const { player, ghosts } = buildMapStartSpawns(rng, 4);
      expect(ghosts).toHaveLength(4);
      for (const ghost of ghosts) {
        expect(spawnSeparationM(player, ghost)).toBeGreaterThan(130);
      }
    }
  });

  it("respawns when the player position is unknown", () => {
    setActiveMap("solvang");
    const player = {
      edgeId: "missing",
      fromNodeId: "missing",
      distanceM: 0,
      queuedDirection: null,
      facing: "right" as const,
    };
    expect(respawnGhostsSpread(player, 2, () => 0.5)).toHaveLength(2);
  });

  it("respawns multiple ghosts away from the player", () => {
    setActiveMap("solvang");
    const { player } = buildMapStartSpawns(() => 0.44, 1);
    const ghosts = respawnGhostsSpread(player, 2, () => 0.61);
    expect(ghosts).toHaveLength(2);
    for (const ghost of ghosts) {
      expect(spawnSeparationM(player, ghost)).toBeGreaterThan(150);
    }
  });

  it("places the player on a playable street", () => {
    setActiveMap("solvang");
    const { player } = buildMapStartSpawns(() => 0.2, 2);
    expect(getTravelerLatLon(player)).toBeTruthy();
    const edge = getStreetGraph().edges.find((e) => e.id === player.edgeId);
    expect(edge?.playable).toBe(true);
  });
});
