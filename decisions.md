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

---

## 2026-06-30 — Merged safety/window card, rest-of-day recovery, science review

**D27 — Three owner-requested changes from a Today-screen screenshot.**

*(a) The safety verdict and the go-outside window are now ONE card.* The old design
stacked an amber "very hot right now…" note above a separate green "TODAY'S HEAT SAFETY"
card; the owner found the caption unclear as its own field and wanted the time window shown
clearly. The merged card (`app/today/page.tsx`) leads with the plain-language verdict
(Good to go gently / Caution / Stop), then shows a **prominent, safety-coloured "Best window
to be outside"** chip (sun/moon + the window label), and folds the "it's hot right now —
that's why your session is timed for the cooler window" sentence inside it. The window chip
only shows when there's an active session (HARD_STOP days have no go-time, by design).

*(b) Rest-of-day recovery guidance is a first-class part of every plan.* Rationale is
physiological: acclimatization is driven by the daily heat *dose* (the timed session), not
by 24/7 exposure — so after the session the right thing is to recover and avoid extra heat
strain (supports plasma-volume restoration, sleep, and heat-illness prevention in peak
hours), and recovering somewhere cool/AC does NOT undo adaptation. New pure module
`lib/physiology/recovery.ts` (`restOfDayGuidance`) tiers the remaining-hours peak feels-like
into MILD/WARM/HOT/EXTREME and returns **with-AC vs without-AC** advice + a recovery note.
The without-AC advice is keyed to AIR temperature via a new constant
`FAN_INEFFECTIVE_AIR_TEMP_C = 35°C` (~95°F): above it a fan no longer reliably cools and can
speed dehydration, so the advice switches to wetting the skin / cool showers / seeking a
cooler space rather than a fan alone (CDC/EPA/WHO; Jay et al.). `client-program.ts` computes
the remaining-hours peak (feels-like + air temp) and a "hot until ~Xpm" label and adds
`restOfDay`/`restOfDayPeakFeelsLikeC` to `TodayView`.

*(c) Scientific review — scope chosen by the owner: "recommendations + recovery".* We
**kept** the validated safety thresholds (D18) and the dose/ramp numbers (D16) — both are
already evidence-based and explicitly pending clinician sign-off (Q1), so churning them
adds risk without clear benefit. The science-led *changes* are: the recovery model above;
the post-session step is now **active** cooling (shade/AC, cool drink, water on skin), which
the literature supports for faster core-temp recovery; and the science is now documented with
sources on `app/how-it-works/` (new "After your session" section; added Périard et al. 2015
and CDC/EPA/WHO fan guidance). One genuine refinement is parked as **Q5**: self-reported
sweat response is collected but not yet used in feedback scoring, even though earlier/freer
sweating is a real adaptation marker.

This change touches only copy, the additive recovery model, and the Today UI — the
safety overlay and the tested acclimatization core are unchanged. 64 tests pass
(6 new in `recovery.test.ts`); tsc + static export clean.

---

## 2026-06-30 — Rebrand: BaseHeat → climatize.now

**D28 — The product is now "climatize.now" (the owner's purchased domain).** Renamed
across every user-facing surface (the `<Brand/>` wordmark — ".now" set in orange-500, flame
logo kept; page titles, descriptions, OpenGraph, Apple web-app title; the how-it-works and
privacy copy; and the PWA manifest name/short_name) and internal identifiers (`package.json`
name → `climatize-now`; service-worker cache → `climatize-v1`, whose existing activate
handler deletes the old `baseheat-v1` cache automatically).

**The localStorage key changed `baseheat.state.v1` → `climatize.state.v1`, WITH a one-time
migration** (`LEGACY_KEYS` in `lib/store.ts`): `loadState` copies any legacy value into the
new key and removes the old one; `clearState` clears both. Rationale: the entire app lives in
localStorage (D21), so renaming the key without migrating would silently wipe every existing
user's goal/locations/health answers/logs — unacceptable for a rebrand. The migration makes
it lossless. Keeping the legacy key name in code (as a migration source) is deliberate.

Historical entries in `memory.md`/`decisions.md` keep the old "BaseHeat" name as a matter of
record; only current-state docs (`CLAUDE.md`, `architecture.md`) were updated. The flame
icon, theme color (#ea580c), and all physiology/safety logic are unchanged.

---

## 2026-06-30 — Plain-language heat note (de-jargoned the caution copy)

**D29 — User-facing safety copy describes the heat in plain words, not raw metrics.** The
caution card's "Heat note" used to dump the three internal metrics ("wet-bulb 23.3°C is high;
heat index 31°C is in the Extreme-Caution range; WBGT 25.1°C is elevated"). The owner (the
target user — non-technical) couldn't understand it, and it had two real flaws: (1) those are
the *exposure-window* values, which clashed with the hero's "feels like 40°C" (now) with no
explanation, and (2) "31°C is in the Extreme-Caution range" was inaccurate — 31°C is below the
NWS Extreme-Caution band (32.2°C) and was flagged only because a HIGH-risk screening *tightens*
the gates by 3°C.

Fix: `evaluateEnvironment` now returns a single plain-language `summary` (e.g. "it still feels
about 31°C and the humidity makes it harder for your body to cool down") alongside the
technical `reasons` (kept for transparency/debug but no longer shown). Humidity is named only
when wet-bulb or WBGT is the trigger. `SafetyAssessment` carries `environmentalSummary`. The
plan engine anchors it to the planned window — "Heat note: even in your {window} window,
{summary}." — so the window's feels-like clearly differs from "right now"; the same summary
feeds the rationale and the hard-stop cautions. Removed the inaccurate "Extreme-Caution range"
wording and an adjacent contradictory phrase ("X minutes of *rest* activity" → "passive heat
exposure"). Thresholds, tiers, doses and the safety gating are all unchanged — this is copy
only. Tests in `plan-engine.test.ts` lock in that the note stays jargon-free (66 tests pass).

---

## 2026-06-30 — "Good window" detection made tight, honest, and consistent

**D30 — The good-window picker hugs the genuinely-cool hours, shows an honest temp
range, and the safety verdict is anchored to that window's warm edge.** The previous
`findGoodWindows` defined a "viable" hour as merely *not a hard stop* (heat index < 39.4°C),
so on any normal summer day the whole morning (5–11) and evening (17–22) filter range formed
one block — the window never narrowed and always read as the fixed "5–11am / 5–10pm". It then
displayed the **single coolest hour's** temperature (e.g. 10pm's 29°C for a 5–10pm window),
which understated a multi-hour window so badly it looked like a made-up number, and the green
"go gently" verdict was computed at that same lone coolest hour — so it disagreed with the
wide window the card displayed. (Owner reported all three on a Slivo Pole heatwave day.)

New model (in the weather/orchestration layer; the safety overlay and the tested physiology
engine are NOT touched, and no thresholds change):
- A `coolBlock` anchors on the period's coolest non-hard-stop hour and grows over consecutive
  clock hours while each stays within `WINDOW_COMFORT_BAND_C` (3°C, new named constant) of that
  coolest hour, OR below the comfortable floor (`HEAT_INDEX_BANDS_C.CAUTION`, 26.7°C). Effect:
  **hot days narrow to the real cool stretch** (e.g. 9–10pm), while **genuinely mild days keep
  the whole comfortable period** (the floor prevents needless tightness). `WindowDisplay` now
  carries `feelsLowC`/`feelsHighC` (the block's coolest→warmest heat index — an honest range)
  and `level` (the worst safety level across the block).
- `pickWindowAnchor` replaces `pickSafestWindow` as the plan's anchor (today via
  `pickUpcomingWindow`, future days via `fetchMultiDayForecast`). It evaluates the plan at the
  best window's **warm edge** — the hottest moment one would actually be active in the
  recommended window — so the verdict and dose are honest to the window rather than to a
  cherry-picked coolest hour. Green now appears only when the *entire* recommended window is in
  the safe band; otherwise it correctly shows Caution. This is slightly more conservative on hot
  days (intended). It falls back to `pickSafestWindow` (single safest hour) when every candidate
  hour is a hard stop, so the engine can still produce a hard-stop day.
- Display: `fmtTempRange()` (`lib/units.ts`) renders the range and collapses to one value when
  the ends round equal; the Today card and the program-list summary show it, coloured by the
  warm edge. The program-list day temperature is now explicitly labelled **"peak"**.

**Why it's scientifically OK to stay green sometimes:** the verdict describes the *cool
exposure window* (e.g. light activity at ~30°C feels-like late evening), not the day's peak
(which the app still steers away from and contrasts in the "it's very hot right now…" note).
Exercising gently in the coolest, time-capped, hydrated window is the correct way to acclimatize
— so green for an honestly-shown cool window is defensible; green next to a mislabelled hot
window was not. Thresholds remain pending clinician review (Q1/D18). New tests in
`lib/weather/__tests__/windows.test.ts` (9) lock the behaviour in (75 tests total; tsc + static
build clean). Verified live against the real Slivo Pole forecast.

---

## 2026-06-30 — Heat clock (visual day timeline) + program-list mobile layout

**D31 — The Today page gets a visual "heat clock", and the program-list rows are
restructured for mobile.** Two owner-requested changes from a platform review.

*Heat clock (`app/heat-clock.tsx`).* A bar-per-hour view of today's feels-like curve for the
waking hours (5am–11pm): **bar height encodes the feels-like heat, colour encodes the safety
level** (emerald NORMAL / amber CAUTION / red HARD_STOP), past hours are dimmed, "now" is
marked, and the recommended cool window is **outlined in orange**. Tapping a bar shows that
hour's detail (defaults to "now") — works on touch and desktop. It makes the core timing
message visible at a glance: *be active in the cool window, not the midday peak.* The data is a
new `HeatHour[]` `heatTimeline` on `TodayView`, built by `buildHeatTimeline()` in
`client-program.ts` from the same forecast already fetched (no extra network); it reuses the
whole-day `findGoodWindows` to flag which hours are in a window, so the highlight always matches
the window logic. `WindowDisplay` gained `startHour`/`endHour` (set in `blockToDisplay`) to
support the highlight. The clock is **display only** — it reads the safety overlay's verdicts,
never sets them. Placed on Today only for now (future days don't carry hourly data).

*Program-list mobile layout.* The `DayRow` was a single horizontal flex with a `shrink-0` right
cluster that included a long outlook badge ("Good · 5–9am & ~10pm"); on a phone it starved the
left column, wrapping the date ("Wed," / "Jul 1") and crushing the summary. Restructured: the
right side is now a **narrow vertical stack** (max-feels temp · felt emoji · chevron), the date
is `whitespace-nowrap`, the left column is `flex-1`, and the **outlook badge moved to its own
line** under the summary showing **only the verdict word** (`o.label`). This intentionally drops
the window times from the badge — **partially reversing commit c3962a4** ("show time in Good
window badge") — because the summary already lists each window with its honest temp range
(D30), so the badge repetition was both redundant and the cause of the overflow. No information
is lost. 75 tests + tsc + static export all clean.

---

## 2026-07-01 — Today Dashboard visual redesign (imported from Claude Design)

**D32 — The Today page is restyled to the owner's Claude Design mockup (`Today
Dashboard.dc.html`), wired to real data, with no loss of existing features.** The mockup was
read via the DesignSync MCP (project `df9cdc86-417c-4ec1-a156-4e01d50818fb`). Faithful port,
but every value comes from the live engine/forecast, not the mockup's demo numbers.

- **Type system**: Space Grotesk (body) + Space Mono (mono labels) replace Geist, via
  `next/font/google`. Shared class tokens live in `app/dc-styles.ts` so all cards stay
  consistent. The warm background gradient was already a match (globals.css), so it's unchanged.
- **New/rewritten components**: `AdaptationRing` (circular gauge + real stats), `ForecastStrip`
  (7-day heat bars + outlook dots), and the heat clock **rewritten from bars to an area+line
  curve** matching the design (shaded cool windows, 32°/39° threshold lines, NOW marker). The
  bar `HeatHour[]` on `TodayView` became `heatCurve {feelsC[24], windows, nowHour}`.
- **Live °C/°F toggle** in the header (a long-standing gap — units were onboarding-only). It
  writes `state.units`; the Today page renders temperatures from `state.units` (not the
  view snapshot), so toggling is instant and triggers **no re-fetch** (the raw view values are
  °C and unit-agnostic).
- **Wind**: added `wind_speed_10m` to the Open-Meteo `current` call → `nowWindKmh` →
  `TodayView.windKmh`, shown as the hero's 4th stat (km/h, or mph in °F).
- **Ring stats on `ProgramView`** (all real): `daysLogged`, `heatDoseMinutes` (cumulative
  completed exposure), `fullAdaptLabel` (projected date adaptation reaches the persona ramp
  length, at +1 adaptation-day/day), `trend7Pct` (adaptation-% delta vs 7 days ago via
  `adaptationAfter`), and `forecastStrip` (next 7 days' peak feels-like + window outlook).

**Deliberately kept beyond the mockup** (real features the mockup simply didn't show): the
rest-of-day recovery card (D27), the "why today looks like this" rationale, the tap-to-expand
full **program list** (D19/D20, now a `DC_CARD`, its linear adaptation meter removed since the
ring supersedes it), and a Start-over control (moved to a quiet link near the footer). The
safety overlay, thresholds, plan engine, and window logic are untouched — this change is
presentation + two additive data fields (wind, ring stats). Only the Today page adopts the new
layout; other pages inherit only the font. 75 tests + tsc + static build clean; the full data
path (wind, 24h curve, windows, ring, forecast strip) verified live against Slivo Pole.
