import { getEdge, isDeadEndSpurEdge } from "@/lib/street-graph";

export type Pellet = {
  id: string;
  edgeId: string;
  distanceM: number;
};

/** Wider spacing = fewer pellets on the map. */
export const PELLET_SPACING_M = 110;

const MIN_PLAYABLE_EDGE_M = 25;
const MIN_PELLET_SEPARATION_M = 12;

export type PelletSlot = {
  edgeId: string;
  distanceM: number;
};

export function pelletCountOnEdge(lengthM: number, spacingM: number): number {
  if (lengthM < MIN_PLAYABLE_EDGE_M) return 0;
  const step = Math.max(MIN_PELLET_SEPARATION_M, spacingM);
  return Math.max(1, Math.floor(lengthM / step));
}

export function buildPelletSlots(
  edgeIds: string[],
  spacingM = PELLET_SPACING_M
): PelletSlot[] {
  const sorted = [...edgeIds].sort();
  const slots: PelletSlot[] = [];

  for (const edgeId of sorted) {
    if (isDeadEndSpurEdge(edgeId)) continue;
    const edge = getEdge(edgeId);
    if (!edge?.playable) continue;

    const count = pelletCountOnEdge(edge.lengthM, spacingM);
    if (count === 0) continue;

    for (let i = 0; i < count; i += 1) {
      slots.push({
        edgeId,
        distanceM: (edge.lengthM * (i + 1)) / (count + 1),
      });
    }
  }

  return slots;
}

function pickEvenlySpacedSlots(slots: PelletSlot[], targetCount: number): PelletSlot[] {
  if (slots.length <= targetCount) return [...slots];
  const picked: PelletSlot[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const idx = Math.floor((i * slots.length) / targetCount);
    picked.push(slots[idx]!);
  }
  return picked;
}

function addPelletsUntilCount(
  picked: PelletSlot[],
  targetCount: number
): PelletSlot[] {
  const result = [...picked];
  const edgesByLength = [...new Set(result.map((s) => s.edgeId))]
    .map((edgeId) => getEdge(edgeId))
    .filter((e): e is NonNullable<typeof e> => e !== undefined)
    .sort((a, b) => b.lengthM - a.lengthM);

  let guard = 0;
  while (result.length < targetCount && guard < targetCount * 4) {
    guard += 1;
    let added = false;
    for (const edge of edgesByLength) {
      if (result.length >= targetCount) break;
      const onEdge = result.filter((s) => s.edgeId === edge.id);
      const candidate =
        onEdge.length === 0
          ? edge.lengthM / 2
          : (() => {
              const distances = onEdge
                .map((s) => s.distanceM)
                .sort((a, b) => a - b);
              let bestGap = 0;
              let bestPos = edge.lengthM / 2;
              let prev = 0;
              for (const d of distances) {
                const gap = d - prev;
                if (gap > bestGap) {
                  bestGap = gap;
                  bestPos = prev + gap / 2;
                }
                prev = d;
              }
              const tailGap = edge.lengthM - prev;
              if (tailGap > bestGap) bestPos = prev + tailGap / 2;
              return bestPos;
            })();

      const tooClose = onEdge.some(
        (s) => Math.abs(s.distanceM - candidate) < MIN_PELLET_SEPARATION_M
      );
      if (tooClose) continue;

      result.push({ edgeId: edge.id, distanceM: candidate });
      added = true;
    }
    if (!added) break;
  }

  return result.slice(0, targetCount);
}

export function slotsToPellets(slots: PelletSlot[]): Pellet[] {
  return slots.map((slot, index) => ({
    id: `pel-${index}-${slot.edgeId}`,
    edgeId: slot.edgeId,
    distanceM: slot.distanceM,
  }));
}

/** Place exactly `targetCount` pellets (or fewer if the map is too small). */
export function placePelletsForCount(
  edgeIds: string[],
  targetCount: number,
  spacingM = PELLET_SPACING_M
): Pellet[] {
  if (targetCount <= 0) return [];

  let spacing = spacingM;
  let slots = buildPelletSlots(edgeIds, spacing);
  while (slots.length < targetCount && spacing > MIN_PELLET_SEPARATION_M) {
    spacing *= 0.9;
    slots = buildPelletSlots(edgeIds, spacing);
  }

  let picked = pickEvenlySpacedSlots(slots, targetCount);
  if (picked.length < targetCount) {
    picked = addPelletsUntilCount(picked, targetCount);
  }

  return slotsToPellets(picked.slice(0, targetCount));
}

export function placePelletsOnEdge(edgeId: string, spacingM = PELLET_SPACING_M): Pellet[] {
  const edge = getEdge(edgeId);
  if (!edge || !edge.playable || edge.lengthM < spacingM) return [];
  if (isDeadEndSpurEdge(edgeId)) return [];

  return slotsToPellets(buildPelletSlots([edgeId], spacingM));
}

export function placeAllPellets(
  edgeIds: string[],
  spacingM = PELLET_SPACING_M,
  targetCount?: number
): Pellet[] {
  if (targetCount != null && targetCount > 0) {
    return placePelletsForCount(edgeIds, targetCount, spacingM);
  }
  return slotsToPellets(buildPelletSlots(edgeIds, spacingM));
}

export function eatPellet(
  pellets: Pellet[],
  pelletId: string
): Pellet[] {
  return pellets.filter((p) => p.id !== pelletId);
}

export function pelletFromNodeId(edgeId: string): string {
  const edge = getEdge(edgeId);
  return edge?.from ?? "";
}

export function findPelletNear(
  pellets: Pellet[],
  edgeId: string,
  distanceM: number,
  thresholdM = 10
): Pellet | undefined {
  return pellets.find(
    (p) => p.edgeId === edgeId && Math.abs(p.distanceM - distanceM) <= thresholdM
  );
}
