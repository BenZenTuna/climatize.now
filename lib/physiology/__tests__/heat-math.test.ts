import { describe, it, expect } from "vitest";
import {
  cToF,
  fToC,
  heatIndexC,
  wetBulbC,
  wbgtC,
  deriveConditions,
} from "../heat-math";

describe("temperature conversion", () => {
  it("round-trips °C↔°F", () => {
    expect(cToF(0)).toBeCloseTo(32, 6);
    expect(cToF(100)).toBeCloseTo(212, 6);
    expect(fToC(cToF(37))).toBeCloseTo(37, 6);
  });
});

describe("heat index (NWS Rothfusz)", () => {
  it("is within a few °F of the NWS chart at several points", () => {
    // 90°F/70% ≈ 105°F; 100°F/40% ≈ 109°F (NWS heat-index chart).
    expect(Math.abs(cToF(heatIndexC(32.2, 70)) - 105)).toBeLessThan(4);
    expect(Math.abs(cToF(heatIndexC(37.8, 40)) - 109)).toBeLessThan(4);
  });

  it("feels hotter than air temp when hot & humid", () => {
    expect(heatIndexC(35, 80)).toBeGreaterThan(35);
  });

  it("≈ air temp in mild conditions (low-range fallback)", () => {
    expect(Math.abs(heatIndexC(20, 50) - 20)).toBeLessThan(2);
  });
});

describe("wet-bulb (Stull 2011)", () => {
  it("matches Stull's reference at 20°C / 50% (≈13.7°C)", () => {
    expect(wetBulbC(20, 50)).toBeCloseTo(13.7, 1);
  });

  it("never exceeds dry-bulb temperature", () => {
    for (const [t, rh] of [
      [25, 30],
      [35, 80],
      [40, 20],
      [15, 95],
    ] as const) {
      expect(wetBulbC(t, rh)).toBeLessThanOrEqual(t + 1e-9);
    }
  });

  it("rises with humidity at fixed temperature", () => {
    expect(wetBulbC(30, 80)).toBeGreaterThan(wetBulbC(30, 30));
  });
});

describe("WBGT estimate", () => {
  it("sits between wet-bulb and dry-bulb in the shade", () => {
    const t = 33;
    const rh = 55;
    const wb = wbgtC(t, rh, 0);
    expect(wb).toBeGreaterThan(wetBulbC(t, rh));
    expect(wb).toBeLessThan(t);
  });

  it("is higher under solar load", () => {
    expect(wbgtC(33, 55, 1)).toBeGreaterThan(wbgtC(33, 55, 0));
  });
});

describe("deriveConditions", () => {
  it("fills all metrics and defaults apparentTemp to heat index", () => {
    const c = deriveConditions({ tempC: 34, humidityPct: 60 });
    expect(c.heatIndexC).toBeGreaterThan(34);
    expect(c.apparentTempC).toBeCloseTo(c.heatIndexC, 6);
    expect(c.wetBulbC).toBeLessThan(34);
    expect(c.wbgtC).toBeGreaterThan(0);
  });

  it("uses a provided apparent temperature when given", () => {
    const c = deriveConditions({ tempC: 34, humidityPct: 60, apparentTempC: 41 });
    expect(c.apparentTempC).toBe(41);
  });
});
