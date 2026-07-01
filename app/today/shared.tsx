// Shared tokens + small presentational helpers for the Today page, used by BOTH the
// mobile layout (app/today/page.tsx) and the desktop layout (app/today/desktop.tsx),
// so the safety palette and plan chrome stay identical across breakpoints.

import type { SafetyLevel, Units } from "@/lib/physiology/types";
import type { OvernightGuidance, OvernightLevel } from "@/lib/physiology/overnight";
import { DC_CARD, DC_MONO_HEAD } from "@/app/dc-styles";
import { Moon, Droplet } from "@/app/icons";
import { fmtTemp } from "@/lib/units";

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

/** Overnight-recovery palette, keyed to how well the night cools (humidity included). */
const NIGHT: Record<OvernightLevel, { accent: string; chipBg: string; chipInk: string; label: string }> = {
  COOL: { accent: "#0891b2", chipBg: "#cffafe", chipInk: "#155e75", label: "Cools off" },
  WARM: { accent: "#d97706", chipBg: "#fef3c7", chipInk: "#92400e", label: "Warm night" },
  MUGGY: { accent: "#ea580c", chipBg: "#ffedd5", chipInk: "#9a3412", label: "Warm & humid" },
  DANGEROUS: { accent: "#dc2626", chipBg: "#fee2e2", chipInk: "#991b1b", label: "Barely cools" },
};

/**
 * "Tonight's recovery" card — the coming night's cool-down outlook. Humidity is
 * surfaced with its own badge when it's the reason the night stays warm, since a
 * muggy night is the one that quietly wrecks recovery. Shared by both layouts.
 */
export function OvernightCard({
  overnight,
  lowFeelsLikeC,
  units,
}: {
  overnight: OvernightGuidance;
  lowFeelsLikeC: number | null;
  units: Units;
}) {
  const c = NIGHT[overnight.level];
  return (
    <section className={DC_CARD}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5">
          <Moon className="h-3.5 w-3.5 text-[#6366f1]" />
          <span className={DC_MONO_HEAD}>Tonight&apos;s recovery</span>
        </span>
        {lowFeelsLikeC != null && (
          <span className="text-[13px] font-bold" style={{ color: c.accent }}>
            dips to ~{fmtTemp(lowFeelsLikeC, units)}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{ background: c.chipBg, color: c.chipInk }}
        >
          {c.label}
        </span>
        {overnight.humidDriven && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e0f2fe] px-2 py-0.5 text-[11px] font-semibold text-[#075985]">
            <Droplet className="h-3 w-3" /> Humidity
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] font-medium text-[#44403c]">{overnight.title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[#57534e]">{overnight.advice}</p>
      <p className="mt-2.5 text-[12px] italic text-[#a8a29e]">{overnight.note}</p>
    </section>
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
