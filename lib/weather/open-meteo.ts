// Open-Meteo integration (free, no API key). Turns a place name into coordinates,
// fetches the live forecast, shapes it into the physiology core's HeatConditions,
// and picks the safest time-of-day window to be active. Network is the only side
// effect; all interpretation reuses the pure physiology functions.

import { deriveConditions, heatIndexC } from "../physiology/heat-math";
import { evaluateEnvironment } from "../physiology/safety";
import { HEAT_INDEX_BANDS_C, WINDOW_COMFORT_BAND_C } from "../physiology/constants";
import type { HeatConditions, SafetyLevel } from "../physiology/types";

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export interface GeoResult {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/**
 * Resolve a place name to coordinates. Open-Meteo matches on plain place names,
 * so a query like "Phoenix, Arizona" is searched as "Phoenix" and the trailing
 * "Arizona" is used to disambiguate among matches. Returns null if nothing fits.
 */
export async function geocode(query: string): Promise<GeoResult | null> {
  const parts = query
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const primary = parts[0] || query;
  const hint = parts.slice(1).join(" ").toLowerCase();

  const url = `${GEO_URL}?name=${encodeURIComponent(primary)}&count=10&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = await res.json();
  const results: Array<Record<string, string>> = data?.results ?? [];
  if (results.length === 0) return null;

  let r = results[0];
  if (hint) {
    const match = results.find((x) =>
      [x.admin1, x.country, x.country_code]
        .filter(Boolean)
        .some((v) => {
          const s = String(v).toLowerCase();
          return s.includes(hint) || hint.includes(s);
        }),
    );
    if (match) r = match;
  }

  const label = [r.name, r.admin1, r.country]
    .filter(Boolean)
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
    .join(", ");
  return {
    label,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    timezone: String(r.timezone),
  };
}

/** Live place suggestions for autocomplete (multiple matches, best first). */
export async function searchPlaces(query: string, count = 5): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const primary = q.split(",")[0].trim() || q;
  const url = `${GEO_URL}?name=${encodeURIComponent(primary)}&count=${count}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const results: Array<Record<string, string>> = data?.results ?? [];
  return results.map((r) => ({
    label: [r.name, r.admin1, r.country]
      .filter(Boolean)
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
      .join(", "),
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    timezone: String(r.timezone),
  }));
}

export interface HourPoint {
  time: string; // ISO local, e.g. "2026-06-26T14:00"
  hour: number; // 0–23 local
  conditions: HeatConditions;
  solarLoad: number; // 0..1
}

export interface ForecastResult {
  timezone: string;
  now: HourPoint;
  hours: HourPoint[]; // next ~24h from now
}

// Strong midday clear-sky shortwave radiation is ~700–900 W/m²; map to a 0..1 load.
function solarLoadFrom(radiation: number | undefined | null): number {
  if (!radiation || radiation <= 0) return 0;
  return Math.max(0, Math.min(1, radiation / 800));
}

function parseHour(iso: string): number {
  const m = iso.match(/T(\d{2})/);
  return m ? parseInt(m[1], 10) : 0;
}

function pointFrom(
  time: string,
  tempC: number,
  humidityPct: number,
  apparentTempC: number,
  radiation: number | undefined | null,
): HourPoint {
  const solarLoad = solarLoadFrom(radiation);
  return {
    time,
    hour: parseHour(time),
    solarLoad,
    conditions: deriveConditions({ tempC, humidityPct, apparentTempC, solarLoad }),
  };
}

/** Fetch live current + next-24h hourly conditions for a coordinate. */
export async function fetchForecast(
  latitude: number,
  longitude: number,
): Promise<ForecastResult> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,shortwave_radiation",
    hourly: "temperature_2m,relative_humidity_2m,apparent_temperature,shortwave_radiation",
    timezone: "auto",
    forecast_days: "2",
  });
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Forecast failed (${res.status})`);
  const data = await res.json();

  const cur = data.current;
  const now = pointFrom(
    cur.time,
    cur.temperature_2m,
    cur.relative_humidity_2m,
    cur.apparent_temperature,
    cur.shortwave_radiation,
  );

  const h = data.hourly;
  const times: string[] = h.time;
  const all: HourPoint[] = times.map((t, i) =>
    pointFrom(
      t,
      h.temperature_2m[i],
      h.relative_humidity_2m[i],
      h.apparent_temperature[i],
      h.shortwave_radiation?.[i],
    ),
  );

  const startIdx = Math.max(
    0,
    all.findIndex((p) => p.time >= cur.time),
  );
  const hours = all.slice(startIdx, startIdx + 24);

  return { timezone: data.timezone, now, hours: hours.length ? hours : all.slice(0, 24) };
}

export interface DayForecast {
  date: string; // YYYY-MM-DD (local)
  hours: HourPoint[];
  safeWindow: SafestWindow; // primary window for plan engine
  goodWindows: WindowDisplay[]; // morning + evening slots for display
  peak: HeatConditions; // hottest hour that day (drives the outlook flag)
}

export interface MultiDayForecast {
  timezone: string;
  now: HourPoint;
  days: DayForecast[]; // day 0 = today, then forward
}

/**
 * Fetch the next `days` (1–16) of hourly conditions, grouped by calendar day, each
 * with its safest window and its peak strain. Used to lay out the program ahead.
 */
export async function fetchMultiDayForecast(
  latitude: number,
  longitude: number,
  days = 7,
  tightenC = 0,
): Promise<MultiDayForecast> {
  const n = Math.max(1, Math.min(16, Math.round(days)));
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,shortwave_radiation",
    hourly: "temperature_2m,relative_humidity_2m,apparent_temperature,shortwave_radiation",
    timezone: "auto",
    forecast_days: String(n),
  });
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Forecast failed (${res.status})`);
  const data = await res.json();

  const cur = data.current;
  const now = pointFrom(
    cur.time,
    cur.temperature_2m,
    cur.relative_humidity_2m,
    cur.apparent_temperature,
    cur.shortwave_radiation,
  );

  const h = data.hourly;
  const times: string[] = h.time;
  const all: HourPoint[] = times.map((t, i) =>
    pointFrom(
      t,
      h.temperature_2m[i],
      h.relative_humidity_2m[i],
      h.apparent_temperature[i],
      h.shortwave_radiation?.[i],
    ),
  );

  const byDate = new Map<string, HourPoint[]>();
  for (const p of all) {
    const d = p.time.slice(0, 10);
    const list = byDate.get(d) ?? [];
    list.push(p);
    byDate.set(d, list);
  }

  const forecastDays: DayForecast[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, hours]) => {
      const peak = hours.reduce((a, b) =>
        b.conditions.heatIndexC > a.conditions.heatIndexC ? b : a,
      ).conditions;
      return { date, hours, safeWindow: pickWindowAnchor(hours, tightenC), goodWindows: findGoodWindows(hours, tightenC), peak };
    });

  return { timezone: data.timezone, now, days: forecastDays };
}

export interface SafestWindow {
  label: string;
  point: HourPoint;
}

const WAKING_START = 5;
const WAKING_END = 21;

/**
 * Pick the safest waking-hours window to be active: prefer the lowest safety level
 * (NORMAL over CAUTION over HARD_STOP), then the lowest heat strain. `tightenC`
 * mirrors the safety overlay's tightening for higher-risk users.
 */
export function pickSafestWindow(hours: HourPoint[], tightenC = 0): SafestWindow {
  const waking = hours.filter((p) => p.hour >= WAKING_START && p.hour <= WAKING_END);
  const pool = waking.length ? waking : hours;

  const rank = (l: string) => (l === "NORMAL" ? 0 : l === "CAUTION" ? 1 : 2);
  const best = pool
    .map((p) => ({ p, level: evaluateEnvironment(p.conditions, tightenC).level }))
    .sort((a, b) => {
      if (rank(a.level) !== rank(b.level)) return rank(a.level) - rank(b.level);
      return a.p.conditions.heatIndexC - b.p.conditions.heatIndexC;
    })[0].p;

  return { label: windowLabel(best.hour), point: best };
}

/** A good-conditions time slot for display: period, time range, and an HONEST temp range. */
export interface WindowDisplay {
  period: "morning" | "evening";
  timeRange: string;   // e.g. "8–10pm", "5–7am", "~6am"
  feelsLowC: number;   // coolest hour's heat index in the window
  feelsHighC: number;  // warmest hour's heat index in the window (the honest worst case)
  level: SafetyLevel;  // worst safety level across the window — so the verdict matches it
  isEstimate: boolean; // true when based on extrapolated (beyond-forecast) data
}

function fmtHour(h: number): string {
  const period = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
}

function blockTimeRange(startHour: number, endHour: number): string {
  if (startHour === endHour) return `~${fmtHour(startHour)}`;
  const startP = startHour < 12 ? "am" : "pm";
  const endP = endHour < 12 ? "am" : "pm";
  const startN = startHour % 12 === 0 ? 12 : startHour % 12;
  const endN = endHour % 12 === 0 ? 12 : endHour % 12;
  return startP === endP
    ? `${startN}–${endN}${endP}`       // "6–9am"
    : `${startN}${startP}–${endN}${endP}`; // "11am–1pm" (edge case)
}

// The candidate periods we look for a "good window" inside (local clock hours).
const WINDOW_PERIODS = [
  { period: "morning" as const, lo: 5, hi: 11 },
  { period: "evening" as const, lo: 17, hi: 22 },
];

function rankLevel(l: SafetyLevel): number {
  return l === "NORMAL" ? 0 : l === "CAUTION" ? 1 : 2;
}
function levelFromRank(r: number): SafetyLevel {
  return r === 0 ? "NORMAL" : r === 1 ? "CAUTION" : "HARD_STOP";
}

/**
 * The genuinely-cool contiguous block within a period: anchor on the coolest
 * non-HARD_STOP hour, then grow outward (by consecutive clock hours) while each
 * hour stays within WINDOW_COMFORT_BAND_C of that coolest hour — or below the
 * comfortable floor on a mild day. This hugs the cool stretch (e.g. 8–10pm)
 * instead of returning the whole 5–10pm period. Returns null if every hour in the
 * period is a hard stop (no safe window at all).
 */
function coolBlock(pool: HourPoint[], tightenC: number): HourPoint[] | null {
  const safe = pool.filter(
    (h) => evaluateEnvironment(h.conditions, tightenC).level !== "HARD_STOP",
  );
  if (!safe.length) return null;

  const sorted = [...pool].sort((a, b) => a.hour - b.hour);
  const anchor = safe.reduce((a, b) =>
    b.conditions.heatIndexC < a.conditions.heatIndexC ? b : a,
  );
  const ceiling = Math.max(
    anchor.conditions.heatIndexC + WINDOW_COMFORT_BAND_C,
    HEAT_INDEX_BANDS_C.CAUTION,
  );
  const ok = (h: HourPoint) =>
    h.conditions.heatIndexC <= ceiling &&
    evaluateEnvironment(h.conditions, tightenC).level !== "HARD_STOP";

  let lo = sorted.findIndex((h) => h.hour === anchor.hour);
  let hi = lo;
  while (lo - 1 >= 0 && sorted[lo - 1].hour === sorted[lo].hour - 1 && ok(sorted[lo - 1])) lo--;
  while (hi + 1 < sorted.length && sorted[hi + 1].hour === sorted[hi].hour + 1 && ok(sorted[hi + 1])) hi++;
  return sorted.slice(lo, hi + 1);
}

function blockToDisplay(
  block: HourPoint[],
  period: "morning" | "evening",
  tightenC: number,
  isEstimate: boolean,
): WindowDisplay {
  const his = block.map((h) => h.conditions.heatIndexC);
  const worst = Math.max(
    ...block.map((h) => rankLevel(evaluateEnvironment(h.conditions, tightenC).level)),
  );
  return {
    period,
    timeRange: blockTimeRange(block[0].hour, block[block.length - 1].hour),
    feelsLowC: Math.min(...his),
    feelsHighC: Math.max(...his),
    level: levelFromRank(worst),
    isEstimate,
  };
}

/**
 * The morning (5–11h) and evening (17–22h) "good windows to be outside", each
 * narrowed to its genuinely-cool block and reported with an HONEST temperature
 * range (coolest→warmest hour) and the window's worst safety level — so the temp
 * and verdict describe the hours actually being recommended, not one cherry-picked
 * coolest hour.
 */
export function findGoodWindows(hours: HourPoint[], tightenC = 0, isEstimate = false): WindowDisplay[] {
  return WINDOW_PERIODS.map(({ period, lo, hi }) => {
    const block = coolBlock(hours.filter((h) => h.hour >= lo && h.hour <= hi), tightenC);
    return block ? blockToDisplay(block, period, tightenC, isEstimate) : null;
  }).filter((w): w is WindowDisplay => w !== null);
}

/**
 * The anchor hour the plan engine should be evaluated at. We pick the best
 * good-window (lowest worst-level, then coolest warm-edge) and return its WARM EDGE
 * conditions — the hottest moment someone would actually be active in the
 * recommended window — so the safety verdict and dose are honest to that window
 * rather than to a single cherry-picked coolest hour. The label still names the
 * window's coolest "sweet spot". Falls back to the single safest hour when no
 * non-hard-stop block exists (so the engine can still hard-stop the day).
 */
export function pickWindowAnchor(hours: HourPoint[], tightenC = 0): SafestWindow {
  const blocks = WINDOW_PERIODS.map(({ lo, hi }) =>
    coolBlock(hours.filter((h) => h.hour >= lo && h.hour <= hi), tightenC),
  ).filter((b): b is HourPoint[] => b !== null);
  if (!blocks.length) return pickSafestWindow(hours, tightenC);

  const warmEdge = (b: HourPoint[]) =>
    b.reduce((a, h) => (h.conditions.heatIndexC > a.conditions.heatIndexC ? h : a));
  const coolest = (b: HourPoint[]) =>
    b.reduce((a, h) => (h.conditions.heatIndexC < a.conditions.heatIndexC ? h : a));
  const worstRank = (b: HourPoint[]) =>
    Math.max(...b.map((h) => rankLevel(evaluateEnvironment(h.conditions, tightenC).level)));

  const best = blocks
    .map((b) => ({ b, edge: warmEdge(b), worst: worstRank(b) }))
    .sort((a, b) =>
      a.worst !== b.worst
        ? a.worst - b.worst
        : a.edge.conditions.heatIndexC - b.edge.conditions.heatIndexC,
    )[0];

  return { label: windowLabel(coolest(best.b).hour), point: best.edge };
}

function to12h(h: number): string {
  const period = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
}

function windowLabel(hour: number): string {
  let part: string;
  if (hour < 8) part = "early morning";
  else if (hour < 11) part = "morning";
  else if (hour < 15) part = "midday";
  else if (hour < 18) part = "afternoon";
  else if (hour < 21) part = "evening";
  else part = "night";
  return `${part} (around ${to12h(hour)})`;
}

// ---------------------------------------------------------------------------
// Origin baseline ("what the body is used to")
// ---------------------------------------------------------------------------

// Typical DAILY-PEAK heat index (°C) for each qualitative climate band — the heat
// the body is used to enduring at home, compared like-for-like against the
// destination's daily peak.
export const ORIGIN_BAND_HEAT_INDEX_C: Record<string, number> = {
  COOL: 18,
  TEMPERATE: 24,
  WARM: 30,
  HOT_HUMID: 35,
};

/**
 * Decay-weighted mean of daily values ordered OLDEST→NEWEST. Recent days count more
 * (exponential decay, `halfLifeDays`), mirroring how heat acclimatization fades over
 * ~2 weeks — so the baseline reflects the heat the body is *currently* carrying.
 */
export function decayWeightedMean(oldestFirst: number[], halfLifeDays = 14): number {
  let weightSum = 0;
  let valueSum = 0;
  const n = oldestFirst.length;
  for (let i = 0; i < n; i++) {
    const age = n - 1 - i; // newest day → age 0
    const w = Math.pow(0.5, age / halfLifeDays);
    weightSum += w;
    valueSum += w * oldestFirst[i];
  }
  return weightSum > 0 ? valueSum / weightSum : 0;
}

/**
 * Origin baseline from the home location's RECENT ACTUAL weather: a decay-weighted
 * average of the last `pastDays` daily-peak heat indices (recent days weighted more).
 * This is the physiologically right signal — heat acclimatization is set by the heat
 * you've lived through over the last ~2–3 weeks, and it automatically captures the
 * season. Returns null if it can't be computed (caller falls back to a band).
 */
export async function recentOriginBaselineHeatIndexC(
  latitude: number,
  longitude: number,
  pastDays = 21,
  halfLifeDays = 14,
): Promise<number | null> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: "temperature_2m,relative_humidity_2m",
    timezone: "auto",
    past_days: String(Math.max(1, Math.min(92, Math.round(pastDays)))),
    forecast_days: "1",
  });
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  const h = data?.hourly;
  const times: string[] = h?.time ?? [];
  if (times.length === 0) return null;

  // Daily PEAK heat index, grouped by calendar day.
  const peakByDay = new Map<string, number>();
  for (let i = 0; i < times.length; i++) {
    const t = h.temperature_2m?.[i];
    const rh = h.relative_humidity_2m?.[i];
    if (t == null || rh == null) continue;
    const day = times[i].slice(0, 10);
    const hi = heatIndexC(t, rh);
    peakByDay.set(day, Math.max(peakByDay.get(day) ?? -Infinity, hi));
  }
  const peaksOldestFirst = [...peakByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
  if (peaksOldestFirst.length === 0) return null;
  return decayWeightedMean(peaksOldestFirst, halfLifeDays);
}

/**
 * Resolve the origin-baseline heat index (°C) from the best available signal: an
 * explicit stored value, else the home's recent-weather decay-weighted baseline,
 * else a qualitative band, else a temperate default.
 */
export async function resolveOriginBaselineHeatIndexC(opts: {
  explicit?: number | null;
  band?: string | null;
  lat?: number | null;
  lon?: number | null;
}): Promise<number> {
  if (typeof opts.explicit === "number") return opts.explicit;
  if (opts.lat != null && opts.lon != null) {
    try {
      const recent = await recentOriginBaselineHeatIndexC(opts.lat, opts.lon);
      if (recent != null) return recent;
    } catch {
      // fall through to band / default
    }
  }
  if (opts.band && ORIGIN_BAND_HEAT_INDEX_C[opts.band] != null) {
    return ORIGIN_BAND_HEAT_INDEX_C[opts.band];
  }
  return ORIGIN_BAND_HEAT_INDEX_C.TEMPERATE;
}
