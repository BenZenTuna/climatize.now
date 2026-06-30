"use client";

// Client-side state. Everything the user enters — goal, locations, HEALTH answers,
// and daily logs — lives only in their browser (localStorage). Nothing is sent to
// or stored on a server. No accounts, no tracking. This is the privacy backbone of
// the public app.

import { useCallback, useEffect, useState } from "react";
import type {
  Persona,
  Units,
  Intensity,
  SafetyLevel,
  ScreeningFlags,
  DailyFeedback,
} from "./physiology/types";

const KEY = "climatize.state.v1";
// Older brand key(s). loadState() migrates these into KEY once, so the rebrand never
// wipes anyone's local data (the whole app lives in localStorage — see decisions D21).
const LEGACY_KEYS = ["baseheat.state.v1"];

export interface StoredLog extends DailyFeedback {
  notes: string | null;
}

/** What we captured for a day we showed a plan — used for history + the day-to-day adjustment. */
export interface DayHistory {
  targetMinutes: number;
  intensity: Intensity;
  safetyLevel: SafetyLevel;
  feelsLikeC: number;
}

export interface AppState {
  version: 1;
  persona: Persona;
  units: Units;
  origin: {
    label: string;
    lat: number | null;
    lon: number | null;
    band: string | null;
    baselineHeatIndexC: number | null;
  };
  current: { label: string; lat: number; lon: number };
  screening: ScreeningFlags;
  tripEndISO: string | null;
  startISO: string;
  /** Test-only fast-forward added to the real calendar day (0 in normal use). */
  dayOffset: number;
  logs: Record<number, StoredLog>;
  history: Record<number, DayHistory>;
}

export const EMPTY_SCREENING: ScreeningFlags = {
  ageBand: "18_64",
  heartCondition: false,
  kidneyCondition: false,
  pregnant: false,
  takingDiuretics: false,
  takingBetaBlockers: false,
  takingAnticholinergics: false,
  otherHeatCondition: false,
};

export function loadState(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = window.localStorage.getItem(KEY);
    if (!raw) {
      // One-time migration from a previous brand's key, so existing users keep their data.
      for (const legacy of LEGACY_KEYS) {
        const old = window.localStorage.getItem(legacy);
        if (old) {
          window.localStorage.setItem(KEY, old);
          window.localStorage.removeItem(legacy);
          raw = old;
          break;
        }
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed?.version !== 1 || !parsed.persona || !parsed.current) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  for (const legacy of LEGACY_KEYS) window.localStorage.removeItem(legacy);
}

/**
 * React hook over the stored state. `ready` flips true once we've read
 * localStorage on the client (render a neutral shell until then to avoid
 * hydration mismatch, since the server has no localStorage).
 */
export function useAppState() {
  const [state, setState] = useState<AppState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  const update = useCallback((next: AppState) => {
    saveState(next);
    setState(next);
  }, []);

  const reset = useCallback(() => {
    clearState();
    setState(null);
  }, []);

  return { state, ready, update, reset };
}
