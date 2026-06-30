"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// Change this constant if you chose a different site code when signing up on goatcounter.com
const GC_SITE = "climatize-now";
const TOKEN_KEY = "climatize.stats.gc_token";

type Period = "7d" | "30d" | "90d";

interface DayStat {
  day: string;
  count: number;
  count_unique: number;
}

interface Totals {
  count: number;
  unique: number;
}

function dateRange(period: Period) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (period === "7d" ? 6 : period === "30d" ? 29 : 89));
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(start), end: fmt(end) };
}

function BarChart({ data }: { data: DayStat[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-px h-28">
        {data.map((d) => {
          const pct = Math.max(Math.round((d.count / max) * 100), d.count > 0 ? 2 : 0);
          return (
            <div key={d.day} className="relative flex-1 group flex flex-col justify-end h-full">
              <div
                className="bg-orange-400 rounded-t-sm group-hover:bg-orange-500 transition-colors w-full"
                style={{ height: `${pct}%` }}
              />
              {d.count > 0 && (
                <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
                  <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                    {d.day.slice(5)}: {d.count}
                  </div>
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 select-none">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-800">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

export default function StatsPage() {
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [days, setDays] = useState<DayStat[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [corsBlocked, setCorsBlocked] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) setSavedToken(t);
  }, []);

  const fetchStats = useCallback(async (tok: string, p: Period) => {
    setLoading(true);
    setError("");
    setCorsBlocked(false);
    const { start, end } = dateRange(p);
    try {
      const res = await fetch(
        `https://${GC_SITE}.goatcounter.com/api/v0/stats/hits?start=${start}&end=${end}&daily=true`,
        { headers: { Authorization: `Bearer ${tok}` } }
      );
      if (res.status === 401) {
        throw new Error("Invalid API token. Check your GoatCounter API key and try again.");
      }
      if (!res.ok) throw new Error(`GoatCounter API returned ${res.status}.`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      // GoatCounter may use "hits" or "stats" depending on version
      const statRows: DayStat[] = (data.hits ?? data.stats ?? []).map((r: DayStat) => ({
        day: r.day,
        count: r.count ?? 0,
        count_unique: r.count_unique ?? 0,
      }));
      setDays(statRows);
      const totalCount = data.total_count ?? data.total?.count ?? statRows.reduce((s, r) => s + r.count, 0);
      const uniqueCount = data.total_count_unique ?? data.total?.count_unique ?? statRows.reduce((s, r) => s + r.count_unique, 0);
      setTotals({ count: totalCount, unique: uniqueCount });
    } catch (err) {
      if (err instanceof TypeError) {
        // Likely a CORS block
        setCorsBlocked(true);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (savedToken) fetchStats(savedToken, period);
  }, [savedToken, period, fetchStats]);

  function handleSaveToken(e: React.FormEvent) {
    e.preventDefault();
    const t = token.trim();
    if (!t) return;
    localStorage.setItem(TOKEN_KEY, t);
    setSavedToken(t);
  }

  function handleDisconnect() {
    localStorage.removeItem(TOKEN_KEY);
    setSavedToken(null);
    setDays(null);
    setTotals(null);
    setToken("");
    setError("");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-5 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
            ← Back
          </Link>
          {savedToken && (
            <button
              onClick={handleDisconnect}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800">Site statistics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Powered by{" "}
            <a
              href="https://www.goatcounter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-orange-500"
            >
              GoatCounter
            </a>{" "}
            — no cookies, no personal data, GDPR-compliant aggregate counts only.
          </p>
        </div>

        {/* Setup screen */}
        {!savedToken && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-semibold text-slate-700">Connect GoatCounter</h2>
              <ol className="mt-3 space-y-1.5 text-sm text-slate-600 list-decimal list-inside">
                <li>
                  Create a free account at{" "}
                  <a
                    href="https://www.goatcounter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 underline"
                  >
                    goatcounter.com
                  </a>{" "}
                  — use site code <strong>climatize-now</strong>
                </li>
                <li>
                  In GoatCounter → <strong>Settings → API</strong>, create a token (read-only is fine)
                </li>
                <li>Paste it below — it stays in your browser only, never sent anywhere</li>
              </ol>
            </div>
            <form onSubmit={handleSaveToken} className="space-y-3">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="GoatCounter API token"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="submit"
                disabled={!token.trim()}
                className="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                Connect
              </button>
            </form>
          </div>
        )}

        {/* Stats screen */}
        {savedToken && (
          <>
            {/* Period selector */}
            <div className="flex gap-2 flex-wrap">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
                    period === p
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {p === "7d" ? "Last 7 days" : p === "30d" ? "Last 30 days" : "Last 90 days"}
                </button>
              ))}
              <button
                onClick={() => fetchStats(savedToken, period)}
                disabled={loading}
                className="rounded-xl px-3 py-1.5 text-sm text-slate-400 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors ml-auto"
              >
                ↻ Refresh
              </button>
            </div>

            {/* Errors */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {corsBlocked && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-800 space-y-2">
                <p className="font-semibold">Browser blocked the API request (CORS)</p>
                <p>
                  GoatCounter&apos;s stats API may not allow browser-direct calls. Open your full
                  dashboard on GoatCounter instead:
                </p>
                <a
                  href={`https://${GC_SITE}.goatcounter.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 rounded-lg bg-orange-500 text-white text-xs font-semibold px-4 py-2 hover:bg-orange-600 transition-colors"
                >
                  Open GoatCounter dashboard →
                </a>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-16 text-slate-400 text-sm">Loading stats…</div>
            )}

            {/* Data */}
            {!loading && !corsBlocked && days && (
              <>
                {totals && (
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard label="Page views" value={totals.count} sub="in selected period" />
                    <StatCard
                      label="Unique visitors"
                      value={totals.unique}
                      sub="estimated, privacy-safe"
                    />
                  </div>
                )}

                {days.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      Daily page views
                    </p>
                    <BarChart data={days} />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
                    No data yet for this period. Make sure the tracking script has been deployed.
                  </div>
                )}

                <p className="text-center">
                  <a
                    href={`https://${GC_SITE}.goatcounter.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-orange-500 underline transition-colors"
                  >
                    Full dashboard on GoatCounter →
                  </a>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
