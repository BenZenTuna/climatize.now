"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/store";
import { buildTodayView, buildProgramView, currentProgramDay, type TodayView, type ProgramView } from "@/lib/client-program";
import { ProgramSection } from "@/app/program-list";
import { ProgressTrends } from "@/app/progress-trends";
import { Brand } from "@/app/brand";
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
import { fmtTemp, fmtTempRange, heatTextColor, PERSONA_LABEL } from "@/lib/units";
import type { SafetyLevel } from "@/lib/physiology/types";

const SAFETY: Record<SafetyLevel, { card: string; chip: string; dot: string; label: string; sub: string }> = {
  NORMAL: {
    card: "border-emerald-200 bg-emerald-50",
    chip: "bg-emerald-100 text-emerald-700",
    dot: "text-emerald-600",
    label: "Good to go — gently",
    sub: "The window you'll exercise in is in the safe range. Keep it light and stop if you feel unwell.",
  },
  CAUTION: {
    card: "border-amber-200 bg-amber-50",
    chip: "bg-amber-100 text-amber-800",
    dot: "text-amber-600",
    label: "Caution — keep it easy",
    sub: "Conditions are on the warm side, so today's plan is capped and kept gentle.",
  },
  HARD_STOP: {
    card: "border-red-200 bg-red-50",
    chip: "bg-red-100 text-red-800",
    dot: "text-red-600",
    label: "Stop — too dangerous for heat today",
    sub: "Even the coolest hours are unsafe. Shelter and cool only — no exposure today.",
  },
};

const INTENSITY_LABEL: Record<string, string> = { REST: "passive", LIGHT: "light", MODERATE: "light–moderate" };

const ADJUST: Record<string, { text: string; cls: string }> = {
  ADVANCED: { text: "Advanced ↑", cls: "bg-emerald-100 text-emerald-800" },
  HELD: { text: "Held →", cls: "bg-slate-100 text-slate-700" },
  REDUCED: { text: "Reduced ↓", cls: "bg-amber-100 text-amber-800" },
  ABORTED: { text: "Rest day ⏸", cls: "bg-red-100 text-red-800" },
};

export default function TodayPage() {
  const router = useRouter();
  const { state, ready, update, reset } = useAppState();
  const [view, setView] = useState<TodayView | null>(null);
  const [program, setProgram] = useState<ProgramView | null>(null);
  const [error, setError] = useState(false);

  const fetchKey = state
    ? `${currentProgramDay(state)}:${state.current.lat}:${state.current.lon}`
    : null;

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
        <p className="text-slate-600">Couldn&apos;t reach the weather service. Check your connection.</p>
        <button onClick={() => location.reload()} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 font-medium text-white">
          Retry
        </button>
      </Centered>
    );
  }

  const { plan, units } = view!;
  const safety = SAFETY[plan.safetyLevel];
  const SafetyIcon = plan.safetyLevel === "NORMAL" ? ShieldCheck : Alert;
  const windowIsNight = /night|evening/i.test(plan.timeWindow);
  const loggedToday = !!state.logs[view!.programDay];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-5">
      <div className="mb-4 flex items-center justify-between">
        <Brand />
        <button
          onClick={() => {
            reset();
            router.push("/onboarding");
          }}
          className="rounded-full px-3 py-1 text-xs text-slate-400 hover:bg-white hover:text-slate-600"
        >
          Start over
        </button>
      </div>

      {/* Hero: location + live conditions */}
      <section className="rise overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 px-5 py-4 text-white">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/80">
            Day {view!.programDay + 1} of your program
          </div>
          <h1 className="mt-1 flex items-center gap-1.5 text-2xl font-bold leading-tight">
            <MapPin className="h-5 w-5 shrink-0 text-white/90" />
            {view!.currentLabel}
          </h1>
          <p className="text-sm text-white/85">{PERSONA_LABEL[state.persona] ?? state.persona}</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <HeroStat icon={<Thermometer className="h-4 w-4" />} label="Right now" value={fmtTemp(view!.current.tempC, units)} />
          <HeroStat
            icon={<Sun className="h-4 w-4" />}
            label="Feels like"
            value={fmtTemp(view!.current.apparentTempC, units)}
            valueClass={heatTextColor(view!.current.apparentTempC)}
          />
          <HeroStat icon={<Droplet className="h-4 w-4" />} label="Humidity" value={`${Math.round(view!.current.humidityPct)}%`} />
        </div>
      </section>

      {/* Safety verdict + when-to-go window (merged into one colour-coded card) */}
      <section className={`mt-4 rounded-2xl border p-4 ${safety.card}`}>
        <div className={`flex items-center gap-2 text-base font-semibold ${safety.dot}`}>
          <SafetyIcon className="h-5 w-5 shrink-0" />
          <span className="text-slate-900">{safety.label}</span>
        </div>
        <p className="mt-1 text-sm text-slate-700">{safety.sub}</p>

        {plan.exposureMinutesTarget > 0 && view!.goodWindows.length > 0 && (
          <div className="mt-3 rounded-xl border border-white/70 bg-white/70 px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {view!.goodWindows.length > 1 ? "Good windows to be outside" : "Best window to be outside"}
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {view!.goodWindows.map((w) => (
                <div key={w.period} className="flex items-center gap-2.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${safety.chip}`}>
                    {w.period === "evening" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-bold text-slate-900">
                        {w.period === "morning" ? "Morning" : "Evening"} · {w.timeRange}
                      </span>
                      <span className={`text-sm font-semibold ${heatTextColor(w.feelsHighC)}`}>
                        {fmtTempRange(w.feelsLowC, w.feelsHighC, units)}
                      </span>
                    </div>
                    {w.isEstimate && (
                      <div className="text-xs text-slate-400">Estimated — forecast not yet available</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(view!.nowSafetyLevel === "CAUTION" || view!.nowSafetyLevel === "HARD_STOP") &&
          plan.exposureMinutesTarget > 0 && (
            <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
              <Sun className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                It&apos;s {view!.nowSafetyLevel === "HARD_STOP" ? "dangerously hot" : "very hot"} right now (
                {fmtTemp(view!.current.apparentTempC, units)}) — that&apos;s exactly why your session is
                timed for the cooler window above, not this moment.
              </span>
            </p>
          )}

        {plan.cautions.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {plan.cautions.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {plan.adjustmentFromYesterday && view!.yesterdayTargetMinutes != null && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ADJUST[plan.adjustmentFromYesterday].cls}`}>
            {ADJUST[plan.adjustmentFromYesterday].text}
          </span>
          <span className="text-slate-600">
            Yesterday {view!.yesterdayTargetMinutes} min → <strong>{plan.exposureMinutesTarget} min</strong> today.
          </span>
        </div>
      )}

      {/* The plan — hero card */}
      <section className="rise mt-4 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-orange-600">
          <Flame className="h-3.5 w-3.5" /> Today&apos;s plan
        </div>
        <h2 className="mt-1 text-xl font-bold leading-snug text-slate-900">{plan.headline}</h2>

        {plan.exposureMinutesTarget > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill icon={<Clock className="h-3.5 w-3.5" />}>{plan.exposureMinutesTarget} min</Pill>
            <Pill icon={<Activity className="h-3.5 w-3.5" />}>{INTENSITY_LABEL[plan.intensity] ?? plan.intensity} effort</Pill>
            <Pill icon={windowIsNight ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}>{plan.timeWindow}</Pill>
          </div>
        )}

        <ol className="mt-4 space-y-2.5">
          {plan.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-slate-700">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                {i + 1}
              </span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
          <Droplet className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
          <span>
            <strong>Hydration:</strong> {plan.hydration}
          </span>
        </div>
      </section>

      {/* The rest of the day — climate-aware recovery guidance */}
      <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Thermometer className="h-4 w-4 text-orange-500" /> The rest of your day
          </h3>
          <span className={`text-sm font-bold ${heatTextColor(view!.restOfDayPeakFeelsLikeC)}`}>
            peaks ~{fmtTemp(view!.restOfDayPeakFeelsLikeC, units)}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-slate-800">{view!.restOfDay.title}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-sky-800">
              <Home className="h-4 w-4" /> If you have AC / cooling
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{view!.restOfDay.withAC}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
              <Wind className="h-4 w-4" /> If you don&apos;t
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{view!.restOfDay.withoutAC}</p>
          </div>
        </div>
        <p className="mt-3 text-xs italic text-slate-500">{view!.restOfDay.recoveryNote}</p>
      </section>

      {/* Why */}
      <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Why today looks like this</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{plan.rationale}</p>
      </section>

      {/* Warning signs */}
      <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Alert className="h-4 w-4 text-amber-500" /> Know the warning signs
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <RecognitionList title="Heat exhaustion" items={plan.recognition.heatExhaustion} tone="amber" />
          <RecognitionList title="Heat stroke (emergency)" items={plan.recognition.heatStroke} tone="red" />
        </div>
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-red-800">
            <Alert className="h-4 w-4" /> Stop and seek help now if:
          </div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-red-700">
            {plan.recognition.stopNow.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <ProgressTrends state={state} />

      {program && <ProgramSection view={program} />}

      {process.env.NODE_ENV === "development" && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-3 text-center">
          <span className="text-xs text-slate-400">🧪 Testing only —</span>
          <button
            onClick={() => update({ ...state, dayOffset: (state.dayOffset ?? 0) + 1 })}
            className="ml-1 rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Simulate next day →
          </button>
        </div>
      )}

      <div className="sticky bottom-4 mt-8 flex flex-col gap-2">
        {loggedToday && (
          <p className="rounded-xl bg-emerald-50 px-3 py-1.5 text-center text-xs font-medium text-emerald-700 shadow-sm">
            ✓ Logged today — come back tomorrow for your next plan
          </p>
        )}
        <Link
          href="/log"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3.5 text-center font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:from-orange-600 hover:to-orange-700"
        >
          {loggedToday ? "Update today's check-in" : "Log how today went"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">{plan.disclaimer}</p>
    </main>
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

function HeroStat({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="px-2 py-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        <span className="text-slate-300">{icon}</span>
        {label}
      </div>
      <div className={`mt-0.5 text-xl font-bold ${valueClass ?? "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-800 ring-1 ring-orange-100">
      <span className="text-orange-500">{icon}</span>
      {children}
    </span>
  );
}

function RecognitionList({ title, items, tone }: { title: string; items: string[]; tone: "amber" | "red" }) {
  const head = tone === "red" ? "text-red-700" : "text-amber-700";
  return (
    <div>
      <div className={`text-sm font-semibold ${head}`}>{title}</div>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-600">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
