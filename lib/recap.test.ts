import { describe, expect, it } from "vitest";
import {
  buildRunRecapInput,
  completeSentence,
  emptyRunLog,
  fallbackRecapLines,
  finalizeRecapLines,
  landmarkBlurbLine,
  landmarkRecapSentence,
  landmarksForRecap,
  noteLandmarkOpened,
  notePlayerEdge,
  parseRecapModelText,
} from "@/lib/recap";
import { setActiveMap, getStreetGraph } from "@/lib/street-graph";

describe("recap", () => {
  it("tracks streets and landmarks without duplicates", () => {
    setActiveMap("isla-vista");
    const edge = getStreetGraph().edges.find((e) => e.playable && e.streetName)!;
    let log = emptyRunLog();
    log = notePlayerEdge(log, edge.id);
    log = notePlayerEdge(log, edge.id);
    expect(log.streetNames).toEqual([edge.streetName]);
    log = noteLandmarkOpened(log, "iv-freebirds");
    log = noteLandmarkOpened(log, "iv-freebirds");
    expect(log.landmarkIds).toEqual(["iv-freebirds"]);
  });

  it("builds recap input from a run log", () => {
    const input = buildRunRecapInput({
      mapId: "isla-vista",
      mapName: "Isla Vista",
      outcome: "won",
      score: 12,
      runLog: { streetNames: ["Del Playa Drive"], landmarkIds: ["iv-deli-mart"] },
    });
    expect(input.mapName).toBe("Isla Vista");
    expect(input.score).toBe(12);
    expect(input.streetNames).toContain("Del Playa Drive");
  });

  it("returns three fallback lines from landmark blurbs", () => {
    const catalog = [
      {
        id: "a",
        name: "Freebirds",
        blurb: "Big burritos on Embarcadero. A classic stop.",
      },
      {
        id: "b",
        name: "Perfect Park",
        blurb: "A grassy triangle where friends meet.",
      },
    ];
    const lines = fallbackRecapLines(
      {
        mapId: "isla-vista",
        mapName: "Isla Vista",
        outcome: "caught",
        score: 5,
        streetNames: ["Del Playa Drive"],
        landmarkIds: ["a"],
      },
      catalog
    );
    expect(lines).toHaveLength(3);
    expect(lines.join(" ")).toMatch(/Del Playa/i);
    expect(lines.join(" ")).toMatch(/Freebirds/i);
  });

  it("prefers visited landmarks in recap picks", () => {
    const catalog = [
      { id: "a", name: "A", blurb: "First." },
      { id: "b", name: "B", blurb: "Second." },
      { id: "c", name: "C", blurb: "Third." },
    ];
    const picked = landmarksForRecap(["c"], catalog);
    expect(picked[0]?.id).toBe("c");
    expect(picked.length).toBe(3);
  });

  it("parses model text into up to three lines", () => {
    expect(
      parseRecapModelText("You ran Del Playa.\nYou saw Freebirds.\nScore 10!")
    ).toEqual(["You ran Del Playa.", "You saw Freebirds.", "Score 10!"]);
    expect(parseRecapModelText("")).toBeNull();
  });

  it("keeps full landmark blurbs without chopping on I.V.", () => {
    const line = landmarkBlurbLine(
      "879 Embarcadero del Norte — the big burrito spot where I.V. meets for lunch and late-night runs"
    );
    expect(line).toMatch(/I\.V\. meets for lunch/);
    expect(line.endsWith(".")).toBe(true);
  });

  it("splits a single model paragraph into sentences", () => {
    expect(
      parseRecapModelText(
        "You ran Del Playa. You opened Freebirds. Try the tunnel tomorrow."
      )
    ).toEqual([
      "You ran Del Playa.",
      "You opened Freebirds.",
      "Try the tunnel tomorrow.",
    ]);
  });

  it("uses full fallback when AI lines are incomplete or template-like", () => {
    const input = {
      mapId: "isla-vista" as const,
      mapName: "Isla Vista",
      outcome: "caught" as const,
      score: 3,
      streetNames: ["Del Playa Drive"],
      landmarkIds: ["iv-freebirds"],
    };
    const catalog = [
      {
        id: "iv-freebirds",
        name: "Freebirds",
        blurb: "Big burritos on Embarcadero.",
      },
    ];
    const merged = finalizeRecapLines(
      ["You ran Del Playa.", "Tomorrow look for Freebirds and the"],
      input,
      catalog
    );
    expect(merged).toEqual(fallbackRecapLines(input, catalog));
    expect(merged[1]).toMatch(/Freebirds:/);
  });

  it("matches the Isla Vista fallback the user saw, but with full sentences", () => {
    const catalog = [
      {
        id: "iv-freebirds",
        name: "Freebirds World Burrito",
        blurb:
          "879 Embarcadero del Norte — the big burrito spot where I.V. meets for lunch and late-night runs",
      },
      {
        id: "iv-deli-mart",
        name: "I.V. Deli Mart",
        blurb:
          "6553 Pardall Road — the corner store everyone knows for snacks, drinks, and late-night stops",
      },
      {
        id: "iv-pardall-tunnel",
        name: "Pardall Tunnel",
        blurb:
          "The foot tunnel under Highway 217 at Pardall — painted walls and the walk between I.V. and UCSB",
      },
    ];
    const lines = fallbackRecapLines(
      {
        mapId: "isla-vista",
        mapName: "Isla Vista",
        outcome: "caught",
        score: 8,
        streetNames: ["El Colegio Road", "Ocean Road", "Camino Corto"],
        landmarkIds: ["iv-freebirds", "iv-deli-mart", "iv-pardall-tunnel"],
      },
      catalog
    );
    expect(lines[0]).toMatch(/El Colegio Road/);
    expect(lines[1]).toMatch(/Freebirds World Burrito is the big burrito spot/);
    expect(lines[2]).toMatch(/I\.V\. Deli Mart and Pardall Tunnel/);
    expect(lines.every((line) => /^[A-Z]/.test(line))).toBe(true);
  });

  it("handles empty blurbs and titles that start with The", () => {
    expect(landmarkRecapSentence("Tunnel", "   ")).toMatch(/find Tunnel/);
    expect(
      landmarkRecapSentence(
        "Pardall Tunnel",
        "The foot tunnel under Highway 217 at Pardall"
      )
    ).toMatch(/Pardall Tunnel is the foot tunnel/);
  });

  it("uses won encouragement when only one landmark was opened", () => {
    const lines = fallbackRecapLines(
      {
        mapId: "isla-vista",
        mapName: "Isla Vista",
        outcome: "won",
        score: 35,
        streetNames: ["Del Playa Drive"],
        landmarkIds: ["iv-freebirds"],
      },
      [
        {
          id: "iv-freebirds",
          name: "Freebirds",
          blurb: "879 Embarcadero — the burrito spot.",
        },
      ]
    );
    expect(lines[2]).toMatch(/cleared every pellet/);
  });

  it("uses two catalog landmarks when none were opened", () => {
    const lines = fallbackRecapLines(
      {
        mapId: "solvang",
        mapName: "Solvang",
        outcome: "caught",
        score: 2,
        streetNames: [],
        landmarkIds: [],
      },
      [
        { id: "a", name: "Windmill", blurb: "A tall windmill." },
        { id: "b", name: "Bakery", blurb: "A danish bakery." },
      ]
    );
    expect(lines[1]).toMatch(/Windmill/);
    expect(lines[2]).toMatch(/Bakery/);
  });

  it("uses a single catalog landmark when none were opened", () => {
    const lines = fallbackRecapLines(
      {
        mapId: "solvang",
        mapName: "Solvang",
        outcome: "caught",
        score: 2,
        streetNames: [],
        landmarkIds: [],
      },
      [{ id: "only", name: "Windmill", blurb: "A tall windmill in town." }]
    );
    expect(lines[1]).toMatch(/Windmill/);
    expect(lines[2]).toMatch(/spot Windmill for real/);
  });

  it("turns blurbs into named sentences", () => {
    expect(
      landmarkRecapSentence(
        "Freebirds World Burrito",
        "879 Embarcadero del Norte — the big burrito spot where I.V. meets for lunch and late-night runs"
      )
    ).toBe(
      "Freebirds World Burrito is the big burrito spot where I.V. meets for lunch and late-night runs."
    );
  });

  it("adds closing punctuation when missing", () => {
    expect(completeSentence("See you on Del Playa")).toBe(
      "See you on Del Playa."
    );
  });

  it("builds fallback when no streets or landmarks were logged", () => {
    const lines = fallbackRecapLines(
      {
        mapId: "solvang",
        mapName: "Solvang",
        outcome: "won",
        score: 0,
        streetNames: [],
        landmarkIds: [],
      },
      [{ id: "x", name: "Windmill", blurb: "A tall landmark in town." }]
    );
    expect(lines[0]).toMatch(/Solvang/);
    expect(lines[1]).toMatch(/Windmill/);
    expect(lines.every((line) => /[.!?]$/.test(line))).toBe(true);
  });

  it("uses score copy when the map has no landmark catalog", () => {
    const lines = fallbackRecapLines(
      {
        mapId: "isla-vista",
        mapName: "Isla Vista",
        outcome: "caught",
        score: 7,
        streetNames: [],
        landmarkIds: [],
      },
      []
    );
    expect(lines.join(" ")).toMatch(/scored 7 pellets/);
    expect(lines.every((line) => /[.!?]$/.test(line))).toBe(true);
  });

  it("keeps three coherent AI lines when the model does well", () => {
    const input = {
      mapId: "isla-vista" as const,
      mapName: "Isla Vista",
      outcome: "won" as const,
      score: 20,
      streetNames: ["Del Playa Drive"],
      landmarkIds: ["iv-freebirds"],
    };
    const ai = [
      "You zoomed down Del Playa Drive in Isla Vista tonight.",
      "Freebirds World Burrito is the big burrito spot on Embarcadero.",
      "Tomorrow, see if you can walk the same route with a friend.",
    ];
    expect(finalizeRecapLines(ai, input, [])).toEqual(ai);
  });

  it("writes two place sentences when two pins were opened", () => {
    const lines = fallbackRecapLines(
      {
        mapId: "isla-vista",
        mapName: "Isla Vista",
        outcome: "won",
        score: 10,
        streetNames: ["Del Playa Drive"],
        landmarkIds: ["iv-freebirds", "iv-deli-mart"],
      },
      [
        {
          id: "iv-freebirds",
          name: "Freebirds World Burrito",
          blurb:
            "879 Embarcadero del Norte — the big burrito spot where I.V. meets for lunch and late-night runs",
        },
        {
          id: "iv-deli-mart",
          name: "I.V. Deli Mart",
          blurb:
            "6553 Pardall Road — the corner store everyone knows for snacks, drinks, and late-night stops",
        },
      ]
    );
    expect(lines[2]).toMatch(
      /I\.V\. Deli Mart is the corner store everyone knows/
    );
  });

  it("returns fallback when the model sends nothing usable", () => {
    const input = {
      mapId: "isla-vista" as const,
      mapName: "Isla Vista",
      outcome: "won" as const,
      score: 1,
      streetNames: ["Embarcadero"],
      landmarkIds: [],
    };
    expect(finalizeRecapLines(null, input, [])).toEqual(
      fallbackRecapLines(input, [])
    );
  });
});
