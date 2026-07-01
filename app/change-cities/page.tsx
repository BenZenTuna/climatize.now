"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { geocode, resolveOriginBaselineHeatIndexC, type GeoResult } from "@/lib/weather/open-meteo";
import { useAppState, type AppState } from "@/lib/store";
import { PlaceInput } from "@/app/onboarding/PlaceInput";
import { Brand } from "@/app/brand";
import { ArrowRight, Flame, Home, MapPin } from "@/app/icons";

const field =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";
const card = "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm";
const legend = "flex items-center gap-1.5 text-sm font-semibold text-slate-700";

function titleCase(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * "Change cities" — the non-destructive settings option. It updates where you are
 * (and, if you touch it, where your body is used to) while KEEPING everything else:
 * your goal, health answers, units, daily logs, and all adaptation progress. This is
 * the flow for a traveller who moves to a new city mid-trip. The origin baseline stays
 * frozen (decisions D23) unless the user actively edits the home field — so their
 * accumulated adaptation still applies against the new destination's heat.
 */
export default function ChangeCitiesPage() {
  const router = useRouter();
  const { state, ready, update } = useAppState();

  const [seeded, setSeeded] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [currentSel, setCurrentSel] = useState<GeoResult | null>(null);
  const [originText, setOriginText] = useState("");
  const [originSel, setOriginSel] = useState<GeoResult | null>(null);
  const [originBand, setOriginBand] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Seed the fields from stored state once it's read from localStorage.
  useEffect(() => {
    if (!ready) return;
    if (!state) {
      router.replace("/onboarding");
      return;
    }
    if (seeded) return;
    setCurrentText(state.current.label);
    setOriginText(state.origin.band ? "" : state.origin.label);
    setOriginBand(state.origin.band ?? "");
    setSeeded(true);
  }, [ready, state, seeded, router]);

  if (!ready || !state || !seeded) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-5 text-center">
        <Flame className="mb-3 h-8 w-8 animate-pulse text-orange-400" />
        <span className="text-stone-600">Loading…</span>
      </main>
    );
  }

  const s = state;
  const originPrefill = s.origin.band ? "" : s.origin.label;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      // Destination — required.
      const current =
        currentSel ?? (currentText.trim() ? await geocode(currentText).catch(() => null) : null);
      if (!current) {
        setError(
          currentText.trim()
            ? `Couldn't find "${currentText}". Pick a suggestion, or try a city like "Dubai".`
            : "Please tell us where you are now.",
        );
        return;
      }

      // Origin — only re-resolve if the user actually touched it; otherwise keep the
      // frozen baseline untouched (D23). Clearing it entirely is a no-op (non-destructive).
      const bandChanged = originBand !== (s.origin.band ?? "");
      const textChanged = originSel != null || originText.trim() !== originPrefill.trim();
      let origin = s.origin;
      if (bandChanged || textChanged) {
        const picked =
          originSel ?? (originText.trim() ? await geocode(originText).catch(() => null) : null);
        const band = originBand || null;
        if (picked || band) {
          const baselineHeatIndexC = await resolveOriginBaselineHeatIndexC({
            lat: picked?.latitude,
            lon: picked?.longitude,
            band,
          });
          origin = {
            label: picked?.label ?? (band ? `${titleCase(band)} climate` : s.origin.label),
            lat: picked?.latitude ?? null,
            lon: picked?.longitude ?? null,
            band: picked ? null : band,
            baselineHeatIndexC,
          };
        }
      }

      const next: AppState = {
        ...s,
        current: { label: current.label, lat: current.latitude, lon: current.longitude },
        origin,
      };
      update(next);
      router.push("/today");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-5">
      <Brand className="mb-6" />
      <header className="rise mb-8 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-white shadow-sm">
        <MapPin className="h-7 w-7 text-white/90" />
        <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">Change your cities</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/90">
          Moving somewhere new? Point your plan at where you are now. We keep everything else — your
          goal, health answers, daily logs, and all of your adaptation progress.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        {/* Destination — the main thing this page changes */}
        <fieldset className={`flex flex-col gap-3 ${card}`}>
          <legend className={legend}>
            <MapPin className="h-4 w-4 text-orange-500" /> Where are you now?
          </legend>
          <PlaceInput
            placeholder="City you're in now, e.g. Doha"
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
            Currently set to <strong className="text-slate-700">{s.current.label}</strong>. Your
            browser reads the live weather here — your location never leaves your device.
          </p>
        </fieldset>

        {/* Origin — optional; frozen unless edited */}
        <fieldset className={`flex flex-col gap-3 ${card}`}>
          <legend className={legend}>
            <Home className="h-4 w-4 text-orange-500" /> Where your body is used to
            <span className="font-normal text-slate-400">· optional</span>
          </legend>
          <p className="text-xs text-slate-500">
            Leave this as-is unless your <em>home base</em> has actually changed — it&apos;s the
            reference your progress is measured from, so we keep it fixed for your trip. Editing it
            re-estimates your starting point from that home&apos;s recent weather.
          </p>
          <PlaceInput
            placeholder={originPrefill || "Home city, e.g. London"}
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
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>or pick a climate:</span>
            <select
              className={field + " max-w-xs"}
              value={originBand}
              onChange={(e) => setOriginBand(e.target.value)}
            >
              <option value="">—</option>
              <option value="COOL">Cool</option>
              <option value="TEMPERATE">Temperate / mild</option>
              <option value="WARM">Warm</option>
              <option value="HOT_HUMID">Hot &amp; humid</option>
            </select>
          </div>
        </fieldset>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <Link
            href="/today"
            className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:from-orange-600 hover:to-orange-700 disabled:opacity-60"
          >
            {pending ? "Reading the weather…" : <>Save & keep my progress <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>

        <p className="text-center text-xs leading-relaxed text-slate-400">
          Want to change your goal, health answers, or units too? Use{" "}
          <em>Start from the beginning</em> from the settings menu — that rebuilds your plan from
          scratch.
        </p>
      </form>
    </main>
  );
}
