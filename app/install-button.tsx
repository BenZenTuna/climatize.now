"use client";

import { useEffect, useState } from "react";
import { Download, X } from "@/app/icons";

const DISMISS_KEY = "climatize.install.dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Persistent "Install mobile app" button shown at the top of every page.
 *
 * – On browsers that support beforeinstallprompt (Chrome, Edge, Android): intercepts the
 *   native popup and surfaces our own button. Clicking it triggers the install flow.
 * – On iOS Safari: shows the same button but opens a tooltip explaining how to use
 *   "Share → Add to Home Screen", since Safari doesn't support beforeinstallprompt.
 * – Hidden when: already running in standalone/installed mode, user dismissed, or the
 *   browser neither fired beforeinstallprompt nor is iOS (i.e., already installed / unsupported).
 */
export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    if (isIOS()) {
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || dismissed) return null;

  const handleInstall = async () => {
    if (isIOS()) {
      setShowIOSHint((s) => !s);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    setShowIOSHint(false);
  };

  return (
    <div className="relative z-50 w-full border-b border-[#fde8d0] bg-[#fff7ed]">
      <div className="mx-auto flex max-w-[1180px] items-center gap-2 px-4 py-1.5">
        <button
          onClick={handleInstall}
          className="flex flex-1 cursor-pointer items-center gap-1.5 text-left"
          aria-label="Install mobile app"
        >
          <Download className="h-3.5 w-3.5 shrink-0 text-[#ea580c]" />
          <span className="text-[12px] font-semibold text-[#9a3412]">Install mobile app</span>
          {isIOS() && (
            <span className="text-[11px] text-[#c2410c]">
              — tap for instructions
            </span>
          )}
        </button>
        <button
          onClick={handleDismiss}
          className="cursor-pointer rounded-full p-0.5 text-[#c2410c] transition-colors hover:bg-[#fde8d0]"
          aria-label="Dismiss install prompt"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {showIOSHint && (
        <div className="border-t border-[#fde8d0] bg-[#fff7ed] px-4 py-2.5">
          <p className="text-[12px] leading-relaxed text-[#92400e]">
            In Safari, tap the{" "}
            <span className="font-bold">Share</span> button (the box with an arrow pointing up) →
            scroll down → tap{" "}
            <span className="font-bold">Add to Home Screen</span> → tap{" "}
            <span className="font-bold">Add</span>.
          </p>
        </div>
      )}
    </div>
  );
}
