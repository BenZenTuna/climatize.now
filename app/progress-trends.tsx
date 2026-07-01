"use client";

import { DC_CARD, DC_MONO_HEAD } from "@/app/dc-styles";
import type { AppState } from "@/lib/store";

function AreaSpark({ id, values, color }: { id: string; values: number[]; color: string }) {
  const W = 150, H = 46, p = 5, n = values.length;
  const x = (i: number) => (n === 1 ? W / 2 : p + (i / (n - 1)) * (W - 2 * p));
  const y = (v: number) => p + (1 - (v - 1) / 4) * (H - 2 * p); // fixed 1–5 scale
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = "M" + pts.join(" L");
  const area = `M${x(0).toFixed(1)},${H - p} L${pts.join(" L")} L${x(n - 1).toFixed(1)},${H - p} Z`;
  const gid = `pg-${id}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", marginTop: 9 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(n - 1)} cy={y(values[n - 1])} r={2.8} fill={color} />
    </svg>
  );
}

const MARKERS = [
  { key: "overallFeeling", label: "Overall feeling", goodUp: true },
  { key: "sweatResponse", label: "Sweat onset", goodUp: true },
  { key: "perceivedExertion", label: "Perceived effort", goodUp: false },
  { key: "sleepQuality", label: "Sleep quality", goodUp: true },
  { key: "thirst", label: "Thirst", goodUp: false },
] as const;

export function ProgressTrends({ state }: { state: AppState }) {
  const days = Object.keys(state.logs)
    .map(Number)
    .sort((a, b) => a - b);
  if (days.length < 2) return null;
  const logs = days.map((d) => state.logs[d]);

  return (
    <section className={DC_CARD}>
      <span className={DC_MONO_HEAD}>Your progress</span>
      <p className="mt-1.5 text-[12px] text-[#a8a29e]">
        How your body&apos;s markers have moved across {days.length} logged days.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {MARKERS.map((m) => {
          const values = logs.map((l) => l[m.key]);
          const delta = values[values.length - 1] - values[0];
          const flat = delta === 0;
          const improving = m.goodUp ? delta > 0 : delta < 0;
          const color = flat ? "#a8a29e" : improving ? "#059669" : "#d97706";
          const word = flat ? "steady →" : improving ? "improving ↑" : "watch ↓";
          return (
            <div key={m.key} className="rounded-[15px] border border-[#f0e7db] bg-[#fffdfa] px-3 py-2.5">
              <div className="text-[13px] font-semibold text-[#44403c]">{m.label}</div>
              <div className="mt-0.5 font-mono text-[10.5px] font-bold" style={{ color }}>
                {word}
              </div>
              <AreaSpark id={m.key} values={values} color={color} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
