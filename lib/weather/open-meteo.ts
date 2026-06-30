// Open-Meteo integration (free, no API key). Turns a place name into coordinates,
// fetches the live forecast, shapes it into the physiology core's HeatConditions,
// and picks the safest time-of-day window to be active. Network is the only side
// effect; all interpretation reuses the pure physiology functions.

import { deriveConditions, heatIndexC } from "../physiology/heat-math";
import { evaluateEnvironment } from "../physiology/safety";
import type { HeatConditions } from "../physiology/types";

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
  safeWindow: SafestWindow; // safest window that day (primary, used by plan engine)
  safeWindows: SafestWindow[]; // morning + evening pair for display (1 or 2 entries)
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
      return { date, hours, safeWindow: pickSafestWindow(hours, tightenC), safeWindows: pickWindowPair(hours, tightenC), peak };
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

/**
 * Pick the best window from the morning (5–11) and the evening/night (17–22)
 * independently. Only includes a slot if it is not HARD_STOP. Returns in time
 * order (morning first, evening second) so UI can render them chronologically.
 */
export function pickWindowPair(hours: HourPoint[], tightenC = 0): SafestWindow[] {
  const rank = (l: string) => (l === "NORMAL" ? 0 : l === "CAUTION" ? 1 : 2);
  function bestOf(pool: HourPoint[]): SafestWindow | null {
    if (!pool.length) return null;
    const rated = pool
      .map((p) => ({ p, level: evaluateEnvironment(p.conditions, tightenC).level }))
      .sort((a, b) => rank(a.level) - rank(b.level) || a.p.conditions.heatIndexC - b.p.conditions.heatIndexC);
    if (rated[0].level === "HARD_STOP") return null;
    return { label: windowLabel(rated[0].p.hour), point: rated[0].p };
  }
  const am = bestOf(hours.filter((h) => h.hour >= 5 && h.hour <= 11));
  const pm = bestOf(hours.filter((h) => h.hour >= 17 && h.hour <= 22));
  return [am, pm].filter((w): w is SafestWindow => w !== null);
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
