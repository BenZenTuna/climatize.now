import { describe, it, expect } from "vitest";
import { findGoodWindows, pickWindowAnchor, type HourPoint } from "../open-meteo";
import { evaluateEnvironment } from "../../physiology/safety";
import { fmtTempRange } from "../../units";

// Build an hour with a chosen heat index. wet-bulb / WBGT are pinned low so ONLY the
// heat index drives the safety level — this isolates the window logic from the
// metric-combination logic (which is tested in safety.test.ts). With these,
// evaluateEnvironment is: <32.2 NORMAL · 32.2–39.4 CAUTION · ≥39.4 HARD_STOP.
function hour(h: number, heatIndexC: number): HourPoint {
  return {
    time: `2026-06-30T${String(h).padStart(2, "0")}:00`,
    hour: h,
    solarLoad: 0,
    conditions: {
      tempC: heatIndexC,
      humidityPct: 30,
      apparentTempC: heatIndexC,
      heatIndexC,
      wetBulbC: 18,
      wbgtC: 20,
    },
  };
}

const evening = (his: number[]) => his.map((hi, i) => hour(17 + i, hi)); // 5pm..10pm
const morning = (his: number[]) => his.map((hi, i) => hour(5 + i, hi)); // 5am..11am

describe("findGoodWindows — tight, honest windows", () => {
  it("narrows a hot falling evening to its cool tail (not the whole 5–10pm)", () => {
    // 5pm..10pm: 37,35,33,31,29,28 → only 8–10pm is within ~3°C of the coolest hour.
    const w = findGoodWindows(evening([37, 35, 33, 31, 29, 28]));
    const pm = w.find((x) => x.period === "evening")!;
    expect(pm.timeRange).toBe("8–10pm");
    expect(pm.feelsLowC).toBe(28);
    expect(pm.feelsHighC).toBe(31);
    expect(pm.level).toBe("NORMAL");
  });

  it("narrows a rising morning to its cool early hours", () => {
    // 5am..11am: 21,20,23,26,29,32,35 → cool block is the early hours.
    const w = findGoodWindows(morning([21, 20, 23, 26, 29, 32, 35]));
    const am = w.find((x) => x.period === "morning")!;
    expect(am.timeRange).toBe("5–8am");
    expect(am.feelsLowC).toBe(20);
    expect(am.feelsHighC).toBe(26);
    expect(am.level).toBe("NORMAL");
  });

  it("reports CAUTION (never green) when even the coolest window is still hot", () => {
    // A heatwave evening: every hour is in the CAUTION band.
    const w = findGoodWindows(evening([38, 37, 36, 35, 34, 33]));
    const pm = w.find((x) => x.period === "evening")!;
    expect(pm.level).toBe("CAUTION");
    expect(pm.feelsHighC).toBeGreaterThan(pm.feelsLowC);
  });

  it("returns no window for a period that is entirely a hard stop", () => {
    const w = findGoodWindows(evening([42, 41, 41, 40, 40, 40]));
    expect(w.find((x) => x.period === "evening")).toBeUndefined();
  });

  it("keeps the whole comfortable period on a genuinely mild day", () => {
    // All hours well below the comfort floor → the window spans the period.
    const w = findGoodWindows(morning([16, 17, 18, 19, 20, 21, 22]));
    const am = w.find((x) => x.period === "morning")!;
    expect(am.timeRange).toBe("5–11am");
    expect(am.level).toBe("NORMAL");
  });
});

describe("pickWindowAnchor — the verdict/dose anchor matches the window", () => {
  it("anchors on the warm edge of the recommended window (honest worst case)", () => {
    const a = pickWindowAnchor(evening([37, 35, 33, 31, 29, 28]));
    // Best block is 8–10pm (31,29,28); the warm edge is 8pm @ 31°C.
    expect(a.point.conditions.heatIndexC).toBe(31);
    expect(a.label).toContain("10pm"); // labelled by the window's coolest "sweet spot"
    expect(evaluateEnvironment(a.point.conditions).level).toBe("NORMAL");
  });

  it("yields a CAUTION verdict when the cool window's warm edge is still hot", () => {
    const a = pickWindowAnchor(evening([38, 37, 36, 35, 34, 33]));
    expect(evaluateEnvironment(a.point.conditions).level).toBe("CAUTION");
  });

  it("falls back to the coolest hour (and hard-stops) when no safe window exists", () => {
    const a = pickWindowAnchor(evening([42, 41, 41, 40, 40, 39.5]));
    expect(evaluateEnvironment(a.point.conditions).level).toBe("HARD_STOP");
  });
});

describe("fmtTempRange", () => {
  it("shows a range, and collapses when the ends round equal", () => {
    expect(fmtTempRange(28, 31, "C")).toBe("28–31°C");
    expect(fmtTempRange(29, 29.2, "C")).toBe("29°C");
    expect(fmtTempRange(20, 26, "F")).toBe("68–79°F");
  });
});
