# PRD — Barbara Chase

**Author:** Giorgio Braccia  ·  **Birth date:** 6 September 2001  ·  **Date:** 2026-09-29  ·  **Version:** 0.4

> **How to fill this file**
> - Fill in **sections 1–4** (required). Sections **5–8** are optional but make the agent far more accurate.
> - Keep it to about **one page**. Use bullets and tables, not paragraphs — agents parse structure better than prose.
> - **Be specific and measurable.** Replace vague words ("nice", "intuitive", "fast") with numbers and observable behavior.
> - **Every requirement gets an acceptance criterion** you can click or type and see — not "it works" or "no console errors."
> - **At least one P0 covers an unexpected case:** empty / first-visit state, blank or bad input, or refresh (the item you just added is still there).
> - Mark anything you're guessing with **`[ASSUMPTION]`** — don't invent facts or numbers.
> - When you are ready to build, tell Cursor:
>   *"Read `PRD.md` and `DESIGN.md`. Follow the workshop rule. Seed from local JSON in `data/`; put new items in localStorage. No database or API keys yet. Do not write a JSON file on the server. Ask me any clarifying questions first, then build the smallest working version of the P0 must-haves in section 4, following the build order."*
>
> *Sections map to the **Lean Product Process**: target customer → underserved needs → value → MVP feature set.*

---

## 1. Product Summary

- **One-liner:** For a 9–12 year old on a family trip who walked one of three local downtowns today, **Barbara Chase** is a Pac-Man-style chase on the **real street grid** (OpenStreetMap) so they can play tonight and name a few streets tomorrow.
- **TL;DR:** Laptop/desktop, landscape. **Start screen:** pick **one of three characters** (same as today) + **one of three maps** (Solvang, Downtown Santa Barbara, Isla Vista). **Play:** one shared game screen loads that map’s graph — full board visible, arrow keys, ghost chase, pellets, landmark photos. Success = next morning they can name **2–3 streets or areas** from the map they played.

## 2. Target Customer

- **User:** Kid, about 9–12, tourist or local family, **in the hotel or at home after walking the area**.
- **Buyer / decision-maker:** Parent in the same room (opens the site on a **laptop or desktop**).
- **Top defining attributes:**
  1. Already walked **one** of the three areas today; evening gap.
  2. Wants a **game**, not a map lesson or trivia quiz.
  3. Parent wants landmarks and street names to stick.
  4. Uses **keyboard arrow keys** (no on-screen arrow pad required on desktop).
  5. Start screen should feel alive — character choice, map previews, landmark photos.

## 3. Customer Problems & the Bet

1. "We walked all day and I still can’t tell the main streets apart."
2. "Maps are real but boring; Pac-Man is fun but it’s a fake maze."
3. "It’s evening — they won’t read a brochure."

- **Riskiest assumption:** Landmark photos + street labels during play are enough for 2–3 names to stick **without** a quiz.
- **The bet:** A playable chase on the **chosen** real OSM graph with photos and names will cause a kid who played one evening to **next morning name 2–3 streets or areas they ran through.**

## 4. Product Requirements / Functionality

**Key user stories**
- As a kid, I want to **pick my character** (boy, girl, or dolphin) and **pick a map** before I start.
- As a kid, I want to **use arrow keys** to move my character and run from a **ghost that follows me**.
- As a parent, I want **photos on the map** I can tap to learn what each place is.
- As a player, I want the **whole map on screen** — no scrolling camera follow — so I can plan routes like a board game.

**Must-haves for v1**

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|----------|----------------------|
| R1 | Three OSM street boards (seed JSON) | P0 | Solvang, Downtown Santa Barbara, Isla Vista each have `data/graph-<map-id>.json`. After Play → that map’s grid visible. Never blank. |
| R2 | Map picker on start | P0 | Start screen shows **3 map cards**: name, preview image, difficulty label. Tap one → selected state. Play uses that map. |
| R3 | Character picker (unchanged) | P0 | **Three** playable characters (boy, girl, dolphin). Same sprites/behavior as today; only the **map** changes between games. |
| R4 | Remember choices | P0 | Last **map id** and **character id** in **localStorage**. Refresh → start screen restores both selections. |
| R5 | Keyboard arrows | P0 | Arrow keys turn at the next corner (queued). Works on laptop without on-screen pad. |
| R6 | Fixed full-map view | P0 | Entire playable graph fits in the game viewport (landscape). **No** camera follow / no pan-to-player during chase. |
| R7 | Yellow Pac-Man-style player | P0 | Character sprite rotates to face movement. |
| R8 | Ghost + chase AI | P0 | Ghost **follows** player (greedy shortest path), ~80% player speed. |
| R9 | Pellets per map | P0 | Yellow pellets on streets; spacing tuned per map so a round is ~**1–3 minutes**. Clear all → win card. |
| R10 | Landmark photos | P0 | Per-map landmark seed (`data/landmarks-<map-id>.json`). Thumbnails on map; tap → card with photo + name + blurb; chase pauses until closed. |
| R11 | Interactive start | P0 | Landmark photo grid (for **selected map**) + character + map cards + **Play**. Chase does not run until Play. |
| R12 | Closed roads | P0 | Non-playable OSM ways drawn as blocks + ⛔, not enterable. |
| R13 | End cards + menu | P0 | Caught/won: dimmed map + card + **Play again** (returns to **start screen**) and **Back to menu** / **Esc** during play. |
| R14 | HUD | P0 | Shows **map name**, **difficulty**, **score** (pellets), **life** (1 — one tag ends the run). No levels. |
| R15 | Random spawn | P0 | Each Play → different spawn when possible. |
| R16 | Street names | P0 | Several street names visible on the board for the active map. |

**Map size (all three)**
- Each map covers roughly **5×7 city blocks** (compact downtown core), fetched from **OpenStreetMap** via local script (`scripts/fetch-map.py`), not live at runtime.
- One graph file per map; pellet count/spacing adjusted per map in seed catalog.

**Build order:** `maps.json` + three graph JSON files → multi-map loader in `lib/` → start screen (character + 3 map cards + localStorage) → shared game shell + HUD → movement + ghost + pellets → per-map landmarks → end cards.

**Explicitly NOT in v1:**
- **Mobile / phone / tablet** layout or touch-only controls
- GPS / live location
- Quiz or score for street names (pellet score only)
- Accounts, multiplayer, saved trips across devices
- Live Overpass on every page load
- Official Namco sprites/sounds (original SVG-inspired shapes)
- More than **three** maps or **three** characters

## 5. Data Model

- **MapCatalog** — `data/maps.json` · id, name, difficulty, graphFile, landmarksFile, previewImage, pelletSpacingM
- **StreetGraph** — `data/graph-downtown-santa-barbara.json` · `data/graph-solvang.json` · `data/graph-isla-vista.json` (bbox, nodes, edges)
- **Landmark** — `data/landmarks-<map-id>.json` · id, name, lat, lon, blurb, imageUrl
- **PlayerPrefs** — localStorage keys e.g. `barbara-chase:lastMapId`, `barbara-chase:lastCharacterId`
- **PlaySession** — in-memory only; refresh → start screen with prefs restored

**Legacy:** `data/streets.json` may mirror downtown graph until imports are migrated.

## 6. Guidance on User Experience

- **Flow:** Start (character + map + landmark grid for selected map) → Play → full-map chase (arrows) → tap landmarks → win or caught → Play again → **start screen**.
- **Controls:** **Arrow keys** primary on desktop. Esc → start screen.
- **Visual:** Harbor chrome. Map card previews in `public/maps/`. Landmark images in `public/landmarks/`.

## 7. Guidance on Tech Stack / Components

- Next.js page; rules in `lib/`; SVG map + shadcn UI.
- OSM fetch: `scripts/fetch-map.py` (same pipeline as downtown; per-map bbox).
- `lib/street-graph.ts` (or `lib/maps.ts`) loads graph by **map id** for the session.
- Ghost chase in `lib/ghost-ai.ts`.

## 8. Other Info & Open Questions

- **Value line:** “Pac-Man on the real streets we walked today — pick Solvang, downtown SB, or Isla Vista.”
- **Open questions:** Landmark sets for Solvang and Isla Vista may start small and grow; `[ASSUMPTION]` preview JPGs in `public/maps/` until real screenshots exist.
