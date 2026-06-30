"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The plan is now merged into /today; keep this route working as a redirect.
export default function PlanRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/today");
  }, [router]);
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center px-5 text-slate-400">
      Redirecting…
    </main>
  );
}
