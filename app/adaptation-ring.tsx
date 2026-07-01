"use client";

import { DC_CARD as CARD, DC_MONO_HEAD as MONO_HEAD, DC_MONO_SMALL as MONO_SMALL } from "@/app/dc-styles";

/** The circular adaptation gauge (ported from the Today Dashboard design). */
function Ring({ pct, size = 148 }: { pct: number; size?: number }) {
  const S = 176,
    cx = 88,
    cy = 88,
    r = 70,
    sw = 12;
  const C = 2 * Math.PI * r;
  const off = C * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const ang = (i / 36) * 2 * Math.PI - Math.PI / 2;
    const major = i % 3 === 0;
    const r1 = r + 10,
      r2 = r + (major ? 18 : 14);
    return (
      <line
        key={i}
        x1={cx + Math.cos(ang) * r1}
        y1={cy + Math.sin(ang) * r1}
        x2={cx + Math.cos(ang) * r2}
        y2={cy + Math.sin(ang) * r2}
        stroke={major ? "#f59e0b" : "#e7d9c6"}
        strokeWidth={major ? 2 : 1.5}
        strokeLinecap="round"
        opacity={major ? 0.9 : 0.7}
      />
    );
  });
  return (
    <svg viewBox={`0 0 ${S} ${S}`} style={{ width: size, height: size, display: "block" }}>
      <defs>
        <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      {ticks}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3e9dd" strokeWidth={sw} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="url(#ringG)"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={off}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontFamily='"Space Grotesk", sans-serif'
        fontSize={44}
        fontWeight={700}
        fill="#ea580c"
      >
        {pct}
        <tspan fontSize={18} dy={-2}>
          %
        </tspan>
      </text>
      <text
        x={cx}
        y={cy + 24}
        textAnchor="middle"
        fontFamily='"Space Mono", monospace'
        fontSize={10.5}
        letterSpacing="0.14em"
        fill="#a8a29e"
      >
        ADAPTED
      </text>
    </svg>
  );
}

function Stat({ label, value, valueClass, boxed }: { label: string; value: string; valueClass?: string; boxed?: boolean }) {
  return (
    <div className={boxed ? "rounded-xl border border-[#f0e7db] bg-[#fffdfa] px-[11px] py-[9px]" : undefined}>
      <div className={MONO_SMALL}>{label}</div>
      <div className={`mt-0.5 whitespace-nowrap font-bold ${boxed ? "text-[17px]" : "text-base"} ${valueClass ?? "text-stone-900"}`}>{value}</div>
    </div>
  );
}

export function AdaptationRing({
  pct,
  daysLogged,
  totalDays,
  currentDay,
  heatDoseMinutes,
  fullAdaptLabel,
  trend7Pct,
  stacked = false,
}: {
  pct: number;
  daysLogged: number;
  totalDays: number;
  currentDay: number;
  heatDoseMinutes: number;
  fullAdaptLabel: string;
  trend7Pct: number;
  /** Desktop bento layout: ring centered above a boxed 2×2 stat grid. */
  stacked?: boolean;
}) {
  const trend = `${trend7Pct >= 0 ? "+" : ""}${trend7Pct}%`;
  const trendClass = trend7Pct > 0 ? "text-emerald-600" : trend7Pct < 0 ? "text-amber-600" : "text-stone-400";
  return (
    <section className={CARD}>
      <div className="flex items-center justify-between">
        <span className={MONO_HEAD}>Adaptation</span>
        <span className="font-mono text-[10.5px] text-[#a8a29e]">
          Day {currentDay + 1} / {totalDays}
        </span>
      </div>
      {stacked ? (
        <>
          <div className="mt-2 flex justify-center">
            <Ring pct={pct} size={162} />
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <Stat boxed label="Days done" value={`${daysLogged} / ${totalDays}`} />
            <Stat boxed label="Heat dose" value={`${heatDoseMinutes} min`} />
            <Stat boxed label="Full adapt" value={fullAdaptLabel} />
            <Stat boxed label="7-day trend" value={trend} valueClass={trendClass} />
          </div>
        </>
      ) : (
        <div className="mt-3 flex items-center gap-3.5">
          <div className="shrink-0">
            <Ring pct={pct} />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-x-2 gap-y-2.5">
            <Stat label="Days done" value={`${daysLogged} / ${totalDays}`} />
            <Stat label="Heat dose" value={`${heatDoseMinutes} min`} />
            <Stat label="Full adapt" value={fullAdaptLabel} />
            <Stat label="7-day trend" value={trend} valueClass={trendClass} />
          </div>
        </div>
      )}
      <div className="mt-3 rounded-xl border border-[#fde6cf] bg-[#fff7ed] px-3 py-2.5 text-[12px] leading-[1.45] text-[#9a3412]">
        Retention holds while you keep showing up — a missed day nudges this back down.
      </div>
    </section>
  );
}
