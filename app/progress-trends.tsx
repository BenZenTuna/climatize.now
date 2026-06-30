"use client";

import type { AppState } from "@/lib/store";

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 92;
  const h = 30;
  const pad = 4;
  const n = values.length;
  const x = (i: number) => (n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad));
  const y = (v: number) => pad + (1 - (v - 1) / 4) * (h - 2 * pad); // fixed 1–5 scale
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={1.7} fill={color} />
      ))}
    </svg>
  );
}

const MARKERS = [
  { key: "overallFeeling", label: "Overall feeling", goodUp: true },
  { key: "sweatResponse", label: "Sweat response", goodUp: true },
  { key: "perceivedExertion", label: "Effort (lower is easier)", goodUp: false },
  { key: "sleepQuality", label: "Sleep", goodUp: true },
  { key: "thirst", label: "Thirst (lower is better)", goodUp: false },
] as const;

export function ProgressTrends({ state }: { state: AppState }) {
  const days = Object.keys(state.logs)
    .map(Number)
    .sort((a, b) => a - b);
  if (days.length < 2) return null;
  const logs = days.map((d) => state.logs[d]);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-900">Your progress</h2>
      <p className="mt-1 text-xs text-slate-400">
        How your markers have moved across {days.length} logged days.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {MARKERS.map((m) => {
          const values = logs.map((l) => l[m.key]);
          const delta = values[values.length - 1] - values[0];
          const flat = delta === 0;
          const improving = m.goodUp ? delta > 0 : delta < 0;
          const color = flat ? "#94a3b8" : improving ? "#10b981" : "#f59e0b";
          const word = flat ? "steady" : improving ? "improving ↑" : "watch this";
          return (
            <div
              key={m.key}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-700">{m.label}</div>
                <div className="text-xs font-medium" style={{ color }}>
                  {word}
                </div>
              </div>
              <Sparkline values={values} color={color} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
