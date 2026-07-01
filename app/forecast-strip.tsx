"use client";

import { DC_CARD, DC_MONO_HEAD } from "@/app/dc-styles";
import type { ForecastDay } from "@/lib/client-program";
import type { Units } from "@/lib/physiology/types";

// Continuous heat→colour ramp (cool blue → red), ported from the design.
export function heatColor(c: number): string {
  const hex2 = (h: string) => {
    const s = h.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  const rgb2 = (a: number[]) => "#" + a.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
  const stops: [number, string][] = [
    [20, "#41b6e6"],
    [27, "#22c55e"],
    [32, "#eab308"],
    [37, "#f97316"],
    [42, "#ef4444"],
  ];
  if (c <= stops[0][0]) return stops[0][1];
  if (c >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (c >= a && c <= b) {
      const t = (c - a) / (b - a);
      const A = hex2(ca);
      const B = hex2(cb);
      return rgb2(A.map((v, k) => v + (B[k] - v) * t));
    }
  }
  return stops[0][1];
}

const DOT: Record<string, string> = { GOOD: "#059669", TOUGH: "#d97706", SHELTER: "#dc2626" };

export function ForecastStrip({
  days,
  units,
  variant = "bars",
}: {
  days: ForecastDay[];
  units: Units;
  /** "bars" = mobile vertical bars; "rows" = desktop horizontal list (bento card). */
  variant?: "bars" | "rows";
}) {
  const deg = (c: number) => `${Math.round(units === "F" ? (c * 9) / 5 + 32 : c)}°`;
  const lo = 33, hi = 44;

  const legend = (
    <div className="mt-3.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px] text-[#78716c]">
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#059669]" />Good window</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#d97706]" />Go gentle</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#dc2626]" />Shelter day</span>
    </div>
  );

  if (variant === "rows") {
    return (
      <section className={DC_CARD}>
        <div className="flex items-baseline justify-between">
          <span className={`${DC_MONO_HEAD} whitespace-nowrap`}>Next 7 days</span>
          <span className="whitespace-nowrap font-mono text-[10px] text-[#a8a29e]">max feels-like</span>
        </div>
        <div className="mt-3 flex flex-col gap-0.5">
          {days.map((d, i) => {
            const w = Math.max(10, Math.min(100, ((d.maxFeelsC - lo) / (hi - lo)) * 100));
            const c = heatColor(d.maxFeelsC);
            return (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-[11px] px-[9px] py-[7px]"
                style={{
                  background: d.isToday ? "#fff7ed" : "transparent",
                  border: `1px solid ${d.isToday ? "#fde6cf" : "transparent"}`,
                }}
              >
                <div
                  className="w-[42px] shrink-0 font-mono text-[11px]"
                  style={{ color: d.isToday ? "#ea580c" : "#78716c", fontWeight: d.isToday ? 700 : 400 }}
                >
                  {d.label}
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-[6px] bg-[#f3ece1]">
                  <div className="h-full rounded-[6px]" style={{ width: `${w}%`, background: `linear-gradient(90deg,${c}bb,${c})` }} />
                </div>
                <div className="w-[34px] shrink-0 text-right text-[13px] font-bold text-[#44403c]">{deg(d.maxFeelsC)}</div>
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: DOT[d.outlook] }} />
              </div>
            );
          })}
        </div>
        {legend}
      </section>
    );
  }

  return (
    <section className={DC_CARD}>
      <div className="flex items-baseline justify-between">
        <span className={`${DC_MONO_HEAD} whitespace-nowrap`}>Next 7 days</span>
        <span className="whitespace-nowrap font-mono text-[10px] text-[#a8a29e]">max feels-like</span>
      </div>
      <div className="mt-3.5 flex items-end gap-[7px]">
        {days.map((d, i) => {
          const barH = 34 + Math.max(0, Math.min(1, (d.maxFeelsC - lo) / (hi - lo))) * 66;
          const c = heatColor(d.maxFeelsC);
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="font-mono text-[10.5px]"
                style={{ color: d.isToday ? "#ea580c" : "#a8a29e", fontWeight: d.isToday ? 700 : 400 }}
              >
                {d.label}
              </div>
              <div className="flex h-[94px] w-full items-end">
                <div
                  className="w-full rounded-[7px]"
                  style={{
                    height: `${barH}%`,
                    background: `linear-gradient(180deg, ${c}, ${c}cc)`,
                    boxShadow: d.isToday ? `0 0 0 2px #fff, 0 0 0 3.5px ${c}` : "none",
                  }}
                />
              </div>
              <div className="text-[12.5px] font-bold text-[#44403c]">{deg(d.maxFeelsC)}</div>
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: DOT[d.outlook] }} />
            </div>
          );
        })}
      </div>
      {legend}
    </section>
  );
}
