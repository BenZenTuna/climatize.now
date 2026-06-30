"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces, type GeoResult } from "@/lib/weather/open-meteo";

const fieldClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

/**
 * A text input with live place suggestions (Open-Meteo geocoding). As the user
 * types, it shows matching cities; picking one locks in its coordinates so we
 * never have to guess at submit time.
 */
export function PlaceInput({
  placeholder,
  value,
  onChange,
  onSelect,
  selected,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: GeoResult) => void;
  selected: GeoResult | null;
}) {
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const reqId = useRef(0);
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setSearched(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const res = await searchPlaces(q, 5).catch(() => []);
      if (id !== reqId.current) return; // a newer keystroke superseded this
      setSuggestions(res);
      setSearched(true);
      setLoading(false);
      setOpen(true);
    }, 250);
    return () => clearTimeout(t);
  }, [value]);

  function pick(p: GeoResult) {
    skipNext.current = true; // setting the text below shouldn't trigger a new search
    onSelect(p);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <input
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && open && suggestions.length > 0) {
            e.preventDefault(); // pick the top match instead of submitting the form
            pick(suggestions[0]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {open && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading && <li className="px-3 py-2 text-sm text-slate-400">Searching…</li>}
          {!loading && searched && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400">No matches — try a city name.</li>
          )}
          {!loading &&
            suggestions.map((p, i) => (
              <li key={`${p.latitude},${p.longitude},${i}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // fire before input blur closes the list
                  onClick={() => pick(p)}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-orange-50"
                >
                  {p.label}
                </button>
              </li>
            ))}
        </ul>
      )}

      {selected && !open && (
        <p className="mt-1 text-xs text-emerald-600">✓ {selected.label}</p>
      )}
    </div>
  );
}
