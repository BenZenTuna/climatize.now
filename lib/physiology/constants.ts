// Named physiology constants. Each safety threshold cites a source. These are
// best-effort starting points and are meant to be reviewed by a clinician before
// any real-world use (see open-questions.md, Q1). Keep them here, named and
// tunable — never inline magic numbers into the logic.

import type { RecognitionGuidance } from "./types";

// ---------------------------------------------------------------------------
// Heat Index category bands, expressed in °C.
// Source: US National Weather Service (Weather Prediction Center) Heat Index.
//   80°F = 26.7°C · 90°F = 32.2°C · 103°F = 39.4°C · 125°F = 51.7°C
// ---------------------------------------------------------------------------
export const HEAT_INDEX_BANDS_C = {
  CAUTION: 26.7, // 80°F
  EXTREME_CAUTION: 32.2, // 90°F
  DANGER: 39.4, // 103°F
  EXTREME_DANGER: 51.7, // 125°F
} as const;

// ---------------------------------------------------------------------------
// WBGT flag thresholds (°C).
// Source: ACSM position stand on exertional heat illness; US Army WBGT flags.
//   ~28°C approaches "very high / cease"; ~31°C is the black-flag cease point.
// ---------------------------------------------------------------------------
export const WBGT_C = {
  HIGH: 28.0,
  BLACK: 31.0,
} as const;

// ---------------------------------------------------------------------------
// Wet-bulb thresholds (°C).
// Context: theoretical human survivability limit ~35°C; empirical critical limit
// for YOUNG, HEALTHY adults ~31°C (Vecellio et al., 2022, J Appl Physiol). Because
// this product may be used by older or vulnerable people, the hard ceiling is set
// conservatively well below those limits.
// ---------------------------------------------------------------------------
export const WET_BULB_C = {
  CAUTION: 25.0,
  HARD_STOP: 28.0,
} as const;

// HARD_STOP: above any of these, NO active exposure is ever prescribed — shelter
// and active cooling only, regardless of goal or progress (brief §3, §4).
export const HARD_STOP = {
  wetBulbC: WET_BULB_C.HARD_STOP, // 28.0
  heatIndexC: HEAT_INDEX_BANDS_C.DANGER, // 39.4
  wbgtC: WBGT_C.BLACK, // 31.0
} as const;

// CAUTION: at/above any of these, scale back to gentle, passive-leaning exposure.
export const CAUTION = {
  wetBulbC: WET_BULB_C.CAUTION, // 25.0
  heatIndexC: HEAT_INDEX_BANDS_C.EXTREME_CAUTION, // 32.2
  wbgtC: WBGT_C.HIGH, // 28.0
} as const;

// For ELEVATED-risk users we lower the environmental gates by this many °C; HIGH
// risk lowers them by 1.5× this.
export const ELEVATED_RISK_TIGHTEN_C = 2.0;

// Above roughly this AIR temperature (~95°F), an electric fan no longer reliably
// cools and can actually add heat / speed dehydration unless the skin is wetted —
// so the "no-AC, rest-of-day" advice changes here (wet skin / cool showers / seek a
// cooler space, rather than rely on a fan alone).
// Source: US CDC & EPA Excessive-Heat guidance; WHO public-health advice on fan use
// during heatwaves; Jay et al. on the air-temperature limits of fan-based cooling.
export const FAN_INEFFECTIVE_AIR_TEMP_C = 35;

// When picking the "good window to be outside", an hour counts as part of the cool
// block if its heat index is within this many °C of the period's COOLEST hour — so
// the window hugs the genuinely cooler stretch (e.g. 8–10pm) instead of the whole
// morning/evening. On a genuinely cool day the comfortable floor (HEAT_INDEX_BANDS_C
// .CAUTION) keeps the window from being needlessly tight.
export const WINDOW_COMFORT_BAND_C = 3;

// ---------------------------------------------------------------------------
// Adaptation program parameters.
// Heat acclimatization: ~7–14 days, most gains in week one; the daily stimulus is
// roughly 60–90 min of raised core temperature; adaptation DECAYS without exposure
// (noticeable within ~a week). (Brief §3.)
//
// Per persona: the FULL daily dose (minutes) and how many effective adaptation-days
// the ramp takes to reach it. We aim the full dose into the 60–90 min stimulus band
// for genuine acclimatizers, a gentler 60 for sweat-retraining, and a conservative
// 35 for vacationers (damage control — full adaptation isn't possible in a few days).
// ---------------------------------------------------------------------------
export const PERSONA_PROGRAM = {
  ACCLIMATIZER: { fullDoseMinutes: 75, rampDays: 8 },
  LEARN_TO_SWEAT: { fullDoseMinutes: 60, rampDays: 14 },
  VACATIONER: { fullDoseMinutes: 35, rampDays: 4 },
} as const;

// How the daily target ramps from a gentle start to the full dose. The starting
// dose is a FRACTION of the full dose set by how big the origin↔current heat gap
// is — a bigger gap starts lower, stretches the ramp, and climbs more gradually.
export const RAMP = {
  startFractionSmallGap: 0.6, // tiny gap → begin at 60% of the full dose
  startFractionLargeGap: 0.3, // huge gap → begin at 30%
  gapPenaltyLowC: 2, // heat gap at/below this °C → no penalty
  gapPenaltyHighC: 18, // heat gap at/above this °C → full penalty
  largeGapRampStretch: 0.4, // a full-penalty gap lengthens the ramp by up to 40%
  largeGapCurve: 0.5, // …and makes the early climb more gradual (concave)
  decayPerMissedDay: 0.5, // adaptation-days lost per fully-missed day
} as const;

// Recognition guidance shipped with EVERY plan (brief §4).
export const RECOGNITION: RecognitionGuidance = {
  heatExhaustion: [
    "Heavy sweating; cool, pale or clammy skin",
    "Headache, dizziness, or feeling faint",
    "Nausea, weakness, or muscle cramps",
    "Fast, weak pulse",
  ],
  heatStroke: [
    "Hot, red skin — sweating may have STOPPED",
    "Confusion, slurred speech, or agitation",
    "Very high body temperature (≈ 40°C / 104°F or above)",
    "Fainting or loss of consciousness",
  ],
  stopNow: [
    "Confusion, fainting, or a seizure",
    "Skin hot and dry, or you've stopped sweating despite the heat",
    "Repeated vomiting, or you can't keep fluids down",
    "Symptoms that worsen or don't ease within ~30 minutes of cooling and rest",
  ],
};

export const DISCLAIMER =
  "This is wellness guidance, not medical advice. It can't diagnose or treat any condition. If you feel unwell, stop, cool down, and seek help.";
