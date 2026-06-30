import { Flame } from "@/app/icons";

export function Brand({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-sm">
        <Flame className="h-4 w-4" />
      </span>
      <span className="text-sm font-bold tracking-tight text-slate-900">
        climatize<span className="text-orange-500">.now</span>
      </span>
    </div>
  );
}
