"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { geocode, resolveOriginBaselineHeatIndexC, type GeoResult } from "@/lib/weather/open-meteo";
import { saveState, type AppState } from "@/lib/store";
import type { AgeBand, Persona } from "@/lib/physiology/types";
import { PlaceInput } from "./PlaceInput";
import { Activity, ArrowRight, Droplet, MapPin, Sun, Thermometer } from "@/app/icons";

const personas = [
  {
    value: "ACCLIMATIZER",
    icon: <Thermometer className="h-5 w-5" />,
    title: "Adapt to a hotter place",
    blurb: "Relocating or arriving somewhere hotter or more humid. Build tolerance safely over ~2 weeks.",
  },
  {
    value: "LEARN_TO_SWEAT",
    icon: <Droplet className="h-5 w-5" />,
    title: "Restore my sweat response",
    blurb: "After lots of air conditioning, gently retrain your body to sweat efficiently again.",
  },
  {
    value: "VACATIONER",
    icon: <Sun className="h-5 w-5" />,
    title: "Salvage a hot trip",
    blurb: "Short trip, feeling rough. Damage control, cooling, and the best possible remaining days.",
  },
];

const field =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";
const card = "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm";
const legend = "flex items-center gap-1.5 text-sm font-semibold text-slate-700";

function titleCase(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [currentSel, setCurrentSel] = useState<GeoResult | null>(null);
  const [originText, setOriginText] = useState("");
  const [originSel, setOriginSel] = useState<GeoResult | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const cb = (n: string) => fd.get(n) === "on";

    setError(null);
    setPending(true);
    try {
      const persona = fd.get("persona") as Persona | null;
      if (!persona) return setError("Please choose a goal to continue.");
      if (!cb("acknowledge"))
        return setError("Please read and accept the disclaimer before continuing.");

      const current =
        currentSel ?? (currentText.trim() ? await geocode(currentText).catch(() => null) : null);
      if (!current)
        return setError(
          currentText.trim()
            ? `Couldn't find "${currentText}". Pick a suggestion, or try a city like "Dubai".`
            : "Please tell us where you are now.",
        );

      const origin =
        originSel ?? (originText.trim() ? await geocode(originText).catch(() => null) : null);
      const band = String(fd.get("originBand") ?? "").trim() || null;
      if (!origin && !band)
        return setError("Tell us where your body is used to — a home city, or pick a climate.");

      const baselineHeatIndexC = await resolveOriginBaselineHeatIndexC({
        lat: origin?.latitude,
        lon: origin?.longitude,
        band,
      });

      const tripEnd = String(fd.get("tripEndDate") ?? "").trim();

      const state: AppState = {
        version: 1,
        persona,
        units: fd.get("units") === "F" ? "F" : "C",
        origin: {
          label: origin?.label ?? (band ? `${titleCase(band)} climate` : "Not specified"),
          lat: origin?.latitude ?? null,
          lon: origin?.longitude ?? null,
          band: origin ? null : band,
          baselineHeatIndexC,
        },
        current: { label: current.label, lat: current.latitude, lon: current.longitude },
        screening: {
          ageBand: (fd.get("ageBand") as AgeBand) || "18_64",
          heartCondition: cb("heartCondition"),
          kidneyCondition: cb("kidneyCondition"),
          pregnant: cb("pregnant"),
          takingDiuretics: cb("takingDiuretics"),
          takingBetaBlockers: cb("takingBetaBlockers"),
          takingAnticholinergics: cb("takingAnticholinergics"),
          otherHeatCondition: cb("otherHeatCondition"),
        },
        tripEndISO: tripEnd ? new Date(tripEnd).toISOString() : null,
        startISO: new Date().toISOString(),
        dayOffset: 0,
        logs: {},
        history: {},
      };

      saveState(state);
      router.push("/today");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* Goal */}
      <fieldset className="flex flex-col gap-3">
        <legend className={legend}>What brings you here?</legend>
        <div className="grid gap-3">
          {personas.map((p) => (
            <label
              key={p.value}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50 has-[:checked]:ring-2 has-[:checked]:ring-orange-200"
            >
              <input type="radio" name="persona" value={p.value} className="sr-only" />
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                {p.icon}
              </span>
              <span>
                <span className="block font-semibold text-slate-900">{p.title}</span>
                <span className="mt-0.5 block text-sm text-slate-600">{p.blurb}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Locations */}
      <fieldset className={`flex flex-col gap-3 ${card}`}>
        <legend className={legend}>
          <MapPin className="h-4 w-4 text-orange-500" /> Your locations
        </legend>

        <label className="text-sm font-medium text-slate-700">Where are you now?</label>
        <PlaceInput
          placeholder="City you're in now, e.g. Dubai"
          value={currentText}
          onChange={(v) => {
            setCurrentText(v);
            setCurrentSel(null);
          }}
          onSelect={(p) => {
            setCurrentText(p.label);
            setCurrentSel(p);
          }}
          selected={currentSel}
        />
        <p className="text-xs text-slate-500">
          Your browser reads the live weather here — your location never leaves your device.
        </p>

        <label className="mt-2 text-sm font-medium text-slate-700">
          Where is your body used to? (home / origin climate)
        </label>
        <PlaceInput
          placeholder="Home city, e.g. London"
          value={originText}
          onChange={(v) => {
            setOriginText(v);
            setOriginSel(null);
          }}
          onSelect={(p) => {
            setOriginText(p.label);
            setOriginSel(p);
          }}
          selected={originSel}
        />
        <p className="text-xs text-slate-500">
          We estimate what your body is used to from your home&apos;s recent weather (about the last
          3 weeks, weighted toward the most recent days).
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>or pick a climate:</span>
          <select name="originBand" className={field + " max-w-xs"} defaultValue="">
            <option value="">—</option>
            <option value="COOL">Cool</option>
            <option value="TEMPERATE">Temperate / mild</option>
            <option value="WARM">Warm</option>
            <option value="HOT_HUMID">Hot &amp; humid</option>
          </select>
        </div>
      </fieldset>

      {/* Preferences */}
      <fieldset className={`flex flex-col gap-3 ${card}`}>
        <legend className={legend}>
          <Activity className="h-4 w-4 text-orange-500" /> Preferences
        </legend>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">Units</span>
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              <label className="cursor-pointer px-3 py-1.5 text-sm has-[:checked]:bg-orange-500 has-[:checked]:text-white">
                <input type="radio" name="units" value="C" defaultChecked className="sr-only" />
                °C
              </label>
              <label className="cursor-pointer px-3 py-1.5 text-sm has-[:checked]:bg-orange-500 has-[:checked]:text-white">
                <input type="radio" name="units" value="F" className="sr-only" />
                °F
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Trip ends (optional)
            <input type="date" name="tripEndDate" className={field + " w-auto"} />
          </label>
        </div>
      </fieldset>

      {/* Health screening */}
      <fieldset className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <legend className={legend + " px-1"}>A few health questions (for your safety)</legend>
        <p className="text-xs text-slate-600">
          These affect how the heat treats you, so they shape — or pause — your plan. They stay on
          your device.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          Age
          <select name="ageBand" className={field + " w-auto"} defaultValue="18_64">
            <option value="UNDER_18">Under 18</option>
            <option value="18_64">18–64</option>
            <option value="65_PLUS">65 or older</option>
          </select>
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["heartCondition", "Heart condition"],
            ["kidneyCondition", "Kidney condition"],
            ["pregnant", "Pregnant"],
            ["otherHeatCondition", "Other condition affecting heat tolerance"],
            ["takingDiuretics", "Taking diuretics"],
            ["takingBetaBlockers", "Taking beta-blockers"],
            ["takingAnticholinergics", "Taking anticholinergics"],
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
      </fieldset>

      {/* Disclaimer + Acknowledgement */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-1.5">
        <p className="font-semibold text-amber-800 uppercase tracking-wide text-[10px]">Important — please read</p>
        <p>
          climatize.now provides <strong>AI-generated wellness guidance only</strong>. It is{" "}
          <strong>not a substitute for professional medical advice, diagnosis, or treatment.</strong>
        </p>
        <p>
          By using this platform you accept full responsibility for your own health and safety. All
          recommendations are used entirely <strong>at your own risk.</strong> If you have any
          medical condition, consult a qualified healthcare professional before following any heat
          acclimatization programme.
        </p>
        <p>
          The creators of climatize.now accept <strong>no liability</strong> for any injury, illness,
          or adverse health outcome arising from use of these recommendations.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm cursor-pointer">
        <input type="checkbox" name="acknowledge" className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500" />
        <span>
          I have read the disclaimer above. I understand this is{" "}
          <strong>AI-generated wellness guidance, not professional medical advice</strong>, and that
          I use all recommendations <strong>at my own risk</strong>. I will stop and seek medical
          help immediately if I feel unwell.
        </span>
      </label>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:from-orange-600 hover:to-orange-700 disabled:opacity-60"
      >
        {pending ? "Reading the weather…" : <>Build my first day <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}
