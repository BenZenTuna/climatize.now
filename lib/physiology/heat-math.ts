// Heat-strain math. Pure functions, °C in / °C out. Humidity always blocks
// evaporative cooling, so these — not dry air temperature — drive all the logic.

import type { HeatConditions } from "./types";

export function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}
export function fToC(f: number): number {
  return ((f - 32) * 5) / 9;
}

function clampRh(rh: number): number {
  return Math.max(1, Math.min(100, rh));
}
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * NWS heat index ("feels-like") via the Rothfusz regression, with the standard
 * low-range Steadman fallback and the dry/humid adjustments.
 * Source: US NWS Weather Prediction Center. Inputs °C + %RH; output °C.
 */
export function heatIndexC(tempC: number, rhPct: number): number {
  const T = cToF(tempC);
  const RH = clampRh(rhPct);

  // Simple Steadman formula; if its average with T is warm enough, refine.
  let hiF = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + RH * 0.094);

  if ((hiF + T) / 2 >= 80) {
    hiF =
      -42.379 +
      2.04901523 * T +
      10.14333127 * RH -
      0.22475541 * T * RH -
      0.00683783 * T * T -
      0.05481717 * RH * RH +
      0.00122874 * T * T * RH +
      0.00085282 * T * RH * RH -
      0.00000199 * T * T * RH * RH;

    if (RH < 13 && T >= 80 && T <= 112) {
      hiF -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    } else if (RH > 85 && T >= 80 && T <= 87) {
      hiF += ((RH - 85) / 10) * ((87 - T) / 5);
    }
  }
  return fToC(hiF);
}

/**
 * Wet-bulb temperature via Stull's (2011) approximation, valid for RH 5–99% and
 * T −20…50°C at sea-level pressure. Inputs °C + %RH; output °C.
 * Source: Stull R., "Wet-Bulb Temperature from RH and Air Temperature", JAMC 2011.
 */
export function wetBulbC(tempC: number, rhPct: number): number {
  const T = tempC;
  const RH = clampRh(rhPct);
  return (
    T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
    Math.atan(T + RH) -
    Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
    4.686035
  );
}

/**
 * Simplified WBGT estimate (°C).
 *   Shade / no solar load:  WBGT ≈ 0.7·Tw + 0.3·Ta
 * `solarLoad` (0..1) adds a conservative outdoor-sun offset of up to ~3°C, since
 * a true WBGT needs a black-globe sensor we don't have.
 */
export function wbgtC(tempC: number, rhPct: number, solarLoad = 0): number {
  const tw = wetBulbC(tempC, rhPct);
  const shade = 0.7 * tw + 0.3 * tempC;
  return shade + 3 * clamp01(solarLoad);
}

/**
 * Bridge raw weather → the derived HeatConditions the engine consumes.
 * `apparentTempC` defaults to the computed heat index if the source doesn't
 * provide its own feels-like value.
 */
export function deriveConditions(input: {
  tempC: number;
  humidityPct: number;
  apparentTempC?: number;
  solarLoad?: number;
}): HeatConditions {
  const heatIndex = heatIndexC(input.tempC, input.humidityPct);
  return {
    tempC: input.tempC,
    humidityPct: input.humidityPct,
    apparentTempC: input.apparentTempC ?? heatIndex,
    heatIndexC: heatIndex,
    wetBulbC: wetBulbC(input.tempC, input.humidityPct),
    wbgtC: wbgtC(input.tempC, input.humidityPct, input.solarLoad ?? 0),
  };
}
