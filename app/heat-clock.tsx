"use client";

import { DC_CARD, DC_MONO_HEAD } from "@/app/dc-styles";
import type { HeatCurve } from "@/lib/client-program";
import type { Units } from "@/lib/physiology/types";

/**
 * The heat curve: today's hour-by-hour feels-like as an area+line chart. The shaded
 * green bands are the recommended cool windows, dashed lines mark the caution (32°)
 * and danger (39°) thresholds, and "NOW" is pinned to the current hour — so the
 * timing message (be active in the cool window, not the midday peak) is visual.
 * Ported from the Today Dashboard design.
 */
export function HeatClock({ curve, units }: { curve: HeatCurve; units: Units }) {
  const { feelsC: feels, windows, nowHour } = curve;
  const deg = (c: number) => `${Math.round(units === "F" ? (c * 9) / 5 + 32 : c)}°`;

  const W = 680, H = 250, pL = 12, pR = 12, pT = 20, pB = 30;
  const n = feels.length, lo = 20, hi = 43, base = H - pB;
  const bx = (i: number) => pL + (i / (n - 1)) * (W - pL - pR);
  const by = (v: number) => pT + (1 - (v - lo) / (hi - lo)) * (H - pT - pB);
  const hourLabel = (hh: number) => {
    if (hh === 0) return "12am";
    if (hh === 12) return "12pm";
    return `${hh % 12}${hh < 12 ? "am" : "pm"}`;
  };

  const pts = feels.map((v, i) => `${bx(i).toFixed(1)},${by(v).toFixed(1)}`);
  const line = "M" + pts.join(" L");
  const area = `M${bx(0).toFixed(1)},${base} L${pts.join(" L")} L${bx(n - 1).toFixed(1)},${base} Z`;
  const now = Math.max(0, Math.min(n - 1, nowHour));
  const nx = bx(now), ny = by(feels[now]);
  const refs: [number, string][] = [[32, "#d97706"], [39, "#dc2626"]];

  return (
    <section className={DC_CARD}>
      <div className="flex items-baseline justify-between">
        <span className={`${DC_MONO_HEAD} whitespace-nowrap`}>Today&apos;s heat · hourly</span>
        <span className="whitespace-nowrap font-mono text-[10px] text-[#a8a29e]">feels-like</span>
      </div>

      <div className="mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <linearGradient id="hcArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.42} />
              <stop offset="55%" stopColor="#fb923c" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="hcLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="55%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {windows.map((w, i) => (
            <rect key={`w${i}`} x={bx(w[0])} y={pT} width={bx(w[1]) - bx(w[0])} height={base - pT} fill="#059669" opacity={0.1} rx={5} />
          ))}
          {refs.map(([v, c], i) => (
            <g key={`r${i}`}>
              <line x1={pL} x2={W - pR} y1={by(v)} y2={by(v)} stroke={c} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
              <text x={pL + 2} y={by(v) - 5} fontFamily='"Space Mono", monospace' fontSize={12} fill={c} opacity={0.85}>{deg(v)}</text>
            </g>
          ))}

          <path d={area} fill="url(#hcArea)" />
          <path d={line} fill="none" stroke="url(#hcLine)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

          {windows.map((w, i) => (
            <line key={`wt${i}`} x1={bx(w[0])} x2={bx(w[1])} y1={pT + 2} y2={pT + 2} stroke="#059669" strokeWidth={3} strokeLinecap="round" />
          ))}

          <line x1={nx} x2={nx} y1={pT} y2={base} stroke="#1c1917" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.45} />
          <circle cx={nx} cy={ny} r={6} fill="#ea580c" stroke="#fff" strokeWidth={3} />
          <text x={Math.min(nx, W - 74)} y={pT - 6} fontFamily='"Space Mono", monospace' fontSize={12} fontWeight={700} fill="#1c1917">
            {`NOW ${deg(feels[now])}`}
          </text>

          {[0, 6, 12, 18].map((hh) => (
            <text key={`x${hh}`} x={bx(hh)} y={H - 8} textAnchor="middle" fontFamily='"Space Mono", monospace' fontSize={12} fill="#a8a29e">
              {hourLabel(hh)}
            </text>
          ))}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px] text-[#78716c]">
        <span className="flex items-center gap-1.5">
          <span className="h-[9px] w-[14px] rounded-[3px] border-t-2 border-[#059669] bg-[#05966922]" /> Cool window
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-[14px] border-t-2 border-dashed border-[#d97706]" /> Caution
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-[14px] border-t-2 border-dashed border-[#dc2626]" /> Danger
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[9px] w-[9px] rounded-full border-2 border-white bg-[#ea580c] shadow-[0_0_0_1px_#ea580c]" /> Now
        </span>
      </div>
      <p className="mt-2.5 text-[12px] leading-[1.5] text-[#78716c]">
        The shaded band is your cool window — effort belongs there, not at the midday peak.
      </p>
    </section>
  );
}
