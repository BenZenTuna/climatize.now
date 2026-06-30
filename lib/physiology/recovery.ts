// Rest-of-day recovery guidance. After the day's heat DOSE (the timed session), the
// rest of the day is for RECOVERY, not for piling on more heat strain. This both
// supports adaptation (recovery, sleep and plasma-volume restoration happen between
// sessions) and prevents heat illness during the hottest hours.
//
// The right advice is climate-aware in two ways: it differs a lot WITH vs. WITHOUT
// air conditioning, and the "without AC" advice depends on how hot the AIR is — once
// the air is hotter than skin (~35°C / 95°F) a fan stops cooling and can worsen
// strain unless the skin is wetted (see FAN_INEFFECTIVE_AIR_TEMP_C). Pure functions.

import { HEAT_INDEX_BANDS_C, FAN_INEFFECTIVE_AIR_TEMP_C } from "./constants";

export type RestOfDayLevel = "MILD" | "WARM" | "HOT" | "EXTREME";

export interface RestOfDayInput {
  /** Peak "feels-like" (heat index, °C) over the hours remaining today. */
  peakHeatIndexC: number;
  /** Peak AIR temperature (°C) over the hours remaining today — drives the fan caveat. */
  peakAirTempC: number;
  /** Label of the last remaining hour that's still ≥ caution-warm (e.g. "around 7pm"), or null. */
  hotUntil: string | null;
}

export interface RestOfDayGuidance {
  level: RestOfDayLevel;
  title: string;
  withAC: string;
  withoutAC: string;
  recoveryNote: string;
}

function levelFor(peakHeatIndexC: number): RestOfDayLevel {
  if (peakHeatIndexC >= HEAT_INDEX_BANDS_C.DANGER) return "EXTREME";
  if (peakHeatIndexC >= HEAT_INDEX_BANDS_C.EXTREME_CAUTION) return "HOT";
  if (peakHeatIndexC >= HEAT_INDEX_BANDS_C.CAUTION) return "WARM";
  return "MILD";
}

/**
 * Plain-language guidance for spending the rest of the day, given how hot it will
 * stay and whether the user has air conditioning. The training stimulus is already
 * done, so cooling down is always framed as good recovery, never a setback.
 */
export function restOfDayGuidance(input: RestOfDayInput): RestOfDayGuidance {
  const level = levelFor(input.peakHeatIndexC);
  const fanStillHelps = input.peakAirTempC < FAN_INEFFECTIVE_AIR_TEMP_C;
  const until = input.hotUntil;

  if (level === "EXTREME") {
    return {
      level,
      title: until
        ? `Dangerous heat lingers until ${until}`
        : "Dangerous heat for the rest of the day",
      withAC:
        "Stay in air conditioning through the hottest hours. If home doesn't cool down, spend a few hours somewhere that does — a mall, library, supermarket, or a friend's place.",
      withoutAC:
        "A fan alone won't cool you in air this hot and can speed dehydration — so wet your skin and clothes (or take cool showers) so moving air still cools you, lay damp cloths on your neck and wrists, close blinds on the sunny side, and rest in the coolest room. Sip water steadily and add a little salt with food.",
      recoveryNote:
        "You've already had today's heat dose — cooling down now helps you recover and sleep, and it won't undo your progress.",
    };
  }

  if (level === "HOT") {
    return {
      level,
      title: until ? `Stays hot until ${until}` : "Hot for the rest of the day",
      withAC:
        "Keep to air conditioning or a cool indoor space during the peak hours. Gentle comfort cooling is fine — you don't need to tough it out.",
      withoutAC: fanStillHelps
        ? "Keep air moving with a fan or cross-breeze, stay in the shadiest room, close sun-facing blinds, and cool your skin with water now and then. Drink regularly."
        : "Cool your skin with water so a fan or breeze can still help you, keep to the shadiest room, close sun-facing blinds, and drink regularly.",
      recoveryNote:
        "Today's session was the training dose; resting somewhere cooler now is good recovery, not a step back.",
    };
  }

  if (level === "WARM") {
    return {
      level,
      title: "Comfortably warm the rest of the day",
      withAC:
        "No need to hide from it — a cool space is pleasant but not necessary. Keep sipping water.",
      withoutAC:
        "Shade, a breeze, and regular water are plenty. Ease off any hard effort during the warmest part.",
      recoveryNote:
        "Gentle warmth the rest of the day is fine — just avoid stacking on more hard heat exposure.",
    };
  }

  return {
    level,
    title: "Cool enough for the rest of the day",
    withAC: "Nothing special needed — go about your day.",
    withoutAC: "Nothing special needed — go about your day, keeping water handy.",
    recoveryNote: "Let your body recover normally before tomorrow's session.",
  };
}
