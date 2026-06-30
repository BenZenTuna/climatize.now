# Working Log

The running log. First file to read when resuming, last to write before stopping.
Newest entry at the top.

---

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
