import OnboardingForm from "./OnboardingForm";
import { Brand } from "@/app/brand";
import { Sun } from "@/app/icons";

export default function OnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-5">
      <Brand className="mb-6" />
      <header className="rise mb-8 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-white shadow-sm">
        <Sun className="h-7 w-7 text-white/90" />
        <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
          Let&apos;s build your heat-adaptation plan
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/90">
          Tell us your goal, where your body is used to, and where you are now. We&apos;ll read the
          live weather and give you a safe plan for today — then adjust it as you go.
        </p>
      </header>
      <OnboardingForm />
    </main>
  );
}
