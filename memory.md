# Working Log

The running log. First file to read when resuming, last to write before stopping.
Newest entry at the top.

---

## 2026-07-02 — Desktop Today redesign (second Claude Design import)

Owner imported a new Claude Design file (`Desktop Today.dc.html`, project
`eb41f117-b6af-42f2-98da-e686371983f7`) and asked to implement the new desktop layout.
Read via DesignSync MCP. tsc clean + 82 tests pass + static build clean; verified live
at 1440px (desktop new layout) and 402px (mobile unchanged).

**New bento layout (replaces the old 5-row arrangement):**
- **Row 1 — plan hero (7) | day & night (5):** The plan hero now leads with a colour-coded
  safety banner (CAUTION=amber / NORMAL=green / HARD_STOP=red) instead of a separate safety
  card, then shows plan content (headline, adj badge, pills, 2-col steps, hydration, why +
  cautions inline). The "Your day & night" card (5 cols) combines what were three separate
  cards: cool windows (morning/evening with "your session" badge on the active window),
  "hot right now" notice, rest-of-day (with/without AC), and tonight's recovery — all in
  one scrollable card.
- **Row 2 — heat+stats (8) | forecast (4):** The heat chart section now shows the four live
  stats (Now / Feels like / Humidity / Wind) inline in the card header (via a new `statsRow`
  prop on `HeatClock`). The separate "Live conditions" card from the old Row A is gone.
- **Row 3 — adaptation+progress (12):** Ring (190px) + 2×2 stats + retention note (250px) +
  5-column sparklines (flex:1) all in ONE unified section. Replaces the old separate
  AdaptationRing card (Row A) and ProgressTrends card (Row E).
- **Row 4 — program calendar (12):** Unchanged.
- **Row 5 — warning signs (12):** Now full-width 3-col (heat exhaustion | heat stroke | red
  stop box), replacing the old col-span-5 card.

**Code changes:**
- `app/adaptation-ring.tsx`: exported `Ring` (was private) so desktop can use just the SVG.
- `app/today/shared.tsx`: exported `NIGHT` palette (needed for inline overnight in the
  day&night card).
- `app/heat-clock.tsx`: added `statsRow?: React.ReactNode` prop — when provided it replaces
  the "feels-like" label in the header with the stats row; mobile passes nothing (unchanged).
- `app/today/sidebar.tsx`: Progress sidebar link changed from `#progress` to `#adaptation`
  to match the new section ID.
- `app/today/desktop.tsx`: complete rewrite matching the new design. `AreaSpark` and
  `SPARK_MARKERS` are inlined (copied from progress-trends) for the 5-col sparkline grid.
  Mobile page, safety overlay, plan engine, and all other files untouched.

---

## 2026-07-01 — Fixed GoatCounter analytics (`/stats`): wrong site code + API parsing

Owner reported the GoatCounter dashboard showed **"No data received"** and couldn't find the
API token page. Diagnosed two real bugs (decisions **D36**); tsc + static build clean.
- **ROOT CAUSE — wrong site code.** The app hardcoded `GC_SITE = "climatize-now"` in
  `app/layout.tsx` (tracking `<Script>`) and `app/stats/page.tsx` (API), but the owner
  registered **`climatize`** (account = `climatize.goatcounter.com`). Verified live:
  `climatize-now.goatcounter.com` → HTTP 400 (never existed); `climatize.goatcounter.com` →
  303. So the tracker was posting to a nonexistent site → no data. **Fixed both to
  `"climatize"`.** Owner must **redeploy** for the corrected tracker to go live, then real
  visits will populate the dashboard (GoatCounter counts the owner's own visits unless
  "disable for this browser" was clicked).
- **API token location.** GoatCounter puts token creation under the **username menu**
  (top-right "tanerr@") → **API** (`/user/api`), NOT under Settings tabs. The `/stats`
  on-page steps said "Settings → API" (wrong) — rewrote them to "account menu (your email,
  top-right) → API" and pointed step 1 at `climatize.goatcounter.com`.
- **SECOND bug — response parsing.** Verified the API's OpenAPI (`goatcounter.com/api.json`):
  `GET /api/v0/stats/hits?start&end&daily=true` returns `hits[]` **one entry per PATH**, each
  with a nested `stats[]` of `{day, daily}`, plus a top-level integer `total`. The old code
  treated each `hits[]` entry as a day (`r.day`/`r.count_unique` — neither exists) and read
  `data.total.count` (it's an int). Rewrote `fetchStats` to **aggregate `stats[].daily` by day
  across paths** (site-wide daily series), use `data.total` for the total, and dropped the
  always-0 "Unique visitors" card for a **"Busiest day"** (peak daily) card. Added `&limit=100`
  so all paths are captured. `DayStat`/`Totals` interfaces updated.
- **CORS is NOT a problem** (had worried it would be): live check shows
  `/api/v0/stats/hits` returns `access-control-allow-origin: *`, so the browser-direct token
  call works from the static site — no server/proxy needed (upholds D21). The `corsBlocked`
  fallback in the page stays as a harmless safety net.

## 2026-07-01 — Humidity science: overnight-recovery outlook + humidity-aware fan rule

Owner asked (science question) how the platform handles high humidity and what to add.
Confirmed humidity is already central (heat index + wet-bulb + WBGT, OR-gated in `safety.ts`;
gap/baseline use heat index; copy names humidity when wet-bulb/WBGT drives it). Then
implemented the two highest-value additions (decisions **D35**). 82 tests (+7) + tsc + static
build clean; **verified live** (Singapore/KL vs Phoenix/Riyadh) — behaves as designed.

- **#1 Overnight-recovery outlook** — new pure module `lib/physiology/overnight.ts`
  (`overnightRecoveryGuidance`): tiers the coming night's COOLEST hour into
  COOL/WARM/MUGGY/DANGEROUS from the overnight-min heat index **plus a wet-bulb "muggy"
  flag** (`OVERNIGHT_C.MUGGY_WET_BULB = 20°C` ≈ dew point 20). A warm night that stays muggy
  is flagged poor-recovery even below the caution band, and `humidDriven` marks when humidity
  (not just heat) is the reason — so a sticky tropical night (Singapore: feels 25°C but
  wet-bulb 23.7 → MUGGY/humidDriven) and a hot-dry night (Riyadh: feels 28.8 but wet-bulb 14.6
  → MUGGY, NOT humidDriven) read differently. `client-program.ts` `computeOvernight()` walks
  forward from "now" to the first upcoming night-band run (8pm–7am) using the existing 2-day
  fetch (no new network); adds `overnight`/`overnightLowFeelsLikeC` to `TodayView`. New
  **`OvernightCard`** in `app/today/shared.tsx` (Moon icon, level chip, **Humidity badge** when
  humidDriven, "dips to ~X") rendered after the rest-of-day card in BOTH mobile + desktop.
  **Deliberately NO pre-emptive dose penalty** — poor sleep surfaces next morning as low
  sleep-quality/feeling, which the tested feedback loop already turns into REDUCE/HOLD; hard-
  wiring would double-count and churn the tested core. (Offered to add an explicit nudge later.)
- **#2 Humidity-aware fan rule** — replaced the single `FAN_INEFFECTIVE_AIR_TEMP_C = 35`
  with a humidity-sliding limit: `FAN_LIMIT_AIR_TEMP_C {DRY:35, HUMID:40}` interpolated over
  `FAN_LIMIT_RH_PCT {DRY:30, HUMID:60}` via new pure `fanEffectiveAirTempLimitC(rh)` in
  `recovery.ts`. Science (Jay/Morris): a fan keeps helping to HIGHER air temps in humid heat
  (drives evaporation off wet skin) and stops/​harms in hot-DRY air. `RestOfDayInput` gains
  `peakAirHumidityPct` (RH at the hottest-air hour, read in `computeRestOfDay`). EXTREME + HOT
  copy now branch on the humidity-aware `fanStillHelps` (humid extreme → "fan still helps IF
  skin is wet"; dry extreme → "won't cool you in air this hot and dry"). Verified: Phoenix 38°C
  @6% → limit 35 → fan dropped; Singapore 29°C @74% → limit 40 → fan kept.
- **Docs**: `app/how-it-works` "After your session" rewrote the fan detail (temp×humidity) and
  added an **overnight/nights-matter** paragraph + two sources (fan biophysical modelling;
  warm-night mortality/sleep-in-heat). Safety overlay, thresholds, plan engine, window logic all
  **untouched** — additive pure modules + one display card.

## 2026-07-01 — Today Dashboard — Desktop layout (sidebar + 12-col bento)

Owner imported a second Claude Design file from the same project
(`df9cdc86-417c-4ec1-a156-4e01d50818fb` → **`Today Dashboard - Desktop.dc.html`**, read via
DesignSync MCP) and asked to implement the desktop version. Done as a **responsive
enhancement of `/today`** (decisions D34) — one data path, safety/physiology untouched. tsc +
75 tests + static build clean; verified with real seeded state via headless Chromium at 1440 /
1024 / 402 px (desktop bento renders; mobile unchanged; no console errors).
- **`/today` is now responsive.** The existing mobile layout is wrapped `lg:hidden`; a new
  desktop layout renders at `lg+` (`hidden lg:block`). Both are fed by the SAME `TodayView` /
  `ProgramView` and the same handlers — so there's no second data path and no divergence.
- **New `app/today/desktop.tsx`** (`DesktopToday`) — sidebar + header + a 12-column bento:
  Row A ring · safety · **live-conditions** (new vertical Now/Feels/Humidity/Wind card, the
  desktop replacement for the mobile hero stat row); Row B heat curve(8) · forecast(4);
  Row C plan(7, 2-col steps) · [rest-of-day + why stacked](5); Row D progress(7) ·
  warnings(5); Row E 14-day program **calendar**(12).
- **New `app/today/sidebar.tsx`** (`Sidebar`) — left rail: Today (active) / Log today /
  Progress / Program / Forecast (the last three are in-page `#anchor` links) · How it works /
  About / Change cities / **Start over** (kept for parity with the mobile gear, behind an inline
  confirm). Footer "no accounts · no tracking".
- **New `app/today/program-calendar.tsx`** (`ProgramCalendar`) — the whole program as a
  7-across day-card grid (today outlined orange, future dashed/"projected", skipped dimmed,
  felt-rating dots), from the same `ProgramView.days`. Short dates computed from `startISO`.
- **Shared, no duplication:** extracted `SAFE`/`INTENSITY_LABEL`/`ADJUST`/`windLabel`/`PlanPill`/
  `RecognitionList` into **`app/today/shared.tsx`** (mobile page now imports them — markup
  unchanged). `AdaptationRing` gained a `stacked` prop (centered ring + boxed 2×2 stats for the
  bento), `ForecastStrip` a `variant="rows"` (desktop list), and `heatColor` is now exported.
  `HeatClock` / `ProgressTrends` reused as-is (they scale to their container).

## 2026-07-01 — Settings menu: two options (change cities vs. start over)

Owner asked (Today-screen screenshot) to split the gear menu's single "Change program
settings" (which just wiped everything) into **two distinct options** (decisions D33). tsc +
75 tests + static build clean; routes serve 200; merge logic proven by a standalone sim.
- **Gear dropdown** (`app/today/page.tsx`) now shows two labelled items:
  1. **Change cities** (`MapPin`) → `/change-cities` — *keep your progress, just update where
     you are*.
  2. **Start from the beginning** (`RotateCcw`, red) → an **inline confirm** ("Erase
     everything?") → `reset()` + `/onboarding`. Added a confirm step because it's destructive
     (the old one wiped instantly). New `confirmReset` state + `closeSettings()` helper resets
     both flags on close. Added a `RotateCcw` icon to `app/icons.tsx`.
- **New route `app/change-cities/page.tsx`** — a focused form (reuses `PlaceInput` + `Brand`)
  that updates the **destination** (`state.current`, required) and optionally the **home/origin**,
  while **keeping everything else** (persona, units, screening, `tripEndISO`, `startISO`,
  `dayOffset`, `logs`, `history`) via `{...s, current, origin}`. The **origin baseline stays
  frozen** (D23) unless the user actively edits the home field — detected by comparing the
  origin text/band against the seeded values; only then is `resolveOriginBaselineHeatIndexC`
  re-run. Fields are seeded from stored state once (guarded render until `seeded`). Cancel →
  `/today`. A footer note points users to "Start from the beginning" for goal/health/units
  changes. No engine/safety changes — presentation + a non-destructive state edit.

## 2026-07-01 — SEO & social sharing (OG image + full metadata)

Full search-engine and social-sharing layer added; static build clean.
- **`app/opengraph-image.tsx`** — generates a branded 1200×630 PNG at build time using
  `ImageResponse` (with `export const dynamic = "force-static"` for static-export
  compatibility). Design: dark orange-amber radial gradient, climatize.now wordmark, sun SVG
  icon with glow, tagline, four pill badges ("No accounts", "No tracking", "Science-based",
  "Safety first"). Output: `dist/opengraph-image` (PNG binary).
- **`layout.tsx` metadata** expanded: `metadataBase` (reads `NEXT_PUBLIC_SITE_URL` env var,
  falls back to `https://climatize.now`), `title.template` (`%s — climatize.now`), `keywords`,
  `authors`, `creator`, `robots` (index/follow + googlebot max-image-preview:large), complete
  `openGraph` (url, siteName, locale en_US, image with dimensions + alt), `twitter` card
  (summary_large_image with image).
- **`app/sitemap.ts`** — XML sitemap (/, /how-it-works, /about, /privacy); priorities 1.0→0.4;
  `force-static` required.
- **`app/robots.ts`** — robots.txt (allow all, sitemap pointer); `force-static` required.
- **Production URL**: set `NEXT_PUBLIC_SITE_URL=https://your-domain.com` before `pnpm build`
  so all canonical/OG/sitemap URLs resolve correctly. Without it they fall back to
  `https://climatize.now`.

## 2026-07-01 — About page

Added `app/about/page.tsx` (static, trust-page style) + an "About" link in the layout footer
(How it works · About · Privacy & terms). Content: the owner's founding story (got sick from
heat while travelling → couldn't find a personalized, safe acclimatization plan → built this with
AI for himself, now shared as summers get hotter) + who-made-it with links to his personal page
(https://tunas.me/taner/) and GitHub (https://github.com/BenZenTuna). Owner is **Taner**
(GitHub BenZenTuna).

## 2026-07-01 — Today Dashboard visual redesign (from Claude Design)

Owner imported a Claude Design mockup (`Today Dashboard.dc.html`, project
`df9cdc86-417c-4ec1-a156-4e01d50818fb` "Climatize.now platform review", read via the
DesignSync MCP) and asked to implement it. Full Today-page redesign to that mockup, wired to
REAL data (not the mockup's demo values), no loss of existing features (decisions D32). 75
tests + tsc + static build clean; data verified live vs Slivo Pole.
- **Type system**: swapped Geist → **Space Grotesk** (body) + **Space Mono** (mono labels) via
  `next/font/google` (`layout.tsx`, `globals.css` `--font-sans/--font-mono`). Background
  gradient already matched the design. New `app/dc-styles.ts` holds shared card/mono class
  tokens (`DC_CARD`, `DC_CARD_WARM`, `DC_MONO_HEAD`, `DC_MONO_SMALL`).
- **New components**: `app/adaptation-ring.tsx` (circular gauge + stats: days done / heat dose /
  full-adapt date / 7-day trend), `app/forecast-strip.tsx` (next-7-days heat bars + outlook
  dots, continuous heat→colour ramp). **Rewrote `app/heat-clock.tsx`** from the bar version to
  the design's **area+line curve** (shaded cool-window bands, 32°/39° dashed thresholds, NOW
  marker, hour ticks). Restyled `app/progress-trends.tsx` (area-spark card grid) and
  `app/program-list.tsx` (dropped the linear meter — the ring replaces it — restyled to a
  `DC_CARD`, now takes a `units` prop).
- **Today page** (`app/today/page.tsx`) fully rebuilt to the mockup: header w/ logo + **working
  °C/°F toggle** (persists to `state.units`, live re-render, no refetch — renders with
  `state.units`), hero with a **new Wind stat**, ring, safety+cool-windows card, heat curve,
  plan card (adjustment badge inline), forecast strip, progress, warning signs, sticky CTA.
  **Kept** the rest-of-day recovery + "why" cards + full program list + Start-over (restyled) —
  the mockup omitted them but they're real features.
- **Data**: added `wind_speed_10m` to the Open-Meteo `current` fetch → `MultiDayForecast
  .nowWindKmh` → `TodayView.windKmh`. Replaced `TodayView.heatTimeline` (bars) with
  `heatCurve {feelsC[24], windows, nowHour}`. Added to `ProgramView`: `daysLogged`,
  `heatDoseMinutes`, `fullAdaptLabel` (projected date), `trend7Pct` (7-day adaptation delta),
  `forecastStrip: ForecastDay[]` — all computed from real state/forecast. `WindowDisplay` still
  carries `startHour/endHour` (from the earlier heat-clock work); curve windows reuse them.

## 2026-06-30 — Heat clock (visual day timeline) + program-list mobile fix

Owner picked suggestion #3 (from a platform-review brainstorm) and reported a mobile layout
bug on the program list. Both done (decisions D31); 75 tests + tsc + static build clean.
- **Heat clock** — new `app/heat-clock.tsx` (`HeatClock`) on the Today page, just under the
  safety/window card. A bar-per-hour view of today's feels-like curve (waking hours 5am–11pm):
  **bar height = feels-like, colour = safety level** (emerald/amber/red), the recommended cool
  window is **outlined in orange**, past hours dimmed, "now" marked. Tap any bar → detail line
  ("3pm · feels 37°C · Caution · your window"); defaults to now. Data: new
  `buildHeatTimeline()` in `client-program.ts` adds `heatTimeline: HeatHour[]` to `TodayView`
  (uses the whole-day `findGoodWindows` to mark window hours). Added `startHour`/`endHour` to
  `WindowDisplay` (set in `blockToDisplay`) so the clock can highlight window hours; tests
  extended. Verified live vs Slivo Pole: clean mountain shape — emerald mornings (5–8am window),
  red HARD-STOP peak 2–3pm, amber cooling evening, evening window highlighted.
- **Program-list mobile fix** — `DayRow` rows were cramped on phones: the date wrapped
  ("Wed," / "Jul 1"), the summary squeezed into a sliver, and the long outlook badge
  ("Good · 5–9am & ~10pm") hogged the row. Fix: the right cluster is now a **narrow vertical
  stack** (max-feels temp, felt emoji, chevron); the outlook badge moved to **its own line**
  under the summary and shows **just the verdict word** (`o.label`) — dropping the window times
  it duplicated from the summary (this reverses the badge-times part of commit c3962a4; the
  times still live in the summary, now with honest ranges). Date is `whitespace-nowrap`; left
  column is `flex-1`.

## 2026-06-30 — Honest "good window" detection (tight windows + real temp ranges)

Owner unhappy with the windows on Today + the program list (screenshots): every day showed
the SAME fixed "5–11am / 5–10pm" spans with one understated temp (e.g. "5–10pm · 29°C" on a
38°C day), and "Good to go — gently" was green on a heatwave day. Root causes (all confirmed):
- **Sonnet's `findGoodWindows` never narrowed.** Its "viable block" = *not HARD_STOP*, but
  HARD_STOP is heat-index 39.4°C, so the whole 5–11/17–22 filter range was always one block →
  back to fixed spans.
- **Temp was the single coolest hour** in the block (`rep`) → 10pm's value shown for a 5–10pm
  window (or 5am's for a morning) → grossly understated, looked "unrealistic / estimated"
  (they're real hourly-forecast values, just cherry-picked).
- **Green verdict came from the single coolest hour too** (`plan.safetyLevel` via the
  coolest-upcoming-hour anchor), so it disagreed with the wide window shown.

Fix (decisions D30) — orchestration + display only; safety overlay & tested engine untouched:
- Rewrote `findGoodWindows` (`lib/weather/open-meteo.ts`): a `coolBlock` anchors on the
  period's coolest non-hard-stop hour and grows over consecutive hours within
  `WINDOW_COMFORT_BAND_C` (3°C, new constant) of it — or below the comfortable floor
  (`HEAT_INDEX_BANDS_C.CAUTION`) on a mild day. So hot days → tight windows (9–10pm), mild days
  → the whole comfortable period stays. `WindowDisplay` now carries **`feelsLowC`/`feelsHighC`
  (honest range)** + **`level`** (worst level across the block) instead of one `feelsLikeC`.
- New `pickWindowAnchor` (replaces `pickSafestWindow` for today via `pickUpcomingWindow` and
  for future days via `fetchMultiDayForecast`): anchors the plan on the best window's **warm
  edge** (hottest moment you'd actually be active), label from the window's coolest sweet spot.
  Falls back to `pickSafestWindow` when every hour is a hard stop. → verdict & dose now match
  the window; green only when the *whole* cool window is genuinely safe (slightly more
  conservative on hot days, by design). No threshold changes.
- Display: `fmtTempRange()` in `lib/units.ts` (collapses when ends round equal); Today card &
  program-list summary show the range, colored by the warm edge; program-list day temp now
  **labelled "peak"** (answers "what is this temp?").
- New `lib/weather/__tests__/windows.test.ts` (9 tests): tight/mild windows, honest range,
  CAUTION-not-green when the window's still hot, no-window-when-all-hard-stop, warm-edge anchor.
- Verified live vs the real Slivo Pole heatwave: today evening now "9–10pm · 29–31°C [NORMAL]"
  (was "5–10pm · 29°C"); Jul 1 "morning 5–9am 23–26°C & evening ~10pm 25°C". 75 tests + tsc +
  static build all clean.

## 2026-06-30 — Plain-language heat note (de-jargoned the caution copy)

Owner couldn't understand the caution "Heat note" line ("wet-bulb 23.3°C is high; heat index
31°C is in the Extreme-Caution range; WBGT 25.1°C is elevated") and suspected it was wrong.
It was confusing (jargon + the numbers are the *window* values, clashing with the hero's
"feels like 40°C") and subtly wrong (31°C was flagged only by the HIGH-risk threshold
tightening — 31°C isn't actually in the NWS Extreme-Caution band). Fix (decisions D29):
- `safety.ts` `evaluateEnvironment` now also returns a **plain `summary`** (no metric names),
  with humidity mentioned only when wet-bulb/WBGT is the driver; kept the technical `reasons`
  for transparency but they're no longer shown. Removed the inaccurate "Extreme-Caution range"
  wording. `SafetyAssessment` gains `environmentalSummary`.
- `plan-engine.ts`: the heat note now reads "Heat note: even in your **{window}** window,
  it still feels about 31°C and the humidity makes it harder for your body to cool down." —
  anchoring the number to the planned window so 40°C-now vs 31°C-window makes sense. Same plain
  summary flows into the rationale and the hard-stop cautions. Also fixed an adjacent awkward
  phrase ("20 minutes of *rest* activity" → "passive heat exposure").
- New tests in `plan-engine.test.ts` assert the note is plain (no wet-bulb/WBGT/heat-index/
  Extreme-Caution) and that humidity is mentioned only when it's the driver. 66 tests + tsc +
  build clean. Verified live (Slivo Pole + heart condition).

## 2026-06-30 — Rebrand: BaseHeat → climatize.now

Owner bought the domain **climatize.now** and asked to rename the platform. Done across all
user-facing surfaces + internal identifiers (decisions D28):
- **Wordmark** `app/brand.tsx`: "BaseHeat" → "climatize<span>.now</span>" (".now" in
  orange-500). Flame logo kept. Every screen uses `<Brand/>`, so this covers them all.
- **Metadata/PWA**: `app/layout.tsx` (title, appleWebApp, OpenGraph), `app/how-it-works`,
  `app/privacy` (titles, descriptions, back-links, body copy), `public/manifest.webmanifest`
  (name/short_name). theme-color & icons unchanged.
- **Internal IDs**: `package.json` name → `climatize-now`; `public/sw.js` cache →
  `climatize-v1` (the activate handler auto-deletes the old `baseheat-v1` cache).
- **localStorage key**: `baseheat.state.v1` → **`climatize.state.v1`**, with a one-time
  migration in `lib/store.ts` (`LEGACY_KEYS`) so NO existing data is lost (it's the whole
  app's storage). `clearState` clears both.
- Docs updated (`CLAUDE.md` title + key note, `architecture.md`). Historical log entries
  below are left as-is (they record the old name as history). 64 tests + tsc + build clean.

## 2026-06-30 — Merged safety+window card, rest-of-day recovery, science review

Owner notes on a Today-screen screenshot (3 asks). All done; 64 tests + tsc + static
build clean (decisions D27):
- **Merged the two stacked boxes into one** colour-coded card (`app/today/page.tsx`):
  the old amber "very hot right now" note + the green "Today's heat safety" card are now
  a single card that leads with the verdict, shows a **prominent, coloured "Best window
  to be outside"** chip (sun/moon + the window label), and folds the "it's hot now — that's
  why it's timed for the cooler window" line inside it. Dropped the unclear "TODAY'S HEAT
  SAFETY" caption.
- **Rest-of-day recovery guidance** (Note 2): new pure module `lib/physiology/recovery.ts`
  (`restOfDayGuidance`) — climate-tiered MILD/WARM/HOT/EXTREME advice for spending the rest
  of the day, split **with AC vs without AC**, keyed to the remaining-hours peak. Includes
  the evidence-based **fan caveat** (above ~35°C air a fan stops cooling / can dehydrate →
  wet skin, cool showers, seek a cooler space) via new constant `FAN_INEFFECTIVE_AIR_TEMP_C`.
  `client-program.ts` computes the remaining-hours peak feels-like/air-temp + "hot until ~Xpm"
  and adds `restOfDay` + `restOfDayPeakFeelsLikeC` to `TodayView`; new card on `/today`.
- **Science review** (Note 3, owner chose "recommendations + recovery"): kept the validated
  safety thresholds and dose/ramp numbers (already evidence-based, pending clinician sign-off
  Q1); added the recovery model, made the post-session step **active cooling**, and documented
  the science + sources on `app/how-it-works/` (new "After your session" section; added Périard
  2015 and CDC/EPA/WHO fan sources). Parked one refinement as open-questions **Q5**
  (self-reported sweat response isn't yet used in feedback scoring).
- New icons `Home`/`Wind`; new tests `recovery.test.ts` (6).

## 2026-06-29 — Trust pages, PWA, real calendar + progress trends

Owner picked 3 of the suggested improvements (skipped data export/edit-setup). All done,
verified in browser (decisions D24–D26):
- **Trust pages**: `app/how-it-works/` (the science + sources) and `app/privacy/` (no-data
  story + medical disclaimer + terms). Footer links added in `layout.tsx`.
- **PWA / installable**: flame app icon (app/icon.svg + generated PNGs 192/512/maskable +
  app/apple-icon.png, made via headless-chromium render), `public/manifest.webmanifest`,
  theme-color, `public/sw.js` (network-first, same-origin only) registered in production
  via `app/sw-register.tsx`. Verified manifest/icons/sw land in `out/`.
- **Real calendar**: program day now derived from the real date via
  `currentProgramDay(state)` (start date + `state.dayOffset`); replaces the advance-on-log
  cursor (supersedes D12). Skipped real days now register as missed (decay). Log no longer
  advances; shows "✓ Logged today". **Dev-only** "Simulate next day" button (hidden in the
  production build) bumps `dayOffset` for testing.
- **Progress trends**: `app/progress-trends.tsx` — sparklines of overall feeling / sweat /
  effort / sleep / thirst over logged days, flagged improving/steady/watch (shows at ≥2 logs).
- 58 tests, tsc, and static build all clean.

## 2026-06-29 — Visual redesign (warm "heat" design system)

Owner asked to make it more user-friendly / visually attractive. Added a cohesive warm
theme, NO logic changes:
- `app/globals.css`: warm sunrise-glow background; `.rise` entrance animation.
- `app/icons.tsx`: inline Lucide-style icon set (Flame, Sun, Moon, Droplet, Thermometer,
  ShieldCheck, Alert, Clock, Activity, MapPin, ChevronDown, ArrowRight, etc.).
- `app/brand.tsx`: gradient flame logo + "BaseHeat".
- `lib/units.ts`: `heatTextColor()` — colors "feels like"/day temps by heat level
  (emerald→amber→orange→red).
- Redesigned all surfaces: onboarding (gradient hero, persona cards w/ icons), today
  (gradient hero + conditions w/ icons + heat-colored feels-like, icon pills on the plan,
  shield/alert on safety, gradient CTA), program list (icons, heat-colored temps, chevron),
  log (emoji scale for "overall", gradient CTA). tsc + build clean; screenshots verified.

## 2026-06-29 — Clarified the safety banner

Owner: the green status banner ("Clear to go — gently") didn't say WHAT it was judging.
Added a "TODAY'S HEAT SAFETY" caption + a plain-language subtitle per level (NORMAL/CAUTION/
HARD_STOP) in `app/today/page.tsx`, tying it to the exposure window. NORMAL now reads "Good
to go — gently / The window you'll exercise in is in the safe range…".

## 2026-06-29 — Onboarding: live place autocomplete

Owner: the location fields were a "black box" (no idea if a place would resolve). Added live
suggestions. New `searchPlaces(query, count)` in open-meteo (multi-result geocoding) +
`app/onboarding/PlaceInput.tsx` (debounced 250ms, race-guarded, dropdown of matches,
Enter-picks-top, "✓ {label}" confirmation once chosen). OnboardingForm now holds controlled
text + selected `GeoResult` for current/origin; submit uses the picked coords, else falls
back to `geocode(text)`. tsc + build clean; verified live (typing "Slivo" → 5 real matches,
pick → ✓ confirmation → onboards).

## 2026-06-29 — Merged Today + Full plan into one page

Owner wanted a single window: today's plan as the focus, other days visible on scroll. Done.
`/today` is now the single main page: today's full plan at top → "Your program" section
below (adaptation meter + caveat + the rest of the days, expandable; today excluded since
it's shown in full above) → sticky "Log how today went" button. Tabs removed (`app/nav.tsx`
deleted); `/plan` now redirects to `/today`. Extracted `app/program-list.tsx`
(`ProgramSection` + expandable `DayRow`). `/today` fetches both builders via `Promise.all`.
tsc + 58 tests + static build all clean; verified in browser (today plan + program both
present, no tabs, /plan→/today).

## 2026-06-29 — Full plan: every day expandable to its preliminary plan

Owner wanted to see each day's full plan, not just the one-liner. `ProgramDay` now carries a
`detail` (headline/steps/hydration/rationale/cautions) for today+future days (built from the
per-day `generateDayPlan`; past days = null). `/plan` rows are now tappable buttons (chevron)
that expand inline: today → full plan + link to the live page; future → "Preliminary…" note +
steps/hydration/why (headline hidden to avoid "Today:" wording); past → "target was X, you
did/skipped, felt 😄". Passed `safestWindowLabel` to projected days so steps name the real
window. tsc + 58 tests clean; verified in browser.

## 2026-06-29 — Origin baseline = 21-day decay-weighted recent home weather

Owner-requested improvement (decisions D23). Replaced the crude origin-baseline proxy with
the home's REAL last 21 days of weather: `recentOriginBaselineHeatIndexC` (Open-Meteo
`past_days`) → decay-weighted average of daily-peak heat index (`decayWeightedMean`, ~14-day
half-life; recent days count more, matching how adaptation fades). Why: recency captures
"what your body is used to" AND the season automatically; yearly avg / single day are both
wrong. Falls back to band → temperate. Onboarding explains it. Verified live: Karlstad →
23.4°C → gap ~15°C vs Slivo Pole ("big jump", gentle 27 min). 58 tests pass. Existing users
must "Start over" to recompute the baseline (it's set once at onboarding, which is correct).

## 2026-06-29 — Bugfix: heat "gap" measured at the wrong moment

Owner reported (Karlstad → Slivo Pole, BG): rationale wrongly said "close to what your body
is used to" and the program temps showed the cool morning value, not the real heat. Root
cause: the gap was computed from the cool exposure-window heat, not the day's peak. Fixed
(decisions D22): gap now uses the **day's peak** + origin's **average daily peak**; Today &
program **display the peak** (e.g. 38°C); unified Today/program via one multi-day fetch +
`pickUpcomingWindow`; added a "very hot right now — plan is timed for {window}" note. Result:
gap ~13°C, "big jump", gentle 30-min start. 53 tests pass; typecheck clean. Dev server left
running on :3100 for the owner to test.

## 2026-06-29 — Re-architected to fully client-side (zero server storage) ✅

Owner is taking this public (own domain, worldwide) with **no logins, no personal-data
collection** to avoid GDPR/regulatory burden. So I rebuilt it privacy-by-design (full
reasoning in `decisions.md` D21):
- **All state in the browser** (`localStorage`, key `baseheat.state.v1`) via `lib/store.ts`.
- **Engine runs in the browser**; weather fetched browser-direct from Open-Meteo (CORS `*`),
  so location never touches a server. New `lib/client-program.ts` builds today + program
  (adaptation REPLAYED from logs — no plans stored).
- **All pages are Client Components** now (guard on a `ready` flag for hydration).
- **`output: "export"`** → `pnpm build` emits static `out/` for any CDN.
- **Removed**: Prisma/SQLite/libSQL, `lib/db.ts`, `lib/program.ts`, `lib/projection.ts`,
  `app/actions.ts`, `prisma/`; deps `@prisma/*`, `@libsql/client`, `prisma`, `zod`, `tsx`.
- Privacy footer added ("No accounts. No tracking. Everything stays on your device").
- **Verified** via real-browser E2E: onboard → today → log → day-2 adjusts → program view,
  with state confirmed in `localStorage`. 51 tests pass; static export build clean.

**State now**: app is empty/fresh (per-browser). `pnpm dev` → http://localhost:3100;
`pnpm build` → `out/`. The tested physiology engine is unchanged.

**Next**: hosting/domain (it's a static site — Cloudflare Pages / Netlify / GitHub Pages all
work), a short privacy/terms page, and a pre-launch legal sanity-check (open-questions Q2).
Also still worth doing someday: real-calendar day advancement + the clinician threshold
review (Q1).

## 2026-06-29 — Multi-day projected program view (`/plan`)

Owner asked for a several-day program (not just today), with future days clearly marked
as projections that change with progress/weather. Built:
- `lib/weather/open-meteo.ts` → `fetchMultiDayForecast` (1–16 days, grouped by day, each
  with its safest window + peak strain).
- `lib/projection.ts` → `buildProgramView`: past days (stored actuals + how they felt),
  today (live), future (PROJECTED — assumes +1 adaptation-day/day and uses the forecast;
  beyond the 16-day horizon it falls back to "typical"). Per-day outlook GOOD/TOUGH/SHELTER
  from the weather, an adaptation meter (% of `personaRampDays`), and a clear caveat.
- `app/plan/page.tsx` + `app/nav.tsx` (Today ↔ Full plan nav, added to both pages).
- Covers 3 of the owner's 4 picks at once: multi-day plan, heat outlook, progress/history.
- Verified via browser: past/today/future render; doses climb 45→48→50→…→75; hotter
  forecast mornings correctly cap to "Go gentle". 51 tests pass, build clean.

**Still open from that batch: "open it on my phone."** It's environment setup (WSL2) with a
privacy tradeoff — parked for the owner to choose private-LAN vs temporary public tunnel
(see `open-questions.md` Q2). The app is already mobile-friendly (verified at 420px).

## 2026-06-29 — Tuned the plan & safety logic (owner-requested)

Owner chose to refine the physiology before adding features. Changes (full reasoning in
`decisions.md` D16–D18):
- **Ramp**: redesigned so day-one is a meaningful, gap-scaled fraction of a per-persona
  full dose and climbs to the real 60–90 min stimulus by end of week 1–2 (was a too-timid
  ~13 min start). New named params in `constants.ts` (`PERSONA_PROGRAM`, `RAMP`); renamed
  `personaHorizonDays`→`personaRampDays`, `personaCeilingMinutes`→`personaFullDoseMinutes`.
- **Screening**: now escalates to HIGH on compounding combinations (e.g. 65+ on a diuretic),
  not just single flags.
- **Thresholds**: reviewed and deliberately kept (documented why).
- Tests: 51 pass (added 5). Typecheck + build clean.

Next natural step is **Phase 4 (history/trends + polish)** unless the owner wants more tuning.

## 2026-06-26 — Session 1: Phases 0–3 done, runnable v1 reached ✅

**Outcome: the core daily loop is built, runnable, and verified end-to-end.**
A user can onboard (goal + origin + current location + health screening), get today's
live-weather-driven, safety-bounded plan, log how they felt, and watch tomorrow's plan
visibly adjust — with the safety overlay active throughout.

**Built this session**
- *Phase 0* — Next.js 16 + TS + Tailwind 4 scaffold on **port 3100**; SQLite via Prisma 7 +
  libSQL adapter (`lib/db.ts`), schema (Profile/DayPlan/DayLog/WeatherSnapshot); continuity
  docs + `CLAUDE.md`.
- *Phase 1* — Pure, tested physiology core in `lib/physiology/`: `heat-math` (NWS heat
  index, Stull wet-bulb, WBGT est.), `safety` (hard stop + screening tiers, the
  non-bypassable overlay), `acclimatization` (gap, ramp, decay, feedback scoring),
  `plan-engine` (persona-aware). **46 Vitest tests pass.**
- *Phase 2* — `lib/weather/open-meteo.ts`: geocoding (handles "City, State"), forecast,
  safest-window picker, origin-baseline resolver. Verified against live Open-Meteo.
- *Phase 3* — Orchestration `lib/program.ts` + server actions `app/actions.ts` + screens
  (`/onboarding`, `/today`, `/log`) + root redirect. **Verified via a real-browser E2E**
  (onboard Phoenix → Day 1 plan → log good day → Day 2 shows "Advanced ↑ 13→16 min").
  Production `pnpm build` passes.

**State of the app right now**
- DB is **empty** (reset after testing) so the next run starts at a clean onboarding.
- Dev server is **stopped**. Start it with `pnpm dev` → http://localhost:3100.

**Not done yet — Phase 4 (polish & honesty), the natural next milestone**
- Progress/history view (trend of feedback markers, plan history) — main remaining feature.
- Decay is implemented in the engine (`updateAdaptationDays`) but not yet surfaced for
  real skipped calendar days (the demo advances days explicitly via "Save & see tomorrow").
- Per-persona tone is in the rationale; vacationer honesty note is present. Could deepen.
- The day model is a **cursor** (`Profile.currentDay`) advanced on log, so the loop is
  demoable in one sitting; real-calendar-day handling is a later choice (see decisions D12).

**Open for the owner** (see `open-questions.md`): clinical review of thresholds (Q1);
deploy/phone/multi-user (Q2); origin-baseline modeling (Q3); units default (Q4).

**Useful commands**
- `pnpm dev` → http://localhost:3100 · `pnpm test` (46 tests) · `pnpm build`
- `pnpm db:studio` browse data · `pnpm db:push` apply schema
