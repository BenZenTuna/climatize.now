"use client";

import Link from "next/link";
import { HeatClock } from "@/app/heat-clock";
import { ForecastStrip } from "@/app/forecast-strip";
import { Sidebar } from "@/app/today/sidebar";
import { ProgramCalendar } from "@/app/today/program-calendar";
import { SAFE, INTENSITY_LABEL, ADJUST, windLabel, PlanPill, RecognitionList, NIGHT } from "@/app/today/shared";
import { Ring } from "@/app/adaptation-ring";
import { DC_CARD, DC_MONO_HEAD, DC_MONO_SMALL } from "@/app/dc-styles";
import {
  Activity,
  Alert,
  ArrowRight,
  Clock,
  Droplet,
  Home,
  MapPin,
  Moon,
  Sun,
  Thermometer,
  Wind,
} from "@/app/icons";
import { fmtTemp, fmtTempRange, PERSONA_LABEL } from "@/lib/units";
import type { TodayView, ProgramView } from "@/lib/client-program";
import type { AppState } from "@/lib/store";
import type { Units } from "@/lib/physiology/types";

// Inline sparkline chart for the adaptation row
function AreaSpark({ id, values, color }: { id: string; values: number[]; color: string }) {
  const W = 150, H = 46, p = 5, n = values.length;
  const x = (i: number) => (n === 1 ? W / 2 : p + (i / (n - 1)) * (W - 2 * p));
  const y = (v: number) => p + (1 - (v - 1) / 4) * (H - 2 * p);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = "M" + pts.join(" L");
  const area = `M${x(0).toFixed(1)},${H - p} L${pts.join(" L")} L${x(n - 1).toFixed(1)},${H - p} Z`;
  const gid = `dt-${id}`;
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

const SPARK_MARKERS = [
  { key: "overallFeeling" as const, label: "Overall feeling", goodUp: true },
  { key: "sweatResponse" as const, label: "Sweat onset", goodUp: true },
  { key: "perceivedExertion" as const, label: "Perceived effort", goodUp: false },
  { key: "sleepQuality" as const, label: "Sleep quality", goodUp: true },
  { key: "thirst" as const, label: "Thirst", goodUp: false },
];

export function DesktopToday({
  v,
  p,
  state,
  units,
  setUnits,
  loggedToday,
  onStartOver,
}: {
  v: TodayView;
  p: ProgramView;
  state: AppState;
  units: Units;
  setUnits: (u: Units) => void;
  loggedToday: boolean;
  onStartOver: () => void;
}) {
  const { plan } = v;
  const trend = `${p.trend7Pct >= 0 ? "+" : ""}${p.trend7Pct}%`;
  const trendClass = p.trend7Pct > 0 ? "text-emerald-600" : p.trend7Pct < 0 ? "text-amber-600" : "text-stone-400";

  const now = new Date();
  const dateLabel = `${now.toLocaleDateString("en-US", { weekday: "short" })} · ${now.getDate()} ${now.toLocaleDateString("en-US", { month: "short" })}`;

  // Which window is "your session" (the planned exposure window)
  const sessionPeriod = plan.timeWindow.match(/morning|early/i) ? "morning" : "evening";

  // Sparklines
  const logDays = Object.keys(state.logs).map(Number).sort((a, b) => a - b);
  const hasProgress = logDays.length >= 2;
  const sparkLogs = logDays.map((d) => state.logs[d]);

  const overnight = v.overnight;
  const nightC = overnight ? NIGHT[overnight.level] : null;

  // Stats row injected into HeatClock header
  const heatStatsRow = (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[12px] text-[#78716c]">Now</span>
        <span className="text-[16px] font-bold text-stone-900">{fmtTemp(v.current.tempC, units)}</span>
      </div>
      <div className="h-4 w-px bg-[#f4ead9]" />
      <div className="flex items-baseline gap-1.5">
        <span className="text-[12px] text-[#78716c]">Feels like</span>
        <span className="text-[16px] font-bold text-[#c2410c]">{fmtTemp(v.current.apparentTempC, units)}</span>
      </div>
      <div className="h-4 w-px bg-[#f4ead9]" />
      <div className="flex items-baseline gap-1.5">
        <span className="text-[12px] text-[#78716c]">Humidity</span>
        <span className="text-[16px] font-bold text-stone-900">{Math.round(v.current.humidityPct)}%</span>
      </div>
      <div className="h-4 w-px bg-[#f4ead9]" />
      <div className="flex items-baseline gap-1.5">
        <span className="text-[12px] text-[#78716c]">Wind</span>
        <span className="text-[16px] font-bold text-stone-900">{windLabel(v.windKmh, units)}</span>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] bg-[#fdf8f2]">
      <Sidebar onStartOver={onStartOver} />

      <div
        className="min-w-0 flex-1 overflow-x-hidden"
        style={{ background: "radial-gradient(1200px 460px at 60% -240px,#ffe3c4 0%,rgba(255,226,194,0) 58%),#fdf8f2" }}
      >
        <div className="mx-auto max-w-[1180px] px-8 pb-11 pt-[26px]">
          {/* ── HEADER ── */}
          <header className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[.16em] text-[#b45309]">
                Day {v.programDay + 1} of {p.totalDays} · your program
              </div>
              <div className="mt-1.5 flex items-center gap-[9px] text-[30px] font-bold tracking-[-.025em]">
                <MapPin className="h-6 w-6 shrink-0 text-[#f97316]" />
                {v.currentLabel}
              </div>
              <div className="mt-[3px] text-[14px] text-[#78716c]">{PERSONA_LABEL[state.persona] ?? state.persona}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[12px] text-[#a8a29e]">{dateLabel}</span>
              <div className="flex rounded-full border border-[#f0e7db] bg-white p-0.5 shadow-[0_1px_2px_rgba(28,25,23,.05)]">
                {(["C", "F"] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnits(u)}
                    className="cursor-pointer rounded-full px-[13px] py-1.5 font-mono text-[12px] font-bold transition-all"
                    style={units === u ? { background: "#f97316", color: "#fff" } : { background: "transparent", color: "#78716c" }}
                  >
                    °{u}
                  </button>
                ))}
              </div>
              <Link
                href="/log"
                className="flex items-center gap-[7px] rounded-[12px] px-4 py-2.5 text-[14px] font-bold text-white no-underline"
                style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", boxShadow: "0 10px 22px -10px rgba(234,88,12,.6)" }}
              >
                {loggedToday ? "Update today's check-in" : "Log how today went"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </header>

          {/* ── BENTO GRID ── */}
          <div className="mt-[22px] grid grid-cols-12 items-start gap-4">

            {/* ── ROW 1: Today's plan hero (7) | Your day & night (5) ── */}

            {/* Plan hero */}
            <section className="col-span-7 overflow-hidden rounded-[20px] border border-[#fde6cf] bg-white shadow-[0_1px_2px_rgba(28,25,23,.05),0_16px_36px_-22px_rgba(234,88,12,.3)]">
              {/* Safety banner */}
              {plan.safetyLevel === "CAUTION" && (
                <div className="flex items-start gap-2.5 border-b border-[#fde68a] bg-[#fffbeb] px-[17px] py-[13px]">
                  <Alert className="mt-0.5 h-5 w-5 shrink-0 text-[#b45309]" />
                  <div>
                    <span className="text-[15px] font-bold text-stone-900">Caution — keep it easy today.</span>
                    <span className="text-[13.5px] text-[#57534e]"> Conditions are on the warm side, so your plan is capped and timed for the cool hours.</span>
                  </div>
                </div>
              )}
              {plan.safetyLevel === "NORMAL" && (
                <div className="flex items-start gap-2.5 border-b border-[#bbf7d0] bg-[#ecfdf5] px-[17px] py-[13px]">
                  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  <div>
                    <span className="text-[15px] font-bold text-stone-900">Good to go — gently.</span>
                    <span className="text-[13.5px] text-[#57534e]"> Your exercise window is in the safe range. Keep it light and stop if you feel unwell.</span>
                  </div>
                </div>
              )}
              {plan.safetyLevel === "HARD_STOP" && (
                <div className="flex items-start gap-2.5 border-b border-[#fecaca] bg-[#fef2f2] px-[17px] py-[13px]">
                  <Alert className="mt-0.5 h-5 w-5 shrink-0 text-[#b91c1c]" />
                  <div>
                    <span className="text-[15px] font-bold text-[#b91c1c]">Stop — too dangerous for heat today.</span>
                    <span className="text-[13.5px] text-[#57534e]"> Even the coolest hours read above the danger line. Shelter and cool only — no exposure today.</span>
                  </div>
                </div>
              )}

              {/* Plan content */}
              <div className="px-[17px] pb-[17px] pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className={`${DC_MONO_HEAD} flex items-center gap-1.5 whitespace-nowrap text-[#ea580c]`}>
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </svg>
                    Today&apos;s plan
                  </span>
                  {plan.adjustmentFromYesterday && (
                    <span
                      className="whitespace-nowrap rounded-full px-[9px] py-[3px] text-[11px] font-bold"
                      style={{ background: ADJUST[plan.adjustmentFromYesterday].bg, color: ADJUST[plan.adjustmentFromYesterday].ink }}
                    >
                      {ADJUST[plan.adjustmentFromYesterday].text}
                    </span>
                  )}
                </div>
                <h2 className="mt-2.5 text-[23px] font-bold leading-[1.22] tracking-[-.015em] text-stone-900">{plan.headline}</h2>
                {plan.adjustmentFromYesterday && v.yesterdayTargetMinutes != null && (
                  <p className="mt-1 text-[12.5px] text-[#a8a29e]">
                    Yesterday {v.yesterdayTargetMinutes} min → <strong className="text-[#57534e]">{plan.exposureMinutesTarget} min</strong> today.
                  </p>
                )}
                {plan.exposureMinutesTarget > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <PlanPill icon={<Clock className="h-3.5 w-3.5" />}>{plan.exposureMinutesTarget} min</PlanPill>
                    <PlanPill icon={<Activity className="h-3.5 w-3.5" />}>{INTENSITY_LABEL[plan.intensity] ?? plan.intensity} intensity</PlanPill>
                    <PlanPill icon={<Moon className="h-3.5 w-3.5" />}>{plan.timeWindow}</PlanPill>
                  </div>
                )}
                <ol className="mt-4 grid list-none grid-cols-2 gap-x-[18px] gap-y-[11px] p-0">
                  {plan.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-[11px]">
                      <span className="flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full bg-[#ffedd5] text-[12px] font-bold text-[#c2410c]">
                        {i + 1}
                      </span>
                      <span className="text-[14px] leading-[1.45] text-[#44403c]">{s}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-3.5 flex items-start gap-[9px] rounded-[14px] border border-[#dbeafe] bg-[#eff6ff] px-3 py-2.5">
                  <Droplet className="mt-0.5 h-4 w-4 shrink-0 text-[#3b82f6]" />
                  <span className="text-[13px] leading-[1.5] text-[#1e40af]">
                    <strong>Hydration:</strong> {plan.hydration}
                  </span>
                </div>
                <p className="mt-[13px] text-[12.5px] leading-[1.55] text-[#78716c]">
                  <strong className="font-mono text-[10px] uppercase tracking-[.13em] text-[#b45309]">Why · </strong>
                  {plan.rationale}
                </p>
                {plan.cautions.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[12.5px] text-[#57534e]">
                    {plan.cautions.map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Your day & night */}
            <section className={`col-span-5 ${DC_CARD}`}>
              <span className={DC_MONO_HEAD}>Your day &amp; night</span>

              {/* Cool windows */}
              {v.goodWindows.length > 0 && (
                <div className="mt-3 flex flex-col gap-[11px]">
                  {v.goodWindows.map((w) => {
                    const isSession = w.period === sessionPeriod && plan.exposureMinutesTarget > 0;
                    return (
                      <div
                        key={w.period}
                        className="flex items-center gap-2.5 rounded-[14px] px-3 py-[9px]"
                        style={{ border: isSession ? "2px solid #059669" : "1px solid #d1fae5", background: "#ecfdf5" }}
                      >
                        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#d1fae5] text-[#047857]">
                          {w.period === "morning" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[14px] font-bold text-stone-900">
                            {w.period === "morning" ? "Morning" : "Evening"}
                            {" · "}
                            <span className="font-mono text-[12px]">{w.timeRange}</span>
                            {isSession && (
                              <span className="ml-1.5 rounded-full bg-[#d1fae5] px-[7px] py-[2px] align-[1px] text-[10px] font-bold text-[#047857]">
                                your session
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] font-semibold text-[#c2410c]">
                            feels {fmtTempRange(w.feelsLowC, w.feelsHighC, units)}
                            {w.isEstimate && <span className="font-normal text-stone-400"> · est.</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hot right now notice */}
              {(v.nowSafetyLevel === "CAUTION" || v.nowSafetyLevel === "HARD_STOP") && plan.exposureMinutesTarget > 0 && (
                <p className="mt-[11px] flex items-start gap-2 text-[12.5px] leading-[1.5] text-[#57534e]">
                  <Sun className="mt-0.5 h-[15px] w-[15px] shrink-0 text-amber-500" />
                  <span>
                    It&apos;s very hot right now (feels like <strong>{fmtTemp(v.current.apparentTempC, units)}</strong>) — that&apos;s exactly why your session is timed for the {sessionPeriod} window, not this moment.
                  </span>
                </p>
              )}

              {/* Rest of day */}
              <div className="my-[13px] h-px bg-[#f4ead9]" />
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-bold text-[#44403c]">Until then — rest of your day</span>
                <span className="whitespace-nowrap text-[12.5px] font-bold text-[#c2410c]">
                  peaks ~{fmtTemp(v.restOfDayPeakFeelsLikeC, units)}
                </span>
              </div>
              <div className="mt-[9px] grid grid-cols-2 gap-2.5">
                <div className="rounded-[14px] border border-[#e0f2fe] bg-[rgba(240,249,255,.6)] px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#075985]">
                    <Home className="h-3.5 w-3.5" /> With AC / cooling
                  </div>
                  <p className="mt-1 text-[12.5px] leading-[1.55] text-[#57534e]">{v.restOfDay.withAC}</p>
                </div>
                <div className="rounded-[14px] border border-[#fef3c7] bg-[rgba(255,251,235,.6)] px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#92400e]">
                    <Wind className="h-3.5 w-3.5" /> Without AC
                  </div>
                  <p className="mt-1 text-[12.5px] leading-[1.55] text-[#57534e]">{v.restOfDay.withoutAC}</p>
                </div>
              </div>

              {/* Tonight's recovery */}
              {overnight && nightC && (
                <>
                  <div className="my-[13px] h-px bg-[#f4ead9]" />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#44403c]">
                      <Moon className="h-3.5 w-3.5 text-[#6366f1]" /> Tonight&apos;s recovery
                    </span>
                    {v.overnightLowFeelsLikeC != null && (
                      <span className="whitespace-nowrap text-[12.5px] font-bold" style={{ color: nightC.accent }}>
                        dips to ~{fmtTemp(v.overnightLowFeelsLikeC, units)}
                      </span>
                    )}
                  </div>
                  <div className="mt-[7px] flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: nightC.chipBg, color: nightC.chipInk }}>
                      {nightC.label}
                    </span>
                    {overnight.humidDriven && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e0f2fe] px-2 py-0.5 text-[11px] font-semibold text-[#075985]">
                        <Droplet className="h-[11px] w-[11px]" /> Humidity
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[12.5px] leading-[1.55] text-[#57534e]">{overnight.advice}</p>
                  <p className="mt-1.5 text-[12px] italic text-[#a8a29e]">{overnight.note}</p>
                </>
              )}
            </section>

            {/* ── ROW 2: Heat chart (8) | Forecast (4) ── */}

            <div className="col-span-8">
              <HeatClock curve={v.heatCurve} units={units} statsRow={heatStatsRow} />
            </div>

            <div id="forecast" className="col-span-4 scroll-mt-6">
              <ForecastStrip days={p.forecastStrip} units={units} variant="rows" />
            </div>

            {/* ── ROW 3: Adaptation + progress (12) ── */}

            <section id="adaptation" className={`col-span-12 scroll-mt-6 ${DC_CARD}`}>
              <div className="flex items-baseline justify-between">
                <span className={DC_MONO_HEAD}>Adaptation &amp; progress</span>
                <span className="font-mono text-[10.5px] text-[#a8a29e]">Day {v.programDay + 1} / {p.totalDays}</span>
              </div>
              <div className="mt-2 grid items-center gap-[22px]" style={{ gridTemplateColumns: "190px 250px 1fr" }}>
                {/* Ring */}
                <div className="flex justify-center">
                  <Ring pct={p.adaptationPct} size={170} />
                </div>
                {/* Stats */}
                <div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "Days done", value: `${p.daysLogged} / ${p.totalDays}`, cls: "" },
                      { label: "Heat dose", value: `${p.heatDoseMinutes} min`, cls: "" },
                      { label: "Full adapt", value: p.fullAdaptLabel, cls: "" },
                      { label: "7-day trend", value: trend, cls: trendClass },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="rounded-xl border border-[#f0e7db] bg-[#fffdfa] px-[11px] py-[9px]">
                        <div className={DC_MONO_SMALL}>{label}</div>
                        <div className={`mt-0.5 whitespace-nowrap text-[17px] font-bold ${cls || "text-stone-900"}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 rounded-xl border border-[#fde6cf] bg-[#fff7ed] px-3 py-2.5 text-[12px] leading-[1.45] text-[#9a3412]">
                    Retention holds while you keep showing up — a missed day nudges this back down.
                  </div>
                </div>
                {/* Sparklines */}
                {hasProgress ? (
                  <div>
                    <div className="grid grid-cols-5 gap-2.5">
                      {SPARK_MARKERS.map((m) => {
                        const values = sparkLogs.map((l) => l[m.key]);
                        const delta = values[values.length - 1] - values[0];
                        const flat = delta === 0;
                        const improving = m.goodUp ? delta > 0 : delta < 0;
                        const color = flat ? "#a8a29e" : improving ? "#059669" : "#d97706";
                        const word = flat ? "steady →" : improving ? "improving ↑" : "watch ↓";
                        return (
                          <div key={m.key} className="rounded-[15px] border border-[#f0e7db] bg-[#fffdfa] px-3 py-2.5">
                            <div className="text-[12.5px] font-semibold text-[#44403c]">{m.label}</div>
                            <div className="mt-0.5 font-mono text-[10.5px] font-bold" style={{ color }}>{word}</div>
                            <AreaSpark id={m.key} values={values} color={color} />
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[12px] text-[#a8a29e]">
                      How your body&apos;s markers have moved across {logDays.length} logged days.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-xl border border-[#f0e7db] bg-[#fffdfa] p-6 text-[13px] text-[#a8a29e]">
                    Progress trends appear after 2 or more logged days.
                  </div>
                )}
              </div>
            </section>

            {/* ── ROW 4: Program calendar (12) ── */}

            <div id="program" className="col-span-12 scroll-mt-6">
              <ProgramCalendar view={p} startISO={state.startISO} units={units} />
            </div>

            {/* ── ROW 5: Warning signs (12) ── */}

            <section className={`col-span-12 ${DC_CARD}`}>
              <span className={`${DC_MONO_HEAD} flex items-center gap-1.5`}>
                <Alert className="h-3.5 w-3.5" /> Know the warning signs
              </span>
              <div className="mt-3 grid grid-cols-3 items-start gap-3.5">
                <RecognitionList title="Heat exhaustion" items={plan.recognition.heatExhaustion} head="#b45309" />
                <RecognitionList title="Heat stroke" items={plan.recognition.heatStroke} head="#b91c1c" />
                <div className="rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-3 py-[11px]">
                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#b91c1c]">
                    <Alert className="h-[15px] w-[15px]" /> Stop and get help now if:
                  </div>
                  <ul className="mt-1.5 list-disc pl-4 text-[12.5px] leading-[1.55] text-[#b91c1c]">
                    {plan.recognition.stopNow.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <p className="mt-6 text-center text-[11.5px] leading-[1.5] text-[#a8a29e]">{plan.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
