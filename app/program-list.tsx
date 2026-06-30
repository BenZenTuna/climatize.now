"use client";

import { useState } from "react";
import { fmtTemp, heatTextColor } from "@/lib/units";
import { ChevronDown, Droplet, Sparkle } from "@/app/icons";
import type { ProgramView, ProgramDay } from "@/lib/client-program";
import type { Intensity, Units } from "@/lib/physiology/types";

const OUTLOOK: Record<string, { label: string; cls: string; dot: string }> = {
  GOOD: { label: "Good window", cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  TOUGH: { label: "Go gentle", cls: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  SHELTER: { label: "Shelter day", cls: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

function extractTime(windowLabel: string | null): string | null {
  if (!windowLabel) return null;
  const m = windowLabel.match(/around (\d+(?:am|pm))/i);
  return m ? `~${m[1]}` : null;
}

const FELT = ["", "😣", "🙁", "😐", "🙂", "😄"];

function intensityWord(i: Intensity): string {
  return i === "REST" ? "passive" : i === "MODERATE" ? "light–moderate" : "light";
}

/** "Your program": adaptation meter + the rest of the days (today is shown in full above). */
export function ProgramSection({ view }: { view: ProgramView }) {
  const days = view.days.filter((d) => d.state !== "TODAY");
  if (days.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-900">Your program</h2>

      <div className="mt-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Sparkle className="h-4 w-4 text-orange-500" /> Adaptation
          </span>
          <span className="text-sm font-medium text-slate-500">
            Day {view.currentDay + 1} of {view.totalDays}
          </span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-orange-50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
            style={{ width: `${Math.max(4, view.adaptationPct)}%` }}
          />
        </div>
        <div className="mt-1.5 text-xs text-slate-500">
          <strong className="text-slate-700">{view.adaptationPct}%</strong> of the way to full
          adaptation — this slips if you skip days.
        </div>
      </div>

      <p className="mt-3 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
        These are <strong>projected</strong> — future days are estimates that change with your
        progress, the live weather, and how you feel.
      </p>

      <p className="mt-3 text-xs text-slate-400">Tap any day to see its full plan.</p>
      <ol className="mt-2 space-y-2">
        {days.map((d) => (
          <DayRow key={d.programDay} d={d} units={view.units} />
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        {Object.values(OUTLOOK).map((o) => (
          <span key={o.label} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${o.dot}`} />
            {o.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function DayRow({ d, units }: { d: ProgramDay; units: Units }) {
  const [open, setOpen] = useState(false);
  const o = OUTLOOK[d.outlook];
  const border = d.state === "PAST" ? "border-slate-100 bg-white/60" : "border-slate-100 bg-white";

  const summary =
    d.state === "PAST"
      ? d.completed
        ? `Did ${d.minutes} min`
        : "Skipped"
      : d.minutes > 0
        ? `${d.minutes} min · ${intensityWord(d.intensity)}`
        : "Rest / shelter";

  return (
    <li className={`rounded-2xl border shadow-sm ${border}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{d.dateLabel}</span>
            {d.state === "FUTURE" && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                projected
              </span>
            )}
            {d.beyondForecast && <span className="text-xs text-slate-400">· typical</span>}
          </div>
          <div className="mt-0.5 text-sm text-slate-600">
            {summary}
            {d.windowLabels.length > 0 && d.minutes > 0 && (
              <span className="text-slate-400"> · {d.windowLabels.join(" & ")}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {d.state === "PAST" && d.feltOverall ? (
            <span className="text-lg" title="how you felt">
              {FELT[d.feltOverall]}
            </span>
          ) : null}
          {d.feelsLikeC != null && (
            <span className={`text-xs font-semibold ${heatTextColor(d.feelsLikeC)}`}>
              {fmtTemp(d.feelsLikeC, units)}
            </span>
          )}
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${o.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} />
            {d.outlook === "GOOD" && d.windowLabels.length > 0
              ? `Good window · ${d.windowLabels.map(extractTime).filter(Boolean).join(" & ")}`
              : o.label}
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-3">
          {d.detail ? (
            <div className="flex flex-col gap-3">
              {d.state === "FUTURE" && (
                <p className="text-xs text-slate-400">
                  Preliminary — this day will change with your progress and the live weather.
                </p>
              )}
              <ol className="space-y-1.5">
                {d.detail.steps.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <div className="flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
                <Droplet className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                <span>
                  <strong>Hydration:</strong> {d.detail.hydration}
                </span>
              </div>
              {d.detail.cautions.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                  {d.detail.cautions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-slate-500">{d.detail.rationale}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Target was {d.minutes} min · {intensityWord(d.intensity)}.{" "}
              {d.completed === false ? "You skipped this day." : d.completed ? "You completed it." : ""}
              {d.feltOverall ? ` Felt ${FELT[d.feltOverall]}.` : ""}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
