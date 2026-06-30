"use client";

import { useState } from "react";
import { Clock } from "@/app/icons";
import { fmtTemp } from "@/lib/units";
import type { HeatHour } from "@/lib/client-program";
import type { SafetyLevel, Units } from "@/lib/physiology/types";

const BAR: Record<SafetyLevel, string> = {
  NORMAL: "bg-emerald-400",
  CAUTION: "bg-amber-400",
  HARD_STOP: "bg-red-500",
};
const WORD: Record<SafetyLevel, string> = {
  NORMAL: "Good to move",
  CAUTION: "Caution — keep it easy",
  HARD_STOP: "Too hot — shelter",
};
const TEXT: Record<SafetyLevel, string> = {
  NORMAL: "text-emerald-600",
  CAUTION: "text-amber-600",
  HARD_STOP: "text-red-600",
};

function hourLabel(h: number): string {
  const period = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
}

/**
 * The "heat clock": today's hour-by-hour feels-like curve. Bar height = how hot it
 * feels, colour = how safe that hour is, and the recommended cool window is
 * outlined. Tap any hour for its detail (defaults to "now"), so the timing of the
 * plan — exercise in the cool window, not the midday peak — is visible at a glance.
 */
export function HeatClock({ timeline, units }: { timeline: HeatHour[]; units: Units }) {
  const defaultHour =
    timeline.find((t) => t.isNow)?.hour ??
    timeline.find((t) => !t.isPast)?.hour ??
    timeline[0]?.hour ??
    12;
  const [selHour, setSelHour] = useState(defaultHour);

  if (timeline.length === 0) return null;

  const his = timeline.map((t) => t.heatIndexC);
  const min = Math.min(...his);
  const span = Math.max(1, Math.max(...his) - min);
  const heightPct = (hi: number) => 30 + ((hi - min) / span) * 70;

  const sel = timeline.find((t) => t.hour === selHour) ?? timeline[0];

  return (
    <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Clock className="h-4 w-4 text-orange-500" /> Today&apos;s heat, hour by hour
      </h3>

      {/* selected-hour detail — defaults to "now", updates on tap */}
      <p className="mt-1 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">
          {sel.isNow ? "Now" : hourLabel(sel.hour)}
        </span>
        {" · feels "}
        <span className="font-semibold">{fmtTemp(sel.heatIndexC, units)}</span>
        {" · "}
        <span className={TEXT[sel.level]}>{WORD[sel.level]}</span>
        {sel.inWindow && <span className="font-medium text-orange-600"> · your window</span>}
      </p>

      {/* bars */}
      <div className="mt-3 flex h-24 items-end gap-[3px]">
        {timeline.map((t) => (
          <button
            key={t.hour}
            type="button"
            onClick={() => setSelHour(t.hour)}
            aria-label={`${hourLabel(t.hour)}, feels ${fmtTemp(t.heatIndexC, units)}, ${WORD[t.level]}`}
            aria-pressed={t.hour === selHour}
            className="flex h-full flex-1 flex-col justify-end"
          >
            <span
              className={`w-full rounded-t transition-all ${BAR[t.level]} ${
                t.isPast ? "opacity-40" : ""
              } ${t.inWindow ? "ring-2 ring-orange-400" : ""} ${
                t.hour === selHour ? "outline outline-2 outline-slate-700" : ""
              }`}
              style={{ height: `${heightPct(t.heatIndexC)}%` }}
            />
          </button>
        ))}
      </div>

      {/* hour ticks (6am / 12pm / 6pm, plus a "now" marker) */}
      <div className="mt-1 flex gap-[3px]">
        {timeline.map((t) => (
          <span key={t.hour} className="flex-1 text-center text-[9px] leading-none text-slate-400">
            {t.isNow ? "now" : [6, 12, 18].includes(t.hour) ? hourLabel(t.hour) : ""}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Bar height is how hot it feels; colour is how safe it is. The{" "}
        <span className="font-medium text-orange-600">outlined</span> hours are your cooler window to
        be active — not the midday peak.
      </p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
        <Legend cls="bg-emerald-400" label="Good to move" />
        <Legend cls="bg-amber-400" label="Caution" />
        <Legend cls="bg-red-500" label="Too hot" />
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm ring-2 ring-orange-400" /> your window
        </span>
      </div>
    </section>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-sm ${cls}`} />
      {label}
    </span>
  );
}
