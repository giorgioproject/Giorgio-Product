import { afterEach, describe, expect, it, vi } from "vitest";
import { generateRunRecapLines } from "@/lib/openai";
import type { RunRecapInput } from "@/lib/recap";

const baseInput: RunRecapInput = {
  mapName: "Isla Vista",
  mapId: "isla-vista",
  outcome: "won",
  score: 10,
  streetNames: ["Del Playa Drive"],
  landmarkIds: ["iv-freebirds"],
};

const catalog = [
  {
    id: "iv-freebirds",
    name: "Freebirds World Burrito",
    blurb: "Look for the big burrito spot on Embarcadero.",
  },
];

describe("openai recap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
  });

  it("returns null when no API key is set", async () => {
    expect(await generateRunRecapLines(baseInput, catalog)).toBeNull();
  });

  it("returns parsed lines from a successful model response", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content:
                  "You raced Del Playa Drive in Isla Vista.\nFreebirds World Burrito is the big burrito spot on Embarcadero.\nTomorrow walk to Pardall Tunnel and see the painted walls.",
              },
            },
          ],
        }),
      }))
    );
    const lines = await generateRunRecapLines(baseInput, catalog);
    expect(lines).toHaveLength(3);
    expect(lines![0]).toMatch(/Del Playa/i);
  });

  it("returns null when the API responds with an error", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({}),
      }))
    );
    expect(await generateRunRecapLines(baseInput, catalog)).toBeNull();
  });

  it("returns null when the model returns blank text", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ finish_reason: "stop", message: { content: "   " } }],
        }),
      }))
    );
    expect(await generateRunRecapLines(baseInput, catalog)).toBeNull();
  });

  it("returns null for a caught run when the payload is invalid JSON shape", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [] }),
      }))
    );
    expect(
      await generateRunRecapLines(
        { ...baseInput, outcome: "caught" },
        catalog
      )
    ).toBeNull();
  });
});
