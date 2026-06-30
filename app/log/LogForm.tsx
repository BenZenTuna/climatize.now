"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState, type StoredLog } from "@/lib/store";
import { currentProgramDay } from "@/lib/client-program";
import { Brand } from "@/app/brand";
import { ArrowRight } from "@/app/icons";

const RATINGS: { name: string; label: string; low: string; high: string }[] = [
  { name: "sweatResponse", label: "How was your sweating?", low: "barely", high: "quick & free" },
  { name: "perceivedExertion", label: "How hard did it feel?", low: "very easy", high: "very hard" },
  { name: "sleepQuality", label: "Last night's sleep", low: "poor", high: "great" },
  { name: "thirst", label: "Thirst today", low: "none", high: "severe" },
];

const EMOJI = ["😣", "🙁", "😐", "🙂", "😄"];

function EmojiRow({ name, label }: { name: string; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex justify-between gap-2">
        {EMOJI.map((e, idx) => {
          const n = idx + 1;
          return (
            <label
              key={n}
              className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-2.5 text-center text-2xl transition has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50 has-[:checked]:ring-2 has-[:checked]:ring-orange-200"
            >
              <input type="radio" name={name} value={n} defaultChecked={n === 3} className="sr-only" />
              {e}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function RatingRow({ name, label, low, high }: { name: string; label: string; low: string; high: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-3">
        <span className="w-16 shrink-0 text-right text-xs text-slate-400">{low}</span>
        <div className="flex flex-1 justify-between gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-sm text-slate-600 transition has-[:checked]:border-orange-500 has-[:checked]:bg-orange-500 has-[:checked]:text-white"
            >
              <input type="radio" name={name} value={n} defaultChecked={n === 3} className="sr-only" />
              {n}
            </label>
          ))}
        </div>
        <span className="w-16 shrink-0 text-xs text-slate-400">{high}</span>
      </div>
    </div>
  );
}

export default function LogForm() {
  const router = useRouter();
  const { state, ready, update } = useAppState();

  useEffect(() => {
    if (ready && !state) router.replace("/onboarding");
  }, [ready, state, router]);

  if (!ready || !state) {
    return <main className="mx-auto max-w-2xl px-5 py-16 text-center text-slate-500">Loading…</main>;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!state) return;
    const fd = new FormData(e.currentTarget);
    const num = (n: string, d = 3) => {
      const v = Number(fd.get(n));
      return Number.isFinite(v) ? v : d;
    };
    const cb = (n: string) => fd.get(n) === "on";
    const D = currentProgramDay(state);
    const log: StoredLog = {
      completedExposure: fd.get("completedExposure") !== "no",
      sweatResponse: num("sweatResponse"),
      perceivedExertion: num("perceivedExertion"),
      sleepQuality: num("sleepQuality"),
      thirst: num("thirst"),
      overallFeeling: num("overallFeeling"),
      headache: cb("headache"),
      dizziness: cb("dizziness"),
      nausea: cb("nausea"),
      redFlag: cb("redFlag"),
      notes: String(fd.get("notes") ?? "").trim() || null,
    };
    update({ ...state, logs: { ...state.logs, [D]: log } });
    router.push("/today");
  }

  const cardClass = "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-5">
      <Brand className="mb-4" />
      <header className="mb-6">
        <Link href="/today" className="text-sm text-slate-400 hover:text-slate-600">
          ← Back to today
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          How did day {currentProgramDay(state) + 1} go?
        </h1>
        <p className="mt-1 text-slate-600">A quick check-in. This is what adjusts tomorrow&apos;s plan.</p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <fieldset className={`flex flex-col gap-3 ${cardClass}`}>
          <EmojiRow name="overallFeeling" label="Overall, how did you feel?" />
        </fieldset>

        <fieldset className={`flex flex-col gap-2 ${cardClass}`}>
          <span className="text-sm font-medium text-slate-700">Did you do today&apos;s exposure?</span>
          <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm">
            <label className="flex-1 cursor-pointer py-2 text-center has-[:checked]:bg-orange-500 has-[:checked]:text-white">
              <input type="radio" name="completedExposure" value="yes" defaultChecked className="sr-only" />
              Yes
            </label>
            <label className="flex-1 cursor-pointer py-2 text-center has-[:checked]:bg-orange-500 has-[:checked]:text-white">
              <input type="radio" name="completedExposure" value="no" className="sr-only" />
              No / skipped
            </label>
          </div>
        </fieldset>

        <fieldset className={`flex flex-col gap-4 ${cardClass}`}>
          {RATINGS.map((r) => (
            <RatingRow key={r.name} {...r} />
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="text-sm font-medium text-slate-700">Any of these today?</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["headache", "Headache"],
              ["dizziness", "Dizziness / lightheaded"],
              ["nausea", "Nausea"],
            ].map(([name, label]) => (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-white/60 px-2 py-1.5 text-sm text-slate-700 has-[:checked]:bg-white has-[:checked]:ring-1 has-[:checked]:ring-amber-300"
              >
                <input type="checkbox" name={name} className="h-4 w-4 accent-orange-500" />
                {label}
              </label>
            ))}
          </div>
          <label className="mt-1 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">
            <input type="checkbox" name="redFlag" className="mt-0.5 h-4 w-4 accent-red-500" />
            <span>Something scarier — confusion, fainting, repeated vomiting, or you stopped sweating in the heat.</span>
          </label>
        </fieldset>

        <label className={`flex flex-col gap-1 text-sm text-slate-700 ${cardClass}`}>
          Anything else? (optional)
          <textarea
            name="notes"
            rows={2}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </label>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:from-orange-600 hover:to-orange-700"
        >
          Save today&apos;s check-in <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </main>
  );
}
