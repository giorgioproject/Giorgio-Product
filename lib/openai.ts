import {
  blurbTail,
  parseRecapModelText,
  visitedLandmarks,
  type RunRecapInput,
  type RunRecapLandmark,
} from "@/lib/recap";

const MODEL = "gpt-4o-mini";

const RECAP_SYSTEM = `You write a three-line recap for a kid about 10 years old after a Pac-Man-style chase on a real street map.

Example (match this tone and structure):
You raced down Del Playa Drive and Ocean Road in Isla Vista.
Freebirds World Burrito is the big burrito spot where I.V. students meet on Embarcadero.
Tomorrow, walk to Pardall Tunnel and see if you recognize the painted walls.

Rules:
- Output exactly 3 lines. One complete sentence per line.
- Use street and place names from the JSON exactly as written.
- Sound like a friendly coach talking to the kid — not a list, not copy-paste from hints.
- Every sentence needs a clear subject (usually "You" or a place name).
- Do not start any line with "Look for", "the", or "Your chase".
- No bullets, numbers, or emojis.`;

function recapUserMessage(
  input: RunRecapInput,
  catalog: RunRecapLandmark[]
): string {
  const opened = visitedLandmarks(input, catalog);
  const payload = {
    mapName: input.mapName,
    result:
      input.outcome === "won"
        ? "cleared every pellet and won"
        : "was caught by a ghost before finishing",
    streetsRun: input.streetNames.slice(0, 4),
    placesOpened: opened.slice(0, 3).map((lm) => ({
      name: lm.name,
      hint: blurbTail(lm.blurb),
    })),
    pelletsCollected: input.score,
  };
  return JSON.stringify(payload, null, 2);
}

export async function generateRunRecapLines(
  input: RunRecapInput,
  catalog: RunRecapLandmark[]
): Promise<string[] | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.55,
      max_tokens: 280,
      messages: [
        { role: "system", content: RECAP_SYSTEM },
        { role: "user", content: recapUserMessage(input, catalog) },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    choices?: Array<{
      finish_reason?: string;
      message?: { content?: string };
    }>;
  };
  const choice = payload.choices?.[0];
  const content = choice?.message?.content;
  if (!content) return null;

  let lines = parseRecapModelText(content);
  if (!lines?.length) return null;

  if (choice?.finish_reason === "length" && lines.length > 0) {
    const last = lines[lines.length - 1]!;
    if (!/[.!?]["']?$/.test(last.trim())) {
      lines = lines.slice(0, -1);
      if (lines.length === 0) return null;
    }
  }

  return lines;
}
