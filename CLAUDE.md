@AGENTS.md

# climatize.now — Heat Acclimatization Platform

(Formerly "BaseHeat" — rebranded to **climatize.now** on 2026-06-30; see decisions D28.)

A personalized, daily, weather-driven program that helps people adapt to heat safely.
See the product brief for the full vision and the non-negotiable physiology/safety rules.

## Continuity discipline — READ THESE FIRST, every session

I (the owner) am not a programmer and rely on you for continuity across sessions. At the
start of every session, read these in order, before doing anything else:

1. `memory.md` — the running log: what's built, half-finished, and what's next.
2. `decisions.md` — settled architectural/product decisions + reasoning (don't reverse
   silently).
3. `architecture.md` — the current system map.
4. `open-questions.md` — things parked for the owner.

At the **end** of every working session, append a dated entry to `memory.md` and record
any significant new decision in `decisions.md`. Keep them concise and current.

## Non-negotiable: the safety overlay

`lib/physiology/safety.ts` sits ABOVE the plan engine and can never be bypassed. A hard
environmental stop overrides any goal/progress; health-screening flags cap or withhold
plans; every plan ships with heat-exhaustion vs heat-stroke recognition and a "stop and
seek help now" list. Everything is framed as **wellness guidance, not medical advice**.
Never weaken this layer to make a feature work — if something conflicts, log it in
`open-questions.md`.

## Operational facts

- **Dev server: port 3100** (`pnpm dev`). Port 3000 is taken on this machine.
- **Tests: `pnpm test`** (Vitest). The physiology core must stay tested, including the
  hard-stop and screening cases.
- **No server, no database.** The app is **fully client-side** (re-architecture D21): all
  state lives in the browser at `localStorage` key `climatize.state.v1` (`lib/store.ts`;
  it migrates the legacy `baseheat.state.v1` key on load so the rebrand loses no data),
  the engine runs in the browser, and weather is fetched **browser-direct** from Open-Meteo
  (CORS `*`) — so no personal/health data ever reaches a server. Don't reintroduce
  server-side storage of user data; it's the core privacy promise.
- **Build = static export.** `next.config.ts` has `output: "export"` + `distDir: "dist"`;
  `pnpm build` emits `dist/` for any CDN. (So `next start` isn't used — serve `dist/` statically.
  `distDir: "dist"` is required for Coolify deployment which expects `/app/dist`.)
- **Weather: Open-Meteo** (no API key). `lib/weather/open-meteo.ts` — geocoding + single &
  multi-day forecast, called from the browser.
- **Next.js 16** — has breaking changes vs older versions (see `@AGENTS.md`).

## Stack

Next.js 16 (App Router, static export) · TypeScript · Tailwind CSS 4 · Vitest. Client-side
only — state in `localStorage`. Engine is rules-based and pure (no ML) by design — see
`decisions.md` D4.
