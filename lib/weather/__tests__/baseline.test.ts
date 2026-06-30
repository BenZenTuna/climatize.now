import { describe, it, expect } from "vitest";
import { decayWeightedMean } from "../open-meteo";

describe("decayWeightedMean (origin baseline weighting)", () => {
  it("returns the value when all days are equal", () => {
    expect(decayWeightedMean([20, 20, 20, 20])).toBeCloseTo(20, 6);
  });

  it("returns the single value for a one-day series", () => {
    expect(decayWeightedMean([25])).toBeCloseTo(25, 6);
  });

  it("weights recent days more: recent-hot pulls the mean above a plain average", () => {
    const series = [10, 10, 10, 30, 30]; // oldest → newest; recent days hot
    const plain = series.reduce((a, b) => a + b, 0) / series.length;
    expect(decayWeightedMean(series, 14)).toBeGreaterThan(plain);
  });

  it("recent-cold pulls the mean below a plain average", () => {
    const series = [30, 30, 10, 10, 10]; // recent days cold
    const plain = series.reduce((a, b) => a + b, 0) / series.length;
    expect(decayWeightedMean(series, 14)).toBeLessThan(plain);
  });

  it("a shorter half-life tilts harder toward recent days", () => {
    const series = [10, 10, 10, 30, 30];
    expect(decayWeightedMean(series, 3)).toBeGreaterThan(decayWeightedMean(series, 21));
  });
});
