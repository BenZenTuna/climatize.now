import { describe, it, expect } from "vitest";
import {
  assessScreening,
  evaluateEnvironment,
  assessSafety,
  isRedFlag,
} from "../safety";
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

// Force specific metric values rather than deriving, so the gate under test is unambiguous.
function conditions(partial: Partial<HeatConditions>): HeatConditions {
  return {
    tempC: 30,
    humidityPct: 50,
    apparentTempC: 30,
    heatIndexC: 30,
    wetBulbC: 20,
    wbgtC: 22,
    ...partial,
  };
}

describe("screening → risk tier", () => {
  it("none when nothing is flagged", () => {
    expect(assessScreening(noScreening).tier).toBe("NONE");
  });
  it("HIGH for a heart condition", () => {
    expect(assessScreening({ ...noScreening, heartCondition: true }).tier).toBe("HIGH");
  });
  it("HIGH for pregnancy and for kidney condition", () => {
    expect(assessScreening({ ...noScreening, pregnant: true }).tier).toBe("HIGH");
    expect(assessScreening({ ...noScreening, kidneyCondition: true }).tier).toBe("HIGH");
  });
  it("ELEVATED for a single relevant medication", () => {
    expect(assessScreening({ ...noScreening, takingDiuretics: true }).tier).toBe("ELEVATED");
  });
  it("HIGH for two or more relevant medications", () => {
    expect(
      assessScreening({ ...noScreening, takingDiuretics: true, takingBetaBlockers: true }).tier,
    ).toBe("HIGH");
  });
  it("ELEVATED at age extremes", () => {
    expect(assessScreening({ ...noScreening, ageBand: "65_PLUS" }).tier).toBe("ELEVATED");
    expect(assessScreening({ ...noScreening, ageBand: "UNDER_18" }).tier).toBe("ELEVATED");
  });
  it("escalates to HIGH when a medication compounds another risk factor", () => {
    // An older adult on a diuretic, or another condition + a heat-relevant med.
    expect(
      assessScreening({ ...noScreening, ageBand: "65_PLUS", takingDiuretics: true }).tier,
    ).toBe("HIGH");
    expect(
      assessScreening({ ...noScreening, otherHeatCondition: true, takingBetaBlockers: true }).tier,
    ).toBe("HIGH");
  });
  it("keeps a single isolated factor at ELEVATED (no false escalation)", () => {
    expect(assessScreening({ ...noScreening, takingBetaBlockers: true }).tier).toBe("ELEVATED");
    expect(assessScreening({ ...noScreening, otherHeatCondition: true }).tier).toBe("ELEVATED");
  });
});

describe("environmental gates", () => {
  it("NORMAL in mild conditions", () => {
    expect(evaluateEnvironment(deriveConditions({ tempC: 22, humidityPct: 50 })).level).toBe(
      "NORMAL",
    );
  });
  it("HARD_STOP at extreme wet-bulb", () => {
    expect(evaluateEnvironment(conditions({ wetBulbC: 30 })).level).toBe("HARD_STOP");
  });
  it("HARD_STOP at Danger-range heat index", () => {
    expect(evaluateEnvironment(conditions({ heatIndexC: 41 })).level).toBe("HARD_STOP");
  });
  it("CAUTION in the in-between band", () => {
    expect(evaluateEnvironment(conditions({ wetBulbC: 26 })).level).toBe("CAUTION");
  });
  it("tightening the gates trips caution sooner", () => {
    const c = conditions({ wetBulbC: 23.5 }); // below the 25°C caution gate
    expect(evaluateEnvironment(c, 0).level).toBe("NORMAL");
    expect(evaluateEnvironment(c, 2).level).toBe("CAUTION"); // gate now 23°C
  });
});

describe("assessSafety (combined)", () => {
  it("is NORMAL for a healthy person in mild weather", () => {
    const a = assessSafety(deriveConditions({ tempC: 22, humidityPct: 50 }), noScreening);
    expect(a.level).toBe("NORMAL");
    expect(a.riskTier).toBe("NONE");
  });

  it("floors a HIGH-risk profile to at least CAUTION even in mild weather", () => {
    const a = assessSafety(deriveConditions({ tempC: 22, humidityPct: 50 }), {
      ...noScreening,
      heartCondition: true,
    });
    expect(a.riskTier).toBe("HIGH");
    expect(a.level).toBe("CAUTION");
  });

  it("a hard environmental stop overrides everything", () => {
    const a = assessSafety(conditions({ wetBulbC: 31 }), noScreening);
    expect(a.level).toBe("HARD_STOP");
    expect(a.reasons.length).toBeGreaterThan(0);
  });
});

describe("red-flag detection from feedback", () => {
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
  it("flags an explicit red flag", () => {
    expect(isRedFlag({ ...base, redFlag: true })).toBe(true);
  });
  it("flags dizziness + nausea together", () => {
    expect(isRedFlag({ ...base, dizziness: true, nausea: true })).toBe(true);
  });
  it("does not flag a normal day", () => {
    expect(isRedFlag(base)).toBe(false);
  });
});
