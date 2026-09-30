import type { MapId } from "@/lib/maps";
import { getEdge } from "@/lib/street-graph";
import type { Landmark } from "@/lib/street-graph";

export type RunLog = {
  streetNames: string[];
  landmarkIds: string[];
};

export type RunRecapOutcome = "won" | "caught";

export type RunRecapInput = {
  mapId: MapId;
  mapName: string;
  outcome: RunRecapOutcome;
  score: number;
  streetNames: string[];
  landmarkIds: string[];
};

export type RunRecapLandmark = Pick<Landmark, "id" | "name" | "blurb">;

export function emptyRunLog(): RunLog {
  return { streetNames: [], landmarkIds: [] };
}

export function notePlayerEdge(runLog: RunLog, edgeId: string): RunLog {
  const edge = getEdge(edgeId);
  const name = edge?.streetName?.trim();
  if (!name || runLog.streetNames.includes(name)) return runLog;
  return {
    ...runLog,
    streetNames: [...runLog.streetNames, name],
  };
}

export function noteLandmarkOpened(runLog: RunLog, landmarkId: string): RunLog {
  if (!landmarkId || runLog.landmarkIds.includes(landmarkId)) return runLog;
  return {
    ...runLog,
    landmarkIds: [...runLog.landmarkIds, landmarkId],
  };
}

export function buildRunRecapInput(input: {
  mapId: MapId;
  mapName: string;
  outcome: RunRecapOutcome;
  score: number;
  runLog: RunLog;
}): RunRecapInput {
  return {
    mapId: input.mapId,
    mapName: input.mapName,
    outcome: input.outcome,
    score: input.score,
    streetNames: input.runLog.streetNames,
    landmarkIds: input.runLog.landmarkIds,
  };
}

const TRUNCATED_TAIL =
  /\b(and|the|on|at|to|for|with|in|a|an|or|you|your|there|of|from|by|as|is|was|are|were|Del|la|de|el)$/i;

/** End with . ! or ? when the model or blurbs omit punctuation. */
export function completeSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const last = trimmed.at(-1);
  if (last && ".!?".includes(last)) return trimmed;
  return `${trimmed}.`;
}

export function looksTruncatedSentence(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/[.!?]["']?$/.test(trimmed)) return false;
  if (/\.{3}$/.test(trimmed)) return true;
  return TRUNCATED_TAIL.test(trimmed);
}

/** Text after the address in seed blurbs (or the whole blurb). */
export function blurbTail(blurb: string): string {
  const trimmed = blurb.trim();
  if (trimmed.includes(" — ")) {
    return trimmed.split(" — ").slice(1).join(" — ").trim();
  }
  return trimmed;
}

function lowerFirstWord(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** One kid-friendly sentence that names the place and what it is. */
export function landmarkRecapSentence(name: string, blurb: string): string {
  const tail = blurbTail(blurb);
  if (!tail) {
    return completeSentence(`See if you can find ${name} on a real walk tomorrow`);
  }
  if (/^(the|a|an)\b/i.test(tail)) {
    return completeSentence(`${name} is ${lowerFirstWord(tail)}`);
  }
  if (/^The\b/.test(tail)) {
    return completeSentence(`${name} is ${lowerFirstWord(tail)}`);
  }
  return completeSentence(`${name}: ${tail}`);
}

/** @deprecated Prefer landmarkRecapSentence for user-facing copy. */
export function landmarkBlurbLine(blurb: string): string {
  return completeSentence(blurbTail(blurb));
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

export function recapLineIsCoherent(line: string): boolean {
  const t = line.trim();
  if (t.length < 18) return false;
  if (/^the [a-z]/.test(t)) return false;
  if (/^Look for .+ when you walk there tomorrow\.$/i.test(t)) return false;
  if (/^You ran along .+ on the .+ map\.$/i.test(t)) return false;
  if (/^Your chase took you along .+ in .+\.$/i.test(t)) return false;
  if (/^Your chase wound through the streets of .+\.$/i.test(t)) return false;
  return true;
}

export function visitedLandmarks(
  input: RunRecapInput,
  catalog: RunRecapLandmark[]
): RunRecapLandmark[] {
  const byId = new Map(catalog.map((lm) => [lm.id, lm]));
  return input.landmarkIds
    .map((id) => byId.get(id))
    .filter((lm): lm is RunRecapLandmark => lm !== undefined);
}

export function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function normalizeRecapLine(line: string): string | null {
  let s = line
    .replace(/^[-*•\d.)]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return null;
  s = s.replace(/[,;:…]+$/, "").trim();
  if (looksTruncatedSentence(s)) return null;
  return completeSentence(s);
}

export function normalizeRecapLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const normalized = normalizeRecapLine(line);
    if (normalized) out.push(normalized);
  }
  return out;
}

/** Always return three finished sentences; fill gaps from fallback copy. */
export function finalizeRecapLines(
  primary: string[] | null | undefined,
  input: RunRecapInput,
  catalog: RunRecapLandmark[]
): string[] {
  const fallback = fallbackRecapLines(input, catalog);
  if (!primary?.length) return fallback;

  const cleaned = normalizeRecapLines(primary);
  if (cleaned.length === 0) return fallback;

  if (cleaned.length >= 3 && cleaned.every(recapLineIsCoherent)) {
    return cleaned.slice(0, 3).map(completeSentence);
  }

  return fallback;
}

export function landmarksForRecap(
  landmarkIds: string[],
  catalog: RunRecapLandmark[]
): RunRecapLandmark[] {
  const byId = new Map(catalog.map((lm) => [lm.id, lm]));
  const picked: RunRecapLandmark[] = [];
  for (const id of landmarkIds) {
    const lm = byId.get(id);
    if (lm) picked.push(lm);
  }
  if (picked.length >= 3) return picked.slice(0, 3);
  for (const lm of catalog) {
    if (picked.length >= 3) break;
    if (!picked.some((p) => p.id === lm.id)) picked.push(lm);
  }
  return picked;
}

function outcomeEncouragement(input: RunRecapInput): string {
  if (input.outcome === "won") {
    return "You cleared every pellet — see how many street names you remember tomorrow.";
  }
  return "Nice try — play again and see how many real spots you can match to the map.";
}

/** Three kid-friendly lines when OpenAI is unavailable. */
export function fallbackRecapLines(
  input: RunRecapInput,
  catalog: RunRecapLandmark[]
): string[] {
  const lines: string[] = [];
  const streets = input.streetNames.filter(Boolean).slice(0, 3);
  if (streets.length > 0) {
    const list = joinNames(streets);
    lines.push(
      `Your chase took you along ${list} in ${input.mapName}.`
    );
  } else {
    lines.push(`Your chase wound through the streets of ${input.mapName}.`);
  }

  const opened = visitedLandmarks(input, catalog);

  if (opened.length >= 3) {
    lines.push(landmarkRecapSentence(opened[0]!.name, opened[0]!.blurb));
    lines.push(
      completeSentence(
        `You also opened ${joinNames(opened.slice(1).map((p) => p.name))} — see how many you can find on a real walk tomorrow`
      )
    );
  } else if (opened.length === 2) {
    lines.push(landmarkRecapSentence(opened[0]!.name, opened[0]!.blurb));
    lines.push(landmarkRecapSentence(opened[1]!.name, opened[1]!.blurb));
  } else if (opened.length === 1) {
    lines.push(landmarkRecapSentence(opened[0]!.name, opened[0]!.blurb));
    lines.push(outcomeEncouragement(input));
  } else if (catalog[0]) {
    lines.push(landmarkRecapSentence(catalog[0].name, catalog[0].blurb));
    if (catalog[1]) {
      lines.push(landmarkRecapSentence(catalog[1].name, catalog[1].blurb));
    } else {
      lines.push(
        completeSentence(
          `On your next walk in ${input.mapName}, see if you can spot ${catalog[0].name} for real`
        )
      );
    }
  } else {
    lines.push(
      input.outcome === "won"
        ? "You cleared every pellet — nice work!"
        : "Nice try — play again and chase down the rest of the map."
    );
    lines.push(`You scored ${input.score} pellets this run.`);
  }

  while (lines.length < 3) {
    lines.push(outcomeEncouragement(input));
  }

  return lines.slice(0, 3);
}

export function parseRecapModelText(text: string): string[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  let lines = trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 1) {
    const split = splitIntoSentences(lines[0]!);
    if (split.length > 1) lines = split;
  }

  const normalized = normalizeRecapLines(lines);
  if (normalized.length === 0) return null;
  return normalized.slice(0, 3);
}
