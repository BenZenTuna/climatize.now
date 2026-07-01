import { describe, it, expect } from "vitest";
import { restOfDayGuidance, fanEffectiveAirTempLimitC } from "../recovery";

describe("rest-of-day recovery guidance", () => {
  it("flags extreme heat with the fan caveat and an AC fallback", () => {
    const g = restOfDayGuidance({
      peakHeatIndexC: 42,
      peakAirTempC: 39,
      peakAirHumidityPct: 40,
      hotUntil: "around 7pm",
    });
    expect(g.level).toBe("EXTREME");
    expect(g.title).toContain("7pm");
    expect(g.withoutAC.toLowerCase()).toMatch(/fan/);
    expect(g.withoutAC.toLowerCase()).toMatch(/wet|shower/);
    expect(g.withAC.toLowerCase()).toMatch(/air conditioning|cool/);
  });

  it("treats a hot-but-not-extreme afternoon as HOT", () => {
    const g = restOfDayGuidance({
      peakHeatIndexC: 34,
      peakAirTempC: 33,
      peakAirHumidityPct: 45,
      hotUntil: "around 6pm",
    });
    expect(g.level).toBe("HOT");
    expect(g.title).toContain("6pm");
  });

  it("gives lighter guidance when it's only warm", () => {
    const g = restOfDayGuidance({
      peakHeatIndexC: 28,
      peakAirTempC: 28,
      peakAirHumidityPct: 50,
      hotUntil: "around 4pm",
    });
    expect(g.level).toBe("WARM");
  });

  it("says cool enough when the rest of the day is mild", () => {
    const g = restOfDayGuidance({
      peakHeatIndexC: 22,
      peakAirTempC: 22,
      peakAirHumidityPct: 50,
      hotUntil: null,
    });
    expect(g.level).toBe("MILD");
    expect(g.recoveryNote.toLowerCase()).toMatch(/recover/);
  });

  it("every tier returns non-empty AC and no-AC advice plus a recovery note", () => {
    for (const peak of [20, 28, 34, 42]) {
      const g = restOfDayGuidance({
        peakHeatIndexC: peak,
        peakAirTempC: peak,
        peakAirHumidityPct: 50,
        hotUntil: null,
      });
      expect(g.withAC.length).toBeGreaterThan(0);
      expect(g.withoutAC.length).toBeGreaterThan(0);
      expect(g.recoveryNote.length).toBeGreaterThan(0);
    }
  });
});

describe("humidity-aware fan rule (#2)", () => {
  it("the fan air-temperature limit slides up with humidity", () => {
    expect(fanEffectiveAirTempLimitC(15)).toBeCloseTo(35, 5); // dry → low limit
    expect(fanEffectiveAirTempLimitC(75)).toBeCloseTo(40, 5); // humid → high limit
    expect(fanEffectiveAirTempLimitC(45)).toBeCloseTo(37.5, 5); // midpoint of the RH band
    // Monotonic: more humid never lowers the limit.
    expect(fanEffectiveAirTempLimitC(60)).toBeGreaterThanOrEqual(fanEffectiveAirTempLimitC(30));
  });

  it("at the SAME hot air temperature, keeps the fan in humid air but drops it in dry air", () => {
    const humid = restOfDayGuidance({
      peakHeatIndexC: 36,
      peakAirTempC: 38,
      peakAirHumidityPct: 75,
      hotUntil: null,
    });
    const dry = restOfDayGuidance({
      peakHeatIndexC: 36,
      peakAirTempC: 38,
      peakAirHumidityPct: 15,
      hotUntil: null,
    });
    expect(humid.withoutAC.toLowerCase()).toMatch(/keep air moving with a fan/);
    expect(dry.withoutAC.toLowerCase()).not.toMatch(/keep air moving with a fan/);
  });

  it("in a humid extreme, still recommends a fan over wet skin (not just 'no fan')", () => {
    const humidExtreme = restOfDayGuidance({
      peakHeatIndexC: 44,
      peakAirTempC: 34, // below the humid limit (40) → a fan over wet skin still helps
      peakAirHumidityPct: 80,
      hotUntil: "around 8pm",
    });
    const dryExtreme = restOfDayGuidance({
      peakHeatIndexC: 44,
      peakAirTempC: 45, // above any limit → fan alone won't help
      peakAirHumidityPct: 12,
      hotUntil: "around 4pm",
    });
    expect(humidExtreme.withoutAC.toLowerCase()).toMatch(/fan still helps/);
    expect(dryExtreme.withoutAC.toLowerCase()).toMatch(/won't cool you in air this hot and dry/);
  });
});
