"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const { state, ready } = useAppState();

  useEffect(() => {
    if (!ready) return;
    router.replace(state ? "/today" : "/onboarding");
  }, [ready, state, router]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center px-5 text-slate-400">
      Loading…
    </main>
  );
}
