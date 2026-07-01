export function Brand({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
        style={{ background: "linear-gradient(140deg,#fcd34d 0%,#f97316 55%,#ea580c 100%)" }}
      >
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden>
          <g stroke="#fff" strokeWidth="1.9" strokeLinecap="round" opacity="0.95">
            <line x1="20" y1="8" x2="20" y2="12.5" />
            <line x1="11" y1="11.5" x2="13.6" y2="14.1" />
            <line x1="29" y1="11.5" x2="26.4" y2="14.1" />
          </g>
          <circle cx="20" cy="25" r="7" fill="#fff" opacity="0.96" />
          <rect x="6.5" y="27" width="27" height="2.4" rx="1.2" fill="#fff" opacity="0.96" />
          <rect x="11" y="31.4" width="18" height="2" rx="1" fill="#fff" opacity="0.62" />
        </svg>
      </span>
      <span className="text-sm font-bold tracking-tight text-slate-900">
        climatize<span className="text-orange-500">.now</span>
      </span>
    </div>
  );
}
