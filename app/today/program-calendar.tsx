"use client";

import { DC_CARD, DC_MONO_HEAD } from "@/app/dc-styles";
import { heatColor } from "@/app/forecast-strip";
import { fmtTemp } from "@/lib/units";
import type { ProgramDay, ProgramView } from "@/lib/client-program";
import type { Units } from "@/lib/physiology/types";

// Desktop program view: the whole program as a compact 7-across calendar of day cards
// (Today Dashboard - Desktop design). Same real ProgramDay data the mobile expandable
// list uses — today is highlighted, future days are dashed/projected, skipped days dim.

const DOT: Record<string, string> = { GOOD: "#059669", TOUGH: "#d97706", SHELTER: "#dc2626" };

function shortDate(startISO: string, programDay: number): string {
  const d = new Date(startISO);
  d.setDate(d.getDate() + programDay);
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${d.getDate()}`;
}

function DayCard({ d, startISO, units }: { d: ProgramDay; startISO: string; units: Units }) {
  const isToday = d.state === "TODAY";
  const isFuture = d.state === "FUTURE";
  const skipped = d.state === "PAST" && d.completed === false;
  const statusWord = isFuture ? "projected" : isToday ? "today" : skipped ? "skipped" : "done";
  const c = d.feelsLikeC != null ? heatColor(d.feelsLikeC) : "#a8a29e";

  return (
    <div
      className="flex flex-col gap-1.5 rounded-[13px] p-[11px]"
      style={{
        border: isToday ? "2px solid #f97316" : `1px ${isFuture ? "dashed #ece0d0" : "solid #f0e7db"}`,
        background: isToday ? "#fff7ed" : "#fffdfa",
        opacity: skipped ? 0.72 : 1,
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-bold" style={{ color: isToday ? "#ea580c" : "#1c1917" }}>
          Day {d.programDay + 1}
        </span>
        <span className="font-mono text-[9.5px] text-[#a8a29e]">{shortDate(startISO, d.programDay)}</span>
      </div>
      <div className="text-[15px] font-bold text-[#44403c]">{d.minutes > 0 ? `${d.minutes} min` : "Rest"}</div>
      <div className="flex items-center gap-1.5">
        <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: DOT[d.outlook] }} />
        <span className="font-mono text-[9.5px] text-[#78716c]">{statusWord}</span>
      </div>
      <div className="mt-px flex min-h-[10px] items-center justify-between">
        <span className="font-mono text-[11px] font-bold" style={{ color: c }}>
          {d.feelsLikeC != null ? fmtTemp(d.feelsLikeC, units) : "—"}
        </span>
        {d.feltOverall ? (
          <span className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="h-[5px] w-[5px] rounded-full"
                style={{ background: i <= d.feltOverall! ? "#f59e0b" : "#eaddcb" }}
              />
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ProgramCalendar({ view, startISO, units }: { view: ProgramView; startISO: string; units: Units }) {
  return (
    <section className={DC_CARD}>
      <div className="flex items-baseline justify-between">
        <span className={DC_MONO_HEAD}>Your {view.totalDays}-day program</span>
        <span className="text-[11px] text-[#a8a29e]">
          Future days are projected — they shift with your progress &amp; the live weather.
        </span>
      </div>
      <div className="mt-3.5 grid grid-cols-7 gap-2.5">
        {view.days.map((d) => (
          <DayCard key={d.programDay} d={d} startISO={startISO} units={units} />
        ))}
      </div>
    </section>
  );
}
