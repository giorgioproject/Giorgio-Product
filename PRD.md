# PRD — Barbara Chase

**Author:** Giorgio Braccia  ·  **Birth date:** 6 September 2001  ·  **Date:** 2026-09-30  ·  **Version:** 0.5

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
- **TL;DR:** Laptop/desktop, landscape. **Start screen:** pick **one of three characters** + **one of three maps** (Isla Vista, Solvang, Downtown Santa Barbara) — each map card shows a **landscape photo** and **street preview**. **Play:** shared chase screen — overview then zoom toward the player, **arrow keys or on-screen pad**, ghost chase, pellets, landmark photos, optional **music on/off**. Success = next morning they can name **2–3 streets or areas** from the map they played.

## 2. Target Customer

- **User:** Kid, about 9–12, tourist or local family, **in the hotel or at home after walking the area**.
- **Buyer / decision-maker:** Parent in the same room (opens the site on a **laptop or desktop**).
- **Top defining attributes:**
  1. Already walked **one** of the three areas today; evening gap.
  2. Wants a **game**, not a map lesson or trivia quiz.
  3. Parent wants landmarks and street names to stick.
  4. Uses **keyboard arrow keys** and/or the **on-screen direction pad** (pad labels match map north on Downtown).
  5. Start screen should feel alive — character choice, **map cards** (landscape + preview), **music toggle**.

## 3. Customer Problems & the Bet

1. "We walked all day and I still can’t tell the main streets apart."
2. "Maps are real but boring; Pac-Man is fun but it’s a fake maze."
3. "It’s evening — they won’t read a brochure."

- **Riskiest assumption:** Landmark photos + street labels during play are enough for 2–3 names to stick **without** a quiz.
- **The bet:** A playable chase on the **chosen** real OSM graph with photos and names will cause a kid who played one evening to **next morning name 2–3 streets or areas they ran through.**

## 4. Product Requirements / Functionality

**Key user stories**
- As a kid, I want to **pick my character** (boy, girl, or dolphin) and **pick a map** before I start.
- As a kid, I want to **use arrow keys or the pad** to move and run from **ghost(s)** on my map.
- As a parent, I want **photos on the map** I can tap to learn what each place is.
- As a player, I want to **see the whole map at first**, then **play closer to my character** and **drag** to look around — like a board game I can peek at.

**Must-haves for v1**

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|----------|----------------------|
| R1 | Three OSM street boards (seed JSON) | P0 | Solvang, Downtown Santa Barbara, Isla Vista each have `data/graph-<map-id>.json`. After Play → that map’s streets visible. Never blank. |
| R2 | Map picker on start | P0 | Start screen shows **3 map cards**: name, difficulty, **landscape image**, **SVG street preview**. Tap one → selected state. Play uses that map. |
| R3 | Character picker | P0 | **Three** playable characters (boy, girl, dolphin). Only the **map** changes between games. |
| R4 | Remember choices | P0 | Last **map id** and **character id** in **localStorage**. Refresh → start screen restores both selections. |
| R5 | Movement input | P0 | **Arrow keys** turn at the next corner (queued). **On-screen direction pad** on the game screen (all maps). Pad can highlight valid turns at the next corner (Downtown). |
| R6 | Map view (focus camera) | P0 | On Play, **~2s full-map overview**, then view **eases toward the player**. **Drag** the map to pan (no auto-scroll every frame). All three maps use this mode. |
| R7 | Player sprite | P0 | Character sprite **faces movement** (Pac-Man-style, original art). |
| R8 | Ghosts + chase AI | P0 | **Ghost count per map:** Isla Vista **1**, Solvang **2**, Downtown **4**. Speed **~70%** of player. At corners, ghosts **hunt** (greedy toward player) or **wander** streets. |
| R9 | Pellets per map | P0 | Yellow pellets on playable streets; counts in `data/maps.json` (~35 / 45 / 60). Clear all → win card. Round roughly **1–3 minutes** per map tuning. |
| R10 | Landmark photos | P0 | Per-map seed (`data/landmarks-<map-id>.json`). Icons on map; tap → card with photo + name + blurb; chase pauses until closed. |
| R11 | Interactive start | P0 | Character picker + **3 map cards** + **Music on/off** + **Play** (disabled until character **and** map chosen). No chase until Play. **No** landmark grid on the start screen. |
| R12 | Closed roads | P0 | Non-playable OSM ways drawn as blocks + ⛔, not enterable. |
| R13 | End cards + menu | P0 | Caught/won: overlay + **Play again** / **Back to menu** (both → **start screen**). **Esc** during play → start screen. |
| R14 | HUD | P0 | **Map name**, **difficulty**, **score** (pellets collected), **pellet progress** (e.g. `12/35`), **one life** (one tag ends the run). No levels. |
| R15 | Random spawn | P0 | Each Play → different spawn when possible. |
| R16 | Street names | P0 | Street names on the board, laid out to reduce overlap where possible. |
| R17 | Background music | P0 | **Music on/off** on start and in-game; choice in **localStorage** (`barbara-chase:musicMuted`). When off, **no** song or chase jingle plays. Song file on welcome/chase; short synth jingles on caught/won/landmark. |
| R18 | Run recap on end | P0 | Win or caught overlay includes **Your run recap** (2–3 lines about streets/places from the run). Uses **OpenAI** when `OPENAI_API_KEY` is set; otherwise **template fallback** in `lib/recap.ts`. Not a scored quiz. |
| R19 | Downtown playability | P0 | Downtown graph **rotated/flattened** so arrows match the screen; **looser** corner input than other maps. **Ocean** layer south of streets (Downtown + Isla Vista). |

**Map size (all three)**
- Each map covers roughly **5×7 city blocks** (compact downtown core), fetched from **OpenStreetMap** via local script (`scripts/fetch-map.py`), not live at runtime.
- One graph file per map; pellet count, ghost count, and player speed per map in `data/maps.json`.

**Build order:** `maps.json` + three graph JSON files → multi-map loader in `lib/` → start screen (character + map cards + prefs) → game shell + focus camera + HUD → movement + ghost + pellets → per-map landmarks + ocean/flatten where needed → music → end cards + recap.

**Explicitly NOT in v1:**
- **Mobile / phone / tablet** layout or touch-only controls
- GPS / live location
- Quiz or score for street names (pellet score only)
- Accounts, multiplayer, saved trips across devices
- Live Overpass on every page load
- Official Namco sprites/sounds (original SVG-inspired shapes)
- More than **three** maps or **three** characters

## 5. Data Model

- **MapCatalog** — `data/maps.json` · id, name, difficulty, graphFile, landmarksFile, previewImage, **landscapeImage**, pelletCount, pelletSpacingM, ghostCount, playerSpeedMps
- **StreetGraph** — `data/graph-downtown-santa-barbara.json` · `data/graph-solvang.json` · `data/graph-isla-vista.json` (bbox, nodes, edges; playable flag on edges)
- **Landmark** — `data/landmarks-<map-id>.json` · id, name, lat, lon, blurb, imageUrl
- **PlayerPrefs** — localStorage · `barbara-chase:lastMapId`, `barbara-chase:lastCharacterId`
- **MusicPrefs** — localStorage · `barbara-chase:musicMuted` (`"1"` = off)
- **PlaySession** — in-memory only (game state + run log: street names and landmark ids visited); refresh → start screen with prefs restored
- **RunRecap** — built from run log + map catalog; server action `app/actions/recap.ts` → `lib/openai.ts` or fallback

**Legacy:** `data/streets.json` and `data/landmarks.json` may remain for scripts; runtime uses per-map graph and landmark files.

## 6. Guidance on User Experience

- **Flow:** Start (character + map cards + music) → Play → overview → chase (arrows/pad, drag map) → tap landmarks → win or caught → recap + **Play again** → **start screen**.
- **Controls:** Arrow keys and direction pad; drag map to look; Esc → start screen. Helper line under HUD lists controls for the active map.
- **Visual:** Harbor chrome. Landscape JPGs + SVG previews in `public/maps/`. Landmark images in `public/landmarks/`. Welcome tagline: *Ready to discover Santa Barbara County?*

## 7. Guidance on Tech Stack / Components

- Next.js page; rules in `lib/`; SVG map + shadcn UI.
- OSM fetch: `scripts/fetch-map.py` (same pipeline as downtown; per-map bbox).
- `lib/maps.ts` loads graph/landmarks by **map id**; Downtown play graph via `lib/flatten-graph.ts` + `lib/map-play.ts`.
- Ghost behavior in `lib/ghost-ai.ts`; ocean in `lib/map-ocean.ts`; music in `lib/game-music.ts` + `components/game-music-*`.

## 8. Other Info & Open Questions

- **Value line:** “Pac-Man on the real streets we walked today — pick Isla Vista, Solvang, or downtown SB.”
- **Open questions:** Landmark sets can grow per map; recap tone when OpenAI is enabled is `[ASSUMPTION]` kid-friendly unless parent feedback says otherwise.
