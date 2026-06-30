// The safety overlay. This sits ABOVE the plan engine and always wins. It has two
// jobs: judge the environment (hard stop / caution) and judge the user's health
// screening (risk tier), then combine them. Pure functions, independently tested.

import { CAUTION, HARD_STOP, ELEVATED_RISK_TIGHTEN_C } from "./constants";
import type {
  HeatConditions,
  ScreeningFlags,
  SafetyAssessment,
  SafetyLevel,
  RiskTier,
  DailyFeedback,
} from "./types";

/**
 * Map onboarding screening answers to a risk tier + human-readable reasons.
 *
 * A single risk factor is ELEVATED; the things that push to HIGH are (a) a major
 * condition that strongly impairs thermoregulation/fluid balance (heart, kidney,
 * pregnancy), or (b) a COMPOUNDING combination — two or more heat-relevant meds, or
 * a heat-relevant med together with an age-extreme/other condition. Compounding
 * matters because (e.g.) an older adult on a diuretic dehydrates and overheats far
 * more readily than either factor alone would suggest.
 */
export function assessScreening(s: ScreeningFlags): {
  tier: RiskTier;
  reasons: string[];
} {
  const majors: string[] = [];
  if (s.heartCondition) majors.push("a heart condition");
  if (s.kidneyCondition) majors.push("a kidney condition");
  if (s.pregnant) majors.push("pregnancy");

  const nonMed: string[] = [];
  if (s.otherHeatCondition) nonMed.push("a condition affecting heat tolerance");
  if (s.ageBand === "65_PLUS") nonMed.push("being 65 or older");
  if (s.ageBand === "UNDER_18") nonMed.push("being under 18");

  const meds: string[] = [];
  if (s.takingDiuretics) meds.push("diuretics");
  if (s.takingBetaBlockers) meds.push("beta-blockers");
  if (s.takingAnticholinergics) meds.push("anticholinergics");

  const reasons = [...majors, ...nonMed, ...meds.map((m) => `taking ${m}`)];

  const multipleMeds = meds.length >= 2;
  const medPlusOther = meds.length >= 1 && nonMed.length >= 1;

  let tier: RiskTier = "NONE";
  if (majors.length > 0 || multipleMeds || medPlusOther) {
    tier = "HIGH";
    if (majors.length === 0) {
      reasons.push(
        multipleMeds
          ? "(several heat-relevant medications together raise the risk)"
          : "(a heat-relevant medication combined with another risk factor)",
      );
    }
  } else if (reasons.length > 0) {
    tier = "ELEVATED";
  }

  return { tier, reasons };
}

/**
 * Judge the environment alone. `tightenC` lowers every gate by that many °C for
 * higher-risk users, so the same weather trips caution/hard-stop sooner for them.
 */
export function evaluateEnvironment(
  c: HeatConditions,
  tightenC = 0,
): { level: SafetyLevel; reasons: string[]; summary: string } {
  const hardWet = HARD_STOP.wetBulbC - tightenC;
  const hardHi = HARD_STOP.heatIndexC - tightenC;
  const hardWbgt = HARD_STOP.wbgtC - tightenC;
  const cautWet = CAUTION.wetBulbC - tightenC;
  const cautHi = CAUTION.heatIndexC - tightenC;
  const cautWbgt = CAUTION.wbgtC - tightenC;

  const feels = Math.round(c.heatIndexC);

  // Hard stop on any single extreme metric.
  const hardWetHit = c.wetBulbC >= hardWet;
  const hardHiHit = c.heatIndexC >= hardHi;
  const hardWbgtHit = c.wbgtC >= hardWbgt;
  if (hardWetHit || hardHiHit || hardWbgtHit) {
    // Technical reasons kept for transparency/debugging; not shown to users directly.
    const reasons: string[] = [];
    if (hardWetHit) reasons.push(`wet-bulb ${c.wetBulbC.toFixed(1)}°C at/above the safe ceiling`);
    if (hardHiHit) reasons.push(`heat index ${c.heatIndexC.toFixed(0)}°C in the Danger range`);
    if (hardWbgtHit) reasons.push(`WBGT ${c.wbgtC.toFixed(1)}°C at the cease-activity flag`);
    const humid = hardWetHit || hardWbgtHit;
    const summary = humid
      ? `it feels about ${feels}°C and the air is too humid for sweat to cool you safely`
      : `it feels about ${feels}°C — past the safe limit for being active`;
    return { level: "HARD_STOP", reasons, summary };
  }

  // Caution on any single elevated metric.
  const cautWetHit = c.wetBulbC >= cautWet;
  const cautHiHit = c.heatIndexC >= cautHi;
  const cautWbgtHit = c.wbgtC >= cautWbgt;
  if (cautWetHit || cautHiHit || cautWbgtHit) {
    const reasons: string[] = [];
    if (cautWetHit) reasons.push(`wet-bulb ${c.wetBulbC.toFixed(1)}°C is high`);
    if (cautHiHit) reasons.push(`heat index ${c.heatIndexC.toFixed(0)}°C is elevated`);
    if (cautWbgtHit) reasons.push(`WBGT ${c.wbgtC.toFixed(1)}°C is elevated`);
    const humid = cautWetHit || cautWbgtHit;
    const summary = humid
      ? `it still feels about ${feels}°C and the humidity makes it harder for your body to cool down`
      : `it still feels about ${feels}°C`;
    return { level: "CAUTION", reasons, summary };
  }

  return { level: "NORMAL", reasons: [], summary: "" };
}

/** Combine environment + screening into the final, authoritative assessment. */
export function assessSafety(c: HeatConditions, s: ScreeningFlags): SafetyAssessment {
  const screening = assessScreening(s);
  const tighten =
    screening.tier === "HIGH"
      ? ELEVATED_RISK_TIGHTEN_C * 1.5
      : screening.tier === "ELEVATED"
        ? ELEVATED_RISK_TIGHTEN_C
        : 0;

  const env = evaluateEnvironment(c, tighten);

  // A HIGH-risk profile should never be told "all clear" for self-directed heat
  // exposure even in mild weather — floor it at CAUTION.
  let level = env.level;
  if (screening.tier === "HIGH" && level === "NORMAL") level = "CAUTION";

  return {
    level,
    riskTier: screening.tier,
    environmentalReasons: env.reasons,
    environmentalSummary: env.summary,
    screeningReasons: screening.reasons,
    reasons: [...env.reasons, ...screening.reasons],
  };
}

/** Acute warning signs in yesterday's feedback that force a stand-down. */
export function isRedFlag(f: DailyFeedback): boolean {
  return f.redFlag || (f.dizziness && f.nausea);
}
