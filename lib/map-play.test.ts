import { describe, expect, it } from "vitest";
import {
  cornerInputEpsM,
  directionPickMinScore,
  mapUsesFlattenedPlay,
  playerTurnScoreFloor,
} from "@/lib/map-play";

describe("map-play", () => {
  it("uses kid-friendly controls only on downtown", () => {
    expect(mapUsesFlattenedPlay("downtown-santa-barbara")).toBe(true);
    expect(mapUsesFlattenedPlay("isla-vista")).toBe(false);
    expect(directionPickMinScore("downtown-santa-barbara")).toBeLessThan(
      directionPickMinScore("isla-vista")
    );
    expect(cornerInputEpsM("downtown-santa-barbara")).toBeGreaterThan(
      cornerInputEpsM("isla-vista")
    );
    expect(playerTurnScoreFloor("downtown-santa-barbara")).toBeLessThan(
      playerTurnScoreFloor("isla-vista")
    );
  });
});
