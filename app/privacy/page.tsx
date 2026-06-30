import Link from "next/link";
import type { Metadata } from "next";
import { Brand } from "@/app/brand";
import { ShieldCheck, Alert } from "@/app/icons";

export const metadata: Metadata = {
  title: "Privacy & terms — climatize.now",
  description:
    "climatize.now stores nothing on a server. No accounts, no tracking. Everything you enter stays in your browser. Wellness guidance, not medical advice.",
};

export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-5">
      <Brand className="mb-6" />
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
        ← Back to climatize.now
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Privacy &amp; terms</h1>
        <p className="mt-2 text-slate-600">The short version: we don&apos;t collect anything.</p>
      </header>

      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-900">
            <ShieldCheck className="h-5 w-5" /> Your data never leaves your device
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-emerald-900">
            <li>
              <strong>No accounts, no login, no tracking.</strong> There&apos;s nothing to sign up
              for.
            </li>
            <li>
              Everything you enter — your goal, locations, <strong>health answers</strong>, and
              daily logs — is stored <strong>only in your browser</strong> (local storage). It is
              never sent to or kept on any server.
            </li>
            <li>
              Live weather is fetched <strong>directly by your browser</strong> from Open-Meteo, so
              even your location never passes through us.
            </li>
            <li>
              The site is just static files on a CDN — there is no database and no back end that
              could hold your information.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 text-sm leading-relaxed text-slate-600 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">What this means for you</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Your data lives on the device and browser you used. It won&apos;t sync to your other
              devices, and <strong>clearing your browser data will erase it.</strong>
            </li>
            <li>
              <strong>Third-party services:</strong> weather and place look-ups are served by{" "}
              <a className="underline" href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">
                Open-Meteo
              </a>
              , which receives the coordinates it needs to return a forecast. This site also uses{" "}
              <a className="underline" href="https://www.goatcounter.com" target="_blank" rel="noopener noreferrer">
                GoatCounter
              </a>{" "}
              for anonymous page-view counting — no cookies, no personal data, no cross-site tracking,
              and no consent banner required (GDPR-exempt aggregate analytics).
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-amber-900">
            <Alert className="h-5 w-5" /> Wellness guidance, not medical advice
          </h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-amber-900">
            <p>
              climatize.now provides general wellness information to help you adapt to heat gradually. It
              is <strong>not medical advice</strong>, cannot diagnose or treat any condition, and is
              no substitute for a qualified health professional. Use it at your own discretion and
              risk.
            </p>
            <p>
              Heat illness can be serious. <strong>Stop and seek help immediately</strong> if you
              experience confusion, fainting, a seizure, hot/dry skin or stopped sweating in the
              heat, repeated vomiting, or symptoms that worsen or don&apos;t ease within ~30 minutes
              of cooling and rest. In an emergency, call your local emergency number.
            </p>
            <p>
              If you are pregnant, elderly, very young, or have a heart, kidney, or other condition —
              or take medications that affect heat tolerance — please consult a clinician before
              starting any heat-exposure program.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 text-sm leading-relaxed text-slate-600 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Terms, briefly</h2>
          <p className="mt-2">
            climatize.now is provided &quot;as is,&quot; without warranties of any kind. To the extent
            permitted by law, the makers accept no liability for any loss or harm arising from its
            use. By using it you agree to these terms and acknowledge it is wellness guidance, not
            medical advice.
          </p>
        </section>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Curious how the plan is built? See{" "}
        <Link href="/how-it-works" className="underline hover:text-slate-600">
          how it works
        </Link>
        .
      </p>
    </main>
  );
}
