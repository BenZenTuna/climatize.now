import { describe, it, expect } from "vitest";
import {
  heatGapC,
  rampTargetMinutes,
  scoreFeedback,
  updateAdaptationDays,
  personaRampDays,
  personaFullDoseMinutes,
} from "../acclimatization";
import type { DailyFeedback } from "../types";

const base: DailyFeedback = {
  completedExposure: true,
  sweatResponse: 3,
  perceivedExertion: 3,
  sleepQuality: 3,
  thirst: 3,
  overallFeeling: 3,
  headache: false,
  dizziness: false,
  nausea: false,
  redFlag: false,
};

describe("heat gap", () => {
  it("is current minus origin baseline", () => {
    expect(heatGapC(40, 28)).toBe(12);
    expect(heatGapC(24, 26)).toBe(-2);
  });
});

describe("ramp target minutes", () => {
  it("is non-decreasing as adaptation accrues", () => {
    let prev = -1;
    for (const d of [0, 1, 3, 6, 9, 12]) {
      const m = rampTargetMinutes("ACCLIMATIZER", d, 6);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it("starts at a meaningful dose on day one (not trivial)", () => {
    // Guards against an over-timid start that wouldn't provide an adaptation stimulus.
    const dayOne = rampTargetMinutes("ACCLIMATIZER", 0, 7);
    expect(dayOne).toBeGreaterThanOrEqual(25);
    expect(dayOne).toBeLessThanOrEqual(personaFullDoseMinutes("ACCLIMATIZER"));
  });

  it("reaches the full dose by the end of the ramp", () => {
    const full = personaFullDoseMinutes("ACCLIMATIZER");
    expect(rampTargetMinutes("ACCLIMATIZER", 30, 3)).toBeGreaterThanOrEqual(0.95 * full);
  });

  it("starts lower on day one with a larger gap", () => {
    const small = rampTargetMinutes("ACCLIMATIZER", 0, 4);
    const large = rampTargetMinutes("ACCLIMATIZER", 0, 16);
    expect(large).toBeLessThan(small);
  });

  it("ramps slower with a larger gap at the same point", () => {
    const small = rampTargetMinutes("ACCLIMATIZER", 4, 5);
    const large = rampTargetMinutes("ACCLIMATIZER", 4, 15);
    expect(large).toBeLessThan(small);
  });

  it("never exceeds the persona's full dose", () => {
    expect(rampTargetMinutes("VACATIONER", 99, 3)).toBeLessThanOrEqual(
      personaFullDoseMinutes("VACATIONER"),
    );
  });

  it("vacationer ramp is short & light; acclimatizer dose is largest", () => {
    expect(personaRampDays("VACATIONER")).toBeLessThan(personaRampDays("ACCLIMATIZER"));
    expect(personaRampDays("LEARN_TO_SWEAT")).toBeGreaterThan(personaRampDays("ACCLIMATIZER"));
    expect(personaFullDoseMinutes("VACATIONER")).toBeLessThan(
      personaFullDoseMinutes("ACCLIMATIZER"),
    );
  });
});

describe("feedback scoring", () => {
  it("ABORTs on a red flag", () => {
    expect(scoreFeedback({ ...base, redFlag: true }).signal).toBe("ABORT");
  });
  it("ABORTs on dizziness + nausea", () => {
    expect(scoreFeedback({ ...base, dizziness: true, nausea: true }).signal).toBe("ABORT");
  });
  it("ADVANCEs on a clearly good day", () => {
    const s = scoreFeedback({
      ...base,
      overallFeeling: 5,
      sleepQuality: 4,
      thirst: 2,
      perceivedExertion: 2,
      sweatResponse: 4,
    });
    expect(s.signal).toBe("ADVANCE");
    expect(s.adaptationDelta).toBeGreaterThan(0);
  });
  it("REDUCEs when the day shows strain", () => {
    const s = scoreFeedback({ ...base, overallFeeling: 2, headache: true, thirst: 4 });
    expect(s.signal).toBe("REDUCE");
  });
  it("HOLDs when exposure wasn't completed", () => {
    expect(scoreFeedback({ ...base, completedExposure: false }).signal).toBe("HOLD");
  });
});

describe("adaptation-days update", () => {
  it("adds the delta", () => {
    expect(updateAdaptationDays(3, 1)).toBe(4);
  });
  it("decays for missed days and never goes below zero", () => {
    expect(updateAdaptationDays(1, 0, 4)).toBe(0); // 1 - 0.5*4 = -1 → floored
    expect(updateAdaptationDays(5, 0, 2)).toBe(4); // 5 - 1
  });
});
