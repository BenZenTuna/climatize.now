// Shared types for the physiology core. Pure data — no I/O.

export type Persona = "ACCLIMATIZER" | "LEARN_TO_SWEAT" | "VACATIONER";
export type AgeBand = "UNDER_18" | "18_64" | "65_PLUS";
export type Units = "C" | "F";

export type SafetyLevel = "NORMAL" | "CAUTION" | "HARD_STOP";
export type Intensity = "REST" | "LIGHT" | "MODERATE";
export type RiskTier = "NONE" | "ELEVATED" | "HIGH";

export type FeedbackSignal = "ADVANCE" | "HOLD" | "REDUCE" | "ABORT";
export type Adjustment = "ADVANCED" | "HELD" | "REDUCED" | "ABORTED";

/** Derived heat-strain metrics for a moment/place. All temperatures in °C. */
export interface HeatConditions {
  tempC: number;
  humidityPct: number;
  apparentTempC: number;
  heatIndexC: number;
  wetBulbC: number;
  wbgtC: number;
}

/** Onboarding health-screening answers that drive the safety overlay. */
export interface ScreeningFlags {
  ageBand: AgeBand;
  heartCondition: boolean;
  kidneyCondition: boolean;
  pregnant: boolean;
  takingDiuretics: boolean;
  takingBetaBlockers: boolean;
  takingAnticholinergics: boolean;
  otherHeatCondition: boolean;
}

export interface SafetyAssessment {
  level: SafetyLevel;
  riskTier: RiskTier;
  reasons: string[];
  environmentalReasons: string[];
  screeningReasons: string[];
}

/** One day's self-reported feedback. */
export interface DailyFeedback {
  completedExposure: boolean;
  sweatResponse: number; // 1 (barely) – 5 (quick & free)
  perceivedExertion: number; // 1 (very easy) – 5 (very hard)
  sleepQuality: number; // 1 (poor) – 5 (great)
  thirst: number; // 1 (none) – 5 (severe)
  overallFeeling: number; // 1 (bad) – 5 (great)
  headache: boolean;
  dizziness: boolean;
  nausea: boolean;
  redFlag: boolean;
}

export interface FeedbackScore {
  signal: FeedbackSignal;
  adaptationDelta: number;
  notes: string[];
}

export interface RecognitionGuidance {
  heatExhaustion: string[];
  heatStroke: string[];
  stopNow: string[];
}

/** The full output of the plan engine for a single day. */
export interface DayPlanResult {
  safetyLevel: SafetyLevel;
  riskTier: RiskTier;
  exposureMinutesTarget: number;
  intensity: Intensity;
  timeWindow: string;
  headline: string;
  steps: string[];
  hydration: string;
  cautions: string[];
  recognition: RecognitionGuidance;
  rationale: string;
  adjustmentFromYesterday: Adjustment | null;
  disclaimer: string;
  gapC: number;
  adaptationDays: number;
}
