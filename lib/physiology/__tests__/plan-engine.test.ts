import { describe, it, expect } from "vitest";
import { generateDayPlan, type PlanInput } from "../plan-engine";
import { deriveConditions } from "../heat-math";
import type { HeatConditions, ScreeningFlags, DailyFeedback } from "../types";

const noScreening: ScreeningFlags = {
  ageBand: "18_64",
  heartCondition: false,
  kidneyCondition: false,
  pregnant: false,
  takingDiuretics: false,
  takingBetaBlockers: false,
  takingAnticholinergics: false,
  otherHeatCondition: false,
};

const mild = deriveConditions({ tempC: 24, humidityPct: 45 }); // NORMAL
const goodFeedback: DailyFeedback = {
  completedExposure: true,
  sweatResponse: 4,
  perceivedExertion: 2,
  sleepQuality: 4,
  thirst: 2,
  overallFeeling: 5,
  headache: false,
  dizziness: false,
  nausea: false,
  redFlag: false,
};
const badFeedback: DailyFeedback = {
  ...goodFeedback,
  perceivedExertion: 4,
  sleepQuality: 2,
  thirst: 4,
  overallFeeling: 2,
  headache: true,
};

function input(overrides: Partial<PlanInput>): PlanInput {
  return {
    persona: "ACCLIMATIZER",
    conditions: mild,
    screening: noScreening,
    originBaselineHeatIndexC: 18,
    priorAdaptationDays: 3,
    ...overrides,
  };
}

describe("a normal day", () => {
  it("produces an active plan with safety guidance attached", () => {
    const p = generateDayPlan(input({}));
    expect(p.safetyLevel).toBe("NORMAL");
    expect(p.exposureMinutesTarget).toBeGreaterThan(0);
    expect(p.recognition.heatStroke.length).toBeGreaterThan(0);
    expect(p.recognition.stopNow.length).toBeGreaterThan(0);
    expect(p.disclaimer).toMatch(/not medical advice/i);
    expect(p.gapC).toBeCloseTo(mild.heatIndexC - 18, 6);
  });
});

describe("hard environmental stop", () => {
  const extreme: HeatConditions = {
    tempC: 38,
    humidityPct: 75,
    apparentTempC: 52,
    heatIndexC: 52,
    wetBulbC: 30,
    wbgtC: 33,
  };
  it("withholds all exposure regardless of goal/progress", () => {
    const p = generateDayPlan(
      input({ conditions: extreme, priorAdaptationDays: 30, yesterday: goodFeedback }),
    );
    expect(p.safetyLevel).toBe("HARD_STOP");
    expect(p.exposureMinutesTarget).toBe(0);
    expect(p.intensity).toBe("REST");
    expect(p.headline.toLowerCase()).toContain("shelter");
    expect(p.steps.join(" ").toLowerCase()).toMatch(/cool|shade|air condition/);
  });
});

describe("the daily loop visibly adjusts", () => {
  it("advances after a good day and reduces after a bad day", () => {
    const good = generateDayPlan(input({ yesterday: goodFeedback }));
    const bad = generateDayPlan(input({ yesterday: badFeedback }));

    expect(good.adjustmentFromYesterday).toBe("ADVANCED");
    expect(bad.adjustmentFromYesterday).toBe("REDUCED");

    // Good day accrues more adaptation and lands a higher (or equal) target.
    expect(good.adaptationDays).toBeGreaterThan(bad.adaptationDays);
    expect(good.exposureMinutesTarget).toBeGreaterThanOrEqual(bad.exposureMinutesTarget);
  });

  it("aborts to a rest day when yesterday had a red flag", () => {
    const p = generateDayPlan(
      input({ yesterday: { ...goodFeedback, redFlag: true } }),
    );
    expect(p.adjustmentFromYesterday).toBe("ABORTED");
    expect(p.exposureMinutesTarget).toBe(0);
  });
});

describe("health screening shapes the plan", () => {
  it("keeps a high-risk profile passive and flags clinician review", () => {
    const p = generateDayPlan(input({ screening: { ...noScreening, heartCondition: true } }));
    expect(p.riskTier).toBe("HIGH");
    expect(p.safetyLevel).toBe("CAUTION"); // floored even in mild weather
    expect(p.intensity).toBe("REST");
    expect(p.cautions.join(" ").toLowerCase()).toContain("clinician");
  });
});

describe("gap uses the day's peak heat, not the cool exposure window", () => {
  it("a cool morning window + hot day + mild origin yields a big gap and gentle start", () => {
    const coolWindow = deriveConditions({ tempC: 21, humidityPct: 30 }); // safe morning
    const p = generateDayPlan(
      input({
        conditions: coolWindow,
        currentHeatIndexForGapC: 37, // the day actually peaks at 37°C
        originBaselineHeatIndexC: 23, // mild home (e.g. Karlstad)
        priorAdaptationDays: 0,
      }),
    );
    expect(p.gapC).toBeCloseTo(14, 0);
    expect(p.rationale.toLowerCase()).toContain("big jump");
    // gentle start: well under the 75-min full dose
    expect(p.exposureMinutesTarget).toBeLessThan(40);
  });

  it("falls back to the window heat index when no peak is supplied", () => {
    const coolWindow = deriveConditions({ tempC: 21, humidityPct: 30 });
    const p = generateDayPlan(
      input({ conditions: coolWindow, originBaselineHeatIndexC: 23, priorAdaptationDays: 0 }),
    );
    expect(p.gapC).toBeLessThan(2);
  });
});

describe("persona framing", () => {
  it("gives the vacationer an honest expectations note", () => {
    const p = generateDayPlan(input({ persona: "VACATIONER", tripDaysRemaining: 4 }));
    expect(p.cautions.join(" ").toLowerCase()).toMatch(/fully acclimat/);
  });
});
