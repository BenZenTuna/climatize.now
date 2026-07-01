"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/store";
import { buildTodayView, buildProgramView, currentProgramDay, type TodayView, type ProgramView } from "@/lib/client-program";
import { ProgramSection } from "@/app/program-list";
import { ProgressTrends } from "@/app/progress-trends";
import { HeatClock } from "@/app/heat-clock";
import { AdaptationRing } from "@/app/adaptation-ring";
import { ForecastStrip } from "@/app/forecast-strip";
import { DC_CARD, DC_CARD_WARM, DC_MONO_HEAD, DC_MONO_SMALL } from "@/app/dc-styles";
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
  RotateCcw,
  Settings,
  ShieldCheck,
  Sun,
  Wind,
} from "@/app/icons";
import { fmtTemp, fmtTempRange, PERSONA_LABEL } from "@/lib/units";
import type { Units } from "@/lib/physiology/types";
import { DesktopToday } from "@/app/today/desktop";
import { SAFE, INTENSITY_LABEL, ADJUST, windLabel, PlanPill, RecognitionList, OvernightCard } from "@/app/today/shared";

export default function TodayPage() {
  const router = useRouter();
  const { state, ready, update, reset } = useAppState();
  const [view, setView] = useState<TodayView | null>(null);
  const [program, setProgram] = useState<ProgramView | null>(null);
  const [error, setError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const closeSettings = () => {
    setShowSettings(false);
    setConfirmReset(false);
  };

  const fetchKey = state ? `${currentProgramDay(state)}:${state.current.lat}:${state.current.lon}` : null;

  useEffect(() => {
    if (!ready) return;
    if (!state) {
      router.replace("/onboarding");
      return;
    }
    let cancelled = false;
    setError(false);
    setView(null);
    setProgram(null);
    Promise.all([buildTodayView(state), buildProgramView(state)])
      .then(([t, p]) => {
        if (cancelled) return;
        setView(t);
        setProgram(p);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fetchKey]);

  useEffect(() => {
    if (!view || !state) return;
    const D = currentProgramDay(state);
    const h = {
      targetMinutes: view.plan.exposureMinutesTarget,
      intensity: view.plan.intensity,
      safetyLevel: view.plan.safetyLevel,
      feelsLikeC: view.peakFeelsLikeC,
    };
    const ex = state.history[D];
    if (ex && ex.targetMinutes === h.targetMinutes && ex.intensity === h.intensity && ex.safetyLevel === h.safetyLevel) {
      return;
    }
    update({ ...state, history: { ...state.history, [D]: h } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  if (!ready || (state && (!view || !program) && !error)) {
    return <Centered>Reading the live weather…</Centered>;
  }
  if (!state) return <Centered>Redirecting…</Centered>;
  if (error) {
    return (
      <Centered>
        <p className="text-stone-600">Couldn&apos;t reach the weather service. Check your connection.</p>
        <button onClick={() => location.reload()} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 font-medium text-white">
          Retry
        </button>
      </Centered>
    );
  }

  const v = view!;
  const p = program!;
  const units = state.units;
  const { plan } = v;
  const safety = SAFE[plan.safetyLevel];
  const SafetyIcon = plan.safetyLevel === "NORMAL" ? ShieldCheck : Alert;
  const loggedToday = !!state.logs[v.programDay];
  const setUnits = (u: Units) => update({ ...state, units: u });

  return (
    <>
    {/* Mobile / tablet layout (< lg). The desktop bento lives in DesktopToday below. */}
    <main className="mx-auto flex w-full max-w-[432px] flex-col gap-3.5 px-[15px] pb-12 pt-[22px] lg:hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-[11px]">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[13px]"
            style={{ background: "linear-gradient(140deg,#fcd34d 0%,#f97316 55%,#ea580c 100%)", boxShadow: "0 7px 18px -6px rgba(234,88,12,.6)" }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <g stroke="#fff" strokeWidth="1.9" strokeLinecap="round" opacity="0.95">
                <line x1="20" y1="8" x2="20" y2="12.5" />
                <line x1="11" y1="11.5" x2="13.6" y2="14.1" />
                <line x1="29" y1="11.5" x2="26.4" y2="14.1" />
              </g>
              <circle cx="20" cy="25" r="7" fill="#fff" opacity="0.96" />
              <rect x="6.5" y="27" width="27" height="2.4" rx="1.2" fill="#fff" opacity="0.96" />
              <rect x="11" y="31.4" width="18" height="2" rx="1" fill="#fff" opacity="0.62" />
            </svg>
          </div>
          <div className="leading-none">
            <div className="text-[18px] font-bold tracking-[-.025em]">
              climatize<span className="text-[#f97316]">.now</span>
            </div>
            <div className={`${DC_MONO_SMALL} mt-1 tracking-[.16em]`}>Heat adaptation</div>
          </div>
        </div>
        <div className="flex rounded-full border border-[#f0e7db] bg-white p-0.5 shadow-[0_1px_2px_rgba(28,25,23,.05)]">
          {(["C", "F"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnits(u)}
              className="cursor-pointer rounded-full px-3 py-[5px] font-mono text-[12px] font-bold transition-all"
              style={units === u ? { background: "#f97316", color: "#fff" } : { background: "transparent", color: "#78716c" }}
            >
              °{u}
            </button>
          ))}
        </div>
      </header>

      {/* HERO */}
      <section className="overflow-hidden rounded-[22px] border border-[#f4ead9] bg-white shadow-[0_1px_2px_rgba(28,25,23,.05),0_20px_42px_-26px_rgba(234,88,12,.34)]">
        <div className="px-[18px] pb-[15px] pt-4 text-white" style={{ background: "linear-gradient(135deg,#fb923c 0%,#f97316 52%,#ea580c 100%)" }}>
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[.17em] text-white/80">
              Day {v.programDay + 1} of {p.totalDays} · your program
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/35"
                aria-label="Settings"
              >
                <Settings className="h-[15px] w-[15px] text-white" />
              </button>
              {showSettings && (
                <>
                  <div className="fixed inset-0 z-10" onClick={closeSettings} />
                  <div className="absolute right-0 top-9 z-20 w-[248px] overflow-hidden rounded-[14px] border border-[#f4ead9] bg-white text-left shadow-lg">
                    {!confirmReset ? (
                      <>
                        <button
                          onClick={() => { closeSettings(); router.push("/change-cities"); }}
                          className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left hover:bg-orange-50"
                        >
                          <MapPin className="mt-0.5 h-[17px] w-[17px] shrink-0 text-orange-500" />
                          <span>
                            <span className="block text-[13.5px] font-semibold text-stone-800">Change cities</span>
                            <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-stone-500">
                              Keep your progress — just update where you are
                            </span>
                          </span>
                        </button>
                        <div className="h-px bg-[#f4ead9]" />
                        <button
                          onClick={() => setConfirmReset(true)}
                          className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left hover:bg-red-50"
                        >
                          <RotateCcw className="mt-0.5 h-[17px] w-[17px] shrink-0 text-red-500" />
                          <span>
                            <span className="block text-[13.5px] font-semibold text-stone-800">Start from the beginning</span>
                            <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-stone-500">
                              Erase everything and rebuild your plan
                            </span>
                          </span>
                        </button>
                      </>
                    ) : (
                      <div className="p-3.5">
                        <div className="text-[13.5px] font-bold text-stone-900">Erase everything?</div>
                        <p className="mt-1 text-[12px] leading-[1.5] text-stone-500">
                          This wipes your program, daily logs, and health answers, then starts a fresh
                          setup. This can&apos;t be undone.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => { reset(); router.push("/onboarding"); }}
                            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-[12.5px] font-bold text-white hover:bg-red-700"
                          >
                            Yes, start over
                          </button>
                          <button
                            onClick={() => setConfirmReset(false)}
                            className="rounded-lg border border-stone-200 px-3 py-2 text-[12.5px] font-semibold text-stone-600 hover:bg-stone-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-[7px] flex items-center gap-[7px] text-[23px] font-bold tracking-[-.02em]">
            <MapPin className="h-[19px] w-[19px] shrink-0 text-white/90" />
            {v.currentLabel}
          </div>
          <div className="mt-[3px] text-[13px] text-white/85">{PERSONA_LABEL[state.persona] ?? state.persona}</div>
        </div>
        <div className="grid grid-cols-4">
          <HeroStat label="Now" value={fmtTemp(v.current.tempC, units)} />
          <HeroStat label="Feels" value={fmtTemp(v.current.apparentTempC, units)} valueColor="#c2410c" />
          <HeroStat label="Humidity" value={`${Math.round(v.current.humidityPct)}%`} />
          <HeroStat label="Wind" value={windLabel(v.windKmh, units)} last />
        </div>
      </section>

      {/* ADAPTATION RING */}
      <AdaptationRing
        pct={p.adaptationPct}
        daysLogged={p.daysLogged}
        totalDays={p.totalDays}
        currentDay={p.currentDay}
        heatDoseMinutes={p.heatDoseMinutes}
        fullAdaptLabel={p.fullAdaptLabel}
        trend7Pct={p.trend7Pct}
      />

      {/* SAFETY VERDICT + COOLER WINDOWS */}
      <section className="rounded-[20px] p-4" style={{ background: safety.bg, border: `1px solid ${safety.border}` }}>
        <div className="flex items-center gap-2">
          <span style={{ color: safety.accent }} className="flex">
            <SafetyIcon className="h-5 w-5 shrink-0" />
          </span>
          <span className="text-[16px] font-bold text-stone-900">{safety.label}</span>
        </div>
        <p className="mt-[7px] text-[13.5px] leading-[1.5] text-[#57534e]">{safety.sub}</p>

        {plan.exposureMinutesTarget > 0 && v.goodWindows.length > 0 && (
          <div className="mt-3 rounded-[14px] border border-white/90 bg-white/70 px-3 py-[11px]">
            <div className="font-mono text-[9.5px] uppercase tracking-[.13em] text-[#78716c]">Cooler windows to be active</div>
            <div className="mt-[9px] flex flex-col gap-[9px]">
              {v.goodWindows.map((w) => (
                <div key={w.period} className="flex items-center gap-2.5">
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full" style={{ background: safety.chipBg, color: safety.chipInk }}>
                    {w.period === "evening" ? <Moon className="h-[17px] w-[17px]" /> : <Sun className="h-[17px] w-[17px]" />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-bold text-stone-900">
                      {w.period === "morning" ? "Morning" : "Evening"} · <span className="font-mono text-[13px]">{w.timeRange}</span>
                    </div>
                    <div className="text-[12.5px] font-semibold text-[#c2410c]">
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

      {/* HEAT CURVE */}
      <HeatClock curve={v.heatCurve} units={units} />

      {/* TODAY'S PLAN */}
      <section className={DC_CARD_WARM}>
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
        <h2 className="mt-[9px] text-[19px] font-bold leading-[1.25] tracking-[-.01em] text-stone-900">{plan.headline}</h2>
        {plan.adjustmentFromYesterday && v.yesterdayTargetMinutes != null && (
          <p className="mt-1 text-[12.5px] text-[#a8a29e]">
            Yesterday {v.yesterdayTargetMinutes} min → <strong className="text-[#57534e]">{plan.exposureMinutesTarget} min</strong> today.
          </p>
        )}

        {plan.exposureMinutesTarget > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <PlanPill icon={<Clock className="h-3.5 w-3.5" />}>{plan.exposureMinutesTarget} min</PlanPill>
            <PlanPill icon={<Activity className="h-3.5 w-3.5" />}>{INTENSITY_LABEL[plan.intensity] ?? plan.intensity}</PlanPill>
            <PlanPill icon={<Sun className="h-3.5 w-3.5" />}>{plan.timeWindow}</PlanPill>
          </div>
        )}

        <ol className="mt-[15px] flex list-none flex-col gap-[11px] p-0">
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

      {/* REST OF DAY (recovery) */}
      <section className={DC_CARD}>
        <div className="flex items-center justify-between gap-2">
          <span className={DC_MONO_HEAD}>The rest of your day</span>
          <span className="text-[13px] font-bold" style={{ color: "#c2410c" }}>peaks ~{fmtTemp(v.restOfDayPeakFeelsLikeC, units)}</span>
        </div>
        <p className="mt-1.5 text-[13px] font-medium text-[#44403c]">{v.restOfDay.title}</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
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

      {/* OVERNIGHT RECOVERY */}
      {v.overnight && (
        <OvernightCard overnight={v.overnight} lowFeelsLikeC={v.overnightLowFeelsLikeC} units={units} />
      )}

      {/* WHY */}
      <section className={DC_CARD}>
        <span className={DC_MONO_HEAD}>Why today looks like this</span>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#57534e]">{plan.rationale}</p>
      </section>

      {/* 7-DAY FORECAST STRIP */}
      <ForecastStrip days={p.forecastStrip} units={units} />

      {/* PROGRESS TRENDS */}
      <ProgressTrends state={state} />

      {/* FULL PROGRAM (tap a day) */}
      <ProgramSection view={p} units={units} />

      {/* WARNING SIGNS */}
      <section className={DC_CARD}>
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

      {process.env.NODE_ENV === "development" && (
        <div className="rounded-xl border border-dashed border-stone-300 p-3 text-center">
          <span className="text-xs text-stone-400">🧪 Testing only —</span>
          <button
            onClick={() => update({ ...state, dayOffset: (state.dayOffset ?? 0) + 1 })}
            className="ml-1 rounded-lg bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700 hover:bg-stone-200"
          >
            Simulate next day →
          </button>
        </div>
      )}

      {/* STICKY CTA */}
      <div className="sticky bottom-3 mt-1 flex flex-col gap-2">
        {loggedToday && (
          <p className="rounded-xl bg-emerald-50 px-3 py-1.5 text-center text-xs font-medium text-emerald-700 shadow-sm">
            ✓ Logged today — come back tomorrow for your next plan
          </p>
        )}
        <Link
          href="/log"
          className="flex items-center justify-center gap-2 rounded-[16px] p-[15px] text-[15px] font-bold text-white shadow-[0_12px_26px_-10px_rgba(234,88,12,.6)]"
          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}
        >
          {loggedToday ? "Update today's check-in" : "Log how today went"}
          <ArrowRight className="h-[17px] w-[17px]" />
        </Link>
      </div>

      <p className="mt-1 text-center text-[11px] leading-[1.5] text-[#a8a29e]">{plan.disclaimer}</p>
    </main>

    {/* Desktop layout (lg+): sidebar + 12-column bento (Today Dashboard - Desktop design). */}
    <div className="hidden lg:block">
      <DesktopToday
        v={v}
        p={p}
        state={state}
        units={units}
        setUnits={setUnits}
        loggedToday={loggedToday}
        onStartOver={() => {
          reset();
          router.push("/onboarding");
        }}
      />
    </div>
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-5 text-center">
      <Flame className="mb-3 h-8 w-8 animate-pulse text-orange-400" />
      {children}
    </main>
  );
}

function HeroStat({ label, value, valueColor, last }: { label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <div className={`px-1.5 py-3 text-center ${last ? "" : "border-r border-[#f4ead9]"}`}>
      <div className="font-mono text-[9px] uppercase tracking-[.1em] text-[#a8a29e]">{label}</div>
      <div className="mt-[3px] text-[19px] font-bold" style={{ color: valueColor ?? "#1c1917" }}>{value}</div>
    </div>
  );
}

