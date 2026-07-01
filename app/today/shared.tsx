// Shared tokens + small presentational helpers for the Today page, used by BOTH the
// mobile layout (app/today/page.tsx) and the desktop layout (app/today/desktop.tsx),
// so the safety palette and plan chrome stay identical across breakpoints.

import type { SafetyLevel, Units } from "@/lib/physiology/types";

/** Safety verdict palette (Today Dashboard design) + the app's reviewed copy. */
export const SAFE: Record<
  SafetyLevel,
  { bg: string; border: string; accent: string; chipBg: string; chipInk: string; label: string; sub: string }
> = {
  NORMAL: {
    bg: "#ecfdf5", border: "#bbf7d0", accent: "#059669", chipBg: "#d1fae5", chipInk: "#047857",
    label: "Good to go — gently",
    sub: "The window you'll exercise in is in the safe range. Keep it light and stop if you feel unwell.",
  },
  CAUTION: {
    bg: "#fffbeb", border: "#fde68a", accent: "#b45309", chipBg: "#fef3c7", chipInk: "#92400e",
    label: "Caution — keep it easy",
    sub: "Conditions are on the warm side, so today's plan is capped and timed for the cool hours.",
  },
  HARD_STOP: {
    bg: "#fef2f2", border: "#fecaca", accent: "#b91c1c", chipBg: "#fee2e2", chipInk: "#991b1b",
    label: "Stop — too dangerous for heat today",
    sub: "Even the coolest hours read above the danger line. Shelter and cool only — no exposure today.",
  },
};

export const INTENSITY_LABEL: Record<string, string> = { REST: "passive", LIGHT: "light", MODERATE: "light–moderate" };

export const ADJUST: Record<string, { text: string; bg: string; ink: string }> = {
  ADVANCED: { text: "Advanced ↑", bg: "#d1fae5", ink: "#047857" },
  HELD: { text: "Held →", bg: "#f5f5f4", ink: "#57534e" },
  REDUCED: { text: "Reduced ↓", bg: "#fef3c7", ink: "#92400e" },
  ABORTED: { text: "Rest day ⏸", bg: "#fee2e2", ink: "#991b1b" },
};

export function windLabel(kmh: number, units: Units): string {
  return units === "F" ? `${Math.round(kmh * 0.621)} mph` : `${Math.round(kmh)} km/h`;
}

export function PlanPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fde6cf] bg-[#fff7ed] px-[11px] py-1.5 text-[13px] font-semibold text-[#9a3412]">
      <span className="text-[#f97316]">{icon}</span>
      {children}
    </span>
  );
}

export function RecognitionList({ title, items, head }: { title: string; items: string[]; head: string }) {
  return (
    <div>
      <div className="text-[13px] font-bold" style={{ color: head }}>{title}</div>
      <ul className="mt-1.5 list-disc pl-4 text-[12.5px] leading-[1.55] text-[#57534e]">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
