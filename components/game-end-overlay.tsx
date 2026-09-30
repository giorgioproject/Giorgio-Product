"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { fetchRunRecap } from "@/app/actions/recap";
import { LandmarkMapIcon } from "@/components/game-sprites";
import { Button } from "@/components/ui/button";
import { getLandmarkImageUrl } from "@/lib/landmark-image";
import { landmarkKindLabel } from "@/lib/landmarks";
import { WinCelebrationGraphic } from "@/components/win-celebration-graphic";
import type { PlayerCharacter } from "@/lib/characters";
import type { MapId } from "@/lib/maps";
import { buildRunRecapInput, type RunLog } from "@/lib/recap";
import type { Landmark } from "@/lib/street-graph";

type GameEndOverlayProps = {
  phase: "caught" | "won";
  mapId: MapId;
  mapName: string;
  landmarks: Landmark[];
  runLog: RunLog;
  playerCharacter: PlayerCharacter;
  score?: number;
  onPlayAgain: () => void;
};

function RunRecapCard({
  phase,
  mapId,
  mapName,
  landmarks,
  runLog,
  score,
}: Pick<
  GameEndOverlayProps,
  "phase" | "mapId" | "mapName" | "landmarks" | "runLog" | "score"
>) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [error, setError] = useState(false);

  const recapInput = useMemo(
    () =>
      buildRunRecapInput({
        mapId,
        mapName,
        outcome: phase,
        score: score ?? 0,
        runLog,
      }),
    [mapId, mapName, phase, score, runLog]
  );

  const landmarkPayload = useMemo(
    () => landmarks.map(({ id, name, blurb }) => ({ id, name, blurb })),
    [landmarks]
  );

  const fetchKey = useMemo(
    () =>
      [
        phase,
        mapId,
        score ?? 0,
        runLog.streetNames.join("|"),
        runLog.landmarkIds.join("|"),
      ].join(":"),
    [phase, mapId, score, runLog.landmarkIds, runLog.streetNames]
  );

  useEffect(() => {
    let cancelled = false;
    setLines(null);
    setError(false);

    void (async () => {
      try {
        const result = await fetchRunRecap(recapInput, landmarkPayload);
        if (!cancelled) setLines(result);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchKey, recapInput, landmarkPayload]);

  return (
    <section
      className="rounded-2xl border-4 border-white bg-card px-5 py-5 text-left shadow-lg sm:px-6"
      aria-labelledby="run-recap-heading"
    >
      <h3
        id="run-recap-heading"
        className="text-lg font-extrabold text-primary sm:text-xl"
      >
        Your run recap
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Two or three places to remember for tomorrow
      </p>
      {lines ? (
        <ul className="mt-4 space-y-2.5">
          {lines.map((line) => (
            <li
              key={line}
              className="text-base leading-relaxed text-foreground font-medium"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {error ? "Could not load recap — scroll the spots below." : "Writing your recap…"}
        </p>
      )}
    </section>
  );
}

export function GameEndOverlay({
  phase,
  mapId,
  mapName,
  landmarks,
  runLog,
  playerCharacter,
  score,
  onPlayAgain,
}: GameEndOverlayProps) {
  const caught = phase === "caught";

  if (!caught) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/40 p-4 sm:p-6 pointer-events-auto">
        <div className="my-auto w-full max-w-md space-y-4">
          <div className="rounded-2xl border-4 border-white bg-card px-6 py-8 text-center shadow-lg">
            <WinCelebrationGraphic
              character={playerCharacter}
              className="mb-4"
            />
            <h2 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
              You win!
            </h2>
            <p className="mt-3 text-lg font-semibold text-foreground">
              You ate every pellet on {mapName}.
            </p>
            {score != null && (
              <p className="mt-2 text-base text-muted-foreground">Score {score}</p>
            )}
          </div>
          <RunRecapCard
            phase={phase}
            mapId={mapId}
            mapName={mapName}
            landmarks={landmarks}
            runLog={runLog}
            score={score}
          />
          <Button
            size="lg"
            className="h-14 w-full text-lg font-bold shadow-lg"
            onClick={onPlayAgain}
          >
            Play again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-foreground/40 p-4 sm:p-6 pointer-events-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-8">
        <header className="rounded-2xl border-4 border-white bg-card px-6 py-8 text-center shadow-lg">
          <p className="text-5xl sm:text-6xl mb-3" aria-hidden>
            👻
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
            Busted!
          </h2>
          <p className="mt-3 text-lg sm:text-xl font-semibold text-foreground">
            Nice try! Can you find these cool spots in real life?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{mapName}</p>
        </header>

        <RunRecapCard
          phase={phase}
          mapId={mapId}
          mapName={mapName}
          landmarks={landmarks}
          runLog={runLog}
          score={score}
        />

        <ul className="space-y-6">
          {landmarks.map((lm, index) => (
            <li
              key={lm.id}
              className="overflow-hidden rounded-2xl border-4 border-white bg-card shadow-lg"
            >
              <div className="relative aspect-[16/10] sm:aspect-[2/1] bg-muted">
                <Image
                  src={getLandmarkImageUrl(lm)}
                  alt={lm.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority={index < 2}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 to-transparent px-4 pb-4 pt-16">
                  <div className="flex items-end justify-between gap-3">
                    <p className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-md leading-tight">
                      {lm.name}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 shadow-md">
                      <svg viewBox="0 0 64 64" width={28} height={28} aria-hidden>
                        <LandmarkMapIcon x={32} y={32} kind={lm.kind} size={22} />
                      </svg>
                      <span className="text-xs font-bold text-foreground">
                        {landmarkKindLabel(lm.kind)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-border bg-background px-5 py-4 sm:px-6 sm:py-5">
                <p className="text-base sm:text-lg leading-relaxed text-foreground font-medium">
                  {lm.blurb}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <Button
          size="lg"
          className="h-14 w-full text-lg font-bold shadow-lg"
          onClick={onPlayAgain}
        >
          Play again
        </Button>
      </div>
    </div>
  );
}
