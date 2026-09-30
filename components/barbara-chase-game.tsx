"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameEndOverlay } from "@/components/game-end-overlay";
import { LandmarkDetailCard } from "@/components/landmark-detail-card";
import { CharacterPicker } from "@/components/character-picker";
import { DirectionPad } from "@/components/direction-pad";
import { MapPicker } from "@/components/map-picker";
import { GameMusicController } from "@/components/game-music-provider";
import { MusicToggleButton } from "@/components/music-toggle-button";
import { WelcomeSceneDecor } from "@/components/welcome-scene-decor";
import { resolveMusicScene } from "@/lib/game-music";
import { GhostSprite, LandmarkMapIcon, PlayerSprite, StreetNameSign } from "@/components/game-sprites";
import type { PlayerCharacter } from "@/lib/characters";
import { buildOceanLayer } from "@/lib/map-ocean";
import {
  getLandmarksForMap,
  getMapById,
  getGhostCountForMap,
  getPelletCountForMap,
  getPlayerSpeedForMap,
  getSimSubstepsForMap,
  mapUsesFocusCamera,
  SIM_FIXED_DT_MS,
  type MapId,
} from "@/lib/maps";
import {
  pelletProgressLabel,
  pelletScore,
  readPlayerPrefs,
  writePlayerPrefs,
} from "@/lib/player-prefs";
import { Button } from "@/components/ui/button";
import {
  createInitialGame,
  getEntityPosition,
  isInvulnerable,
  noteLandmarkOpenedOnState,
  OVERVIEW_MS,
  positionOnEdge,
  setPlayerDirection,
  tickGame,
  type GameState,
} from "@/lib/game-state";
import type { Direction } from "@/lib/street-graph";
import { pelletFromNodeId } from "@/lib/pellets";
import {
  lerpViewBox,
  projectPoint,
  viewBoxAroundPoint,
  viewBoxForBbox,
} from "@/lib/projection";
import {
  directionsOpenAtNode,
  inputNodeForPress,
  keyToDirection,
  latLonDistanceM,
  lerpLatLon,
} from "@/lib/movement";
import { mapUsesFlattenedPlay } from "@/lib/map-play";
import {
  getStreetGraph,
  getStreetLabels,
  setActiveMap,
  type Landmark,
} from "@/lib/street-graph";
import { layoutStreetLabelsForMap } from "@/lib/street-label-layout";

const MAP_W = 900;
const MAP_H = 640;
const FOCUS_W = 420;
const FOCUS_H = 320;
const LANDMARK_ICON_SIZE = 26;
const LANDMARK_HIT_RADIUS = LANDMARK_ICON_SIZE * 1.85;
const MAP_PAN_DRAG_THRESHOLD_PX = 10;
/** Do not interpolate across corner jumps or respawns. */
const MAX_RENDER_LERP_M = 90;

export function BarbaraChaseGame() {
  const [screen, setScreen] = useState<"welcome" | "game">("welcome");
  const [selectedMapId, setSelectedMapId] = useState<MapId | null>(null);
  const [activeMapId, setActiveMapIdState] = useState<MapId | null>(null);
  const [playerCharacter, setPlayerCharacter] = useState<PlayerCharacter | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [landmarkOpen, setLandmarkOpen] = useState<Landmark | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focusT, setFocusT] = useState(0);
  const [motionBlend, setMotionBlend] = useState(1);
  const [renderPrev, setRenderPrev] = useState<{
    player: { lat: number; lon: number; edgeId: string };
    ghosts: Array<{ lat: number; lon: number; edgeId: string }>;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const rafRef = useRef<number>(0);
  const gameRef = useRef<GameState | null>(null);
  const simAccumRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const prefsLoaded = useRef(false);

  gameRef.current = game;

  const usesFocusCamera =
    activeMapId !== null && mapUsesFocusCamera(activeMapId);

  const musicScene = useMemo(
    () =>
      resolveMusicScene({
        screen,
        phase: game?.phase ?? null,
        landmarkOpen: landmarkOpen !== null,
      }),
    [screen, game?.phase, landmarkOpen]
  );

  useEffect(() => {
    if (prefsLoaded.current) return;
    prefsLoaded.current = true;
    const prefs = readPlayerPrefs(
      typeof window !== "undefined" ? window.localStorage : null
    );
    setSelectedMapId(prefs.mapId);
    setPlayerCharacter(prefs.characterId);
  }, []);

  const graph = activeMapId ? getStreetGraph() : null;
  const labels = useMemo(() => {
    if (!activeMapId || !graph) return [];
    return layoutStreetLabelsForMap(
      activeMapId,
      getStreetLabels(),
      graph.bbox,
      MAP_W,
      MAP_H
    );
  }, [activeMapId, graph, game?.pellets.length]);
  const landmarks = activeMapId ? getLandmarksForMap(activeMapId) : [];
  const mapMeta = activeMapId ? getMapById(activeMapId) : null;

  const backToMenu = useCallback(() => {
    gameRef.current = null;
    setGame(null);
    setScreen("welcome");
    setLandmarkOpen(null);
    setActiveMapIdState(null);
    setPan({ x: 0, y: 0 });
    setFocusT(0);
    setMotionBlend(1);
    setRenderPrev(null);
    simAccumRef.current = 0;
    lastFrameRef.current = null;
  }, []);

  const startGame = useCallback(() => {
    if (!playerCharacter || !selectedMapId) return;
    setActiveMap(selectedMapId);
    setActiveMapIdState(selectedMapId);
    const map = getMapById(selectedMapId);
    const initial = createInitialGame(Math.random, {
      pelletCount: getPelletCountForMap(selectedMapId),
      pelletSpacingM: map.pelletSpacingM,
      startWithOverview: mapUsesFocusCamera(selectedMapId),
      playerSpeedMps: getPlayerSpeedForMap(selectedMapId),
      ghostCount: getGhostCountForMap(selectedMapId),
      simSubsteps: getSimSubstepsForMap(selectedMapId),
    });
    gameRef.current = initial;
    setScreen("game");
    setGame(initial);
    setLandmarkOpen(null);
    setPan({ x: 0, y: 0 });
    setFocusT(0);
    setMotionBlend(1);
    setRenderPrev(null);
    simAccumRef.current = 0;
    lastFrameRef.current = null;
    writePlayerPrefs(
      { mapId: selectedMapId, characterId: playerCharacter },
      typeof window !== "undefined" ? window.localStorage : null
    );
  }, [playerCharacter, selectedMapId]);

  const playAgain = useCallback(() => {
    backToMenu();
  }, [backToMenu]);

  const openLandmark = useCallback((lm: Landmark) => {
    setLandmarkOpen(lm);
    const current = gameRef.current;
    if (!current) return;
    const next = noteLandmarkOpenedOnState(current, lm.id);
    gameRef.current = next;
    setGame(next);
  }, []);

  const applyDirection = useCallback((dir: Direction) => {
    const current = gameRef.current;
    if (!current || current.phase === "caught" || current.phase === "won") return;
    const next = setPlayerDirection(current, dir);
    gameRef.current = next;
    setRenderPrev(null);
    setMotionBlend(1);
    setGame(next);
  }, []);

  useEffect(() => {
    if (screen !== "game") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        backToMenu();
        return;
      }
      const dir = keyToDirection(e.key);
      if (!dir) return;
      e.preventDefault();
      if (landmarkOpen) return;
      applyDirection(dir);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screen, landmarkOpen, applyDirection, backToMenu]);

  useEffect(() => {
    if (game?.phase === "won" || game?.phase === "caught") {
      setLandmarkOpen(null);
    }
  }, [game?.phase]);

  useEffect(() => {
    if (screen !== "game" || landmarkOpen) return;

    const maxCatchUpSteps = 1;

    const loop = (ts: number) => {
      if (lastFrameRef.current === null) lastFrameRef.current = ts;
      const frameDt = Math.min(48, ts - lastFrameRef.current);
      lastFrameRef.current = ts;

      let current = gameRef.current;
      if (!current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = Date.now();

      if (usesFocusCamera && current.phase === "overview" && current.overviewStartedAt !== null) {
        const elapsed = now - current.overviewStartedAt;
        setFocusT(Math.min(1, elapsed / OVERVIEW_MS));
      } else if (usesFocusCamera && current.phase === "playing") {
        setFocusT(1);
      }

      if (current.phase === "playing") {
        const playing = current;
        simAccumRef.current += frameDt;
        let snapshot: typeof renderPrev = null;
        let stepped = 0;
        while (simAccumRef.current >= SIM_FIXED_DT_MS && stepped < maxCatchUpSteps) {
          const beforePlayer = getEntityPosition(playing, "player");
          const beforeGhosts = playing.ghosts.map((ghost, index) => {
            const pos = getEntityPosition(playing, "ghost", index);
            return pos ? { ...pos, edgeId: ghost.edgeId } : null;
          });
          if (beforePlayer && beforeGhosts.every(Boolean)) {
            snapshot = {
              player: { ...beforePlayer, edgeId: playing.player.edgeId },
              ghosts: beforeGhosts as Array<{
                lat: number;
                lon: number;
                edgeId: string;
              }>,
            };
          }
          current = tickGame(current, now);
          simAccumRef.current -= SIM_FIXED_DT_MS;
          stepped += 1;
        }

        if (stepped > 0) {
          gameRef.current = current;
          if (snapshot) setRenderPrev(snapshot);
          setGame(current);
          setMotionBlend(1 - simAccumRef.current / SIM_FIXED_DT_MS);
        } else {
          setMotionBlend(1 - simAccumRef.current / SIM_FIXED_DT_MS);
        }
      } else if (current.phase === "overview") {
        current = tickGame(current, now);
        if (current !== gameRef.current) {
          gameRef.current = current;
          setGame(current);
        }
        setMotionBlend(1);
      }

      current = gameRef.current;
      if (
        current &&
        (current.phase === "caught" || current.phase === "won")
      ) {
        setGame(current);
        return;
      }
      if (!current) return;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [screen, landmarkOpen, usesFocusCamera]);

  const directionHints = useMemo(() => {
    if (
      screen !== "game" ||
      !activeMapId ||
      !game ||
      !mapUsesFlattenedPlay(activeMapId)
    ) {
      return undefined;
    }
    const node = inputNodeForPress(game.player);
    if (!node) return undefined;
    return directionsOpenAtNode(node);
  }, [
    screen,
    activeMapId,
    game?.player.edgeId,
    game?.player.fromNodeId,
    game?.player.distanceM,
  ]);

  if (screen === "welcome") {
    return (
      <div className="california-sky relative flex min-h-full flex-col overflow-hidden">
        <GameMusicController scene={musicScene} />
        <WelcomeSceneDecor />
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-8 pt-24 sm:pt-28 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-5xl sm:text-6xl font-bold uppercase tracking-wide text-white drop-shadow-md">
              Barbara Chase
            </h1>
            <p className="text-lg text-white/95 max-w-lg mx-auto font-medium drop-shadow-sm">
              Ready to discover Santa Barbara County?
            </p>
          </div>

          <CharacterPicker
            value={playerCharacter}
            onChange={(character) => {
              setPlayerCharacter(character);
              writePlayerPrefs(
                { characterId: character },
                typeof window !== "undefined" ? window.localStorage : null
              );
            }}
          />

          <MapPicker
            value={selectedMapId}
            onChange={(mapId) => {
              setSelectedMapId(mapId);
              writePlayerPrefs(
                { mapId },
                typeof window !== "undefined" ? window.localStorage : null
              );
            }}
          />

          <div className="flex flex-col items-center gap-2">
            <MusicToggleButton />
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 font-bold text-lg px-8 shadow-lg disabled:opacity-50"
              onClick={startGame}
              disabled={!playerCharacter || !selectedMapId}
            >
              Play
            </Button>
            {(!playerCharacter || !selectedMapId) && (
              <p className="text-xs text-white/80 font-medium">
                Choose a character and a map to continue
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!game || !playerCharacter || !graph || !mapMeta || !activeMapId) return null;

  const project = (lon: number, lat: number) =>
    projectPoint(lon, lat, graph.bbox, MAP_W, MAP_H);

  const ocean = buildOceanLayer(graph, MAP_W, MAP_H, activeMapId);
  const overviewBox = viewBoxForBbox(graph.bbox, MAP_W, MAP_H);

  const rawPlayerPos = getEntityPosition(game, "player");

  const canLerpPlayer =
    renderPrev?.player &&
    rawPlayerPos &&
    motionBlend < 1 &&
    renderPrev.player.edgeId === game.player.edgeId &&
    latLonDistanceM(
      renderPrev.player.lat,
      renderPrev.player.lon,
      rawPlayerPos.lat,
      rawPlayerPos.lon
    ) <= MAX_RENDER_LERP_M;

  const playerPos = canLerpPlayer
    ? lerpLatLon(renderPrev!.player, rawPlayerPos!, motionBlend)
    : rawPlayerPos;

  const ghostDisplayPositions = game.ghosts.map((ghost, index) => {
    const raw = getEntityPosition(game, "ghost", index);
    const prev = renderPrev?.ghosts[index];
    if (
      raw &&
      prev &&
      motionBlend < 1 &&
      prev.edgeId === ghost.edgeId &&
      latLonDistanceM(prev.lat, prev.lon, raw.lat, raw.lon) <= MAX_RENDER_LERP_M
    ) {
      return lerpLatLon(prev, raw, motionBlend);
    }
    return raw;
  });

  const focusCenter = playerPos
    ? project(playerPos.lon, playerPos.lat)
    : { x: MAP_W / 2, y: MAP_H / 2 };
  const focusBox = viewBoxAroundPoint(focusCenter.x, focusCenter.y, FOCUS_W, FOCUS_H);

  const baseViewBox = usesFocusCamera
    ? lerpViewBox(overviewBox, focusBox, focusT)
    : overviewBox;

  const viewBox = {
    minX: baseViewBox.minX - pan.x,
    minY: baseViewBox.minY - pan.y,
    width: baseViewBox.width,
    height: baseViewBox.height,
  };

  const playerFacing = game.player.facing;
  const score = pelletScore(game.initialPelletCount, game.pellets.length);
  const pelletProgress = pelletProgressLabel(
    game.initialPelletCount,
    game.pellets.length
  );
  const playerBlink =
    game.phase === "playing" &&
    isInvulnerable(game, Date.now()) &&
    Math.floor(Date.now() / 160) % 2 === 0;

  const dimmed =
    game.phase === "caught" || game.phase === "won" || landmarkOpen !== null;

  const controlsDisabled =
    game.phase === "caught" ||
    game.phase === "won" ||
    landmarkOpen !== null;

  const onPanPointerDown = (e: React.PointerEvent) => {
    if (!usesFocusCamera || landmarkOpen) return;
    if (game.phase === "caught" || game.phase === "won") return;
    dragRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY, moved: false };
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPanPointerMove = (e: React.PointerEvent) => {
    if (!usesFocusCamera || !dragRef.current || !svgRef.current || !panStartRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    if (!panStartRef.current.moved) {
      if (Math.hypot(dx, dy) < MAP_PAN_DRAG_THRESHOLD_PX) return;
      panStartRef.current.moved = true;
    }
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    setPan((p) => ({
      x: p.x + e.movementX * scaleX,
      y: p.y + e.movementY * scaleY,
    }));
  };

  const onPanPointerUp = (e: React.PointerEvent) => {
    dragRef.current = false;
    panStartRef.current = null;
    svgRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="california-sky flex min-h-full flex-col">
      <GameMusicController scene={musicScene} />
      <header className="border-b border-white/30 bg-white/20 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide text-white drop-shadow">
              Barbara Chase
            </h1>
            <p className="text-sm text-white/90 font-medium">
              {mapMeta.name} · {mapMeta.difficulty}
            </p>
          </div>
          <dl className="flex flex-wrap gap-4 text-sm font-semibold text-white drop-shadow">
            <div>
              <dt className="text-white/70 text-xs font-medium">Score</dt>
              <dd className="leading-tight">
                <span className="text-base tabular-nums">{score}</span>
                <span className="mt-0.5 block text-xs font-medium tabular-nums text-white/85">
                  {pelletProgress} pellets
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-white/70 text-xs font-medium">Lives</dt>
              <dd>{game.lives}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <MusicToggleButton />
            <Button
              variant="outline"
              size="sm"
              className="border-white/70 bg-white/90 text-foreground"
              onClick={backToMenu}
            >
              Back to menu
            </Button>
          </div>
        </div>
        <p className="mx-auto mt-1 max-w-[1080px] text-xs text-white/80">
          {usesFocusCamera
            ? "Arrows or pad to move · drag map to look · tap a place pin on the map · Esc for menu"
            : "Arrows to move · tap place pins on the map · Esc for menu"}
        </p>
      </header>

      <div
        className={`relative mx-auto flex w-full max-w-[1080px] flex-1 gap-4 p-4 ${
          usesFocusCamera ? "flex-col lg:flex-row" : ""
        }`}
      >
        <div className="relative min-w-0 flex-1">
          <div
            className={`relative overflow-hidden rounded-xl border-2 border-white/70 bg-[#FEF3C7] shadow-lg ${dimmed ? "opacity-60" : ""}`}
          >
            <svg
              ref={svgRef}
              viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
              className={`h-auto w-full select-none ${
                usesFocusCamera ? "cursor-grab touch-none active:cursor-grabbing" : ""
              }`}
              style={{ minHeight: 480 }}
              onPointerDown={onPanPointerDown}
              onPointerMove={onPanPointerMove}
              onPointerUp={onPanPointerUp}
              onPointerCancel={onPanPointerUp}
            >
              <defs>
                <linearGradient id="map-land" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FEF9C3" />
                  <stop offset="100%" stopColor="#FDE68A" />
                </linearGradient>
                <linearGradient id="map-ocean" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#0369A1" />
                </linearGradient>
              </defs>
              <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="url(#map-land)" />
              {ocean && (
                <>
                  <polygon points={ocean.fillPoints} fill="url(#map-ocean)" />
                  <polyline
                    points={ocean.wavePoints}
                    fill="none"
                    stroke="#BAE6FD"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                </>
              )}

              {graph.edges
                .filter((e) => !e.playable)
                .map((edge) => {
                  const a = graph.nodes.find((n) => n.id === edge.from);
                  const b = graph.nodes.find((n) => n.id === edge.to);
                  if (!a || !b) return null;
                  const p1 = project(a.lon, a.lat);
                  const p2 = project(b.lon, b.lat);
                  const mx = (p1.x + p2.x) / 2;
                  const my = (p1.y + p2.y) / 2;
                  return (
                    <g key={edge.id}>
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="var(--accent)"
                        strokeWidth={6}
                        strokeLinecap="round"
                      />
                      <text x={mx} y={my} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10}>
                        ⛔
                      </text>
                    </g>
                  );
                })}

              {graph.edges
                .filter((e) => e.playable)
                .map((edge) => {
                  const a = graph.nodes.find((n) => n.id === edge.from);
                  const b = graph.nodes.find((n) => n.id === edge.to);
                  if (!a || !b) return null;
                  const p1 = project(a.lon, a.lat);
                  const p2 = project(b.lon, b.lat);
                  return (
                    <line
                      key={edge.id}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#64748B"
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                  );
                })}

              {game.pellets.map((pellet) => {
                const pos = positionOnEdge(
                  pellet.edgeId,
                  pelletFromNodeId(pellet.edgeId),
                  pellet.distanceM
                );
                if (!pos) return null;
                const p = project(pos.lon, pos.lat);
                return (
                  <circle
                    key={pellet.id}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill="#FACC15"
                    stroke="#CA8A04"
                    strokeWidth={0.5}
                  />
                );
              })}

              {labels.map((label) => (
                <StreetNameSign
                  key={label.key}
                  x={label.x}
                  y={label.y}
                  angle={label.angle}
                  name={label.displayName}
                  featured={label.featured}
                />
              ))}

              {ghostDisplayPositions.map(
                (ghostPos, index) =>
                  ghostPos && (
                    <GhostSprite
                      key={`ghost-${index}`}
                      variant={index}
                      x={project(ghostPos.lon, ghostPos.lat).x}
                      y={project(ghostPos.lon, ghostPos.lat).y}
                    />
                  )
              )}

              {playerPos && (
                <g opacity={playerBlink ? 0.35 : 1}>
                  <PlayerSprite
                    x={project(playerPos.lon, playerPos.lat).x}
                    y={project(playerPos.lon, playerPos.lat).y}
                    facing={playerFacing}
                    character={playerCharacter}
                  />
                </g>
              )}

              {landmarks.map((lm) => {
                const p = project(lm.lon, lm.lat);
                return (
                  <g
                    key={lm.id}
                    className="cursor-pointer"
                    data-landmark-hit
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (controlsDisabled) return;
                      openLandmark(lm);
                    }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={LANDMARK_HIT_RADIUS}
                      fill="transparent"
                      stroke="transparent"
                    />
                    <LandmarkMapIcon
                      x={p.x}
                      y={p.y}
                      kind={lm.kind}
                      size={LANDMARK_ICON_SIZE}
                      selected={landmarkOpen?.id === lm.id}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {(game.phase === "caught" || game.phase === "won") && (
            <GameEndOverlay
              phase={game.phase}
              mapId={activeMapId}
              mapName={mapMeta.name}
              landmarks={landmarks}
              runLog={game.runLog}
              playerCharacter={playerCharacter}
              score={score}
              onPlayAgain={playAgain}
            />
          )}

          {landmarkOpen &&
            game.phase !== "caught" &&
            game.phase !== "won" && (
            <div className="absolute inset-0 z-20 flex items-end justify-center p-4 pointer-events-none sm:items-center">
              <LandmarkDetailCard
                landmark={landmarkOpen}
                onClose={() => setLandmarkOpen(null)}
                pauseHint={game.phase === "playing" || game.phase === "overview"}
              />
            </div>
          )}
        </div>

        {usesFocusCamera && (
          <aside className="flex shrink-0 flex-col items-center justify-center gap-3 pb-2 lg:w-44">
            <p className="text-xs text-white font-semibold text-center drop-shadow max-w-[11rem]">
              {mapUsesFlattenedPlay(activeMapId)
                ? "Up is toward the top of the map. Lit arrows work at the next corner."
                : "Map directions"}
            </p>
            <DirectionPad
              onDirection={applyDirection}
              disabled={controlsDisabled}
              activeDirections={directionHints}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
