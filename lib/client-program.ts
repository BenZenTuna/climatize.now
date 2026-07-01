// Browser-side program logic. Fetches weather directly from the user's browser and
// runs the (pure, tested) physiology engine on the client. No server, no storage.
// The running adaptation total is derived by REPLAYING the stored logs, so we never
// need to persist computed plans.

import {
  fetchMultiDayForecast,
  pickWindowAnchor,
  findGoodWindows,
  ORIGIN_BAND_HEAT_INDEX_C,
} from "./weather/open-meteo";
import type { MultiDayForecast, SafestWindow, WindowDisplay } from "./weather/open-meteo";
export type { WindowDisplay } from "./weather/open-meteo";
import { generateDayPlan } from "./physiology/plan-engine";
import { assessScreening, evaluateEnvironment } from "./physiology/safety";
import { restOfDayGuidance, type RestOfDayGuidance } from "./physiology/recovery";
import { HEAT_INDEX_BANDS_C } from "./physiology/constants";
import {
  scoreFeedback,
  updateAdaptationDays,
  personaRampDays,
} from "./physiology/acclimatization";
import type { AppState, StoredLog } from "./store";
import type {
  DailyFeedback,
  DayPlanResult,
  HeatConditions,
  Intensity,
  Persona,
  SafetyLevel,
  Units,
} from "./physiology/types";

function toFeedback(l: StoredLog): DailyFeedback {
  return {
    completedExposure: l.completedExposure,
    sweatResponse: l.sweatResponse,
    perceivedExertion: l.perceivedExertion,
    sleepQuality: l.sleepQuality,
    thirst: l.thirst,
    overallFeeling: l.overallFeeling,
    headache: l.headache,
    dizziness: l.dizziness,
    nausea: l.nausea,
    redFlag: l.redFlag,
  };
}

export function tightenFor(state: AppState): number {
  const tier = assessScreening(state.screening).tier;
  return tier === "HIGH" ? 3 : tier === "ELEVATED" ? 2 : 0;
}

function originBaseline(state: AppState): number {
  if (state.origin.baselineHeatIndexC != null) return state.origin.baselineHeatIndexC;
  if (state.origin.band && ORIGIN_BAND_HEAT_INDEX_C[state.origin.band] != null) {
    return ORIGIN_BAND_HEAT_INDEX_C[state.origin.band];
  }
  return ORIGIN_BAND_HEAT_INDEX_C.TEMPERATE;
}

/** Replay the logs to get the running adaptation-days total before `uptoDay`. */
export function adaptationAfter(state: AppState, uptoDay: number): number {
  let a = 0;
  for (let d = 0; d < uptoDay; d++) {
    const log = state.logs[d];
    a = log
      ? updateAdaptationDays(a, scoreFeedback(toFeedback(log)).adaptationDelta, 0)
      : updateAdaptationDays(a, 0, 1); // missed day → decay
  }
  return a;
}

function tripDaysRemaining(state: AppState): number | null {
  if (state.persona !== "VACATIONER" || !state.tripEndISO) return null;
  const end = new Date(state.tripEndISO).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

/**
 * The program day derived from the real calendar (day 0 = the start date), plus a
 * test-only `dayOffset`. So skipping real days naturally registers as missed days
 * (decay) when the logs are replayed.
 */
export function currentProgramDay(state: AppState): number {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const elapsed = Math.round(
    (startOfDay(new Date()) - startOfDay(new Date(state.startISO))) / 86_400_000,
  );
  return Math.max(0, elapsed + (state.dayOffset ?? 0));
}

/**
 * The safest window the user can still act on today: only hours at/after "now",
 * spilling into tomorrow morning if today is nearly over. Shared by the Today and
 * program views so "today" reads the same on both.
 */
function pickUpcomingWindow(mdf: MultiDayForecast, tighten: number): SafestWindow {
  const today = mdf.days[0];
  let pool = today.hours.filter((h) => h.time >= mdf.now.time);
  if (pool.length < 3 && mdf.days[1]) pool = [...pool, ...mdf.days[1].hours];
  if (pool.length === 0) pool = today.hours;
  return pickWindowAnchor(pool, tighten);
}

function findUpcomingGoodWindows(mdf: MultiDayForecast, tighten: number): WindowDisplay[] {
  const today = mdf.days[0];
  let pool = today.hours.filter((h) => h.time >= mdf.now.time);
  if (pool.length < 3 && mdf.days[1]) pool = [...pool, ...mdf.days[1].hours];
  if (pool.length === 0) pool = today.hours;
  return findGoodWindows(pool, tighten);
}

function labelHour(hour: number): string {
  const period = hour < 12 ? "am" : "pm";
  const hr = hour % 12 === 0 ? 12 : hour % 12;
  return `around ${hr}${period}`;
}

/**
 * What's left of TODAY's heat, for the rest-of-day recovery advice: the peak
 * feels-like and air temp over the hours still ahead, and roughly when it stops
 * being caution-warm. Looks only at hours at/after "now" so it tracks the day down.
 */
function computeRestOfDay(mdf: MultiDayForecast): {
  guidance: RestOfDayGuidance;
  peakFeelsLikeC: number;
} {
  const remaining = mdf.days[0].hours.filter((h) => h.time >= mdf.now.time);
  const pool = remaining.length ? remaining : [mdf.now];
  const peakFeelsLikeC = Math.max(...pool.map((h) => h.conditions.heatIndexC));
  const peakAirTempC = Math.max(...pool.map((h) => h.conditions.tempC));
  const hotHours = pool.filter((h) => h.conditions.heatIndexC >= HEAT_INDEX_BANDS_C.CAUTION);
  const lastHot = hotHours.length ? hotHours[hotHours.length - 1] : null;
  const guidance = restOfDayGuidance({
    peakHeatIndexC: peakFeelsLikeC,
    peakAirTempC,
    hotUntil: lastHot ? labelHour(lastHot.hour) : null,
  });
  return { guidance, peakFeelsLikeC };
}

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

/** Today's full-day feels-like curve (24 hourly values) for the heat-curve chart. */
export interface HeatCurve {
  feelsC: number[]; // length 24, index = local hour; raw °C (chart converts for display)
  windows: [number, number][]; // cool-window hour spans to shade [startHour, endHour]
  nowHour: number; // 0–23
}

export interface TodayView {
  programDay: number;
  plan: DayPlanResult;
  current: HeatConditions;
  currentLabel: string;
  windKmh: number; // current wind speed for the hero
  goodWindows: WindowDisplay[]; // morning + evening slots with time ranges and temps
  heatCurve: HeatCurve; // today's hour-by-hour feels-like curve
  windowConditions: HeatConditions;
  peakFeelsLikeC: number; // the day's hottest heat index
  nowSafetyLevel: SafetyLevel; // how dangerous it is RIGHT NOW (vs the safe window)
  restOfDay: RestOfDayGuidance; // how to spend the rest of today (with/without AC)
  restOfDayPeakFeelsLikeC: number; // peak feels-like over the hours still ahead
  yesterdayTargetMinutes: number | null;
  units: Units;
}

/**
 * Today's hour-by-hour feels-like curve (all 24 hours, index = local hour) plus the
 * recommended cool-window spans and the current hour — for the heat-curve chart.
 * Any gaps are filled forward/back so the line stays continuous.
 */
function buildHeatCurve(mdf: MultiDayForecast, tighten: number): HeatCurve {
  const today = mdf.days[0];
  const raw = new Array<number | null>(24).fill(null);
  for (const p of today.hours) {
    if (p.hour >= 0 && p.hour < 24) raw[p.hour] = p.conditions.heatIndexC;
  }
  let last: number | null = null;
  for (let i = 0; i < 24; i++) {
    if (raw[i] != null) last = raw[i];
    else raw[i] = last;
  }
  let next: number | null = null;
  for (let i = 23; i >= 0; i--) {
    if (raw[i] != null) next = raw[i];
    else raw[i] = next;
  }
  const feelsC = raw.map((v) => v ?? 25);

  const windows = findGoodWindows(today.hours, tighten).map(
    (w) => [w.startHour, w.endHour] as [number, number],
  );
  return { feelsC, windows, nowHour: mdf.now.hour };
}

export async function buildTodayView(state: AppState): Promise<TodayView> {
  const tighten = tightenFor(state);
  // One multi-day fetch gives the same calendar-day peak the program view uses, so
  // the two screens always agree on today's numbers.
  const mdf = await fetchMultiDayForecast(state.current.lat, state.current.lon, 2, tighten);
  const today = mdf.days[0];
  const window = pickUpcomingWindow(mdf, tighten);
  const todayGoodWindows = findUpcomingGoodWindows(mdf, tighten);
  const heatCurve = buildHeatCurve(mdf, tighten);
  const restOfDay = computeRestOfDay(mdf);

  // The day's PEAK heat is the real adaptation challenge (the gap); exposure is
  // still timed to the cool window above.
  const dayPeakHeatIndexC = today.peak.heatIndexC;

  const D = currentProgramDay(state);
  const prior = adaptationAfter(state, Math.max(0, D - 1));
  const yLog = D > 0 ? state.logs[D - 1] : undefined;

  const plan = generateDayPlan({
    persona: state.persona,
    conditions: window.point.conditions,
    currentHeatIndexForGapC: dayPeakHeatIndexC,
    screening: state.screening,
    originBaselineHeatIndexC: originBaseline(state),
    priorAdaptationDays: prior,
    yesterday: yLog ? toFeedback(yLog) : null,
    missedDays: D > 0 && !yLog ? 1 : 0,
    tripDaysRemaining: tripDaysRemaining(state),
    safestWindowLabel: window.label,
  });

  return {
    programDay: D,
    plan,
    current: mdf.now.conditions,
    currentLabel: state.current.label,
    windKmh: mdf.nowWindKmh,
    goodWindows: todayGoodWindows,
    heatCurve,
    windowConditions: window.point.conditions,
    peakFeelsLikeC: dayPeakHeatIndexC,
    nowSafetyLevel: evaluateEnvironment(mdf.now.conditions, tighten).level,
    restOfDay: restOfDay.guidance,
    restOfDayPeakFeelsLikeC: restOfDay.peakFeelsLikeC,
    yesterdayTargetMinutes: state.history[D - 1]?.targetMinutes ?? null,
    units: state.units,
  };
}

// ---------------------------------------------------------------------------
// Multi-day program
// ---------------------------------------------------------------------------

export type Outlook = "GOOD" | "TOUGH" | "SHELTER";
export type DayState = "PAST" | "TODAY" | "FUTURE";

/** The full preliminary plan for a day (today/future), revealed when a row expands. */
export interface DayDetail {
  headline: string;
  steps: string[];
  hydration: string;
  rationale: string;
  cautions: string[];
}

export interface ProgramDay {
  programDay: number;
  state: DayState;
  dateLabel: string;
  minutes: number;
  intensity: Intensity;
  safetyLevel: SafetyLevel;
  outlook: Outlook;
  goodWindows: WindowDisplay[]; // morning + evening slots with time ranges and temps
  feelsLikeC: number | null;
  beyondForecast: boolean;
  completed: boolean | null;
  feltOverall: number | null;
  detail: DayDetail | null; // null for past days (no stored plan)
}

/** One day in the 7-day forecast heat-strip. */
export interface ForecastDay {
  label: string; // "Today" | "Wed" | …
  maxFeelsC: number; // the day's peak feels-like
  outlook: Outlook; // window feasibility (GOOD/TOUGH/SHELTER)
  isToday: boolean;
}

export interface ProgramView {
  persona: Persona;
  currentDay: number;
  totalDays: number;
  adaptationDays: number;
  adaptationPct: number;
  daysLogged: number; // days with a completed log
  heatDoseMinutes: number; // cumulative completed exposure minutes
  fullAdaptLabel: string; // projected "~Jul 9" date full adaptation is reached
  trend7Pct: number; // change in adaptation % over the last 7 days
  forecastStrip: ForecastDay[]; // next 7 days' peak feels-like + outlook
  units: Units;
  currentLabel: string;
  days: ProgramDay[];
}

const PROJECTED_DAILY_GAIN = 1.0;

function programLength(state: AppState): number {
  if (state.persona === "VACATIONER") {
    if (state.tripEndISO) {
      const span =
        Math.ceil(
          (new Date(state.tripEndISO).getTime() - new Date(state.startISO).getTime()) /
            86_400_000,
        ) + 1;
      return Math.max(3, Math.min(14, span));
    }
    return 7;
  }
  return state.persona === "LEARN_TO_SWEAT" ? 21 : 14;
}

function outlookFrom(level: SafetyLevel): Outlook {
  return level === "NORMAL" ? "GOOD" : level === "CAUTION" ? "TOUGH" : "SHELTER";
}

function fmtDateLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtWeekday(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

export async function buildProgramView(state: AppState): Promise<ProgramView> {
  const tighten = tightenFor(state);
  const persona = state.persona;
  const totalDays = programLength(state);
  const currentDay = currentProgramDay(state);
  const origin = originBaseline(state);

  const todayAdaptation = adaptationAfter(state, currentDay);

  const futureSpan = Math.min(16, Math.max(1, totalDays - currentDay));
  const forecast = await fetchMultiDayForecast(
    state.current.lat,
    state.current.lon,
    futureSpan,
    tighten,
  );
  if (forecast.days.length === 0) throw new Error("No forecast days");

  const days: ProgramDay[] = [];
  for (let d = 0; d < totalDays; d++) {
    if (d < currentDay) {
      const h = state.history[d];
      const log = state.logs[d];
      const level = h?.safetyLevel ?? "NORMAL";
      days.push({
        programDay: d,
        state: "PAST",
        dateLabel: `Day ${d + 1}`,
        minutes: h?.targetMinutes ?? 0,
        intensity: h?.intensity ?? "LIGHT",
        safetyLevel: level,
        outlook: outlookFrom(level),
        goodWindows: [],
        feelsLikeC: h?.feelsLikeC ?? null,
        beyondForecast: false,
        completed: log?.completedExposure ?? null,
        feltOverall: log?.overallFeeling ?? null,
        detail: null,
      });
      continue;
    }

    const offset = d - currentDay;
    const beyondForecast = offset >= forecast.days.length;
    const fday = forecast.days[Math.min(offset, forecast.days.length - 1)];
    // For "today", recommend the upcoming window (matches the Today screen); future
    // days use their whole-day best window.
    const dayWindow = offset === 0 ? pickUpcomingWindow(forecast, tighten) : fday.safeWindow;
    const rawGoodWindows = offset === 0 ? findUpcomingGoodWindows(forecast, tighten) : fday.goodWindows;
    const dayGoodWindows = beyondForecast
      ? rawGoodWindows.map((w) => ({ ...w, isEstimate: true }))
      : rawGoodWindows;
    const cond = dayWindow.point.conditions;
    const projectedAdaptation = Math.min(60, todayAdaptation + offset * PROJECTED_DAILY_GAIN);

    const plan = generateDayPlan({
      persona,
      conditions: cond,
      currentHeatIndexForGapC: fday.peak.heatIndexC,
      screening: state.screening,
      originBaselineHeatIndexC: origin,
      priorAdaptationDays: projectedAdaptation,
      safestWindowLabel: dayWindow.label,
    });

    days.push({
      programDay: d,
      state: offset === 0 ? "TODAY" : "FUTURE",
      dateLabel: beyondForecast ? `Day ${d + 1}` : fmtDateLabel(fday.date),
      minutes: plan.exposureMinutesTarget,
      intensity: plan.intensity,
      safetyLevel: plan.safetyLevel,
      outlook: outlookFrom(evaluateEnvironment(cond, tighten).level),
      goodWindows: dayGoodWindows,
      feelsLikeC: fday.peak.heatIndexC, // show the day's real heat, not the cool window
      beyondForecast,
      completed: null,
      feltOverall: null,
      detail: {
        headline: plan.headline,
        steps: plan.steps,
        hydration: plan.hydration,
        rationale: plan.rationale,
        cautions: plan.cautions,
      },
    });
  }

  const rampDays = personaRampDays(persona);
  const adaptationPct = Math.round(Math.min(1, todayAdaptation / rampDays) * 100);

  // Ring stats, all from real state / forecast.
  const daysLogged = Object.values(state.logs).filter((l) => l?.completedExposure).length;
  let heatDoseMinutes = 0;
  for (let d = 0; d < currentDay; d++) {
    if (state.logs[d]?.completedExposure) heatDoseMinutes += state.history[d]?.targetMinutes ?? 0;
  }
  const remainingAdaptDays = Math.max(0, rampDays - todayAdaptation);
  let fullAdaptLabel = "reached";
  if (remainingAdaptDays > 0) {
    const dt = new Date();
    dt.setDate(dt.getDate() + Math.ceil(remainingAdaptDays / PROJECTED_DAILY_GAIN));
    fullAdaptLabel = "~" + dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  const prior7 = adaptationAfter(state, Math.max(0, currentDay - 7));
  const trend7Pct = adaptationPct - Math.round(Math.min(1, prior7 / rampDays) * 100);

  const forecastStrip: ForecastDay[] = forecast.days.slice(0, 7).map((fday, i) => ({
    label: i === 0 ? "Today" : fmtWeekday(fday.date),
    maxFeelsC: fday.peak.heatIndexC,
    outlook: outlookFrom(evaluateEnvironment(fday.safeWindow.point.conditions, tighten).level),
    isToday: i === 0,
  }));

  return {
    persona,
    currentDay,
    totalDays,
    adaptationDays: todayAdaptation,
    adaptationPct,
    daysLogged,
    heatDoseMinutes,
    fullAdaptLabel,
    trend7Pct,
    forecastStrip,
    units: state.units,
    currentLabel: state.current.label,
    days,
  };
}
