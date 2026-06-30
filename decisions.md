# Decisions Log (append-only)

Significant architectural & product decisions, with reasoning, so future sessions
don't relitigate or silently reverse settled choices. Newest at the bottom.

---

## 2026-06-26 — Initial architecture & stack

**D1 — Single Next.js (App Router) + TypeScript app.**
One codebase serves both the UI and the server-side logic, so there is a single thing
to run and maintain across many sessions. TypeScript guards against whole classes of
errors. Version: Next 16.2.9, React 19.2.4.

**D2 — SQLite via Prisma 7 + the libSQL driver adapter (`@prisma/adapter-libsql`).**
A single local `dev.db` file — no database server to install, and health-screening
data never leaves the machine. Chose the **libSQL** adapter over `better-sqlite3`
because libSQL ships **prebuilt binaries** (no native compilation, which can fail on a
fresh machine). Gotchas discovered and encoded:
- The adapter class is `PrismaLibSql` (note the casing — not `PrismaLibSQL`).
- Prisma 7 puts the datasource URL in `prisma.config.ts` (reads `DATABASE_URL`), not in
  `schema.prisma`. `file:./dev.db` resolves from the **project root** (where
  `prisma.config.ts` lives), so the db lands at `./dev.db`.
- `lib/db.ts` resolves the file to an absolute path from `process.cwd()` so the CLI and
  the runtime adapter always agree on the same file.
- Verified end-to-end (create/count/delete) on 2026-06-26.

**D3 — Open-Meteo for weather.** Free, **no API key / no signup**, and returns
temperature, relative humidity, AND `apparent_temperature` directly — exactly the
physiology inputs we need. Its geocoding endpoint turns a place name into coordinates,
also free. Keeps the prototype instantly runnable for a non-technical owner.

**D4 — Rules-based plan engine, NOT machine learning (per brief §3).** A transparent set
of pure, tested functions is safer, explainable to users, and auditable. Revisit only
with a recorded decision here.

**D5 — Physiology is pure functions; the safety overlay is a SEPARATE layer above the
plan engine.** The engine *proposes*, the safety layer *disposes*. Modeling safety as its
own gate (not woven into plan generation) guarantees it can always win and is independently
testable. (Brief §4: the overlay is never bypassable.)

**D6 — No authentication / single profile for v1.** Simplest honest path to prove the
daily loop. Accounts/multi-user is a later decision (the schema already allows many rows).

**D7 — Units: store everything in °C internally; display °C with a °F toggle.** One
internal unit keeps the physiology unambiguous; display conversion is a thin layer.

**D8 — Origin baseline = the origin location's recent conditions as a proxy** for "what
the body is used to," with a manual qualitative override (COOL/TEMPERATE/WARM/HOT_HUMID).
Flagged for the owner in `open-questions.md` — it's a modeling simplification.

**D9 — JSON payloads stored as `String` columns (JSON.stringify/parse in code); enum-like
fields stored as `String` with allowed values documented + enforced in TS/Zod.** SQLite
lacks native enums and has uneven JSON support across tooling; this is the portable choice.

**D10 — `prisma db push` (not migrations) for v1.** Faster schema iteration during the
prototype. Switch to `prisma migrate` before any real/multi-user deployment.

**D11 — Generated Prisma client lives in `lib/generated/prisma/` (out of the `app/`
routing tree) and is imported by relative path.** Keeps Next's router from ever treating
generated files as routes, and relative imports resolve identically in Next, Vitest, and
`tsx`. Entry file is `client.ts` (Prisma 7's new `prisma-client` generator).

---

## 2026-06-26 — Building the loop (Phase 3)

**D12 — The program day is a cursor (`Profile.currentDay`), advanced when the user logs.**
Real calendar days would make the "see tomorrow adjust" loop un-demoable in one sitting, so
each log saves feedback then advances the cursor; the next Today view regenerates from live
weather. The running adaptation total is chained through `DayPlan[D-1].adaptationDays` (which
does NOT yet include log[D-1]), so day D applies yesterday's delta exactly once — no
double-counting. Real-calendar handling and missed-day decay surfacing are a later choice.

**D13 — Geocoding tolerates "City, State/Country".** Open-Meteo matches plain place names,
so `geocode()` searches the first comma-segment and uses the rest to disambiguate among
matches. Without this, "Phoenix, Arizona" / "Austin, Texas" return nothing — a constant
real-world failure. (Found via browser E2E.)

**D14 — Next server actions require a matching `Origin` header (CSRF protection).** Relevant
if we ever proxy/forward to the app or script form posts. Real browsers send it automatically;
hand-crafted POSTs must include it. Not a code change — a note for future integration work.

**D15 — `intensity: "REST"` with minutes > 0 means PASSIVE heat exposure (no exertion),** a
valid gentler mode (brief §3). Reserved `REST` + 0 min for true rest days. Copy reflects this
("passive heat exposure") so a reduced day never reads as "X min of light activity" at REST.

---

## 2026-06-29 — Tuning the plan & safety logic (owner-requested)

**D16 — Ramp redesigned to start at a meaningful dose and reach the real stimulus.**
The first version started everyone at ~13 min and stayed low for days — too timid to
provide the ~60–90 min core-temperature stimulus the science calls for. New model: each
persona has a FULL daily dose (ACCLIMATIZER 75 / LEARN_TO_SWEAT 60 / VACATIONER 35 min) and
a ramp length in adaptation-days (8 / 14 / 4). Day one starts at a gap-scaled FRACTION of
the full dose (60% for a tiny gap → 30% for a huge gap), then climbs to full over the ramp,
with a bigger gap also stretching and flattening the early climb. Net effect (gap 4°C
acclimatizer): 42→49→65→75 over ~8 days — gentle but genuinely adapting. Params are named
in `constants.ts` (`PERSONA_PROGRAM`, `RAMP`). Safety caps still override on caution days.

**D17 — Screening now escalates on COMPOUNDING combinations, not just single flags.**
A lone risk factor is ELEVATED; HIGH now triggers on a major condition (heart/kidney/
pregnancy), OR ≥2 heat-relevant meds, OR a heat-relevant med combined with an age-extreme/
other condition. Rationale: an older adult on a diuretic (dehydration + blunted
thermoregulation) is far higher risk than either factor alone implies. Reasons text says
when the escalation was due to a combination.

**D18 — Safety thresholds reviewed and kept (not changed).** Heat-index hard stop at 39.4°C
(NWS "Danger"), wet-bulb hard stop 28°C (conservative vs. the ~31°C empirical / 35°C
theoretical limits, since users may be vulnerable), WBGT 31°C (black flag). The three metrics
are complementary (wet-bulb catches humid danger, heat index catches dry-hot danger, WBGT
the exertional combination), so the OR logic is intentional. Still flagged for clinician
review (open-questions Q1).

---

## 2026-06-29 — Multi-day projected program (`/plan`)

**D19 — Future days are PROJECTIONS, computed and clearly labelled as such.** The program
view (`lib/projection.ts`) lays out the whole program: past = stored actuals, today = live,
future = projected. Projection assumes the user completes each day and advances ~+1
adaptation-day/day (`PROJECTED_DAILY_GAIN`), and uses the real multi-day forecast for each
day's safest-window conditions (so a hotter forecast day correctly caps the dose / flags
"go gentle"). Beyond Open-Meteo's 16-day horizon, days fall back to the last forecast day's
conditions, marked "typical". The UI states plainly that future days change with progress,
weather, and feedback. Rationale: the owner wanted to *see the shape* of the program without
implying the future is fixed.

**D20 — The `/plan` page does triple duty.** Rather than three separate screens, the program
view carries the multi-day plan, the per-day heat outlook (GOOD/TOUGH/SHELTER from the
weather), AND progress/history (adaptation meter + past days with how-you-felt). Fewer
screens, one coherent story. Today ↔ Full-plan nav lives in `app/nav.tsx`.

---

## 2026-06-29 — Re-architecture: fully client-side, zero server storage

**D21 — The app is now fully client-side; the server stores and processes NOTHING.**
The owner is taking this public (own domain, worldwide) with **no logins and no personal-data
collection** to stay out of GDPR/regulatory scope. Since health-screening answers are the
most sensitive category of data, the design is privacy-by-design: **all state lives in the
visitor's browser (`localStorage`), the pure engine runs in the browser, and weather is
fetched straight from Open-Meteo by the browser** (confirmed CORS `*`), so even location
never touches us. `next.config.ts` uses `output: "export"` → `pnpm build` emits a static
`out/` folder hostable on any CDN. New: `lib/store.ts` (state + `useAppState` hook) and
`lib/client-program.ts` (browser builders; adaptation derived by REPLAYING stored logs, so
no plans need persisting). Pages are now Client Components that guard on a `ready` flag to
avoid hydration mismatch.

  **This SUPERSEDES:** D2 (Prisma/SQLite/libSQL — removed entirely), D6 (single server
  profile → per-browser state), D9/D10/D11 (Prisma schema/migrations/generated client — gone).
  The physiology engine + its 51 tests are unchanged. Removed deps: `@prisma/*`,
  `@libsql/client`, `prisma`, `zod`, `tsx`; removed files: `prisma/`, `lib/db.ts`,
  `lib/program.ts`, `lib/projection.ts`, `app/actions.ts`, `lib/generated/`.

  **Tradeoffs (accepted, inherent to "no logins"):** data is per-device (no cross-device
  sync; clearing the browser wipes history). Keep the "wellness not medical advice" framing
  prominent; a short privacy/terms page + a legal sanity-check are still advisable before
  launch (open-questions Q2).

---

## 2026-06-29 — Bugfix: the heat "gap" was measured at the wrong moment

**D22 — The origin↔current GAP is measured at the day's PEAK heat, compared like-for-like
against the origin's typical daily peak.** Bug (reported by owner, Karlstad→Slivo Pole): the
engine timed exposure to the cool morning window and then computed the gap from THAT cool
value (~21°C) vs the origin's single current reading — so a 37°C destination looked "close to
what your body is used to," gave a wrong rationale, and an over-aggressive 45-min day-1 dose.
Fixes:
- `generateDayPlan` takes `currentHeatIndexForGapC` (the day's peak) for the gap; exposure
  conditions/safety still use the cool window. (Karlstad→Slivo Pole now: gap ~13°C, "big
  jump", 30-min gentle start.)
- `resolveOriginBaselineHeatIndexC` now uses the origin's **average daily peak** over 3
  forecast days (not one current snapshot); band values bumped to daytime-peak levels.
- Program/Today now **display the day's peak feels-like** (e.g. 38°C), not the cool window.
- `buildTodayView` uses one multi-day fetch + a shared `pickUpcomingWindow` (never a
  passed time) so Today and the program agree on today's minutes AND window label.
- Added a Today note when it's dangerous *right now* but the plan is timed for a cooler
  window ("It's very hot right now — your plan is timed for {window}"). 53 tests (added 2).

---

## 2026-06-29 — Origin baseline from 21-day decay-weighted recent weather

**D23 — The origin baseline is now the home's RECENT ACTUAL weather, not a forecast
snapshot.** `recentOriginBaselineHeatIndexC` fetches the home location's last **21 days**
(Open-Meteo `past_days`) and takes a **decay-weighted average of daily-peak heat index**
(`decayWeightedMean`, ~14-day half-life) — recent days count more, mirroring how heat
acclimatization fades over ~2 weeks. Rationale: heat tolerance is set by the heat you've
lived through over the last few weeks (gained in ~2 weeks, lost in ~2–4), so a recent-weeks
window is the physiologically correct signal AND it automatically captures the season — a
yearly average would be wrong (a Swede is heat-adapted in July, not January) and a single
day is too noisy. Falls back to the qualitative band, then a temperate default. Verified
live: Karlstad → 23.4°C baseline; vs Slivo Pole ~38°C peak → gap ~15°C ("big jump", gentle
27-min start). `decayWeightedMean` is pure + unit-tested (58 tests total). Onboarding now
notes the method. NOTE: baseline is computed once at onboarding (correct — the body's
adaptation is frozen at departure), so existing users must "Start over" to recompute.

---

## 2026-06-29 — Trust pages, PWA, real calendar + trends (owner-picked polish)

**D24 — Trust pages.** `app/how-it-works/` explains the science (heat metrics, baseline,
gap, ramp, safety) with sources; `app/privacy/` states the no-server-data story + a clear
"wellness, not medical advice" disclaimer + brief terms. Footer links from every page.
Plain server components (statically exported).

**D25 — Installable PWA, static-export friendly.** Flame icon: `app/icon.svg` (favicon) +
PNGs (`public/icon-192/512/maskable.png`, `app/apple-icon.png`) rendered once via headless
Chromium (no image-lib dep). `public/manifest.webmanifest` (static JSON, linked via layout
metadata — robust under `output: export`, unlike a dynamic `manifest.ts`). Service worker
`public/sw.js` is **network-first, same-origin only** (so live weather/geocoding always hit
the network and never get staled), registered **production-only** by `app/sw-register.tsx`
(keeps dev clean). theme-color + Open-Graph added.

**D26 — Program day is derived from the real calendar.** `currentProgramDay(state)` =
days since `startISO` + a test-only `state.dayOffset`. This SUPERSEDES the advance-on-log
cursor (D12): logging no longer advances the day, so genuinely skipping calendar days now
registers as missed days (decay) via the log replay. A **dev-only** "Simulate next day"
control (excluded from the production build via `process.env.NODE_ENV`) bumps `dayOffset`
so the loop is still testable in one sitting. Adaptation is still derived by replaying logs,
so no migration needed; the old `currentDay` field is simply ignored. Added
`app/progress-trends.tsx` (sparklines of the self-report markers over logged days).
