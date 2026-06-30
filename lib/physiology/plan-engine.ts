// The plan engine. It PROPOSES a day's plan from the acclimatization model, then
// the safety overlay DISPOSES (can always cap or override it). Output is a fully
// structured, plain-language plan + the numbers that drove it (auditable).

import { assessSafety } from "./safety";
import {
  heatGapC,
  rampTargetMinutes,
  scoreFeedback,
  updateAdaptationDays,
} from "./acclimatization";
import { RECOGNITION, DISCLAIMER } from "./constants";
import type {
  Persona,
  Intensity,
  Adjustment,
  FeedbackSignal,
  HeatConditions,
  ScreeningFlags,
  DailyFeedback,
  DayPlanResult,
} from "./types";

export interface PlanInput {
  persona: Persona;
  conditions: HeatConditions;
  screening: ScreeningFlags;
  originBaselineHeatIndexC: number;
  /**
   * Representative "how hot is it here" heat index (°C) for the origin↔current GAP
   * — the day's PEAK, not the cool exposure window. Exposure is still timed to the
   * safe window (`conditions`), but the adaptation challenge is the day's real heat.
   * Defaults to `conditions.heatIndexC` when omitted.
   */
  currentHeatIndexForGapC?: number;
  /** Running adaptation-days total BEFORE today (0 on day one). */
  priorAdaptationDays: number;
  /** Yesterday's feedback, if any — drives the visible day-to-day adjustment. */
  yesterday?: DailyFeedback | null;
  /** Fully-missed days since the last completed session (for decay). */
  missedDays?: number;
  /** Days left on the trip (vacationer persona). */
  tripDaysRemaining?: number | null;
  /** Safest time-of-day window label, from the weather layer (Phase 2). */
  safestWindowLabel?: string;
}

const INTENSITY_ORDER: Intensity[] = ["REST", "LIGHT", "MODERATE"];

function capIntensity(value: Intensity, max: Intensity): Intensity {
  return INTENSITY_ORDER.indexOf(value) <= INTENSITY_ORDER.indexOf(max) ? value : max;
}
function downshift(value: Intensity): Intensity {
  return INTENSITY_ORDER[Math.max(0, INTENSITY_ORDER.indexOf(value) - 1)];
}

function signalToAdjustment(signal: FeedbackSignal): Adjustment {
  switch (signal) {
    case "ADVANCE":
      return "ADVANCED";
    case "REDUCE":
      return "REDUCED";
    case "ABORT":
      return "ABORTED";
    case "HOLD":
      return "HELD";
  }
}

function pickIntensity(persona: Persona, adaptationDays: number, gapC: number): Intensity {
  if (adaptationDays < 2 || gapC >= 12) return "LIGHT"; // ease in / big gap
  if (persona === "VACATIONER") return "LIGHT"; // damage control, never push
  return "MODERATE"; // acclimatizer & learn-to-sweat can use light–moderate activity
}

function cautionMinutesCap(persona: Persona): number {
  return persona === "VACATIONER" ? 20 : 25;
}

function defaultWindow(level: string): string {
  return level === "HARD_STOP"
    ? "wait for a cooler day or the coolest hours (usually around dawn)"
    : "the coolest part of the day — early morning is usually safest";
}

export function generateDayPlan(input: PlanInput): DayPlanResult {
  const { persona, conditions, screening, originBaselineHeatIndexC } = input;

  const gapC = heatGapC(
    input.currentHeatIndexForGapC ?? conditions.heatIndexC,
    originBaselineHeatIndexC,
  );
  const safety = assessSafety(conditions, screening);

  const score = input.yesterday ? scoreFeedback(input.yesterday) : null;
  const adjustment: Adjustment | null = score ? signalToAdjustment(score.signal) : null;
  const adaptationDays = updateAdaptationDays(
    input.priorAdaptationDays,
    score?.adaptationDelta ?? 0,
    input.missedDays ?? 0,
  );

  const window = input.safestWindowLabel ?? defaultWindow(safety.level);

  // --- Hard environmental stop: overrides everything ---
  if (safety.level === "HARD_STOP") {
    return hardStopPlan(input, gapC, adaptationDays, adjustment, window, safety.reasons);
  }

  // --- Otherwise, build from the ramp, then apply caps ---
  let minutes = rampTargetMinutes(persona, adaptationDays, gapC);
  let intensity = pickIntensity(persona, adaptationDays, gapC);

  // Same-day modifier from yesterday's signal (ADVANCE/HOLD already reflected in
  // the higher adaptation-days, so only pull back on REDUCE/ABORT here).
  if (score?.signal === "REDUCE") {
    minutes = Math.round(minutes * 0.6);
    intensity = downshift(intensity);
  } else if (score?.signal === "ABORT") {
    minutes = 0;
    intensity = "REST";
  }

  // Screening caps.
  if (safety.riskTier === "ELEVATED") {
    minutes = Math.round(minutes * 0.7);
    intensity = capIntensity(intensity, "LIGHT");
  } else if (safety.riskTier === "HIGH") {
    minutes = Math.min(minutes, 20);
    intensity = "REST"; // passive only, and clinician-gated
  }

  // Caution gate caps active exposure and keeps it gentle.
  if (safety.level === "CAUTION") {
    minutes = Math.min(minutes, cautionMinutesCap(persona));
    intensity = capIntensity(intensity, "LIGHT");
  }

  minutes = Math.max(0, minutes);

  const headline = buildHeadline(safety.level, minutes, intensity, persona);
  const steps = buildSteps(persona, minutes, intensity, safety.level, safety.riskTier, window);
  const cautions = buildCautions(safety, persona);
  const rationale = buildRationale({
    persona,
    gapC,
    safetyLevel: safety.level,
    reasons: safety.reasons,
    feedbackNotes: score?.notes ?? [],
    minutes,
    intensity,
    window,
    tripDaysRemaining: input.tripDaysRemaining ?? null,
  });

  return {
    safetyLevel: safety.level,
    riskTier: safety.riskTier,
    exposureMinutesTarget: minutes,
    intensity,
    timeWindow: window,
    headline,
    steps,
    hydration: buildHydration(intensity, safety.level),
    cautions,
    recognition: RECOGNITION,
    rationale,
    adjustmentFromYesterday: adjustment,
    disclaimer: DISCLAIMER,
    gapC,
    adaptationDays,
  };
}

// ---------------------------------------------------------------------------
// Content builders
// ---------------------------------------------------------------------------

function hardStopPlan(
  input: PlanInput,
  gapC: number,
  adaptationDays: number,
  adjustment: Adjustment | null,
  window: string,
  reasons: string[],
): DayPlanResult {
  return {
    safetyLevel: "HARD_STOP",
    riskTier: assessSafety(input.conditions, input.screening).riskTier,
    exposureMinutesTarget: 0,
    intensity: "REST",
    timeWindow: window,
    headline: "Too dangerous for heat exposure today — shelter and cool down.",
    steps: [
      "Stay somewhere cool: air conditioning if you have it, otherwise the shadiest, breeziest spot.",
      "Cool your skin actively: cool (not ice-cold) showers, damp cloths on neck/wrists, a fan.",
      "Sip water steadily through the day; add some electrolytes if you've been sweating.",
      "Avoid exertion and direct sun — no training today, regardless of your goal.",
      `If you want to move, do it ${window}, and keep it brief and easy.`,
    ],
    hydration:
      "Drink to thirst plus a bit more — pale-yellow urine is the target. Include electrolytes if you've been sweating or feel low.",
    cautions: [
      `Conditions are unsafe right now: ${reasons.join("; ")}.`,
      "Progress doesn't matter more than safety — skipping heat today is the right call.",
    ],
    recognition: RECOGNITION,
    rationale:
      "The heat-strain numbers are above the safe ceiling, so no amount of goal or progress justifies exposure today. " +
      "The plan is to shelter, cool, and hydrate, and pick the program back up when conditions ease.",
    adjustmentFromYesterday: adjustment,
    disclaimer: DISCLAIMER,
    gapC,
    adaptationDays,
  };
}

function buildHeadline(
  level: string,
  minutes: number,
  intensity: Intensity,
  persona: Persona,
): string {
  if (minutes <= 0) {
    return "Rest and recover today — no heat exposure.";
  }
  const activityPhrase =
    intensity === "REST"
      ? "passive heat exposure"
      : intensity === "MODERATE"
        ? "light–moderate activity in the heat"
        : "light activity in the heat";
  const prefix = level === "CAUTION" ? "Go gently today: " : "Today: ";
  const goal =
    persona === "LEARN_TO_SWEAT"
      ? "to wake up your sweat response"
      : persona === "VACATIONER"
        ? "to feel more functional in the heat"
        : "to build heat tolerance";
  return `${prefix}${minutes} min of ${activityPhrase} ${goal}.`;
}

function buildSteps(
  persona: Persona,
  minutes: number,
  intensity: Intensity,
  level: string,
  riskTier: string,
  window: string,
): string[] {
  if (minutes <= 0) {
    return [
      "Take a rest day from heat exposure.",
      "Keep hydrating and stay cool.",
      "We'll resume the ramp once you're feeling better and conditions allow.",
    ];
  }
  const activity =
    intensity === "MODERATE"
      ? "an easy walk with a few brisker stretches, or light chores"
      : intensity === "LIGHT"
        ? "a relaxed walk or gentle movement"
        : "passive time in the warmth — sitting or gentle movement, no exertion";

  const steps = [
    `Plan your exposure for ${window}.`,
    `Do about ${minutes} minutes of ${activity} — warm enough to start sweating, never to feel unwell.`,
    "Keep water with you and sip throughout.",
    "Cool down afterwards in shade or indoors, and notice how you feel.",
  ];

  if (persona === "LEARN_TO_SWEAT") {
    steps.splice(1, 0, "Aim to get a light sweat going — that's the signal we're retraining.");
  }
  if (persona === "VACATIONER") {
    steps.push("Time sightseeing/activity for cooler hours and take shade/AC breaks often.");
  }
  if (riskTier !== "NONE") {
    steps.push(
      "Because of your health screening, keep it on the gentle end and stop at the first sign of feeling unwell.",
    );
  }
  if (level === "CAUTION") {
    steps.push("Conditions are on the warm side, so favour shade and keep the pace easy.");
  }
  return steps;
}

function buildHydration(intensity: Intensity, level: string): string {
  const base =
    "Drink water before, during, and after. Target pale-yellow urine — not clear, not dark.";
  if (intensity === "MODERATE" || level === "CAUTION") {
    return `${base} Add electrolytes (a pinch of salt or a sports drink) since you'll be sweating.`;
  }
  return base;
}

function buildCautions(
  safety: ReturnType<typeof assessSafety>,
  persona: Persona,
): string[] {
  const cautions: string[] = [];
  if (safety.environmentalReasons.length > 0) {
    cautions.push(`Heat note: ${safety.environmentalReasons.join("; ")}.`);
  }
  if (safety.screeningReasons.length > 0) {
    cautions.push(
      `You flagged: ${safety.screeningReasons.join("; ")}. Go gentler than you think you need to.`,
    );
  }
  if (safety.riskTier === "HIGH") {
    cautions.push(
      "Your screening puts you at higher heat risk — please check with a clinician before any heat-exposure program, and keep today passive.",
    );
  }
  if (persona === "VACATIONER") {
    cautions.push(
      "Honest note: a few days isn't enough to fully acclimatize — this is about feeling better and staying safe, not finishing adaptation.",
    );
  }
  return cautions;
}

function buildRationale(args: {
  persona: Persona;
  gapC: number;
  safetyLevel: string;
  reasons: string[];
  feedbackNotes: string[];
  minutes: number;
  intensity: Intensity;
  window: string;
  tripDaysRemaining: number | null;
}): string {
  const gap = Math.round(args.gapC);
  const gapPhrase =
    gap >= 8
      ? `Where you are now feels about ${gap}°C hotter than your baseline — a big jump, so we start gentle and ramp slowly.`
      : gap >= 3
        ? `Where you are now feels about ${gap}°C hotter than your baseline, so there's real adapting to do.`
        : "The heat here is close to what your body is already used to, so only a light nudge is needed.";

  const personaPhrase =
    args.persona === "ACCLIMATIZER"
      ? "We build tolerance over about two weeks, with most of the gains in the first week."
      : args.persona === "LEARN_TO_SWEAT"
        ? "We're gently retraining your sweat response, so even modest warmth with light activity helps — and we ramp slowly."
        : "On a short trip your body can't fully acclimatize, so this optimises for feeling functional: hydration, cooling, and short exposures at the safest times.";

  const feedbackPhrase = args.feedbackNotes.length > 0 ? ` ${args.feedbackNotes.join(" ")}` : "";

  const safetyPhrase =
    args.safetyLevel === "CAUTION"
      ? ` Conditions are on the warm side (${args.reasons.join("; ")}), so today is capped and kept gentle.`
      : "";

  const targetPhrase =
    args.minutes > 0
      ? ` So today's target is ${args.minutes} minutes of ${args.intensity.toLowerCase()} activity in ${args.window}.`
      : " So today is a rest-and-recover day.";

  return `${gapPhrase} ${personaPhrase}${feedbackPhrase}${safetyPhrase}${targetPhrase}`;
}
