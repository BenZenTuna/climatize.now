// Overnight recovery outlook. Heat acclimatization is driven by the daytime heat
// DOSE, but the body has to shed that heat again overnight — and both adaptation and
// heat-illness recovery depend on actually cooling down and sleeping. HUMIDITY is the
// villain here: a high dew point keeps nights warm and sticky, so the temperature
// never really drops, sweat can't evaporate, sleep suffers, and heat strain
// accumulates across days (a leading driver of heat-wave harm). This pure function
// turns tonight's coolest-hour conditions into a plain-language recovery outlook.
//
// It deliberately does NOT change today's dose: poor overnight recovery shows up the
// next morning as low sleep-quality / feeling in the daily check-in, which the tested
// feedback loop already turns into a REDUCE/HOLD. So this layer's job is foresight —
// tell the user tonight won't cool off and to prioritise a cool sleeping space.

import { HEAT_INDEX_BANDS_C, OVERNIGHT_C } from "./constants";

export type OvernightLevel = "COOL" | "WARM" | "MUGGY" | "DANGEROUS";

export interface OvernightInput {
  /** The lowest "feels-like" (heat index, °C) the coming night reaches. */
  minHeatIndexC: number;
  /** The AIR temperature (°C) at that coolest moment — how far it actually drops. */
  minAirTempC: number;
  /** Wet-bulb (°C) at that coolest moment — how muggy it stays even at its best. */
  coolestWetBulbC: number;
  /** Label of roughly when the coolest point falls (e.g. "around 5am"), or null. */
  coolestAround: string | null;
}

export interface OvernightGuidance {
  level: OvernightLevel;
  title: string;
  advice: string;
  note: string;
  /** True when humidity (not just heat) is why the night won't cool — for UI emphasis. */
  humidDriven: boolean;
}

function levelFor(input: OvernightInput): { level: OvernightLevel; muggy: boolean } {
  const muggy = input.coolestWetBulbC >= OVERNIGHT_C.MUGGY_WET_BULB;

  if (input.minHeatIndexC >= HEAT_INDEX_BANDS_C.EXTREME_CAUTION) {
    return { level: "DANGEROUS", muggy };
  }
  // A warm night that ALSO stays muggy is the poor-recovery case, even when the
  // feels-like sits just under the caution band — humidity is what steals the relief.
  if (
    input.minHeatIndexC >= HEAT_INDEX_BANDS_C.CAUTION ||
    (input.minHeatIndexC >= OVERNIGHT_C.WARM_HEAT_INDEX && muggy)
  ) {
    return { level: "MUGGY", muggy };
  }
  if (input.minHeatIndexC >= OVERNIGHT_C.WARM_HEAT_INDEX) {
    return { level: "WARM", muggy };
  }
  return { level: "COOL", muggy };
}

/**
 * Plain-language overnight-recovery outlook for the coming night. Emphasises humidity
 * whenever it's the reason the night won't cool off, and always frames good overnight
 * cooling as part of adapting well (not lost training).
 */
export function overnightRecoveryGuidance(input: OvernightInput): OvernightGuidance {
  const { level, muggy } = levelFor(input);
  const when = input.coolestAround;

  if (level === "DANGEROUS") {
    return {
      level,
      humidDriven: muggy,
      title: muggy
        ? "Dangerously warm, humid night — it barely cools"
        : "Dangerously warm night — it barely cools",
      advice:
        "Sleep in the coolest space you can — air conditioning if you have it, or the coolest room with air moving over damp skin. Take a cool shower before bed, use light bedding, and keep water by the bed. If nowhere at home cools down in a prolonged heatwave, a night somewhere air-conditioned is a real safety measure, not a luxury.",
      note: "Your body needs the night to shed today's heat. If you sleep badly in this heat, tomorrow's session will automatically ease back when you log how you feel.",
    };
  }

  if (level === "MUGGY") {
    return {
      level,
      humidDriven: muggy,
      title: muggy
        ? "Warm, humid night — it won't cool off much"
        : "Warm night — limited overnight cooling",
      advice: muggy
        ? "The humidity keeps it sticky, so sweat can't do its job at rest — sleep somewhere cooler or air-conditioned if you can, take a cool shower before bed, keep air moving over lightly-damp skin, use minimal bedding, and keep water within reach."
        : "It stays warm overnight, so favour a cool, well-ventilated room, a cool shower before bed, light bedding, and water within reach.",
      note: "Poor overnight cooling is what makes the next hot day harder. Rest is part of adapting — and if you sleep poorly, the morning check-in will ease tomorrow's plan for you.",
    };
  }

  if (level === "WARM") {
    return {
      level,
      humidDriven: false,
      title: when ? `Mild night — coolest ${when}` : "Mild, warm night",
      advice:
        "It should cool down enough to sleep. A fan or an open window once the air outside drops below indoor temperature helps; keep water handy.",
      note: "Normal overnight recovery expected — let your body cool and rest before tomorrow's session.",
    };
  }

  return {
    level,
    humidDriven: false,
    title: "Cools off nicely tonight",
    advice: "Good sleeping conditions — nothing special needed. Let yourself cool down naturally.",
    note: "A cool night means good recovery before tomorrow — exactly what you want between sessions.",
  };
}
