import { describe, it, expect } from "vitest";
import { overnightRecoveryGuidance } from "../overnight";

describe("overnight recovery outlook (#1)", () => {
  it("calls a cool, dry night good for recovery", () => {
    const g = overnightRecoveryGuidance({
      minHeatIndexC: 18,
      minAirTempC: 17,
      coolestWetBulbC: 14,
      coolestAround: "around 5am",
    });
    expect(g.level).toBe("COOL");
    expect(g.humidDriven).toBe(false);
    expect(g.note.toLowerCase()).toMatch(/recovery|recover/);
  });

  it("humidity is the differentiator: same warm low, but muggy → poorer recovery", () => {
    const dry = overnightRecoveryGuidance({
      minHeatIndexC: 24,
      minAirTempC: 23,
      coolestWetBulbC: 16, // dry
      coolestAround: "around 4am",
    });
    const muggy = overnightRecoveryGuidance({
      minHeatIndexC: 24,
      minAirTempC: 23,
      coolestWetBulbC: 22, // oppressively humid
      coolestAround: "around 4am",
    });
    expect(dry.level).toBe("WARM");
    expect(muggy.level).toBe("MUGGY");
    expect(muggy.humidDriven).toBe(true);
    expect(muggy.title.toLowerCase()).toMatch(/humid/);
  });

  it("flags a night that never leaves the caution band as MUGGY regardless of dew point", () => {
    const g = overnightRecoveryGuidance({
      minHeatIndexC: 28, // ≥ CAUTION (26.7)
      minAirTempC: 27,
      coolestWetBulbC: 15, // dry heat, not humidity-driven
      coolestAround: "around 5am",
    });
    expect(g.level).toBe("MUGGY");
    expect(g.humidDriven).toBe(false);
  });

  it("flags a barely-cooling extreme night as DANGEROUS", () => {
    const g = overnightRecoveryGuidance({
      minHeatIndexC: 33, // ≥ EXTREME_CAUTION (32.2)
      minAirTempC: 31,
      coolestWetBulbC: 26,
      coolestAround: "around 6am",
    });
    expect(g.level).toBe("DANGEROUS");
    expect(g.humidDriven).toBe(true);
    expect(g.advice.toLowerCase()).toMatch(/air.?condition|cool/);
  });

  it("every level returns a non-empty title, advice, and note", () => {
    const inputs = [
      { minHeatIndexC: 18, coolestWetBulbC: 12 },
      { minHeatIndexC: 24, coolestWetBulbC: 21 },
      { minHeatIndexC: 28, coolestWetBulbC: 22 },
      { minHeatIndexC: 34, coolestWetBulbC: 27 },
    ];
    for (const i of inputs) {
      const g = overnightRecoveryGuidance({
        minHeatIndexC: i.minHeatIndexC,
        minAirTempC: i.minHeatIndexC - 1,
        coolestWetBulbC: i.coolestWetBulbC,
        coolestAround: null,
      });
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.advice.length).toBeGreaterThan(0);
      expect(g.note.length).toBeGreaterThan(0);
    }
  });
});
