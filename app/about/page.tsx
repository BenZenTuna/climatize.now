import Link from "next/link";
import type { Metadata } from "next";
import { Brand } from "@/app/brand";
import { Flame, Thermometer, ArrowRight } from "@/app/icons";

export const metadata: Metadata = {
  title: "About — climatize.now",
  description:
    "Why climatize.now exists: a personal, weather-driven heat-acclimatization dashboard, built after getting sick from the heat while travelling — and shared for anyone who needs the same.",
};

export default function About() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-5">
      <Brand className="mb-6" />
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
        ← Back to climatize.now
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="text-3xl font-bold text-slate-900">About</h1>
        <p className="mt-2 text-slate-600">A small tool, built from a real problem.</p>
      </header>

      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Flame className="h-5 w-5 text-orange-500" /> Why this exists
          </h2>
          <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-600">
            <p>
              I built climatize.now after getting sick from the heat while travelling. Arriving
              somewhere much hotter than home, I went looking for a simple, personalized way to
              adapt to it <strong>safely</strong> — and couldn&apos;t find one anywhere.
            </p>
            <p>
              So I turned to AI and built the dashboard I wished I&apos;d had: a daily,
              weather-driven acclimatization plan that starts gentle, respects the science, and puts
              safety first — timed to the coolest hours, ramped to how your body responds.
            </p>
            <p>
              With climate change making summers hotter, I figured I&apos;m not the only one who
              needs this. Anyone heading somewhere hot — travellers, people relocating, outdoor
              workers, athletes — might want the same personalized help. So I&apos;m sharing it, free
              and private.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 text-sm leading-relaxed text-slate-600 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Thermometer className="h-5 w-5 text-orange-500" /> Who made it
          </h2>
          <p className="mt-2">
            Made by <strong>Taner</strong> — built for my own use first, then opened up for anyone
            who needs it. It keeps <strong>no accounts and stores nothing on a server</strong>:
            everything you enter stays in your browser.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href="https://tunas.me/taner/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-medium text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
            >
              My personal page
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-orange-500" />
            </a>
            <a
              href="https://github.com/BenZenTuna"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-medium text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
            >
              GitHub
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-orange-500" />
            </a>
          </div>
        </section>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Curious how the plan is built? See{" "}
        <Link href="/how-it-works" className="underline hover:text-slate-600">
          how it works
        </Link>
        , or read our{" "}
        <Link href="/privacy" className="underline hover:text-slate-600">
          privacy &amp; terms
        </Link>
        .
      </p>
    </main>
  );
}
