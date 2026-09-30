import { describe, expect, it } from "vitest";
import { getLandmarkImageUrl } from "@/lib/landmark-image";
import { getLandmarksForMap } from "@/lib/maps";

describe("landmark-image", () => {
  it("resolves a public photo path for every seeded place", () => {
    for (const mapId of [
      "isla-vista",
      "solvang",
      "downtown-santa-barbara",
    ] as const) {
      for (const lm of getLandmarksForMap(mapId)) {
        expect(lm.imageUrl).toMatch(/^\/landmarks\/.+\.jpg$/);
        expect(getLandmarkImageUrl(lm)).toBe(lm.imageUrl);
      }
    }
  });
});
