"use server";

import { generateRunRecapLines } from "@/lib/openai";
import {
  fallbackRecapLines,
  finalizeRecapLines,
  type RunRecapInput,
  type RunRecapLandmark,
} from "@/lib/recap";

export async function fetchRunRecap(
  input: RunRecapInput,
  landmarks: RunRecapLandmark[]
): Promise<string[]> {
  try {
    const fromModel = await generateRunRecapLines(input, landmarks);
    if (fromModel && fromModel.length > 0) {
      return finalizeRecapLines(fromModel, input, landmarks);
    }
  } catch {
    /* use fallback */
  }
  return fallbackRecapLines(input, landmarks);
}
