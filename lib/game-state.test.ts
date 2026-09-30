import { describe, expect, it } from "vitest";
import { getStreetGraph } from "@/lib/street-graph";
import { spawnSeparationM } from "@/lib/spawn";
import {
  INVULNERABLE_MS,
  OVERVIEW_MS,
  createInitialGame,
  endOverviewIfReady,
  getEntityPosition,
  isInvulnerable,
  noteLandmarkOpenedOnState,
  positionOnEdge,
  restartChase,
  setPlayerDirection,
  tickGame,
} from "@/lib/game-state";

describe("game-state", () => {
  it("creates a game with pellets and travelers", () => {
    const game = createInitialGame(() => 0.5, { ghostCount: 2 });
    expect(game.pellets.length).toBeGreaterThan(0);
    expect(game.phase).toBe("playing");
    expect(game.lives).toBe(3);
    expect(game.ghosts.length).toBe(2);
    expect(game.runLog.streetNames.length).toBeGreaterThan(0);
  });

  it("records landmark pins opened during a run", () => {
    const game = createInitialGame(() => 0.5);
    const next = noteLandmarkOpenedOnState(game, "iv-freebirds");
    expect(next.runLog.landmarkIds).toEqual(["iv-freebirds"]);
  });

  it("can start in overview for downtown-style intro", () => {
    const game = createInitialGame(() => 0.5, { startWithOverview: true });
    expect(game.phase).toBe("overview");
    expect(game.overviewStartedAt).not.toBeNull();
  });

  it("stores custom sim substeps for smooth motion", () => {
    const game = createInitialGame(() => 0.5, { simSubsteps: 48 });
    expect(game.simSubsteps).toBe(48);
  });

  it("queues player direction", () => {
    const game = createInitialGame(() => 0.5);
    const next = setPlayerDirection(game, "up");
    expect(next.player.queuedDirection).toBe("up");
  });

  it("ignores direction when not playing", () => {
    const game = { ...createInitialGame(() => 0.5), phase: "caught" as const };
    const next = setPlayerDirection(game, "up");
    expect(next.player).toEqual(game.player);
  });

  it("transitions from overview to playing after delay", () => {
    const game = createInitialGame(() => 0.5);
    const started = { ...game, overviewStartedAt: Date.now() - OVERVIEW_MS - 1 };
    const next = endOverviewIfReady(started, Date.now());
    expect(next.phase).toBe("playing");
  });

  it("ticks movement while playing", () => {
    const base = createInitialGame(() => 0.5, { ghostCount: 1 });
    const edges = getStreetGraph().edges.filter((e) => e.playable);
    const far = edges[edges.length - 1]!;
    const game = {
      ...base,
      phase: "playing" as const,
      overviewStartedAt: null,
      ghosts: [
        {
          edgeId: far.id,
          fromNodeId: far.from,
          distanceM: 0,
          queuedDirection: null,
          facing: "right" as const,
        },
      ],
    };
    const next = tickGame(game, Date.now());
    expect(next.phase).toBe("playing");
    expect(next.ghosts[0]!.distanceM).toBeGreaterThanOrEqual(
      game.ghosts[0]!.distanceM
    );
  });

  it("eats a pellet when crossing it", () => {
    const base = createInitialGame(() => 0.5);
    const game = {
      ...base,
      phase: "playing" as const,
      overviewStartedAt: null,
      pellets: [
        {
          id: "p1",
          edgeId: base.player.edgeId,
          distanceM: base.player.distanceM,
        },
      ],
    };
    const next = tickGame(game, Date.now());
    expect(next.pellets.length).toBeLessThanOrEqual(game.pellets.length);
  });

  it("restart picks a new chase", () => {
    const game = createInitialGame(() => 0.1, { ghostCount: 2 });
    const again = restartChase({ ...game, phase: "caught" }, () => 0.9);
    expect(again.phase).toBe("playing");
    expect(again.ghosts.length).toBe(2);
  });

  it("returns entity positions", () => {
    const game = createInitialGame(() => 0.5, { ghostCount: 1 });
    expect(getEntityPosition(game, "player")?.lat).toBeDefined();
    expect(getEntityPosition(game, "ghost", 0)?.lon).toBeDefined();
  });

  it("positions a point along an edge", () => {
    const edge = getStreetGraph().edges.find((e) => e.playable)!;
    const pos = positionOnEdge(edge.id, edge.from, edge.lengthM / 2);
    expect(pos?.lat).toBeDefined();
  });

  it("wins when the last pellet is collected even if a ghost is touching the player", () => {
    const base = createInitialGame(() => 0.5, { ghostCount: 1 });
    const player = { ...base.player };
    const pellet = {
      id: "last",
      edgeId: player.edgeId,
      distanceM: player.distanceM,
    };
    const game = {
      ...base,
      phase: "playing" as const,
      overviewStartedAt: null,
      lives: 1,
      player,
      playerSpawn: { ...player },
      ghosts: [{ ...player, queuedDirection: null }],
      pellets: [pellet],
      initialPelletCount: 1,
    };
    const next = tickGame(game, Date.now());
    expect(next.phase).toBe("won");
  });

  it("declares win when all pellets are eaten", () => {
    const base = createInitialGame(() => 0.5, { ghostCount: 1 });
    const far = getStreetGraph().edges.filter((e) => e.playable).at(-1)!;
    const game = {
      ...base,
      phase: "playing" as const,
      overviewStartedAt: null,
      ghosts: [
        {
          edgeId: far.id,
          fromNodeId: far.from,
          distanceM: 0,
          queuedDirection: null,
          facing: "right" as const,
        },
      ],
      pellets: [],
    };
    const next = tickGame(game, Date.now());
    expect(next.phase).toBe("won");
  });

  it("does not win when the board started with no pellets", () => {
    const base = createInitialGame(() => 0.5, { ghostCount: 1 });
    const far = getStreetGraph().edges.filter((e) => e.playable).at(-1)!;
    const next = tickGame(
      {
        ...base,
        phase: "playing",
        overviewStartedAt: null,
        initialPelletCount: 0,
        pellets: [],
        ghosts: [
          {
            edgeId: far.id,
            fromNodeId: far.from,
            distanceM: 0,
            queuedDirection: null,
            facing: "right",
          },
        ],
      },
      Date.now()
    );
    expect(next.phase).toBe("playing");
  });

  it("declares caught when a ghost touches player on last life", () => {
    const base = createInitialGame(() => 0.5, { ghostCount: 1 });
    const game = {
      ...base,
      phase: "playing" as const,
      overviewStartedAt: null,
      lives: 1,
      ghosts: [{ ...base.player }],
    };
    const next = tickGame(game, Date.now());
    expect(next.phase).toBe("caught");
    expect(next.invulnerableUntil).toBeNull();
  });

  it("loses a life on first tag instead of ending the run", () => {
    const base = createInitialGame(() => 0.5, { ghostCount: 1 });
    const game = {
      ...base,
      phase: "playing" as const,
      overviewStartedAt: null,
      ghosts: [{ ...base.player }],
    };
    const next = tickGame(game, Date.now());
    expect(next.phase).toBe("playing");
    expect(next.lives).toBe(2);
  });

  it("loses a life instead of ending when extra lives are configured", () => {
    const base = createInitialGame(() => 0.5, {
      ghostCount: 1,
      startingLives: 3,
    });
    const game = {
      ...base,
      phase: "playing" as const,
      overviewStartedAt: null,
      lives: 3,
      ghosts: [{ ...base.player }],
    };
    const now = Date.now();
    const next = tickGame(game, now);
    expect(next.phase).toBe("playing");
    expect(next.lives).toBe(2);
    expect(next.player.edgeId).toBe(base.playerSpawn.edgeId);
    expect(isInvulnerable(next, now)).toBe(true);
    expect(isInvulnerable(next, now + INVULNERABLE_MS - 1)).toBe(true);
    expect(isInvulnerable(next, now + INVULNERABLE_MS + 1)).toBe(false);
  });

  it("does not lose multiple lives while invulnerable", () => {
    const base = createInitialGame(() => 0.5, {
      ghostCount: 1,
      startingLives: 3,
    });
    const now = Date.now();
    const game = {
      ...base,
      phase: "playing" as const,
      overviewStartedAt: null,
      lives: 3,
      ghosts: [{ ...base.player }],
      invulnerableUntil: now + INVULNERABLE_MS,
    };
    const next = tickGame(game, now);
    expect(next.lives).toBe(3);
    expect(next.phase).toBe("playing");
  });

  it("respawns ghosts away from the player when losing a life", () => {
    const base = createInitialGame(() => 0.5, {
      ghostCount: 2,
      startingLives: 3,
    });
    const game = {
      ...base,
      phase: "playing" as const,
      overviewStartedAt: null,
      lives: 2,
      ghosts: [{ ...base.player }, { ...base.player }],
    };
    const next = tickGame(game, Date.now());
    expect(next.lives).toBe(1);
    for (const ghost of next.ghosts) {
      expect(spawnSeparationM(next.player, ghost)).toBeGreaterThan(200);
    }
  });

  it("ends overview when tickGame runs after the intro timer", () => {
    const game = createInitialGame(() => 0.5, { startWithOverview: true });
    const next = tickGame(
      { ...game, overviewStartedAt: Date.now() - OVERVIEW_MS - 5 },
      Date.now()
    );
    expect(next.phase).toBe("playing");
    expect(next.player.distanceM).toBe(game.player.distanceM);
  });

  it("does not move travelers during overview", () => {
    const game = {
      ...createInitialGame(() => 0.5, { startWithOverview: true, ghostCount: 1 }),
      phase: "overview" as const,
      overviewStartedAt: Date.now(),
    };
    const next = tickGame(game, Date.now());
    expect(next.phase).toBe("overview");
    expect(next.player.distanceM).toBe(game.player.distanceM);
    expect(next.ghosts[0]!.distanceM).toBe(game.ghosts[0]!.distanceM);
  });

  it("keeps overview until timer elapses", () => {
    const game = {
      ...createInitialGame(() => 0.5),
      phase: "overview" as const,
      overviewStartedAt: Date.now(),
    };
    const next = endOverviewIfReady(game, Date.now());
    expect(next.phase).toBe("overview");
  });
});
