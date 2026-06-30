# Architecture Map

The current high-level shape of the system. Keep this accurate as the system grows.

## Big picture

BaseHeat is a **fully client-side, static web app** — public, anonymous, with **no accounts
and no server-side storage**. Everything the visitor enters (goal, locations, health
answers, daily logs) lives only in their **browser** (`localStorage`). The plan engine runs
in the browser, and weather is fetched directly from Open-Meteo by the browser, so no
personal data — not even location — ever reaches a server. This is the privacy backbone and
the GDPR-minimizing posture the owner wants. `pnpm build` emits a static `out/` folder for
any CDN.

```
                         ┌───────────────── the user's browser ─────────────────┐
                         │                                                       │
   Open-Meteo  ◀── fetch ── lib/weather/open-meteo.ts  (geocode, forecast)       │
  (no API key)            │            │                                          │
                         │            ▼                                          │
                         │   PHYSIOLOGY CORE (lib/physiology) — pure, 51 tests    │
                         │   heat-math · acclimatization · plan-engine            │
                         │   ┌───────────────────────────────────────────────┐   │
                         │   │ SAFETY OVERLAY (safety.ts) — sits ABOVE, wins  │   │
                         │   └───────────────────────────────────────────────┘   │
                         │            │                                          │
                         │   lib/client-program.ts  (buildTodayView,            │
                         │   buildProgramView — adaptation replayed from logs)   │
                         │            │                                          │
                         │   lib/store.ts  ◀── localStorage (the only storage)   │
                         │            │                                          │
                         │   app/* Client Components (onboarding/today/plan/log)  │
                         └───────────────────────────────────────────────────────┘

   Hosting = a CDN serving static files from `out/`. No server, no database.
```

## Why it's shaped this way

- **Physiology core is pure** (no I/O): deterministic, unit-tested, auditable, and it runs
  unchanged in the browser. The valuable, safety-critical logic never moved.
- **Safety overlay is its own module**, applied as a gate over any proposed plan.
- **State lives in the browser only.** No server means nothing to breach, the lightest
  regulatory footprint, and trivially cheap global hosting.
- **Adaptation is derived, not stored:** `client-program` replays the saved logs to get the
  running adaptation total, so we never persist computed plans.

## The daily loop (data flow)

1. Onboarding writes the profile (incl. health answers) to `localStorage` and resolves the
   origin baseline once.
2. `/today` reads state, fetches live weather in the browser, picks the safest window, runs
   the engine (safety overlay first), and shows the plan. It saves a tiny `history` entry.
3. `/log` writes the day's feedback to `localStorage` and advances the day cursor.
4. Next `/today` replays the logs → new adaptation total → the plan visibly adjusts.
5. `/plan` projects the whole program forward from the multi-day forecast.

## Directory layout

```
app/                      Next.js routes — all Client Components
  page.tsx                client redirect → /onboarding or /today           [done]
  onboarding/             goal + origin + location + screening (client form) [done]
  today/                  MAIN page: today's plan + "Your program" (merged)  [done]
  plan/                   redirect → /today (program merged into Today)      [done]
  log/                    daily self-report (client form)                    [done]
  program-list.tsx        "Your program" section + expandable day rows       [done]
  layout.tsx              shell + privacy footer                             [done]
lib/
  store.ts                localStorage state + useAppState hook              [done]
  client-program.ts       browser builders (today + program), adaptation     [done]
  units.ts                °C/°F display + persona labels                      [done]
  physiology/             pure domain core (+ __tests__/, 51 tests)          [done]
    constants.ts            named safety thresholds + persona/ramp params
    heat-math.ts            heat index, wet-bulb, WBGT
    safety.ts               the overlay (env gates + screening tiers)
    acclimatization.ts      gap, ramp, decay, feedback scoring
    plan-engine.ts          persona-aware plan generator
  weather/
    open-meteo.ts           geocoding + single & multi-day forecast (browser) [done]
next.config.ts            output: "export" (static site)                     [done]
```

## Storage shape (`localStorage` key `baseheat.state.v1`)

`AppState` = persona · units · origin{label,lat,lon,band,baselineHeatIndexC} ·
current{label,lat,lon} · screening · tripEndISO · startISO · currentDay ·
logs{day→feedback} · history{day→{target,intensity,safety,feelsLike}}.

There is **no server, no database, and no `WeatherSnapshot`/Prisma anymore** (removed in the
client-side re-architecture — see `decisions.md` D21).
