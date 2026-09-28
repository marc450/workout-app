"use client";

import { useEffect, useState } from "react";
import { haptic } from "./useRestTimer";
import { SHORTCUT_NAME, isIOS } from "./useClockTimer";

type Props = { enabled: boolean; onChange: (v: boolean) => void };

/** iOS-only opt-in: start a Clock timer through the Shortcuts app on every confirmed set. */
export function ClockTimerSetting({ enabled, onChange }: Props) {
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setIos(isIOS()), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!ios) return null;

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-card bg-surface px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-text">iOS Clock timer</div>
        <div className="text-[12px] text-muted">Runs the “{SHORTCUT_NAME}” Shortcut after each set</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="iOS Clock timer"
        onClick={() => {
          haptic(8);
          onChange(!enabled);
        }}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${enabled ? "bg-accent" : "bg-surface-2"}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full transition-[left] ${enabled ? "left-7 bg-accent-ink" : "left-1 bg-muted"}`} aria-hidden="true" />
      </button>
    </div>
  );
}
