import type { Units } from "./physiology/types";

/** Format a Celsius value for display in the user's chosen units. */
export function fmtTemp(celsius: number, units: Units, digits = 0): string {
  const v = units === "F" ? (celsius * 9) / 5 + 32 : celsius;
  return `${v.toFixed(digits)}°${units}`;
}

export const PERSONA_LABEL: Record<string, string> = {
  ACCLIMATIZER: "Acclimatizing to a hotter place",
  LEARN_TO_SWEAT: "Restoring my sweat response",
  VACATIONER: "Salvaging a hot trip",
};

/** A text-color class for a heat-index value, so "feels like" reads its danger at a glance. */
export function heatTextColor(celsius: number): string {
  if (celsius >= 39) return "text-red-600";
  if (celsius >= 32) return "text-orange-600";
  if (celsius >= 27) return "text-amber-600";
  return "text-emerald-600";
}
