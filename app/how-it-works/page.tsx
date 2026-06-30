import Link from "next/link";
import type { Metadata } from "next";
import { Brand } from "@/app/brand";
import { Thermometer, Droplet, ShieldCheck, Activity, Sparkle } from "@/app/icons";

export const metadata: Metadata = {
  title: "How BaseHeat works — the science",
  description:
    "How BaseHeat reads real heat strain, estimates your baseline, and builds a safe, gradual heat-adaptation plan — in plain language, with sources.",
};

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <span className="text-orange-500">{icon}</span>
        {title}
      </h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export default function HowItWorks() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-5">
      <Brand className="mb-6" />
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
        ← Back to BaseHeat
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="text-3xl font-bold text-slate-900">How it works</h1>
        <p className="mt-2 text-slate-600">
          BaseHeat is a transparent, rules-based coach for adapting to heat safely. No black-box AI
          — just published physiology you can read here, line by line.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <Section icon={<Thermometer className="h-5 w-5" />} title="We read the real heat, not just the temperature">
          <p>
            Your body cools by evaporating sweat. High humidity blocks that, so the same air
            temperature can be harmless or dangerous depending on the moisture in the air. So we
            never drive anything from dry temperature alone. Instead we compute:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Heat index</strong> (the &quot;feels-like&quot;) from temperature + humidity.
            </li>
            <li>
              <strong>Wet-bulb temperature</strong> — how much evaporative cooling is even possible.
            </li>
            <li>
              <strong>A WBGT estimate</strong> — a combined heat-stress measure used in sport and
              the military.
            </li>
          </ul>
        </Section>

        <Section icon={<Droplet className="h-5 w-5" />} title="Your baseline = the heat you're used to">
          <p>
            Heat tolerance is short-term: you build it in about 1–2 weeks of heat exposure and lose
            it over 2–4 weeks without. So &quot;what your body is used to&quot; is best captured by
            the heat you&apos;ve actually lived through recently — not a yearly average (which
            ignores the season) and not a single day (too noisy).
          </p>
          <p>
            We estimate it from your home city&apos;s <strong>last ~3 weeks of real weather</strong>,
            taking each day&apos;s peak and weighting recent days more heavily (a ~2-week half-life)
            — exactly how the adaptation itself fades.
          </p>
        </Section>

        <Section icon={<Sparkle className="h-5 w-5" />} title="The gap drives the plan">
          <p>
            The personalization comes from one number: the <strong>gap</strong> between how hot it
            gets where you are now (the day&apos;s peak) and that home baseline. A big gap means
            start gentler and ramp slower; a small gap needs little.
          </p>
        </Section>

        <Section icon={<Activity className="h-5 w-5" />} title="The daily plan ramps gently to a real dose">
          <p>
            The adaptation stimulus is roughly <strong>60–90 minutes of raised core temperature</strong>{" "}
            a day, from heat exposure with light activity. We start you at a gap-scaled fraction of
            that and build up over about two weeks, with most of the gains in the first week. We also
            pick the <strong>safest time-of-day window</strong> so you exercise when it&apos;s
            coolest, and we adjust tomorrow based on how today felt — good days advance, rough days
            pull back, and a warning sign means a rest day.
          </p>
          <p>
            If you stop, adaptation <strong>decays</strong> — noticeable within about a week — so the
            plan accounts for missed days too.
          </p>
        </Section>

        <Section icon={<ShieldCheck className="h-5 w-5" />} title="Safety always wins">
          <p>
            A safety layer sits above everything and can never be bypassed by your goal or progress:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              A <strong>hard stop</strong> in extreme conditions (around wet-bulb 28°C, heat index
              39°C / 103°F, or WBGT 31°C) — shelter and cooling only, no exposure.
            </li>
            <li>
              <strong>Health screening</strong> at sign-up (heart/kidney conditions, pregnancy, age
              extremes, and medications like diuretics, beta-blockers or anticholinergics) that caps
              or withholds plans — especially for risky combinations.
            </li>
            <li>
              Plain <strong>heat-exhaustion vs heat-stroke</strong> recognition and a clear
              &quot;stop and seek help now&quot; list on every plan.
            </li>
          </ul>
        </Section>

        <Section icon={<Sparkle className="h-5 w-5" />} title="What we deliberately don't do">
          <ul className="list-disc space-y-1 pl-5">
            <li>No machine-learning black box — the rules are transparent and auditable.</li>
            <li>No accounts, no tracking — everything stays in your browser (see Privacy).</li>
            <li>
              No medical claims — this is <strong>wellness guidance, not medical advice</strong>.
            </li>
          </ul>
        </Section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Sources</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>US National Weather Service — Heat Index (Rothfusz regression).</li>
            <li>Stull, R. (2011), &quot;Wet-Bulb Temperature from RH and Air Temperature,&quot; JAMC.</li>
            <li>ACSM position stand on exertional heat illness; US Army WBGT flag system.</li>
            <li>Vecellio et al. (2022), critical environmental limits, J. Appl. Physiol.</li>
            <li>Heat-acclimatization reviews (timeline ~7–14 days; decay over ~2–4 weeks).</li>
          </ul>
          <p className="mt-3">
            These thresholds are best-effort and pending review by a qualified clinician before
            real-world use.
          </p>
        </section>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Wellness guidance, not medical advice. See our{" "}
        <Link href="/privacy" className="underline hover:text-slate-600">
          privacy &amp; terms
        </Link>
        .
      </p>
    </main>
  );
}
