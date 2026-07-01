"use client";

import { useState } from "react";
import Link from "next/link";

// Desktop-only left navigation rail (Today Dashboard - Desktop design). Primary links
// jump to the in-page sections (the whole program lives on /today); the secondary group
// holds the trust pages plus the two settings actions from the mobile gear menu
// (Change cities = non-destructive; Start over = destructive, behind a confirm).

const ICON = "h-[18px] w-[18px] shrink-0";
const ICON_SM = "h-4 w-4 shrink-0";

function Item({
  href,
  onClick,
  active,
  small,
  danger,
  icon,
  children,
}: {
  href?: string;
  onClick?: () => void;
  active?: boolean;
  small?: boolean;
  danger?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const base = "flex items-center gap-[11px] rounded-xl no-underline transition-colors";
  const pad = small ? "px-3 py-[9px]" : "px-3 py-2.5";
  const tone = active
    ? "bg-[#fff7ed] font-bold text-[#c2410c]"
    : danger
      ? "font-medium text-[#b91c1c] hover:bg-red-50"
      : small
        ? "font-medium text-[#78716c] hover:bg-[#fdf3e8]"
        : "font-medium text-[#57534e] hover:bg-[#fdf3e8]";
  const size = small ? "text-[13px]" : "text-[14px]";
  const cls = `${base} ${pad} ${tone} ${size}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${cls} w-full cursor-pointer border-0 bg-transparent text-left`}>
      {icon}
      {children}
    </button>
  );
}

export function Sidebar({ onStartOver }: { onStartOver: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <aside className="sticky top-0 flex h-[100dvh] w-[246px] shrink-0 flex-col border-r border-[#f0e7db] bg-white px-4 py-5">
      {/* Brand */}
      <div className="flex items-center gap-[11px] px-1.5">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[13px]"
          style={{ background: "linear-gradient(140deg,#fcd34d 0%,#f97316 55%,#ea580c 100%)", boxShadow: "0 7px 18px -6px rgba(234,88,12,.6)" }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <g stroke="#fff" strokeWidth="1.9" strokeLinecap="round" opacity="0.95">
              <line x1="20" y1="8" x2="20" y2="12.5" />
              <line x1="11" y1="11.5" x2="13.6" y2="14.1" />
              <line x1="29" y1="11.5" x2="26.4" y2="14.1" />
            </g>
            <circle cx="20" cy="25" r="7" fill="#fff" opacity="0.96" />
            <rect x="6.5" y="27" width="27" height="2.4" rx="1.2" fill="#fff" opacity="0.96" />
            <rect x="11" y="31.4" width="18" height="2" rx="1" fill="#fff" opacity="0.62" />
          </svg>
        </div>
        <div className="leading-none">
          <div className="text-[17px] font-bold tracking-[-.025em]">
            climatize<span className="text-[#f97316]">.now</span>
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[.16em] text-[#a8a29e]">Heat adaptation</div>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="mt-6 flex flex-col gap-[3px]">
        <Item href="/today" active icon={<SunIcon className={ICON} />}>Today</Item>
        <Item href="/log" icon={<PencilIcon className={ICON} />}>Log today</Item>
        <Item href="#progress" icon={<TrendIcon className={ICON} />}>Progress</Item>
        <Item href="#program" icon={<CalendarIcon className={ICON} />}>Program</Item>
        <Item href="#forecast" icon={<CloudIcon className={ICON} />}>Forecast</Item>
      </nav>

      <div className="mx-2 my-4 h-px bg-[#f4ead9]" />

      {/* Secondary nav */}
      <nav className="flex flex-col gap-[3px]">
        <Item href="/how-it-works" small icon={<HelpIcon className={ICON_SM} />}>How it works</Item>
        <Item href="/about" small icon={<InfoIcon className={ICON_SM} />}>About</Item>
        <Item href="/change-cities" small icon={<PinIcon className={ICON_SM} />}>Change cities</Item>
        {!confirming ? (
          <Item small danger onClick={() => setConfirming(true)} icon={<RotateIcon className={ICON_SM} />}>
            Start over
          </Item>
        ) : (
          <div className="mt-1 rounded-xl border border-[#f4ead9] bg-[#fffdfa] p-2.5">
            <div className="text-[12px] font-bold text-stone-900">Erase everything?</div>
            <p className="mt-1 text-[11px] leading-[1.5] text-stone-500">Wipes your program, logs, and health answers.</p>
            <div className="mt-2 flex gap-1.5">
              <button
                onClick={onStartOver}
                className="flex-1 cursor-pointer rounded-lg bg-red-600 px-2 py-1.5 text-[11.5px] font-bold text-white hover:bg-red-700"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="cursor-pointer rounded-lg border border-stone-200 px-2 py-1.5 text-[11.5px] font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-[#f4ead9] px-1.5 pt-3">
        <div className="font-mono text-[10px] leading-[1.6] text-[#a8a29e]">
          No accounts · no tracking.
          <br />
          Everything stays on your device.
        </div>
      </div>
    </aside>
  );
}

// --- Inline nav icons (match the desktop design's stroke set) ---
type IP = { className?: string };
const S = (p: IP & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden>
    {p.children}
  </svg>
);
const SunIcon = (p: IP) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" /></S>;
const PencilIcon = (p: IP) => <S {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></S>;
const TrendIcon = (p: IP) => <S {...p}><path d="M22 7 13.5 15.5 8.5 10.5 2 17" /><path d="M16 7h6v6" /></S>;
const CalendarIcon = (p: IP) => <S {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></S>;
const CloudIcon = (p: IP) => <S {...p}><path d="M17.5 19a4.5 4.5 0 1 0 0-9h-1.8A7 7 0 1 0 4 15.9" /></S>;
const HelpIcon = (p: IP) => <S {...p}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></S>;
const InfoIcon = (p: IP) => <S {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></S>;
const PinIcon = (p: IP) => <S {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></S>;
const RotateIcon = (p: IP) => <S {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></S>;
