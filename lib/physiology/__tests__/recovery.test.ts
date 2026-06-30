import { describe, it, expect } from "vitest";
import { restOfDayGuidance } from "../recovery";

describe("rest-of-day recovery guidance", () => {
  it("flags extreme heat with the fan caveat and an AC fallback", () => {
    const g = restOfDayGuidance({ peakHeatIndexC: 42, peakAirTempC: 39, hotUntil: "around 7pm" });
    expect(g.level).toBe("EXTREME");
    expect(g.title).toContain("7pm");
    expect(g.withoutAC.toLowerCase()).toMatch(/fan/);
    expect(g.withoutAC.toLowerCase()).toMatch(/wet|shower/);
    expect(g.withAC.toLowerCase()).toMatch(/air conditioning|cool/);
  });

  it("treats a hot-but-not-extreme afternoon as HOT", () => {
    const g = restOfDayGuidance({ peakHeatIndexC: 34, peakAirTempC: 33, hotUntil: "around 6pm" });
    expect(g.level).toBe("HOT");
    expect(g.title).toContain("6pm");
  });

  it("gives lighter guidance when it's only warm", () => {
    const g = restOfDayGuidance({ peakHeatIndexC: 28, peakAirTempC: 28, hotUntil: "around 4pm" });
    expect(g.level).toBe("WARM");
  });

  it("says cool enough when the rest of the day is mild", () => {
    const g = restOfDayGuidance({ peakHeatIndexC: 22, peakAirTempC: 22, hotUntil: null });
    expect(g.level).toBe("MILD");
    expect(g.recoveryNote.toLowerCase()).toMatch(/recover/);
  });

  it("drops the fan suggestion once the AIR itself is too hot for a fan to help", () => {
    const fanOk = restOfDayGuidance({ peakHeatIndexC: 33, peakAirTempC: 31, hotUntil: null });
    const fanBad = restOfDayGuidance({ peakHeatIndexC: 36, peakAirTempC: 38, hotUntil: null });
    expect(fanOk.withoutAC.toLowerCase()).toMatch(/fan|cross-breeze/);
    expect(fanBad.withoutAC.toLowerCase()).not.toMatch(/keep air moving with a fan/);
  });

  it("every tier returns non-empty AC and no-AC advice plus a recovery note", () => {
    for (const peak of [20, 28, 34, 42]) {
      const g = restOfDayGuidance({ peakHeatIndexC: peak, peakAirTempC: peak, hotUntil: null });
      expect(g.withAC.length).toBeGreaterThan(0);
      expect(g.withoutAC.length).toBeGreaterThan(0);
      expect(g.recoveryNote.length).toBeGreaterThan(0);
    }
  });
});
