"use client";

import Link from "next/link";
import { AdaptationRing } from "@/app/adaptation-ring";
import { HeatClock } from "@/app/heat-clock";
import { ForecastStrip } from "@/app/forecast-strip";
import { ProgressTrends } from "@/app/progress-trends";
import { Sidebar } from "@/app/today/sidebar";
import { ProgramCalendar } from "@/app/today/program-calendar";
import { SAFE, INTENSITY_LABEL, ADJUST, windLabel, PlanPill, RecognitionList } from "@/app/today/shared";
import { DC_CARD, DC_CARD_WARM, DC_MONO_HEAD } from "@/app/dc-styles";
import {
  Activity,
  Alert,
  ArrowRight,
  Clock,
  Droplet,
  Flame,
  Home,
  MapPin,
  Moon,
  ShieldCheck,
  Sun,
  Thermometer,
  Wind,
} from "@/app/icons";
import { fmtTemp, fmtTempRange, PERSONA_LABEL } from "@/lib/units";
import type { TodayView, ProgramView } from "@/lib/client-program";
import type { AppState } from "@/lib/store";
import type { Units } from "@/lib/physiology/types";

function CondRow({ icon, label, value, valueColor, last }: { icon: React.ReactNode; label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${last ? "" : "border-b border-[#f4ead9]"}`}>
      <span className="flex items-center gap-[7px] text-[13px] text-[#57534e]">
        <span className="text-[#a8a29e]">{icon}</span>
        {label}
      </span>
      <span className="whitespace-nowrap text-[17px] font-bold" style={{ color: valueColor ?? "#1c1917" }}>
        {value}
      </span>
    </div>
  );
}

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
  const safety = SAFE[plan.safetyLevel];
  const SafetyIcon = plan.safetyLevel === "NORMAL" ? ShieldCheck : Alert;
  const hasProgress = Object.keys(state.logs).length >= 2;

  const now = new Date();
  const dateLabel = `${now.toLocaleDateString("en-US", { weekday: "short" })} · ${now.getDate()} ${now.toLocaleDateString("en-US", { month: "short" })}`;

  return (
    <div className="flex min-h-[100dvh] bg-[#fdf8f2]">
      <Sidebar onStartOver={onStartOver} />

      <div
        className="min-w-0 flex-1 overflow-x-hidden"
        style={{ background: "radial-gradient(1200px 460px at 60% -240px,#ffe3c4 0%,rgba(255,226,194,0) 58%),#fdf8f2" }}
      >
        <div className="mx-auto max-w-[1180px] px-8 pb-11 pt-[26px]">
          {/* HEADER */}
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

          {/* BENTO GRID */}
          <div className="mt-[22px] grid grid-cols-12 items-start gap-4">
            {/* ROW A: ring · safety · live conditions */}
            <div className="col-span-4">
              <AdaptationRing
                stacked
                pct={p.adaptationPct}
                daysLogged={p.daysLogged}
                totalDays={p.totalDays}
                currentDay={p.currentDay}
                heatDoseMinutes={p.heatDoseMinutes}
                fullAdaptLabel={p.fullAdaptLabel}
                trend7Pct={p.trend7Pct}
              />
            </div>

            <section className="col-span-4 rounded-[20px] p-[18px]" style={{ background: safety.bg, border: `1px solid ${safety.border}` }}>
              <div className="flex items-center gap-2">
                <span style={{ color: safety.accent }} className="flex">
                  <SafetyIcon className="h-5 w-5 shrink-0" />
                </span>
                <span className="text-[17px] font-bold text-stone-900">{safety.label}</span>
              </div>
              <p className="mt-[7px] text-[13.5px] leading-[1.5] text-[#57534e]">{safety.sub}</p>

              {plan.exposureMinutesTarget > 0 && v.goodWindows.length > 0 && (
                <div className="mt-3 rounded-[14px] border border-white/90 bg-white/70 px-[13px] py-3">
                  <div className="font-mono text-[9.5px] uppercase tracking-[.13em] text-[#78716c]">Cooler windows to be active</div>
                  <div className="mt-[11px] flex flex-col gap-[11px]">
                    {v.goodWindows.map((w) => (
                      <div key={w.period} className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: safety.chipBg, color: safety.chipInk }}>
                          {w.period === "evening" ? <Moon className="h-[17px] w-[17px]" /> : <Sun className="h-[17px] w-[17px]" />}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[14px] font-bold text-stone-900">
                            {w.period === "morning" ? "Morning" : "Evening"} · <span className="font-mono text-[12px]">{w.timeRange}</span>
                          </div>
                          <div className="text-[12px] font-semibold text-[#c2410c]">
                            feels {fmtTempRange(w.feelsLowC, w.feelsHighC, units)}
                            {w.isEstimate && <span className="font-normal text-stone-400"> · est.</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(v.nowSafetyLevel === "CAUTION" || v.nowSafetyLevel === "HARD_STOP") && plan.exposureMinutesTarget > 0 && (
                <p className="mt-[11px] flex items-start gap-2 text-[12.5px] leading-[1.5] text-[#57534e]">
                  <Sun className="mt-0.5 h-[15px] w-[15px] shrink-0 text-amber-500" />
                  <span>
                    It&apos;s {v.nowSafetyLevel === "HARD_STOP" ? "dangerously hot" : "very hot"} right now (
                    {fmtTemp(v.current.apparentTempC, units)}) — that&apos;s exactly why your session is timed for the cooler window above, not this moment.
                  </span>
                </p>
              )}

              {plan.cautions.length > 0 && (
                <ul className="mt-3 space-y-1 text-[13px] text-[#57534e]">
                  {plan.cautions.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={`col-span-4 ${DC_CARD}`}>
              <span className={DC_MONO_HEAD}>Live conditions</span>
              <div className="mt-1.5 flex flex-col">
                <CondRow icon={<Thermometer className="h-[15px] w-[15px]" />} label="Now" value={fmtTemp(v.current.tempC, units)} />
                <CondRow icon={<Sun className="h-[15px] w-[15px]" />} label="Feels like" value={fmtTemp(v.current.apparentTempC, units)} valueColor="#c2410c" />
                <CondRow icon={<Droplet className="h-[15px] w-[15px]" />} label="Humidity" value={`${Math.round(v.current.humidityPct)}%`} />
                <CondRow icon={<Wind className="h-[15px] w-[15px]" />} label="Wind" value={windLabel(v.windKmh, units)} last />
              </div>
            </section>

            {/* ROW B: heat curve · forecast */}
            <div className="col-span-8">
              <HeatClock curve={v.heatCurve} units={units} />
            </div>
            <div id="forecast" className="col-span-4 scroll-mt-6">
              <ForecastStrip days={p.forecastStrip} units={units} variant="rows" />
            </div>

            {/* ROW C: plan · (rest of day + why) */}
            <section className={`col-span-7 ${DC_CARD_WARM}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`${DC_MONO_HEAD} flex items-center gap-1.5 whitespace-nowrap text-[#ea580c]`}>
                  <Flame className="h-3.5 w-3.5" /> Today&apos;s plan
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
              <h2 className="mt-2.5 text-[22px] font-bold leading-[1.22] tracking-[-.015em] text-stone-900">{plan.headline}</h2>
              {plan.adjustmentFromYesterday && v.yesterdayTargetMinutes != null && (
                <p className="mt-1 text-[12.5px] text-[#a8a29e]">
                  Yesterday {v.yesterdayTargetMinutes} min → <strong className="text-[#57534e]">{plan.exposureMinutesTarget} min</strong> today.
                </p>
              )}

              {plan.exposureMinutesTarget > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <PlanPill icon={<Clock className="h-3.5 w-3.5" />}>{plan.exposureMinutesTarget} min</PlanPill>
                  <PlanPill icon={<Activity className="h-3.5 w-3.5" />}>{INTENSITY_LABEL[plan.intensity] ?? plan.intensity}</PlanPill>
                  <PlanPill icon={<Sun className="h-3.5 w-3.5" />}>{plan.timeWindow}</PlanPill>
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
            </section>

            <div className="col-span-5 flex flex-col gap-4">
              <section className={DC_CARD}>
                <div className="flex items-center justify-between gap-2">
                  <span className={DC_MONO_HEAD}>The rest of your day</span>
                  <span className="text-[13px] font-bold" style={{ color: "#c2410c" }}>peaks ~{fmtTemp(v.restOfDayPeakFeelsLikeC, units)}</span>
                </div>
                <p className="mt-1.5 text-[13px] font-medium text-[#44403c]">{v.restOfDay.title}</p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-[14px] border border-sky-100 bg-sky-50/60 p-3">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-sky-800">
                      <Home className="h-4 w-4" /> If you have AC / cooling
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#57534e]">{v.restOfDay.withAC}</p>
                  </div>
                  <div className="rounded-[14px] border border-amber-100 bg-amber-50/60 p-3">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-800">
                      <Wind className="h-4 w-4" /> If you don&apos;t
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#57534e]">{v.restOfDay.withoutAC}</p>
                  </div>
                </div>
                <p className="mt-3 text-[12px] italic text-[#a8a29e]">{v.restOfDay.recoveryNote}</p>
              </section>

              <section className={DC_CARD}>
                <span className={DC_MONO_HEAD}>Why today looks like this</span>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#57534e]">{plan.rationale}</p>
              </section>
            </div>

            {/* ROW D: program calendar */}
            <div id="program" className="col-span-12 scroll-mt-6">
              <ProgramCalendar view={p} startISO={state.startISO} units={units} />
            </div>

            {/* ROW E: progress · warning signs */}
            {hasProgress && (
              <div id="progress" className="col-span-7 scroll-mt-6">
                <ProgressTrends state={state} />
              </div>
            )}
            <section className={`col-span-5 ${DC_CARD}`}>
              <span className={`${DC_MONO_HEAD} flex items-center gap-1.5`}>
                <Alert className="h-3.5 w-3.5" /> Know the warning signs
              </span>
              <div className="mt-3 grid grid-cols-2 gap-3.5">
                <RecognitionList title="Heat exhaustion" items={plan.recognition.heatExhaustion} head="#b45309" />
                <RecognitionList title="Heat stroke" items={plan.recognition.heatStroke} head="#b91c1c" />
              </div>
              <div className="mt-3.5 rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-3 py-[11px]">
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#b91c1c]">
                  <Alert className="h-[15px] w-[15px]" /> Stop and get help now if:
                </div>
                <ul className="mt-1.5 list-disc pl-4 text-[12.5px] leading-[1.55] text-[#b91c1c]">
                  {plan.recognition.stopNow.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </section>


          </div>

          <p className="mt-6 text-center text-[11.5px] leading-[1.5] text-[#a8a29e]">{plan.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
