// The acclimatization model: how big the heat "gap" is, how far along the ramp the
// user is, how feedback nudges that, and how adaptation decays when days are missed.
// Pure functions, fully testable.

import { PERSONA_PROGRAM, RAMP } from "./constants";
import type { Persona, DailyFeedback, FeedbackScore } from "./types";

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
function clamp01(x: number): number {
  return clamp(x, 0, 1);
}

/**
 * The personalization driver: how much hotter the current heat strain is than what
 * the body is acclimatized to (origin baseline), in °C of heat index. A large gap
 * means start gentler and ramp slower; a small/negative gap needs little.
 */
export function heatGapC(currentHeatIndexC: number, originBaselineHeatIndexC: number): number {
  return currentHeatIndexC - originBaselineHeatIndexC;
}

/** Effective adaptation-days this persona's ramp takes to reach the full dose. */
export function personaRampDays(p: Persona): number {
  return PERSONA_PROGRAM[p].rampDays;
}

/** The full daily dose (minutes) this persona ramps toward. */
export function personaFullDoseMinutes(p: Persona): number {
  return PERSONA_PROGRAM[p].fullDoseMinutes;
}

/** How strongly the heat gap should hold the ramp back, 0 (small) … 1 (large). */
export function gapPenalty(gapC: number): number {
  return clamp01(
    (gapC - RAMP.gapPenaltyLowC) / (RAMP.gapPenaltyHighC - RAMP.gapPenaltyLowC),
  );
}

/**
 * Base daily exposure target (minutes). The target ramps from a gentle START dose
 * (a gap-scaled fraction of the persona's full dose) up to that full dose. A bigger
 * gap starts lower, stretches the ramp longer, and climbs more gradually — so a
 * large origin↔current jump is met with caution, while a small one needs little.
 */
export function rampTargetMinutes(
  persona: Persona,
  adaptationDays: number,
  gapC: number,
): number {
  const full = personaFullDoseMinutes(persona);
  const penalty = gapPenalty(gapC);

  const startFraction =
    RAMP.startFractionSmallGap -
    (RAMP.startFractionSmallGap - RAMP.startFractionLargeGap) * penalty;
  const start = full * startFraction;

  const rampDays = personaRampDays(persona) * (1 + RAMP.largeGapRampStretch * penalty);
  const progress = clamp01(adaptationDays / rampDays);

  const eased = Math.pow(progress, 1 + RAMP.largeGapCurve * penalty);
  return Math.round(start + (full - start) * eased);
}

/**
 * Score yesterday's feedback into a signal (advance / hold / reduce / abort) plus
 * a delta to adaptation-days. Poor response holds or reduces; a red flag aborts.
 */
export function scoreFeedback(f: DailyFeedback): FeedbackScore {
  const notes: string[] = [];

  // Acute warning signs → stand down hard.
  if (f.redFlag || (f.dizziness && f.nausea)) {
    notes.push("You reported warning signs — easing right back and prioritising cooling.");
    return { signal: "ABORT", adaptationDelta: -1.0, notes };
  }

  if (!f.completedExposure) {
    notes.push("Yesterday's session wasn't completed — holding steady today.");
    return { signal: "HOLD", adaptationDelta: 0, notes };
  }

  const strain =
    (f.overallFeeling <= 2 ? 1 : 0) +
    (f.sleepQuality <= 2 ? 1 : 0) +
    (f.headache ? 1 : 0) +
    (f.thirst >= 4 ? 1 : 0) +
    (f.perceivedExertion >= 4 ? 1 : 0) +
    (f.dizziness ? 1 : 0);

  if (strain >= 2) {
    notes.push("Yesterday looked like a strain — reducing today's target.");
    return { signal: "REDUCE", adaptationDelta: 0, notes };
  }

  const goodResponse =
    f.overallFeeling >= 4 &&
    f.sleepQuality >= 3 &&
    !f.headache &&
    f.thirst <= 3 &&
    f.perceivedExertion <= 3;

  if (goodResponse) {
    notes.push("You responded well — advancing today's target a little.");
    return { signal: "ADVANCE", adaptationDelta: 1.0, notes };
  }

  notes.push("A steady day — holding the target.");
  return { signal: "HOLD", adaptationDelta: 0.5, notes };
}

/**
 * Apply a feedback delta and decay for any fully-missed days to the running
 * adaptation-days total (floored at 0, capped to avoid unbounded growth).
 */
export function updateAdaptationDays(
  current: number,
  delta: number,
  missedDays = 0,
): number {
  const decayed = current - RAMP.decayPerMissedDay * Math.max(0, missedDays);
  return clamp(decayed + delta, 0, 60);
}
